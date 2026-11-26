(()=>{'use strict';
// Backend contract shared by scheduled assets and v109 frontend durable tasks.
// Wallet edits, locks, preview acceptance and font bytes remain frontend-owned.
const assetPrompt109=`<资产与活动>
依据人设、世界书、所选记忆、聊天上下文及已有资产与流水，生成指定时段内的生活活动、收入、支出和资产变化，体现角色的职业、经济能力、喜好与当时安排。活动不必都与对方有关，也不必都产生收支。
支出可包括餐饮/交通/居住/日用/服饰/出行社交/房车养护/投资收藏等；收入可包括工资/工作报酬/经营回款/分红/租金/利息等，依角色实际情况生成。
聊天和记忆中已明确的活动、收支及其时间、金额等细节须据实保留，缺失信息结合当时情境合理补全；未提及的合理活动与收支，也须根据人设、世界书、当天上下文及已有资产自然补充，不因未报备而遗漏。项目、金额和频率须符合角色的职业、经济能力、生活习惯及当时安排，不机械套用固定模板；合理推定的收支信息在备注中注明估算。
每笔收支按实际发生或到账时间记录，精确到年月日、时、分。已知时间据实保留，缺失部分结合活动经过、当天安排及结算规律推定，不统一填为零点或固定时间，不直接用聊天发送时间、日记创建时间代替事件时间。收入遵循结算周期，不将年收入一次入账，不强制每天有收入；初始存款不能代替当期收入，不将计划、意愿或待收款记为实际收支。
首次建立符合人设的资产，取得日期结合角色经历合理确定，后续保留并承接已有记录。购入、出售、赠予等变化须有合理原因和经过，不随机替换原有资产；专项款按约定用途记录，自定义板块按其说明补充。近况兼顾工作、收入相关进展与日常生活，涉及到账的活动同时记账一次。
核对已有流水、实际交易及保留记录，不为同一事件重复记账，不重复计算初始余额与当期收支。收支自然发生，不为凑数生成记录，不强制花完预算、保持盈利或收支成对。
补充生成保留全部已有内容，只新增遗漏记录，允许继续补充已生成过的时段。重新生成仅重做指定时段和所选项目，保留锁定内容及实际交易，其他时段不变。遵循本次生成要求，不与已知事实及保留内容冲突。
仅输出本次需要新增或替换的记录，按指定格式返回。
</资产与活动>`;
const reviewPrompt109='书影音记录不局限于聊天或记忆中提到过的作品，也可根据角色的人设、兴趣、生活经历及当时情境，自然补充其阅读、观看或收听的其他作品，所选作品须真实存在并符合角色偏好。影视板块统一收录电影/电视剧/纪录片/动画/综艺/短片/其他，须准确标明作品类型，不混称。保留现有协议的type:movie作为影视板块，另用workType标明具体类型；书籍为type:book，音乐为type:music。';
const assetAddPrompt109='按用户指令补全资产，可同时包含车、房等多项，拆成独立资产并归入提供的板块。明确提供的信息不得改写，其余依人设、绑定世界书和上下文合理补全。existing仅作参考，不重复添加已有资产。仅生成可编辑预览，不自行确认、扣款或执行资产处置。每项标明recordMode:existing或purchase，已有资产补录不再扣购入款，新购入是否记账由用户逐项确认。';
const zoneCache109=new Map(),formatCache109=new Map();
const validZone=z=>{if(!z)return false;if(zoneCache109.has(z))return zoneCache109.get(z);let ok;try{new Intl.DateTimeFormat('en',{timeZone:z}).format();ok=true;}catch{ok=false;}if(zoneCache109.size>64)zoneCache109.clear();zoneCache109.set(z,ok);return ok;};
function formatter109(zone,clock=false){const key=zone+':'+clock;let f=formatCache109.get(key);if(!f){if(formatCache109.size>64)formatCache109.clear();f=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',...(clock?{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}:{})});formatCache109.set(key,f);}return f;}
function taskZone109(s){return validZone(s.timeZone)?s.timeZone:validZone(s.meta?.timeZone)?s.meta.timeZone:null;}
function localDay109(at,s={}){at=messageStamp109(at);if(at===null)throw Error('来源时间无效');const zone=taskZone109(s);if(zone)return formatter109(zone).format(at);return new Date(at-(Number(s.offset)||0)*60000).toISOString().slice(0,10);}
function shiftDay109(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function previousRange109(s,due){const day=localDay109(due,s);let start,end;if(s.frequency==='weekly'){const weekday=new Date(day+'T12:00:00Z').getUTCDay(),monday=shiftDay109(day,-((weekday+6)%7));start=shiftDay109(monday,-7);end=shiftDay109(monday,-1);}else if(s.frequency==='monthly'){end=shiftDay109(day.slice(0,7)+'-01',-1);start=end.slice(0,7)+'-01';}else{start=end=shiftDay109(day,-1);}return {mode:'activity',start,end,memoryIds:s.meta?.memoryIds||[]};}
function localInstant109(day,time,s){const [h,m]=time.split(':').map(Number),base=Date.parse(day+'T'+time+':00Z'),zone=taskZone109(s);if(!zone)return base+(Number(s.offset)||0)*60000;let at=base;const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<5;i++){const parts=Object.fromEntries(fmt.formatToParts(at).map(p=>[p.type,p.value])),wall=Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second),delta=base-wall;if(!delta)return at;at+=delta;}
// A nonexistent DST clock time moves to the first valid local minute after it.
const target=day+' '+time;let best=null;for(let t=base-16*3600000;t<=base+16*3600000;t+=60000){const wall=fmt.format(t).slice(0,16);if(wall>=target&&wall.slice(0,10)===day){best=t;break;}}if(best!==null)return best;throw Error('无法确定角色当地定时时间');}
function nextAssetTime109(s,after=Date.now()){const time=String(s.time||'20:00');if(!/^\d{2}:\d{2}$/.test(time)||+time.slice(0,2)>23||+time.slice(3)>59)throw Error('定时时间无效');let day=localDay109(after,s);if(s.frequency==='weekly'){const wd=new Date(day+'T12:00:00Z').getUTCDay();day=shiftDay109(day,(8-wd)%7);}else if(s.frequency==='monthly')day=day.slice(0,7)+'-01';let at=localInstant109(day,time,s);if(at<=after){if(s.frequency==='monthly'){const d=new Date(day+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);day=d.toISOString().slice(0,10);}else day=shiftDay109(day,s.frequency==='weekly'?7:1);at=localInstant109(day,time,s);}return at;}
function messageStamp109(value){if(value===null||value===undefined||value===''||typeof value==='boolean')return null;const n=typeof value==='number'?value:Number.isFinite(Number(value))?Number(value):Date.parse(value);return Number.isFinite(n)&&Number.isFinite(new Date(n).getTime())?n:null;}
function journalRange109(j,s){const a=messageStamp109(j.sourceTimeStart??j.periodStart),b=messageStamp109(j.sourceTimeEnd??j.periodEnd);return a!==null&&b!==null&&!j.timeRangeUnknown?[localDay109(a,s),localDay109(b,s)]:null;}
function assetContext109(catalog,range,s={}){
 const journals=(catalog.journals||[]).filter(j=>j.id&&typeof j.content==='string'&&(j.referenceOnly109||j.content.trim())),map=new Map(journals.map(j=>[String(j.id),j])),messages=catalog.messages||[],rawMap=new Map(messages.map(m=>[String(m.id),m]));
 const childCache=new Map(),coverageCache=new Map(),descCache=new Map(),visited=new Set();
 const children=j=>{if(!childCache.has(j.id))childCache.set(j.id,(j.childIds||[]).map(id=>map.get(String(id))).filter(Boolean));return childCache.get(j.id);};
 const coverage=j=>{if(!coverageCache.has(j.id))coverageCache.set(j.id,[...new Set([...(j.sourceIds||[]).map(String),...(j.coverage||[]).map(id=>{const m=/^\d+:(.+)$/.exec(String(id));return m?m[1]:null;}).filter(Boolean)])]);return coverageCache.get(j.id);};
 function effectiveRange(j,path=new Set()){const own=journalRange109(j,s);if(own)return own;if(path.has(String(j.id)))return null;const next=new Set(path).add(String(j.id)),rs=children(j).map(c=>effectiveRange(c,next)).filter(Boolean);return rs.length?[rs.map(r=>r[0]).sort()[0],rs.map(r=>r[1]).sort().at(-1)]:null;}
 const intersects=j=>{if(j.referenceOnly109)return false;const r=effectiveRange(j);return r&&r[0]<=range.end&&r[1]>=range.start;};
 const mode=catalog.mode||'small',selected=new Set((catalog.selectedIds||[]).map(String));
 function descendantCoverage(j,path=new Set()){if(path.has(String(j.id)))return [];if(descCache.has(j.id))return descCache.get(j.id);const next=new Set(path).add(String(j.id)),ids=[...new Set([...coverage(j),...children(j).flatMap(c=>descendantCoverage(c,next))])];descCache.set(j.id,ids);return ids;}
 const visit=(j,path=new Set())=>{if(path.has(String(j.id))||visited.has(j.id))return;visited.add(j.id);const next=new Set(path).add(String(j.id)),kids=children(j);if(mode==='small'&&kids.length){for(const c of kids)visit(c,next);const covered=new Set(kids.flatMap(k=>descendantCoverage(k)));const missingChild=(j.childIds||[]).some(id=>!map.has(String(id)));if(intersects(j)&&(coverage(j).some(id=>!covered.has(id))||missingChild))selected.add(String(j.id));}else if(intersects(j))selected.add(String(j.id));};
 if(mode==='small')for(const j of journals)visit(j);
 else if(mode==='big'){const childIds=new Set(journals.filter(j=>j.isMerged).flatMap(j=>j.childIds||[]).map(String));for(const j of journals)if(!childIds.has(String(j.id)))visit(j);}
 else if(!['manual','none'].includes(mode))throw Error('记忆选择模式无效');
 if(mode==='none')selected.clear();for(const id of catalog.excludedIds||[])selected.delete(String(id));
 const chosen=journals.filter(j=>!j.referenceOnly109&&selected.has(String(j.id))),covered=new Set();
 const cover=(j,path=new Set())=>{if(path.has(String(j.id))||j.needsUpdate||j.sourceUnverified||j.sourceIndependent)return;const next=new Set(path).add(String(j.id));for(const id of coverage(j)){const raw=rawMap.get(String(id)),saved=j.sourcePrints?.[id];if(raw&&saved&&raw.sourcePrint109&&saved!==raw.sourcePrint109)continue;covered.add(String(id));}for(const child of children(j))cover(child,next);};
 for(const j of chosen)cover(j);
 // Changed raw sources must survive even when a parent carries aggregate coverage.
 const changed=new Set();const inspect=(j,path=new Set())=>{if(path.has(String(j.id)))return;const next=new Set(path).add(String(j.id));for(const id of coverage(j)){const raw=rawMap.get(String(id)),saved=j.sourcePrints?.[id];if(raw&&(j.needsUpdate||saved&&raw.sourcePrint109&&saved!==raw.sourcePrint109))changed.add(String(id));}for(const child of children(j))inspect(child,next);};for(const j of chosen)inspect(j);for(const id of changed)covered.delete(id);
 const zone=taskZone109(s),clock=t=>zone?formatter109(zone,true).format(t):new Date(t-(Number(s.offset)||0)*60000).toISOString().slice(0,16).replace('T',' ');
 const coarseStart=Date.parse(range.start+'T00:00:00Z')-15*3600000,coarseEnd=Date.parse(range.end+'T00:00:00Z')+39*3600000;
 const chat=messages.filter(m=>{const t=messageStamp109(m.timestamp);if(t===null||t<coarseStart||t>=coarseEnd||covered.has(String(m.id))||m.isThinking||m.isStatusUpdate||m.isContextDisabled||!['user','assistant'].includes(m.role))return false;const day=localDay109(t,s);return day>=range.start&&day<=range.end;}).map(m=>({id:m.id,role:m.role,content:m.content,timestamp:m.timestamp,sentAt:clock(messageStamp109(m.timestamp)),timeZone:zone||'offset:'+String(Number(s.offset)||0),...(changed.has(String(m.id))?(m.sourcePrint109==='unverified-large-source'?{sourceVerificationUnknown:true}:{correctedSource:true}):{})}));
 const unknownTimeMessages=messages.filter(m=>messageStamp109(m.timestamp)===null&&!m.isThinking&&!m.isStatusUpdate&&!m.isContextDisabled&&['user','assistant'].includes(m.role)).length;
 return {memories:chosen.map(j=>({id:j.id,title:j.title,from:j.sourceTimeStart??j.periodStart,to:j.sourceTimeEnd??j.periodEnd,content:j.content,...(j.needsUpdate?{needsUpdate:true}:{})})),recentChat:chat,memoryIds:chosen.map(j=>j.id),unknownTimeMessages};
}
function assetWallet109(w,range){
 const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])),within=v=>!range||!v.date||v.date>=range.start&&v.date<=range.end;
 return {initialized:!!w.initialized,name:w.name,defaultAccount:w.defaultAccount,
  accounts:(w.accounts||[]).map(a=>pick(a,['id','name','kind','tail','balance'])),
  sections:(w.sections||[]).map(s=>pick(s,['id','name','fields','enabled','financial','description','instructions'])),
  assets:(w.assets||[]).map(a=>({...pick(a,['id','name','section','sectionName','date','value','purchase','ownership','status','info','fields']),events:(a.events||[]).filter(within).map(e=>pick(e,['date','time','title','reason','amount','value']))})),
  entries:(w.entries||[]).filter(within).map(e=>pick(e,['id','date','time','title','cents','amount','category','accountId','assetId','activityId','source','sourceId','eventKey','note'])),
  activities:(w.activities||[]).filter(within).map(a=>pick(a,['id','date','time','title','info','assetId','sourceId','eventKey'])),
  fixed:(w.fixed||[]).map(f=>pick(f,['id','enabled','title','cents','day','category','accountId','createdAt'])),
  funds:(w.funds||[]).map(f=>pick(f,['id','name','title','balance','cents','target','purpose']))};
}
function userData109(body){for(const m of (body.messages||body.contents||[]).slice().reverse()){if(m.role!=='user')continue;const p=m.parts?.find(x=>typeof x.text==='string'),content=typeof m.content==='string'?m.content:p?.text;if(typeof content!=='string')continue;try{const value=JSON.parse(content);if(value&&typeof value==='object'&&!Array.isArray(value)&&value.existing)return {value,set:v=>{if(typeof m.content==='string')m.content=JSON.stringify(v);else p.text=JSON.stringify(v);}};}catch{}}return null;}
function system109(body,text){const tag='<资产生成后端109>',block=tag+'\n'+text+'\n</资产生成后端109>',strip=s=>s.replace(/\n?<资产生成后端109>[\s\S]*?<\/资产生成后端109>/g,'');if(Array.isArray(body.messages)){for(const m of body.messages)if(m.role==='system'&&typeof m.content==='string')m.content=strip(m.content);body.messages.push({role:'system',content:block});}else if(body.contents){body.system_instruction??={parts:[]};body.system_instruction.parts??=[];for(const p of body.system_instruction.parts)if(p.text)p.text=strip(p.text);body.system_instruction.parts.push({text:block});}else throw Error('资产任务缺少消息结构');}
function prepareAsset109(input,range,s={}){const body=JSON.parse(input.body),slot=userData109(body);if(!slot)throw Error('资产任务缺少账本资料');const d=slot.value;if(range)d.range=range;range=d.range||input.meta?.range||d.plan?.range;if(range){input.meta.range=range;const catalog=input.meta.assetContext109||d.contextCatalog109;if(catalog){const c=assetContext109(catalog,range,s);d.memories=c.memories;d.recentChat=c.recentChat;range.memoryIds=c.memoryIds;}d.timeZone=taskZone109(s)||taskZone109(input.meta||{})||d.timeZone;}
 d.existing=assetWallet109(d.existing,range);delete d.contextCatalog109;
 const task=input.meta?.feature||'',reroll=task==='asset-reroll97';d.taskRules109=reroll?'仅生成plan指定范围的替代预览。锁定及实际交易为必须保留参考，待替换旧生成记录仅供比较，不视为禁止重做的已有事件。':task==='asset-add109'?assetAddPrompt109:'保留全部已有记录，只补遗漏，不因generated中已有时段而拒绝继续补充。';
 if(d.schema?.entries)for(const e of d.schema.entries)e.time??='HH:mm';
 // Keep provider parameters, schemas, requirements, persona and world books unchanged.
 slot.set(d);const systems=(body.messages||[]).filter(m=>m.role==='system').map(m=>m.content||'').join('\n')+'\n'+(body.system_instruction?.parts||[]).map(p=>p.text||'').join('\n');system109(body,(systems.includes(assetPrompt109)?'':assetPrompt109+'\n')+d.taskRules109+'\nentries每条保留date:YYYY-MM-DD并新增time:HH:mm，使用角色当地时间。跨天日记仅提取本次时段事件，早期内容仅作背景。recentChat.sentAt为角色当地消息发送时间，用于理解昨天等相对日期；不等于事情发生时间。correctedSource表示原消息已改，以修正后的原文为准。');input.body=JSON.stringify(body);return input;}
