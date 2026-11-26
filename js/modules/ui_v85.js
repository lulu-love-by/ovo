(() => {
'use strict';
let closeMenu;
function popover(anchor,items){if(closeMenu){closeMenu();return;}const menu=document.createElement('div');menu.className='uwu85-popover';menu.setAttribute('role','menu');for(const [text,fn]of items){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{close();Promise.resolve().then(fn).catch(e=>showToast(e.message));};menu.append(b);}document.body.append(menu);const r=anchor.getBoundingClientRect(),box=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-box.width-8,r.right-box.width))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-box.height-8,r.bottom+6))+'px';
 const outside=e=>{if(!menu.contains(e.target)&&!anchor.contains(e.target))close();},key=e=>{if(e.key==='Escape')close();};function close(){menu.remove();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);window.removeEventListener('resize',close);closeMenu=null;}closeMenu=close;setTimeout(()=>document.addEventListener('pointerdown',outside),0);document.addEventListener('keydown',key);window.addEventListener('resize',close);}
// Rebind library references, retain existing manuscript source snapshots unchanged.
async function convert(item,toStyle){
 if(item.type==='folder')throw Error('请转换文件夹中的具体条目');
 const sources=toStyle?db.worldBooks:UwUStories.styles(),target=toStyle?UwUStories.styles():db.worldBooks;
 if(!sources.includes(item)||target.some(x=>x.id===item.id))throw Error('条目已变化或目标存在同ID条目');
 const keys=['worldBooks','uwuWritingStyles','characters','groups','worldBookPresets','uwuShortStories'];
 const snapshot=Object.fromEntries(keys.map(k=>[k,db[k]===undefined?undefined:JSON.parse(JSON.stringify(db[k]))]));
 const fromKey=toStyle?'worldBookIds':'styleIds',toKey=toStyle?'styleIds':'worldBookIds';
 function migrate(v){if(!v||typeof v!=='object')return;if(Array.isArray(v)){for(const x of v)migrate(x);return;}if(Array.isArray(v[fromKey])&&v[fromKey].includes(item.id)){v[fromKey]=v[fromKey].filter(id=>id!==item.id);v[toKey]=[...new Set([...(v[toKey]||[]),item.id])];}if(toStyle&&Array.isArray(v.worldBookExtraIds))v.worldBookExtraIds=v.worldBookExtraIds.filter(id=>id!==item.id);if(!toStyle&&Array.isArray(v.worldBookExtraIds)&&v.worldBookIds?.includes(item.id))v.worldBookExtraIds=[...new Set([...v.worldBookExtraIds,item.id])];if(Array.isArray(v.summaryWorldBookIds)&&toStyle)v.summaryWorldBookIds=v.summaryWorldBookIds.filter(id=>id!==item.id);for(const [k,x]of Object.entries(v))if(!['history','worldbooks','writingStyles','summaryWorldbooks','persona','content'].includes(k))migrate(x);}
 try{const row=toStyle?{...item,parentId:null,group:item.category||'',conversionWorldbook:{position:item.position,depth:item.depth,category:item.category}}:{...item,parentId:null,position:item.conversionWorldbook?.position||'before',depth:item.conversionWorldbook?.depth??100,category:item.group||''};target.push(row);sources.splice(sources.indexOf(item),1);for(const key of keys.slice(2))migrate(db[key]);await saveData(toStyle?{worldBookDeletes:[item.id]}:{});}
 catch(e){for(const key of keys)if(snapshot[key]===undefined)delete db[key];else db[key]=snapshot[key];throw e;}
 renderWorldBookList();UwUWritingStyles.render();showToast(toStyle?'已移动到文风':'已移动到世界书');
}
function setup(){const form=document.getElementById('edit-world-book-form');if(form&&!document.getElementById('wb-to-style')){const b=document.createElement('button');b.id='wb-to-style';b.type='button';b.textContent='移动为文风';b.className='ss-button';b.onclick=async()=>{try{const id=document.getElementById('world-book-id').value||currentEditingWorldBookId;const item=db.worldBooks.find(x=>x.id===id);if(!item)return showToast('请先保存条目');await convert(item,true);switchScreen('world-book-screen');}catch(e){showToast(e.message);}};form.append(b);}
 const min=document.getElementById('setting-auto-reply-interval');if(min&&!document.getElementById('setting-auto-reply-max')){const max=min.cloneNode();max.id='setting-auto-reply-max';max.value=120;min.setAttribute('aria-label','最短间隔（分钟）');max.setAttribute('aria-label','最长间隔（分钟）');min.after(document.createTextNode(' ～ '),max);min.closest('.kkt-item').querySelector('.kkt-item-label').textContent='随机间隔（分钟）';}
}
window.UwU85UI={popover,convert,setup};document.addEventListener('DOMContentLoaded',setup);window.addEventListener('uwu-db-ready',setup);if(document.readyState!=='loading')setup();
})();
