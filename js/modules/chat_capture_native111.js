/* Final paint snapshot only: source has already reflowed under its original CSS cascade. */
(()=>{'use strict';
const XHTML='http://www.w3.org/1999/xhtml',SVG='http://www.w3.org/2000/svg',assets=new Map(),photoImages=new Map();
function ios111(){return typeof navigator!=='undefined'&&(/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1));}
function style111(source,target,pseudo,resolved){const style=resolved||source.ownerDocument.defaultView.getComputedStyle(source,pseudo);for(const name of Array.from(style))if(!name.startsWith('--'))target.style.setProperty(name,style.getPropertyValue(name),'important');for(const name of Array.from(target.style))if(name.startsWith('--'))target.style.removeProperty(name);target.style.setProperty('animation','none','important');target.style.setProperty('transition','none','important');return style;}
function text111(content){if(!content||content==='none'||content==='normal')return null;return [...content.matchAll(/(["'])((?:\\.|(?!\1)[\s\S])*)\1/g)].map(m=>m[2].replace(/\\([0-9a-f]{1,6})\s?|\\([\s\S])/gi,(_,hex,char)=>hex?String.fromCodePoint(parseInt(hex,16)):char)).join('');}
function pseudo111(source,target,kind){const doc=target.ownerDocument,style=source.ownerDocument.defaultView.getComputedStyle(source,kind);if(style.display==='none'||style.content==='none'||style.content==='normal'||!style.content)return;const span=doc.createElementNS(XHTML,'span');style111(source,span,kind,style);span.style.setProperty('content','normal','important');span.setAttribute('data-capture-pseudo111',kind);const url=style.content.match(/^url\(["']?([\s\S]*?)["']?\)$/);if(url){const img=doc.createElementNS(XHTML,'img');img.setAttribute('src',url[1]);span.append(img);}else{const text=text111(style.content);if(text)span.textContent=text;}if(kind==='::before')target.prepend(span);else target.append(span);}
async function data111(url){if(!url||url.startsWith('data:')||url.startsWith('#'))return url;if(!assets.has(url))assets.set(url,(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{signal:controller.signal,cache:'force-cache',uwuNative97:true});if(!response.ok)throw Error('HTTP '+response.status);const blob=await response.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}finally{clearTimeout(timer);}})());try{return await assets.get(url);}catch(error){assets.delete(url);throw Error('截图图片无法读取，请检查图片地址或跨域权限：'+error.message);}}
async function decode111(image){if(typeof image.decode==='function')try{await image.decode();}catch{} }
async function photo111(url){
 if(!photoImages.has(url)){
  if(photoImages.size>=16)photoImages.delete(photoImages.keys().next().value);
  photoImages.set(url,(async()=>{const image=new Image(),src=await data111(url);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('截图头像加载超时')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('截图头像原图读取失败'));};image.src=src;});await decode111(image);if(!(image.naturalWidth>0&&image.naturalHeight>0))throw Error('截图头像原图为空');return image;})());
 }
 try{return await photoImages.get(url);}catch(error){photoImages.delete(url);throw error;}
}
function photoBox111(source,style){
 const box=source.getBoundingClientRect(),v=name=>style.getPropertyValue(name),number=name=>parseFloat(v(name))||0,sx=box.width/(source.offsetWidth||box.width||1),sy=box.height/(source.offsetHeight||box.height||1);
 const left=(number('border-left-width')+number('padding-left'))*sx,right=(number('border-right-width')+number('padding-right'))*sx,top=(number('border-top-width')+number('padding-top'))*sy,bottom=(number('border-bottom-width')+number('padding-bottom'))*sy;
 const radius=(name,dx,dy)=>{const parts=(v(name)||'0').split(/\s+/),size=(part,total,scale)=>part.endsWith('%')?parseFloat(part)*total/100:(parseFloat(part)||0)*scale;return [Math.max(0,size(parts[0],box.width,sx)-dx),Math.max(0,size(parts[1]||parts[0],box.height,sy)-dy)];};
 let opacity=1;for(let node=source;node;node=node.parentElement){const alpha=parseFloat(node.ownerDocument.defaultView.getComputedStyle(node).opacity);if(Number.isFinite(alpha))opacity*=alpha;}
 return {left:box.left+left,top:box.top+top,width:Math.max(0,box.width-left-right),height:Math.max(0,box.height-top-bottom),fit:v('object-fit')||'fill',position:v('object-position')||'50% 50%',opacity,radii:[radius('border-top-left-radius',left,top),radius('border-top-right-radius',right,top),radius('border-bottom-right-radius',right,bottom),radius('border-bottom-left-radius',left,bottom)]};
}
function position111(value,free){if(value==='left'||value==='top')return 0;if(value==='right'||value==='bottom')return free;if(value==='center')return free/2;const calc=value.match(/^calc\(([+-]?[\d.]+)%\s*([+-])\s*([\d.]+)px\)$/);if(calc)return free*Number(calc[1])/100+(calc[2]==='-'?-1:1)*Number(calc[3]);return value.endsWith('%')?free*(parseFloat(value)||0)/100:parseFloat(value)||0;}
function paintPhotos111(context,photos,root,y,height,scale){
 for(const photo of photos){const x=photo.left-root.left,top=photo.top-root.top-y,w=photo.width,h=photo.height;if(w<=0||h<=0||top+h<=0||top>=height||photo.opacity<=0)continue;
  context.save();try{context.scale(scale,scale);context.translate(x,top);context.globalAlpha=photo.opacity;
   const radii=photo.radii.map(([rx,ry])=>[Math.min(w/2,rx),Math.min(h/2,ry)]),[a,b,c,d]=radii;
   context.beginPath();context.moveTo(a[0],0);context.lineTo(w-b[0],0);context.quadraticCurveTo(w,0,w,b[1]);context.lineTo(w,h-c[1]);context.quadraticCurveTo(w,h,w-c[0],h);context.lineTo(d[0],h);context.quadraticCurveTo(0,h,0,h-d[1]);context.lineTo(0,a[1]);context.quadraticCurveTo(0,0,a[0],0);context.closePath();context.clip();
   const nw=photo.image.naturalWidth,nh=photo.image.naturalHeight;let dw=w,dh=h;if(photo.fit!=='fill'){let ratio=photo.fit==='cover'?Math.max(w/nw,h/nh):photo.fit==='none'?1:Math.min(w/nw,h/nh);if(photo.fit==='scale-down')ratio=Math.min(1,ratio);dw=nw*ratio;dh=nh*ratio;}
   const parts=photo.position.match(/calc\([^)]*\)|[^\s]+/g)||['50%','50%'];context.drawImage(photo.image,position111(parts[0],w-dw),position111(parts[1]||'50%',h-dh),dw,dh);
  }finally{context.restore();}
 }
}
const urls111=/url\(\s*(?:(["'])([\s\S]*?)\1|([^)]*))\s*\)/gi;
async function embed111(root,base){await Promise.all([...root.querySelectorAll('*'),root].map(async node=>{if(node.localName==='img'){const src=node.getAttribute('src');if(src)node.setAttribute('src',await data111(src.startsWith('data:')?src:new URL(src,base).href));node.removeAttribute('srcset');node.removeAttribute('sizes');node.removeAttribute('loading');}
 const css=node.getAttribute('style');if(!css)return;let rewritten=css;for(const match of [...css.matchAll(urls111)]){const url=(match[2]||match[3]||'').trim();if(!url||url.startsWith('data:')||url.startsWith('#'))continue;rewritten=rewritten.replace(match[0],'url("'+await data111(new URL(url,base).href)+'")');}if(rewritten!==css)node.setAttribute('style',rewritten);
}));}
function compact111(root,head,doc){
 // The final document contains only frozen paint styles, so identical inline
 // declarations can safely share one rule without changing the layout cascade.
 const groups=new Map();for(const node of [root,...root.querySelectorAll('*')]){if(node.localName==='style')continue;const css=node.getAttribute('style');if(!css||css.length<256)continue;if(!groups.has(css))groups.set(css,[]);groups.get(css).push(node);}
 const rules=[];let count=0;for(const [css,nodes]of groups){if(nodes.length<2)continue;const id=String(count++);rules.push('[data-capture-style111="'+id+'"]{'+css+'}');for(const node of nodes){node.removeAttribute('style');node.setAttribute('data-capture-style111',id);}}
 if(rules.length){const style=doc.createElementNS(XHTML,'style');style.textContent=rules.join('\n');head.append(style);}return count;
}
async function snapshot111(root,{fontCSS=''}={}){const imageJobs=[],photos=[],sourceDoc=root.ownerDocument,doc=document.implementation.createDocument(XHTML,'html',null),html=doc.documentElement,head=doc.createElementNS(XHTML,'head'),body=doc.createElementNS(XHTML,'body');html.append(head,body);style111(sourceDoc.documentElement,html);style111(sourceDoc.body,body);const font=doc.createElementNS(XHTML,'style');font.textContent=fontCSS;head.append(font);
 let parent=body;const chain=[];for(let el=root.parentElement;el&&el!==sourceDoc.body;el=el.parentElement)chain.unshift(el);for(const source of chain){const clone=doc.importNode(source,false);style111(source,clone);parent.append(clone);parent=clone;}
 function cloneNode(source){if(source.nodeType===3)return doc.createTextNode(source.nodeValue||'');if(source.nodeType!==1||['SCRIPT','STYLE','LINK','NOSCRIPT'].includes(source.tagName))return null;const style=sourceDoc.defaultView.getComputedStyle(source);if(style.display==='none')return null;const avatar=ios111()&&source.localName==='img'&&/\bmessage-avatar\b/.test(source.getAttribute('class')||'');const copy=doc.importNode(source,false);for(const attr of [...copy.attributes])if(/^on/i.test(attr.name))copy.removeAttribute(attr.name);style111(source,copy,null,style);if(source.localName==='img'){const src=source.currentSrc||source.getAttribute('src');if(src)copy.setAttribute('src',src);if(avatar&&style.visibility!=='hidden'&&style.opacity!=='0'&&src){const url=src.startsWith('data:')?src:new URL(src,sourceDoc.baseURI).href,geometry=photoBox111(source,style);const photo={...geometry};photos.push(photo);imageJobs.push(photo111(url).then(image=>photo.image=image));}}if(source.localName==='input')copy.setAttribute('value',source.value||'');if(source.localName==='textarea')copy.textContent=source.value||'';
 if(style.opacity==='0')return copy; // Preserve its measured box without serializing an invisible message subtree.
 for(const child of source.childNodes){const next=cloneNode(child);if(next)copy.append(next);}pseudo111(source,copy,'::before');pseudo111(source,copy,'::after');return copy;}
 const copy=cloneNode(root);if(!copy)throw Error('聊天页面当前不可见');parent.append(copy);await Promise.all(imageJobs);await embed111(html,sourceDoc.baseURI);compact111(html,head,doc);
 const box=root.getBoundingClientRect(),viewportWidth=Math.max(sourceDoc.documentElement.clientWidth,box.right,box.width),viewportHeight=Math.max(sourceDoc.documentElement.clientHeight,box.bottom,box.height),serialized=new XMLSerializer().serializeToString(html),encoded=encodeURIComponent(serialized);
 return async(y,height,scale)=>{
 const pixelWidth=Math.ceil(box.width*scale),pixelHeight=Math.ceil(height*scale),ios=ios111();
 // WebKit may composite HTML layers without applying the outer SVG viewBox scale.
 // Keep its SVG viewport 1:1 and apply crop/scale inside the HTML coordinate space.
 const wrapper=ios?'<div xmlns="'+XHTML+'" style="width:'+viewportWidth+'px;height:'+viewportHeight+'px;transform-origin:0 0;transform:matrix('+scale+',0,0,'+scale+','+(-box.left*scale)+','+(-(box.top+y)*scale)+');">':'';
 const start='<svg xmlns="'+SVG+'" width="'+pixelWidth+'" height="'+pixelHeight+'" viewBox="0 0 '+(ios?pixelWidth:box.width)+' '+(ios?pixelHeight:height)+'"><foreignObject x="'+(ios?0:-box.left)+'" y="'+(ios?0:-box.top-y)+'" width="'+(ios?Math.max(pixelWidth,viewportWidth*scale):viewportWidth)+'" height="'+(ios?Math.max(pixelHeight,viewportHeight*scale):viewportHeight)+'">'+wrapper;
 const end=(ios?'</div>':'')+'</foreignObject></svg>';
 const image=new Image(),url='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(start)+encoded+encodeURIComponent(end);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('高清截图渲染超时')),20000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('当前环境无法渲染高清聊天截图'));};image.src=url;});
 if(ios)await decode111(image);
 const canvas=document.createElement('canvas');canvas.width=pixelWidth;canvas.height=pixelHeight;const context=canvas.getContext('2d');if(!context)throw Error('设备无法创建高清截图');context.drawImage(image,0,0,canvas.width,canvas.height);if(ios)paintPhotos111(context,photos,box,y,height,scale);return canvas;
 };
}
window.UwUChatCaptureNative111={snapshot:snapshot111,text:text111,isIOS:ios111,compact:compact111,photo:photo111,photoBox:photoBox111,paintPhotos:paintPhotos111};
})();
