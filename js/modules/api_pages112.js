/* Two API pages; moves live controls without replacing their values or listeners. */
(() => {
 'use strict';
 // Length diagnostics are local metadata only; never store text, API keys or media data.
 const recent=new Map();let lastTiming113=null;
 function beginTiming113(){
  const started=performance.now();let previous=started;
  const record={time:Date.now(),steps:[],submitted:false};lastTiming113=record;
  return {mark(name,submitted=false){const at=performance.now();record.steps.push({name,ms:at-previous});previous=at;record.total=at-started;if(submitted)record.submitted=true;}};
 }
 function timingReport113(){const r=lastTiming113;if(!r)return '';return ['提交前耗时（本次点击接收信息）',new Date(r.time).toLocaleString(),...r.steps.map(s=>s.name+'：'+(s.ms/1000).toFixed(3)+' 秒'),'合计：'+((r.total||0)/1000).toFixed(3)+' 秒',r.submitted?'已开始提交请求；不包含模型生成与服务端排队时间。':'尚未到达请求提交，以下为已完成步骤。',''].join('\n');}

 const size=value=>typeof value==='string'?value.length:0;
 function start(chat){
  const sections=[];let previous=0;
  return {mark(name,text){const next=size(text);sections.push({name,chars:Math.max(0,next-previous)});previous=next;},capture(body,rows){
   let chars=0,media=0;
   const parts=list=>{for(const p of list||[]){if(typeof p.text==='string')chars+=p.text.length;else if(p.type==='image_url'||p.inline_data||p.inlineData||p.file_data||p.type==='input_audio'||p.input_audio)media++;}};
   if(body.messages)for(const m of body.messages){if(typeof m.content==='string')chars+=m.content.length;else parts(m.content);}
   else {parts((body.system_instruction||body.systemInstruction)?.parts);for(const m of body.contents||[])parts(m.parts);}
   const key=String(chat.id)+':'+String(chat.activeArchiveId||'');const old=recent.get(key);
   const rest=Math.max(0,chars-sections.reduce((n,s)=>n+s.chars,0));if(rest)sections.push({name:'聊天记录、时间标记及后置预设',chars:rest});
   const record={name:chat.remarkName||chat.name||chat.realName||'当前聊天',time:Date.now(),chars,media,messages:rows.length,sections:sections.filter(s=>s.chars),delta:old?chars-old.chars:null};
   recent.delete(key);recent.set(key,record);if(recent.size>20)recent.delete(recent.keys().next().value);
   console.table(record.sections);console.info('[聊天输入构成112]',{textCharacters:chars,mediaParts:media,historyMessages:rows.length,changeFromPrevious:record.delta});
  }};
 }
 function report(){
  const r=Array.from(recent.values()).at(-1);if(!r)return timingReport113()+'下一次聊天请求发出后显示输入构成。';
  const lines=[r.name+' · '+new Date(r.time).toLocaleString(), '最终请求文本：'+r.chars+' 字符', '相比该聊天上次请求：'+(r.delta===null?'暂无对比':(r.delta>=0?'+':'')+r.delta+' 字符'),'聊天记录：'+r.messages+' 条；媒体附件：'+r.media+' 项','',...r.sections.map(s=>s.name+'：'+s.chars+' 字符'),'','以上按实际文本长度统计，并非模型计费 token 数；文本、图片和音频的计费以接口返回为准。'];return timingReport113()+lines.join('\n');
 }
 window.UwUInputAudit112={start,report,beginTiming113};

 let installed=false;
 function install(){
  const form=document.getElementById('api-form'),main=document.getElementById('api-main-panel112'),other=document.getElementById('api-connections-panel112');
  if(!form||!main||!other||installed)return;
  installed=true;
  const host=form.parentElement,presets=document.getElementById('api-presets-group112');
  if(presets)main.append(presets);
  const links=document.createElement('div');links.id='api-connection-links112';links.className='kkt-group api-links112';other.prepend(links);
  function route(){
   for(const group of Array.from(host.children)){
    if(group===form||group.classList.contains('api-tabs112')||!group.classList.contains('kkt-group'))continue;
    if(group.id==='sy-api-settings'){other.insertBefore(group,links.nextSibling);compactCover(group);}
    else {group.classList.add('api-connection-entry112');links.append(group);}
   }
  }
  function compactCover(group){
   group.style.removeProperty('margin');group.style.removeProperty('padding');
   const actions=document.createElement('div');actions.className='api-actions112';
   for(const b of Array.from(group.children).filter(n=>n.tagName==='BUTTON')){b.classList.add('btn','btn-secondary');actions.append(b);}
   const guide=group.querySelector('details');if(guide)group.insertBefore(actions,guide);else group.append(actions);
  }
  route();new MutationObserver(route).observe(host,{childList:true});
  const tabs=[document.getElementById('api-tab-main112'),document.getElementById('api-tab-connections112')];
  function select(i){
   [main,other].forEach((p,n)=>p.hidden=n!==i);
   tabs.forEach((t,n)=>{t.setAttribute('aria-selected',String(n===i));t.tabIndex=n===i?0:-1;});
   const scroll=form.closest('main');if(scroll)scroll.scrollTop=0;
  }
  tabs.forEach((t,i)=>{t.onclick=()=>select(i);t.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?1:1-i;select(n);tabs[n].focus();};});
  // Only the moved API controls retain explicit form ownership; connection services save independently.
  const stats=document.createElement('div');stats.className='kkt-group api-input-card113';
  const b=document.createElement('button');b.type='button';b.className='kkt-item api-input-toggle113';b.id='api-input-toggle113';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','api-input-report113');const label=document.createElement('span');label.textContent='查看最近聊天输入';const arrow=document.createElement('span');arrow.className='api-input-arrow113';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';b.append(label,arrow);
  const out=document.createElement('pre');out.className='api-input-report112';out.id='api-input-report113';out.hidden=true;
  b.onclick=()=>{out.hidden=!out.hidden;b.setAttribute('aria-expanded',String(!out.hidden));out.textContent=window.UwUInputAudit112?.report()||'下一次聊天请求发出后显示输入构成。';};stats.append(b,out);other.append(stats);
 }
 window.UwUApiPages112={install};
 document.addEventListener('DOMContentLoaded',install);
})();
