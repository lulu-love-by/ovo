// Calendar-day duration from recorded transitions; never guesses missing start dates.
(() => {
'use strict';
const active=new Set(['在读','在看','在听']),done=new Set(['读过','看过','听过']);
function day(at,zone){try{return new Intl.DateTimeFormat('sv-SE',{timeZone:zone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);}catch{return new Date(at).toISOString().slice(0,10);}}
function days(a,b){if(!/^\d{4}-\d{2}-\d{2}$/.test(a||'')||!/^\d{4}-\d{2}-\d{2}$/.test(b||''))return null;const n=Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);return n>=0?n+1:null;}
function update(work,status,at=Date.now(),zone='UTC',round=''){
 if(!Number.isFinite(at))at=Date.now();
 const old=work.timing105;let t=old?{...old}:{};
 if(round&&t.round===round&&t.status===status)return t;
 // Late receipt of an older command cannot move a newer timeline backwards.
 if(t.updatedAt>at)return t;
 if(active.has(status)&&!active.has(t.status)){
  if(t.startAt||t.endAt)(work.sessions105??=[]).push({...t});
  if(work.sessions105?.length>50)work.sessions105=work.sessions105.slice(-50);
  t={startAt:at,startDay:day(at,zone),zone};
 }else if(done.has(status)&&!done.has(t.status)){
  t.endAt=at;t.endDay=day(at,t.zone||zone);t.elapsedDays=days(t.startDay,t.endDay);
 }
 t.status=status;t.updatedAt=at;t.round=round;work.timing105=t;return {...t};
}
function describe(t){if(!t)return '';if(t.endDay){return (t.startDay?t.startDay+' → ':'完成于 ')+t.endDay+(t.elapsedDays?' · 历时'+t.elapsedDays+'天':' · 开始日期未记录');}return t.startDay?'开始于 '+t.startDay:'';}
globalThis.UwUReviewTiming105={update,describe,days,day};
})();
