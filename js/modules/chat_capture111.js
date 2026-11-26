/* Reflow with the original stylesheet cascade; snapshot computed paint only after layout. */
(()=>{'use strict';
const fontCache111=new Map();
// CSS-redrawn icons are background/content images, not the hidden inline SVG buttons.
const cssSVGPattern111=/url\(\s*(?:(["'])(data:image\/svg\+xml[\s\S]*?)\1|(data:image\/svg\+xml[^)]*))\s*\)/gi;
function cssSVGURLs111(css){return [...String(css||'').matchAll(cssSVGPattern111)].map(match=>({raw:match[0],url:(match[2]||match[3]).trim()}));}
function sizedSVG111(url,size){const comma=url.indexOf(',');if(comma<0)throw Error('无效的SVG背景图');const metadata=url.slice(0,comma),payload=url.slice(comma+1),source=/;base64/i.test(metadata)?new TextDecoder().decode(Uint8Array.from(atob(payload),c=>c.charCodeAt(0))):decodeURIComponent(payload),match=source.match(/<svg\b[^>]*>/i);if(!match)throw Error('SVG背景图缺少根节点');const tag=match[0],attribute=name=>tag.match(new RegExp('\\s'+name+'\\s*=\\s*(["\\\'])(.*?)\\1','i'))?.[2],view=(attribute('viewBox')||'').trim().split(/[\s,]+/).map(Number),dimension=(value,fallback)=>/^\d+(?:\.\d+)?(?:px)?$/i.test(value||'')?Number.parseFloat(value):fallback,width=Number(size?.width)||dimension(attribute('width'),view[2]||24),height=Number(size?.height)||dimension(attribute('height'),view[3]||24);if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)))throw Error('SVG背景图尺寸无效');let fixed=tag.replace(/\s(?:width|height)\s*=\s*(["'])[\s\S]*?\1/gi,'');fixed=fixed.replace(/\/?>(?=$)/,ending=>' width="'+width+'" height="'+height+'"'+ending);return {source:source.replace(tag,fixed),width,height};}
async function pngSVGBackground111(url,size){const svg=sizedSVG111(url,size),image=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('SVG背景图加载超时')),10000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('SVG背景图读取失败'));};image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.source);});const scale=Math.min(4,2048/Math.max(svg.width,svg.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(svg.width*scale));canvas.height=Math.max(1,Math.round(svg.height*scale));const context=canvas.getContext('2d');if(!context)throw Error('设备无法转换CSS图标');context.drawImage(image,0,0,canvas.width,canvas.height);const png=canvas.toDataURL('image/png');if(!png.startsWith('data:image/png'))throw Error('CSS图标转换失败');canvas.width=canvas.height=0;return png;}
function cssSizing111(live){const hints=new Map(),roots=[live.querySelector('#chat-room-header-default'),live.querySelector('.chat-input-wrapper')].filter(Boolean);for(const root of roots)for(const node of [root,...root.querySelectorAll('*')])for(const pseudo of [null,'::before','::after']){const style=getComputedStyle(node,pseudo);if(style.display==='none'||style.backgroundSize!=='100% 100%')continue;const width=parseFloat(style.width),height=parseFloat(style.height);if(!(width>0&&height>0))continue;for(const asset of cssSVGURLs111(style.backgroundImage)){const old=hints.get(asset.url);if(!hints.has(asset.url))hints.set(asset.url,{width,height});else if(old&&(old.width!==width||old.height!==height))hints.set(asset.url,null);}}return hints;}
async function cssImages111(html,convert=pngSVGBackground111){const entries=[];for(const element of html.querySelectorAll('style,[style]')){if(element.tagName==='STYLE')entries.push({element,kind:'text',css:element.textContent});if(element.hasAttribute('style'))entries.push({element,kind:'style',css:element.getAttribute('style')});}const urls=new Set(entries.flatMap(entry=>cssSVGURLs111(entry.css).map(asset=>asset.url))),images=new Map();await Promise.all([...urls].map(async url=>images.set(url,await convert(url))));for(const entry of entries){const css=entry.css.replace(cssSVGPattern111,(raw,quote,quoted,unquoted)=>'url("'+images.get((quoted||unquoted).trim())+'")');if(entry.kind==='text')entry.element.textContent=css;else entry.element.setAttribute('style',css);}return urls.size;}

function force111(el,styles){if(el)for(const [name,value]of Object.entries(styles))el.style.setProperty(name,value,'important');}
// Prefer one complete PNG; reduce supersampling before considering multiple images.
function plan111(width,height,bars=0,ios=false,scaleCap=4) {
 if(!(Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0&&Number.isFinite(bars)&&bars>=0))throw Error('截图尺寸无效');
 const pixels=10000000,maxHeight=30000,cap=Math.max(1,Math.min(4,Number(scaleCap)||4));
 const fit=Math.min(cap,Math.sqrt(pixels/(width*height)),maxHeight/height);
 let scale=Math.max(1,Math.floor(fit*4)/4);
 const body=Math.max(0,height-bars);
 const available=value=>Math.floor((Math.min(maxHeight,Math.floor(pixels/Math.ceil(width*value)))-3)/value-bars);
 let capacity=available(scale);
 // Three output pixels cover the independent ceil() of header/body/footer.
 while(scale>1&&capacity<body){scale=Math.max(1,scale-.25);capacity=available(scale);}
 if(capacity<1)throw Error('顶栏或底栏过高，无法生成高清截图');
 const parts=[];
 for(let offset=0;offset<body;offset+=capacity)parts.push({offset,height:Math.min(capacity,body-offset)});
 if(!parts.length)parts.push({offset:0,height:0});
 return {scale,capacity,pixels,maxHeight,parts};
}
function styles111(sourceDoc,head){
 // Retain the live cascade order, including current CSSOM edits and chat/global beauty sheets.
 head.querySelectorAll('style,link[rel="stylesheet"]').forEach(node=>node.remove());
 for(const source of sourceDoc.querySelectorAll('style,link[rel="stylesheet"]')){
  if(source.disabled||source.sheet?.disabled)continue;
  const clone=source.cloneNode(true);
  if(source.tagName==='STYLE')try{if(source.sheet)clone.textContent=[...source.sheet.cssRules].map(rule=>rule.cssText).join('\n');}catch{}
  head.append(clone);
 }
 for(const sheet of sourceDoc.adoptedStyleSheets||[]){if(sheet.disabled)continue;const node=sourceDoc.createElement('style');node.textContent=[...sheet.cssRules].map(rule=>rule.cssText).join('\n');head.append(node);}
}
function settle111(doc){
 // Inserting a clone restarts .screen fadeIn. Complete finite entrance/transition
 // animations in the isolated document BEFORE measuring or reading paint styles.
 const root=doc.documentElement;
 if(typeof root.getAnimations==='function')for(const animation of root.getAnimations({subtree:true})){
  const end=animation.effect?.getComputedTiming?.().endTime;
  if(Number.isFinite(end))try{animation.finish();}catch{}
 }
 else for(const node of [root,doc.body,...doc.querySelectorAll('.phone-screen,#chat-room-screen')].filter(Boolean))force111(node,{animation:'none',transition:'none'});
}
function normalChrome111(root){root.classList.remove('multi-select-active');root.classList.add('active');const header=root.querySelector('#chat-room-header-default'),select=root.querySelector('#chat-room-header-select'),footer=root.querySelector('.chat-input-wrapper');for(const [node,fallback]of [[header,'flex'],[footer,'block']])if(node){node.style.removeProperty('display');if(getComputedStyle(node).display==='none')force111(node,{display:fallback});}if(select)force111(select,{display:'none'});root.querySelectorAll('#capture-mode-bar,#multi-select-bar').forEach(el=>el.classList.remove('visible'));}
function metrics111(root){const rect=root.getBoundingClientRect(),header=root.querySelector('#chat-room-header-default')?.getBoundingClientRect(),footer=root.querySelector('.chat-input-wrapper')?.getBoundingClientRect(),area=root.querySelector('#message-area'),box=area?.getBoundingClientRect();if(!header||!footer||!box)throw Error('聊天页面未准备好');const style=getComputedStyle(area);return {width:rect.width,height:rect.height,scrollTop:area.scrollTop,top:Math.max(0,header.bottom-rect.top),bottom:Math.max(0,rect.bottom-footer.top),paddingTop:Math.max(0,(parseFloat(style.paddingTop)||0)-Math.max(0,header.bottom-box.top)),paddingBottom:Math.max(0,(parseFloat(style.paddingBottom)||0)-Math.max(0,box.bottom-footer.top))};}
function prune111(root,selected){const area=root.querySelector('#message-area');if(!area)throw Error('聊天页面未准备好');for(const row of [...area.querySelectorAll('.message-wrapper')]){if(!selected.has(row.dataset.id))row.remove();else row.classList.remove('multi-select-selected');}if(area.querySelectorAll('.message-wrapper').length!==selected.size)throw Error('部分所选消息尚未载入，请重新选择截图范围');}
async function chrome111(root,capture,top,bottom,height){const area=root.querySelector('#message-area'),main=area?.closest('main')||area?.parentElement;if(!main)throw Error('聊天页面未准备好');const value=main.style.getPropertyValue('opacity'),priority=main.style.getPropertyPriority('opacity');main.style.setProperty('opacity','0','important');try{return {header:top?await capture(0,top):null,footer:bottom?await capture(Math.max(0,height-bottom),bottom):null};}finally{if(value)main.style.setProperty('opacity',value,priority);else main.style.removeProperty('opacity');}}
function layout111(doc,selected,width,metrics={paddingTop:10,paddingBottom:10}){const root=doc.getElementById('chat-room-screen'),area=doc.getElementById('message-area'),main=area?.closest('main')||area?.parentElement;if(!root||!area||!main)throw Error('聊天页面未准备好');root.classList.remove('multi-select-active');root.classList.add('active');for(const row of [...area.querySelectorAll('.message-wrapper')]){if(!selected.has(row.dataset.id))row.remove();else row.classList.remove('multi-select-selected');}if(area.querySelectorAll('.message-wrapper').length!==selected.size)throw Error('部分所选消息尚未载入，请重新选择截图范围');for(const node of [...area.children])if(!node.classList.contains('message-wrapper'))node.remove();
 // Chrome has already been captured with its original fixed/absolute layout.
 for(const node of [...root.children])if(node!==main&&node.tagName!=='STYLE')force111(node,{display:'none'});
 for(const selector of ['#chat-room-header-default','#chat-room-header-select','.chat-input-wrapper','#capture-mode-bar','#multi-select-bar','#typing-indicator','#char-status-overlay','#chat-expansion-panel','#sticker-panel','#reply-preview-bar','.message-select-checkbox','.message-checkbox'])doc.querySelectorAll(selector).forEach(el=>force111(el,{display:'none'}));
 const growing={height:'auto','block-size':'auto','min-height':'0','min-block-size':'0','max-height':'none','max-block-size':'none',overflow:'visible',contain:'none','flex-shrink':'0','content-visibility':'visible'};for(let parent=root.parentElement;parent;parent=parent.parentElement)force111(parent,{...growing,position:'relative',transform:'none'});
 force111(root,{...growing,display:'block',position:'relative',inset:'auto',width:width+'px',margin:'0','padding-top':'0','padding-bottom':'0','padding-block-start':'0','padding-block-end':'0',transform:'none'});force111(main,{...growing,position:'relative',inset:'auto',flex:'none','margin-top':'0','margin-bottom':'0','padding-top':'0','padding-bottom':'0','padding-block-start':'0','padding-block-end':'0',transform:'none'});force111(area,{...growing,position:'relative',inset:'auto',flex:'none','margin-top':'0','margin-bottom':'0','padding-top':metrics.paddingTop+'px','padding-bottom':metrics.paddingBottom+'px','padding-block-start':metrics.paddingTop+'px','padding-block-end':metrics.paddingBottom+'px','justify-content':'flex-start','scroll-behavior':'auto',transform:'none'});area.scrollTop=0;return {root,main};}
function contentBounds111(root,metrics){const rows=[...root.querySelectorAll('#message-area .message-wrapper')];if(!rows.length)throw Error('没有可截图的消息');const outer=root.getBoundingClientRect(),boxes=rows.map(row=>row.getBoundingClientRect()),first=Math.min(...boxes.map(r=>r.top)),last=Math.max(...boxes.map(r=>r.bottom));return {top:Math.max(0,Math.floor(first-outer.top-Math.min(24,Math.max(0,metrics.paddingTop||0)))),bottom:Math.min(Math.ceil(outer.height),Math.ceil(last-outer.top+Math.min(24,Math.max(0,metrics.paddingBottom||0))))};}
function sliceCanvas111(canvas,y,height,scale){const out=document.createElement('canvas');out.width=canvas.width;out.height=Math.max(1,Math.round(height*scale));const context=out.getContext('2d');if(!context)throw Error('设备无法创建截图');context.drawImage(canvas,0,Math.round(y*scale),canvas.width,out.height,0,0,canvas.width,out.height);return out;}
async function fonts111(families){const rules=[];function visit(sheet){let css;try{css=sheet.cssRules;}catch{return;}for(const rule of css||[]){if(rule.type===5){const family=rule.style.getPropertyValue('font-family').replace(/["']/g,'').trim();if(families.has(family))rules.push({css:rule.cssText,base:sheet.href||document.baseURI});}else if(rule.styleSheet)visit(rule.styleSheet);}}for(const sheet of document.styleSheets)visit(sheet);const results=await Promise.all(rules.map(async rule=>{let css=rule.css;for(const match of [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)]){if(match[2].startsWith('data:'))continue;const url=new URL(match[2],rule.base).href;try{if(!fontCache111.has(url))fontCache111.set(url,(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{signal:controller.signal,uwuNative97:true});if(!response.ok)throw Error('font');const blob=await response.blob();if(blob.size>16000000)throw Error('font size');return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}finally{clearTimeout(timer);}})());css=css.replace(match[0],'url("'+await fontCache111.get(url)+'")');}catch{fontCache111.delete(url);}}return css;}));const local=[];if(typeof db!=='undefined'&&typeof dexieDB!=='undefined'){for(const preset of db.fontPresets||[]){if(!preset.isCustom||!families.has(preset.fontFamily))continue;const record=await dexieDB.customFonts.get(preset.id);if(!record?.file)continue;const key='local:'+preset.id+':'+(record.timestamp||0)+':'+(record.file.lastModified||0)+':'+record.file.size;if(!fontCache111.has(key))fontCache111.set(key,new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(record.file);}));const url=await fontCache111.get(key);local.push('@font-face{font-family:'+JSON.stringify(preset.fontFamily)+';src:url("'+url+'");}');}}return [...results,...local].join('\n');}
async function render111(live,ids){const selected=new Set(ids),state={classes:live.className},changed=[];let html,metrics,families=new Set();const remember=el=>{if(el)changed.push([el,el.getAttribute('style'),el.className]);};for(const selector of ['#chat-room-header-default','#chat-room-header-select','.chat-input-wrapper','#capture-mode-bar','#multi-select-bar'])live.querySelectorAll(selector).forEach(remember);
 try{for(const row of live.querySelectorAll('.multi-select-selected')){remember(row);row.classList.remove('multi-select-selected');}normalChrome111(live);metrics=metrics111(live);if(!metrics.width)throw Error('请先打开聊天页面');html=document.documentElement.cloneNode(false);const head=document.head.cloneNode(true),body=document.body.cloneNode(false);head.querySelectorAll('script,base').forEach(el=>el.remove());const base=document.createElement('base');base.href=document.baseURI;head.prepend(base);styles111(document,head);html.append(head,body);let target=body;const ancestors=[];for(let el=live.parentElement;el&&el!==document.body;el=el.parentElement)ancestors.unshift(el);for(const el of ancestors){const node=el.cloneNode(false);target.append(node);target=node;}const copy=live.cloneNode(true);copy.querySelectorAll('audio,video').forEach(el=>el.removeAttribute('autoplay'));target.append(copy);
 const originals=[live,...live.querySelectorAll('*')];originals.forEach(el=>{const row=el.closest('.message-wrapper');if(row&&!selected.has(row.dataset.id))return;for(const family of getComputedStyle(el).fontFamily.split(','))families.add(family.replace(/["']/g,'').trim());});copy.querySelectorAll('script,style,link[rel="stylesheet"],.uwu-selection-circle111,#uwu-range-select111').forEach(el=>el.remove());const sourceCanvases=live.querySelectorAll('canvas'),clonedCanvases=copy.querySelectorAll('canvas');sourceCanvases.forEach((canvas,i)=>{try{const img=document.createElement('img');img.src=canvas.toDataURL();if(canvas.hasAttribute('style'))img.setAttribute('style',canvas.getAttribute('style'));const size=getComputedStyle(canvas);img.style.width=size.width;img.style.height=size.height;img.width=canvas.width;img.height=canvas.height;clonedCanvases[i]?.replaceWith(img);}catch{}});
 }finally{live.className=state.classes;for(const [el,style,classes]of changed){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);el.className=classes;}}
 prune111(html.querySelector('#chat-room-screen'),selected);const embeddedFonts=await fonts111(families),fontStyle=document.createElement('style');fontStyle.textContent=embeddedFonts;html.querySelector('#chat-room-screen').append(fontStyle);const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-same-origin');frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-100000px;top:0;border:0;pointer-events:none;width:'+window.innerWidth+'px;height:'+window.innerHeight+'px;';
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('截图样式加载超时，请重试')),20000);frame.onload=()=>{clearTimeout(timer);resolve();};frame.onerror=()=>{clearTimeout(timer);reject(Error('截图页面加载失败'));};frame.srcdoc='<!doctype html>'+html.outerHTML;document.body.append(frame);});const doc=frame.contentDocument;await Promise.race([doc.fonts?.ready||Promise.resolve(),new Promise(r=>setTimeout(r,3000))]);prune111(doc.getElementById('chat-room-screen'),selected);const original=doc.getElementById('chat-room-screen').cloneNode(true),width=metrics.width,parentState=[];for(let parent=doc.getElementById('chat-room-screen').parentElement;parent;parent=parent.parentElement)parentState.push([parent,parent.getAttribute('style')]);
 async function pass(scaleCap=4) {
  for(const [el,style]of parentState){if(style===null)el.removeAttribute('style');else el.setAttribute('style',style);}
  const root=original.cloneNode(true);doc.getElementById('chat-room-screen').replaceWith(root);
  settle111(doc);root.querySelector('#message-area').scrollTop=metrics.scrollTop;
  const frameMetrics=metrics111(root),initial=root.getBoundingClientRect();
  const top=Math.round(frameMetrics.top),bottom=Math.round(frameMetrics.bottom),bars=top+bottom;
  const estimated=Math.max(metrics.height,[...root.querySelectorAll('.message-wrapper')]
   .filter(row=>selected.has(row.dataset.id))
   .reduce((n,row)=>n+row.getBoundingClientRect().height+Math.max(0,parseFloat(doc.defaultView.getComputedStyle(row).marginBottom)||0),metrics.paddingTop+metrics.paddingBottom)+bars);
  const planned=plan111(width,estimated,bars,UwUChatCaptureNative111.isIOS(),scaleCap);
  let chromeSnapshot,chromeFull,header,footer;
  const release=canvas=>{if(canvas)canvas.width=canvas.height=0;};
  try {
   const canRenderFull=Math.ceil(width*planned.scale)*Math.ceil(initial.height*planned.scale)<=planned.pixels&&Math.ceil(initial.height*planned.scale)<=planned.maxHeight;
   const capture=async(y,height)=>{
    chromeSnapshot??=UwUChatCaptureNative111.snapshot(root,{fontCSS:embeddedFonts});
    const render=await chromeSnapshot;
    if(!canRenderFull)return render(y,height,planned.scale);
    chromeFull??=render(0,initial.height,planned.scale);
    return sliceCanvas111(await chromeFull,y,height,planned.scale);
   };
   const chrome=await chrome111(root,capture,top,bottom,initial.height);header=chrome.header;footer=chrome.footer;
   if(chromeFull){release(await chromeFull);chromeFull=null;}
   layout111(doc,selected,width,frameMetrics);settle111(doc);
   const extent=contentBounds111(root,frameMetrics),bodyHeight=extent.bottom-extent.top;
   const actual=plan111(width,bodyHeight+bars,bars,UwUChatCaptureNative111.isIOS(),planned.scale);
   // Real reflow can be taller than the estimate. Rebuild all three regions at
   // one matching scale instead of splitting early or mixing their resolutions.
   if(actual.scale<planned.scale){release(header);release(footer);header=footer=null;return await pass(actual.scale);}
   const bodySnapshot=await UwUChatCaptureNative111.snapshot(root,{fontCSS:embeddedFonts}),results=[];
   for(let offset=0;offset<bodyHeight;offset+=actual.capacity) {
    let middle,canvas;
    try {
     middle=await bodySnapshot(extent.top+offset,Math.min(actual.capacity,bodyHeight-offset),planned.scale);
     canvas=document.createElement('canvas');canvas.width=Math.max(header?.width||0,middle.width,footer?.width||0);
     canvas.height=(header?.height||0)+middle.height+(footer?.height||0);
     const context=canvas.getContext('2d');if(!context)throw Error('设备无法创建截图');
     context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
     let y=0;for(const piece of [header,middle,footer])if(piece){context.drawImage(piece,0,y);y+=piece.height;}
     const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
     if(!blob)throw Error('截图超出设备图像限制');results.push(blob);
    } finally {release(canvas);release(middle);}
   }
   if(!results.length)throw Error('没有可截图的消息');return results;
  } finally {
   release(header);release(footer);
   if(chromeFull)try{release(await chromeFull);}catch{}
  }
 }
 for(let cap=4;cap>=1;cap--) {
  try{return await pass(cap);}
  catch(error){if(cap===1||!/(设备无法创建.*截图|设备图像限制|高清截图渲染超时)/.test(error.message))throw error;}
 }

 }finally{frame.remove();}
}
window.UwUChatCapture111={render:render111,plan:plan111,layout:layout111,metrics:metrics111,prune:prune111,chrome:chrome111,cssSVGURLs:cssSVGURLs111,sizedSVG:sizedSVG111,cssImages:cssImages111,fonts:fonts111,styles:styles111,settle:settle111,normalChrome:normalChrome111,contentBounds:contentBounds111};
})();