function normalizeAssetResult109(value,range,existing={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('资产返回结构无效');for(const k of ['entries','activities','assets','accounts'])if(value[k]!==undefined&&!Array.isArray(value[k]))throw Error('资产返回数组无效');
 if((value.entries?.length||0)>100||(value.activities?.length||0)>100||(value.assets?.length||0)>50)throw Error('资产生成记录过多');
 const knownAssets=new Set((existing.assets||[]).map(a=>a.id)),knownAccounts=new Set((existing.accounts||[]).map(a=>a.id));
 for(const a of value.assets||[]){if(a.id&&(!knownAssets.has(a.id)||!['出售','赠予','估值','共同持有'].includes(a.action)))throw Error('资产变更引用无效');if(!a.id&&!String(a.name||'').trim())throw Error('新资产缺少名称');for(const k of ['amount','value','purchase'])if(a[k]!==undefined&&(!Number.isFinite(Number(a[k]))||Number(a[k])<0))throw Error('资产金额无效');if(a.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(a.date)||a.date>range.end))throw Error('资产日期无效');}
 const old=existing.entries||[],kept=[];for(const e of value.entries||[]){if(e.accountId&&knownAccounts.size&&!knownAccounts.has(e.accountId))throw Error('流水引用了不存在的账户');const d=String(e.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d+'T12:00:00Z'))||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d||d<range.start||d>range.end)throw Error('生成流水日期不在目标时段');if(e.time!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time))throw Error('生成流水时间无效');const income=e.type==='income'||e.category==='收入',expense=e.type==='expense';if(income&&expense)throw Error('收入类别与支出方向冲突');const n=Number(e.amount);if(!Number.isFinite(n)||n===0||!Number.isSafeInteger(Math.round(n*100)))throw Error('生成收支金额无效');e.amount=income?Math.abs(n):expense?-Math.abs(n):n;if(income)e.category='收入';
 const duplicates=(rows)=>rows.some(o=>{const amount=o.cents!==undefined?o.cents:Math.round(Number(o.amount)*100);return o.date===d&&amount===Math.round(e.amount*100)&&String(o.accountId||'')===String(e.accountId||'')&&((e.eventKey&&o.eventKey===e.eventKey)||(e.sourceId&&o.sourceId===e.sourceId)||(e.time&&o.time===e.time&&o.title===e.title));});
 if(duplicates([...old,...kept]))continue;kept.push(e);}
 value.entries=kept;for(const e of value.activities||[])if(!e.date||e.date<range.start||e.date>range.end)throw Error('生成近况不在目标时段');return value;}
function assetData109(input){return userData109(JSON.parse(input.body))?.value;}

window.UwUAssetCore109={assetWallet109,assetPrompt109,reviewPrompt109,assetAddPrompt109,taskZone109,localDay109,previousRange109,nextAssetTime109,messageStamp109,assetContext109,prepareAsset109,normalizeAssetResult109,assetData109};
})();
