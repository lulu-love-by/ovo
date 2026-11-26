// Shared lightweight reader surfaces. Reader stays a separate home-screen application.
(() => {'use strict';
const E=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
function B(text,fn,cls=''){const b=E('button',text,'r89-button '+cls);b.type='button';b.onclick=async e=>{e.stopPropagation();if(b.disabled)return;b.disabled=true;try{await fn(e);}catch(err){showToast(err.message||String(err));}finally{b.disabled=false;}};return b;}
function sheet(title){const shade=E('div',undefined,'r89-shade'),box=E('section',undefined,'r89-sheet'),head=E('header',undefined,'r89-sheet-head'),body=E('div',undefined,'r89-sheet-body');let onClose=null;const close=()=>{shade.remove();onClose?.();};head.append(E('strong',title),B('×',close,'r89-close'));box.append(head,body);shade.append(box);shade.onclick=e=>{if(e.target===shade)close();};shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');document.body.append(shade);return {box:body,close,set onClose(fn){onClose=fn;}};}
function field(parent,label,value='',type='text'){const row=E('label',undefined,'r89-field'),caption=E('span',label),input=E(type==='textarea'?'textarea':type==='select'?'select':'input');if(!['textarea','select'].includes(type))input.type=type;if(value!==undefined)input.value=value;row.append(caption,input);parent.append(row);return input;}
function select(parent,label,options,value){const input=field(parent,label,undefined,'select');for(const [v,t] of options){const o=E('option',t);o.value=v;input.append(o);}input.value=value;return input;}
async function data(file,limit=8){if(file.size>limit*1024*1024)throw Error('文件请小于'+limit+'MB');return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('文件读取失败'));fr.readAsDataURL(file);});}
window.ReaderUI89={E,B,sheet,field,select,data};
})();
