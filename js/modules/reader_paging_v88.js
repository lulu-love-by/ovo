// Bound layout work even when an imported chapter contains an entire novel.
(() => {
'use strict';
function chunks(text){const result=[],paras=String(text||'').split('\n').filter(p=>p!==''),limit=16000;let rows=[],size=0;
 const flush=()=>{if(rows.length){result.push(rows);rows=[];size=0;}};
 paras.forEach((p,index)=>{for(let offset=0;offset<p.length;){let end=Math.min(p.length,offset+2000);if(end<p.length&&/[\uD800-\uDBFF]/.test(p[end-1]))end++;const part=p.slice(offset,end);if(size+part.length>limit||rows.length>=80)flush();rows.push({index,offset,text:part,continues:end<p.length});size+=part.length;offset=end;}});flush();return result.length?result:[[]];
}
function swipe(dx,dy,duration){return duration<750&&Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;}
window.UwUReader88={chunks,swipe};
})();
