// A fresh clock and explicit elapsed intervals, never a timer that triggers a model request.
const TimeContinuity110 = (() => {
 const valid=t=>Number.isFinite(Number(t))&&Number(t)>0;
 const stamp=t=>new Date(Number(t)).toISOString();
 // All history clocks use char's timezone; timezone information is supplied once.
 function historyZone(zones){return zones?.char||zones?.user||Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}
 function historyStamp(t,zones){
  if(!valid(t))return '';
  const zone=historyZone(zones);let v;
  try{v=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(Number(t));}
  catch{v=new Intl.DateTimeFormat('sv-SE',{timeZone:'UTC',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(Number(t));}
  const parts=Object.fromEntries(v.map(p=>[p.type,p.value]));return parts.month+'-'+parts.day+' '+parts.hour+':'+parts.minute;
 }
 function marker(t,zones){const value=historyStamp(t,zones);return value?'[system: '+value+']\n':'';}
 function historyMarkers(rows,zones){
  let previous=null,hasTime=false;
  return rows.map(m=>{
   if(!['user','assistant'].includes(m.role)||m.isThinking||m.isContextDisabled)return '';
   const changed=!previous||m.role!==previous.role||m.senderId!==previous.senderId||m.role==='assistant'&&m.roundId&&m.roundId!==previous.roundId;
   if(changed)hasTime=false;previous=m;
   if(hasTime||!valid(m.timestamp))return '';
   hasTime=true;return marker(m.timestamp,zones);
  });
 }
 const zoneRule='依据双方所在地的当地时间理解日期、时段与事情进度，仅作为背景信息使用。表达自然，不主动报时或反复强调双方时差；涉及具体时段且可能产生歧义时，才简短说明归属。';
 function localTimes(zones,at){
  if(!valid(at))return {};
  const out={};for(const side of ['char','user']){const zone=zones?.[side];if(!zone)continue;try{out[side]={timeZone:zone,localTime:new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(Number(at))};}catch{}}
  return out;
 }
 function zonesForChat(chat){
  const zones={};for(const side of ['char','user']){
   const v=globalThis.UwULocation?.at(chat,side);
   if(v&&!v.unknown&&(v.configured||side==='user'))zones[side]=v.timeZone;
   else if(!v)zones[side]=chat?.locationSettings?.[side]?.timeZone;
  }return zones;
 }
 function fromHistory(rows,zones){
  const out=zones?{zones}:{};
  for(const m of rows||[]){if(m.isThinking||m.isWithdrawn||m.isContextDisabled||!valid(m.timestamp))continue;
   if(m.role==='user')out.userAt=Number(m.timestamp);
   else if(m.role==='assistant')out.charAt=Number(m.timestamp);
  }
  return out;
 }
 function elapsed(now,at){
  if(now<at)return '消息时间晚于当前时刻，不可当作已过去的时长';
  let n=Math.floor((now-at)/1000);if(n<1)return '不足1秒';
  const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;
  return (h?h+'小时':'')+(m?m+'分钟':'')+(s?s+'秒':'');
 }
 function render(meta,now=Date.now()){
  const zone=historyZone(meta.zones),local=localTimes({char:zone},now).char;
  const lines=['<真实时间连续性110>','本轮真实时刻（char当地）：'+(local?.localTime||stamp(now))+'。',
   '历史消息的[system: 月-日 时:分]统一使用char当地时间（'+zone+'），每轮仅第一条附带时间。'];
  for(const [key,label]of [['userAt','user上一条消息'],['charAt','你上一条消息']])if(valid(meta[key]))lines.push(label+'至本轮实际间隔：'+elapsed(now,Number(meta[key]))+'。');
  lines.push('[system: 结合实际间隔与合理耗时，判断上下文中双方提到的事情进展，不因新一轮回复默认已完成；仍在进行时，可自然分享其中的见闻与感受。]','</真实时间连续性110>');
  return lines.join('\n');
 }
 function refresh(input,now=Date.now()){
  const meta=input.meta?.timeContext110;if(!meta)return input;
  if(!meta.zones&&input.meta?.location105){meta.zones=Object.fromEntries(['char','user'].map(side=>[side,input.meta.location105[side]?.timeZone||input.meta.location105[side]?.geo105?.timezone]));}
  const block=render(meta,now),re=/<真实时间连续性110>[\s\S]*?<\/真实时间连续性110>/g;
  if(input.provider==='gemini'){
   const sys=input.body.system_instruction??={parts:[]};let inserted=false;
   for(const p of sys.parts||[]){if(typeof p.text!=='string')continue;p.text=p.text.replace(re,'').trim();if(!inserted){p.text+='\n'+block;inserted=true;}}
   if(!inserted)(sys.parts??=[]).push({text:block});
  }else{
   const messages=input.body.messages;let inserted=false;
   for(const m of messages||[]){if(m.role!=='system'||typeof m.content!=='string')continue;m.content=m.content.replace(re,'').trim();if(!inserted){m.content+='\n'+block;inserted=true;}}
   if(!inserted)messages.unshift({role:'system',content:block});
  }
  return input;
 }
 return {stamp,marker,historyStamp,historyMarkers,historyZone,fromHistory,render,refresh,localTimes,zonesForChat,zoneRule};
})();
window.UwUTimeContinuity110=TimeContinuity110;
