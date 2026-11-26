// EPUB/DOCX decoding is local. Parser dependencies ship with the app.
(() => {
'use strict';
const P=()=>window.readerParser;
const elements=(root,name)=>Array.from(root.getElementsByTagNameNS('*',name));
const first=(root,name)=>elements(root,name)[0];
const xml=text=>{const d=new DOMParser().parseFromString(text,'application/xml');if(elements(d,'parsererror').length)throw Error('文件中的XML结构不完整');return d;};
const val=(root,name)=>first(root,name)?.textContent.trim()||'';
function pathOf(base,href){const u=new URL(href,'https://reader.local/'+base);if(u.origin!=='https://reader.local')return null;return decodeURIComponent(u.pathname.slice(1));}
async function zipFile(file){if(typeof JSZip==='undefined')throw Error('本地解包组件未加载，请刷新页面');const z=await JSZip.loadAsync(await file.arrayBuffer());let total=0;for(const f of Object.values(z.files)){total+=f._data?.uncompressedSize||0;if(total>200*1024*1024)throw Error('解压后内容超过200MB，请选择较小的文件');}return z;}
async function zipText(z,path){const f=path&&z.file(path);if(!f)throw Error('文件缺少内容：'+path);return f.async('string');}
function epubBlocks(root){
 const out=[];
 function visit(n){if(n.nodeType===3){const t=n.textContent.trim();if(t)out.push({text:t});return;}const tag=(n.localName||'').toLowerCase();if(['script','style','nav','head'].includes(tag))return;
 if(/^h[1-6]$/.test(tag)){const t=n.textContent.trim();if(t)out.push({heading:true,text:t});return;}
 if(['p','li','blockquote','pre','div'].includes(tag)&&!Array.from(n.children||[]).some(c=>['p','li','div','blockquote','h1','h2','h3'].includes(c.localName))){const t=n.textContent.trim();if(t)out.push({text:t});return;}
 for(const c of Array.from(n.childNodes||[]))visit(c);
 }
 visit(root);return out;
}
async function epub(file,progress){
 const z=await zipFile(file),container=xml(await zipText(z,'META-INF/container.xml')),opfPath=first(container,'rootfile')?.getAttribute('full-path');if(!opfPath)throw Error('EPUB缺少内容清单');
 const opf=xml(await zipText(z,opfPath)),info={...P().parseBookInfo(file.name),format:'epub'},title=val(opf,'title'),author=elements(opf,'creator').map(n=>n.textContent.trim()).filter(Boolean).join('、');if(title)info.title=title;if(author)info.author=author;info.description=val(opf,'description').replace(/<[^>]*>/g,'').slice(0,4000);
 const manifest=new Map(elements(opf,'item').map(n=>[n.getAttribute('id'),{path:pathOf(opfPath,n.getAttribute('href')),properties:n.getAttribute('properties')||'',media:n.getAttribute('media-type')}])) ,navTitles=new Map();
 for(const item of manifest.values())if(item.properties.split(/\s+/).includes('nav')||item.media==='application/x-dtbncx+xml'){
  const nav=xml(await zipText(z,item.path));for(const a of elements(nav,'a')){const p=pathOf(item.path,a.getAttribute('href')||'');if(p&&!navTitles.has(p))navTitles.set(p,a.textContent.trim());}
  for(const point of elements(nav,'navPoint')){const src=first(point,'content')?.getAttribute('src'),name=val(point,'text'),p=src&&pathOf(item.path,src);if(p&&name&&!navTitles.has(p))navTitles.set(p,name);}
 }
 const coverMeta=elements(opf,'meta').find(n=>n.getAttribute('name')==='cover'),coverItem=manifest.get(coverMeta?.getAttribute('content'))||[...manifest.values()].find(x=>x.properties.split(/\s+/).includes('cover-image'));if(coverItem&&/^image\/(png|jpeg|webp)$/.test(coverItem.media)&&z.file(coverItem.path)&&Number(z.file(coverItem.path)._data?.uncompressedSize||0)<=5*1024*1024)info.cover='data:'+coverItem.media+';base64,'+await z.file(coverItem.path).async('base64');
 const spine=elements(opf,'itemref'),chapters=[];
 for(let i=0;i<spine.length;i++){
  const item=manifest.get(spine[i].getAttribute('idref'));if(!item||item.properties.split(/\s+/).includes('nav'))continue;
  const d=xml(await zipText(z,item.path)),body=first(d,'body')||d,blocks=epubBlocks(body);let name=navTitles.get(item.path)||val(d,'title')||'第'+(chapters.length+1)+'节',parts=[];
  function flush(){if(parts.length){chapters.push({title:name,content:parts.join('\n\n')});parts=[];}}
  for(const block of blocks){if(block.heading){if(parts.length)flush();name=block.text;}else parts.push(block.text);}flush();progress?.(20+Math.round(65*(i+1)/Math.max(1,spine.length)),'正在读取EPUB '+(i+1)+'/'+spine.length);
 }
 if(!chapters.length)throw Error('没有找到可阅读的EPUB正文（不支持加密书籍）');return {bookInfo:info,chapters,text:null};
}
async function docx(file,progress){
 const z=await zipFile(file),d=xml(await zipText(z,'word/document.xml')),body=first(d,'body'),info={...P().parseBookInfo(file.name),format:'docx'};
 if(z.file('docProps/core.xml')){const core=xml(await zipText(z,'docProps/core.xml'));const title=val(core,'title'),author=val(core,'creator');if(title)info.title=title;if(author)info.author=author;}
 const headingStyles=new Set();if(z.file('word/styles.xml')){const styles=xml(await zipText(z,'word/styles.xml'));for(const style of elements(styles,'style')){const n=first(style,'name'),level=first(style,'outlineLvl'),name=n&&(n.getAttribute('w:val')||n.getAttribute('val'))||'',rank=level&&(level.getAttribute('w:val')||level.getAttribute('val'));if(/^(?:heading|标题)[ _-]*[1-3]$/i.test(name)||rank!==null&&rank!==undefined&&Number(rank)<=2)headingStyles.add(style.getAttribute('w:styleId')||style.getAttribute('styleId'));}}
 const blocks=[];
 for(const p of elements(body,'p')){
  let text='';function walk(n){const tag=n.localName;if(tag==='t')text+=n.textContent;else if(tag==='tab')text+='\t';else if(tag==='br'||tag==='cr')text+='\n';else for(const c of Array.from(n.childNodes||[]))walk(c);}walk(p);text=text.trim();if(!text)continue;
  const style=first(p,'pStyle'),id=style&&(style.getAttribute('w:val')||style.getAttribute('val'))||'';const outline=first(p,'outlineLvl'),rank=outline&&(outline.getAttribute('w:val')||outline.getAttribute('val'));blocks.push({text,heading:headingStyles.has(id)||/^(?:heading|标题)[ _-]*[1-3]$/i.test(id)||rank!==null&&rank!==undefined&&Number(rank)<=2});
 }
 const text=blocks.map(b=>b.text).join('\n\n');if(!text.trim())throw Error('DOCX中没有可提取的文字');progress?.(80,'DOCX正文已提取');
 if(!blocks.some(b=>b.heading))return {bookInfo:{...info,...mergeDetected(info,P().parseBookInfo(file.name,text))},chapters:P().parseChapters(text),text};
 const chapters=[];let title='前言／简介',parts=[];const flush=()=>{if(parts.length)chapters.push({title,content:parts.join('\n\n')});parts=[];};
 for(const b of blocks){if(b.heading){flush();title=b.text;}else parts.push(b.text);}flush();return {bookInfo:info,chapters,text,sourcePreferred:true};
}
function mergeDetected(info,detected){return {title:info.title,author:info.author==='未知作者'?detected.author:info.author};}
async function read(file,progress){if(file.size>100*1024*1024)throw Error('单本文件请小于100MB');progress?.(5,'正在读取文件');const ext=file.name.split('.').pop().toLowerCase();if(ext==='txt'){const text=await P().readTxtContent(file);return {bookInfo:{...P().parseBookInfo(file.name,text),format:'txt'},chapters:P().parseChapters(text),text};}if(ext==='epub')return epub(file,progress);if(ext==='docx')return docx(file,progress);throw Error('请选择TXT、EPUB或DOCX');}
window.ReaderImport={read,epub,docx,epubBlocks,pathOf};
})();
