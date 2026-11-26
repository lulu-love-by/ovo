/* One visible endpoint for range selection; independent controls avoid beauty pseudo-elements. */
(()=>{'use strict';
let anchor=null,button=null,area=null,root=null,frame=0,observer=null;
function between(ids,start,end){const a=ids.indexOf(start),b=ids.indexOf(end);return a<0||b<0?[]:ids.slice(Math.min(a,b),Math.max(a,b)+1);}
function endpoint(rows,top,bottom){const visible=rows.filter(row=>row.bottom>top&&row.top<bottom);return visible.filter(row=>row.bottom<=bottom).at(-1)||visible[0]||null;}
function center(row,avatar,bubble,height=36){return avatar&&avatar.height>0?avatar.top-row.top+avatar.height/2:(bubble?.top??row.top)-row.top+height/2;}
function rows(){return [...area.querySelectorAll('.message-wrapper[data-id]')].filter(row=>row.dataset.id);}
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;refresh();});}
function setup(){ /* Selection appearance is documented in css/chat.css [111-18]. */ }
function enter(){
 exit();setup();root=document.getElementById('chat-room-screen');area=document.getElementById('message-area');if(!root||!area)return;
 button=document.createElement('button');button.id='uwu-range-select111';button.type='button';button.textContent='↑ 选择到这里';button.addEventListener('click',event=>{event.stopPropagation();apply();});root.append(button);
 area.addEventListener('scroll',schedule,{passive:true});area.addEventListener('load',schedule,true);window.addEventListener('resize',schedule);
 if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);observer.observe(area);observer.observe(root);}refresh();schedule();
}
function refresh(){
 if(!isInMultiSelectMode||!area||!button)return;
 if(!anchor||!selectedMessageIds.has(anchor))anchor=selectedMessageIds.values().next().value||null;
 const list=rows();for(const row of list){
  let circle=row.querySelector('.uwu-selection-circle111');if(!circle){circle=document.createElement('button');circle.type='button';circle.className='uwu-selection-circle111';circle.textContent='✓';circle.setAttribute('role','checkbox');circle.setAttribute('aria-label','选择消息');circle.addEventListener('click',event=>{event.stopPropagation();toggleMessageSelection(row.dataset.id);});row.prepend(circle);}
  const chosen=selectedMessageIds.has(row.dataset.id);row.classList.toggle('multi-select-selected',chosen);circle.setAttribute('aria-checked',String(chosen));
 }
 // Measure after every row has its selection gutter, so both sides align identically.
 for(const row of list){const avatar=row.querySelector('.message-avatar'),box=avatar?.getBoundingClientRect(),bubble=row.querySelector('.message-bubble-row')?.getBoundingClientRect(),height=avatar?parseFloat(getComputedStyle(avatar).height)||36:36;row.style.setProperty('--uwu-select-y111',center(row.getBoundingClientRect(),box,bubble,height)+'px');}
 const bar=document.getElementById(currentMultiSelectMode==='capture'?'capture-mode-bar':'multi-select-bar'),barBox=bar?.getBoundingClientRect(),rootBox=root.getBoundingClientRect();const bottom=barBox?.height?Math.max(12,rootBox.bottom-barBox.top+10):12;button.style.setProperty('--uwu-range-bottom111',bottom+'px');button.disabled=!anchor;
}
function apply(){
 if(!isInMultiSelectMode||!anchor||!area)return;
 const list=rows(),view=area.getBoundingClientRect(),edge=Math.min(view.bottom,button.getBoundingClientRect().top-6),last=endpoint(list.map(row=>({id:row.dataset.id,...rect(row)})),view.top,edge);
 if(!last)return showToast('当前位置没有可选择的消息');const ids=between(list.map(row=>row.dataset.id),anchor,last.id);if(!ids.length)return showToast('起始消息未载入，请重新选择起点');
 ids.forEach(id=>selectedMessageIds.add(id));refreshMultiSelectCount111();refresh();
}
function rect(row){const box=row.getBoundingClientRect();return {top:box.top,bottom:box.bottom};}
function exit(){if(frame){cancelAnimationFrame(frame);frame=0;}observer?.disconnect();observer=null;if(area){area.removeEventListener('scroll',schedule);area.removeEventListener('load',schedule,true);area.querySelectorAll('.uwu-selection-circle111').forEach(node=>node.remove());area.querySelectorAll('.message-wrapper[data-id]').forEach(row=>row.style.removeProperty('--uwu-select-y111'));}window.removeEventListener('resize',schedule);button?.remove();button=area=root=null;anchor=null;}
window.UwURangeSelect111={enter,exit,refresh,apply,between,endpoint,center};
})();
