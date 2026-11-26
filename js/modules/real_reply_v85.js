// v94 adapter: the exact same policy is used by the offline Worker.
(() => {
'use strict';
window.UwUPaperTimes94=new WeakMap();
const H=window.UwUHuman94,S=window.SmartMessaging,C=window.SmartReplyControl,M=60000;let ticking=false;
const state=c=>{const s=H.state(c);c.smartInterleaved=false;return s;};
const save=c=>void saveData({chat:c}).catch(e=>console.error('真人状态保存失败',e));
const prompt=`<真人回复>
✨重要✨ 生活状态：每轮结合人设／当前时间／聊天上下文／本地提供的现有安排，依次填写生活纸条，只记录你自己：
A. 当前活动：现在正在做什么。
B. 手机可用性：方便使用／可以抽空／暂时无法使用。
C. 忙闲程度：空闲／轻度忙碌／中度忙碌／高度忙碌／不可用，以及预计结束时间。
D. 手机模式：结合活动场合与使用习惯，填写响铃／振动／静音。
E. 睡眠状态：清醒／准备睡／睡着／短暂醒来；睡眠时填写浅睡／深睡及起止时间。
F. 后续安排：本轮确定的新事件／联系计划／待兑现约定，以及兑现／取消／改期。
- 事件与时间：未变的安排沿用原时间，剩余时长不重复累加；到期事件由程序移除，后续继续做则新建事件。
- 活动与睡眠：抽空聊天保留忙碌状态，短暂醒来保留原睡眠安排；决定继续忙／继续睡／正式起床时更新。
- 联系安排：记录时间／缘由／预计联系或明确约定，不预写台词；实际联系时，根据最新上下文生成回复。
<主动分享>
角色的生活会随时间持续推进，活动、忙闲、睡眠、所处环境与心境依实际进程自然变化，不因user未回复而停在上一轮，也不每轮无故更换状态。
随自身生活、活动进展与表达意愿自然分享。可以联系user分享自己的生活、刚刚发生的事、见闻趣事、想法感受、吐槽或后续进展，也可以延续上一轮交流作有内容的补充、聊起新的共同话题，或只是想念、想找user亲近。也可以只发布朋友圈、记录书影音或参与相关互动，不必同时发送聊天消息。
上下文用于保持连贯，不是每次主动分享的选题范围。已说完的话题、已分享过的生活细节，没有新进展就不再延续、翻提或换说法重复；user未回复也不代表话题尚未结束。不借分享催回，不为分享硬编事情、报备或提问，也允许暂不分享。
</主动分享>
每轮回复末尾追加 <life_note>合法JSON</life_note>，在角色正文及原有thinking之外，不放进气泡，只填写结果。
a) situation：activity；availability=available/limited/unavailable；activity_state=free/busy/unavailable；busy_level=light/medium/heavy；phone_mode=ring/vibrate/silent；busy_until=带时区ISO或毫秒时间（无变化继承）；contact_state=chatting/away。
b) sleep：state=awake/winding_down/asleep/briefly_awake；depth=light/deep；starts_at/wake_at继承已定时间。新睡眠可填onset_minutes/wake_min_minutes/wake_max_minutes。
c) events：id/title/subject=char/phase=planned/ongoing/completed/cancelled/start_at/end_at/availability=free/limited/unavailable/sleep，可填phone_mode与busy_level供到点切换。已有事件沿用ID，过期事件不重建；后续继续做使用新ID。
d) opportunities：id/kind=promise（明确约定）或followup（预计联系、必要追问）/motive（缘由）/due_at（带时区时间）；fulfilled_promises/cancelled_promises填写已兑现/取消的原ID，改期另建安排。
e) daily：明确要求勿扰时enabled=false与pause_minutes；解除时enabled=true。
输入等待／到期清理／计时／概率／联系窗口／重试由程序执行，不在聊天中提及内部记录。
</真人回复>`;
const stamp=(t,c,role='char')=>{if(!t)return '暂无';const L=window.UwULocation;if(!L)return new Date(t).toLocaleString('zh-CN',{hour12:false});const a=L.at(c,role,t);return (a.city||'当地')+' '+a.stamp.slice(5);};
function range(a,b,c){const L=window.UwULocation;if(!L)return stamp(a,c)+' ～ '+stamp(b,c);const roles=L.at(c,'char',a).timeZone===L.at(c,'user',a).timeZone?['char']:['char','user'];return roles.map(role=>stamp(a,c,role)+' ～ '+L.at(c,role,b).stamp.slice(5)).join('\n');}
function render(c){if(typeof currentChatId==='undefined'||currentChatId!==c.id)return;const el=document.getElementById('smart-reply-status');if(!el)return;const s=state(c),st=H.status(c),time=t=>{const L=window.UwULocation;return L&&L.at(c,'char',t).timeZone!==L.at(c,'user',t).timeZone?stamp(t,c)+' · '+stamp(t,c,'user'):stamp(t,c);};const usage=C.counter(c);const rows=['手机状态：'+{ring:'响铃',vibrate:'振动',silent:'静音'}[s.phoneMode],'当前状态：'+(st.kind==='busy'?{light:'轻度忙碌',medium:'中度忙碌',heavy:'高度忙碌'}[st.level]+' · ':'')+st.label];if(st.until)rows.push((['sleep','briefly_awake'].includes(st.kind)?'预计起床：':'预计恢复：')+time(st.until));if(st.kind==='briefly_awake')rows.push('无互动后继续睡：'+time(s.awakeUntil));if(s.chatUntil>Date.now())rows.push('连续聊天中');;
rows.push('今日自动请求：'+usage.count+(c.smartAutoLimit?'/'+c.smartAutoLimit:'（不限）'));for(const e of s.events)rows.push(range(e.startAt,e.endAt,c)+'\n'+e.title+'（'+({planned:'计划中',ongoing:'进行中',paused:'暂停'}[e.phase]||e.phase)+'）');if(s.pendingReply)rows.push('预计回复：'+time(Math.max(s.pendingReply.dueAt,s.retryAt||0)));rows.push('日常分享：'+(s.dailyWindow?time(s.dailyWindow.dueAt):'睡眠中暂停'));for(const n of s.nodes)rows.push((n.kind==='promise'?'约定联系：':'预计联系：')+time(n.dueAt)+' '+(n.motive||''));if(s.noteAt)rows.push('纸条更新于：'+time(s.noteAt));if(s.lastError)rows.push(s.lastError);const key=rows.join('\n');if(el.textContent!==key){el.style.whiteSpace='pre-line';el.textContent=key;}}
function onUser(c,m,now=Date.now(),willSave=false){if(!state(c).enabled||state(c).lastUserId===m.id||m.isThinking||m.isWithdrawn||m.isContextDisabled)return;const input=document.getElementById('message-input');state(c).hasDraft=!!input?.value?.trim();state(c).composing=false;C.sent(c,m,now);S.cancelAutomatic(c);H.onUser(c,m,now);render(c);if(!willSave)save(c);;;}
S.commit=(c,n,kind)=>{const s=state(c);if(!s.enabled)return;const context=window.UwUPaperTimes94.get(c),latest=[...(c.history||[])].reverse().find(m=>m.role==='user'&&!m.isWithdrawn&&!m.isContextDisabled&&!m.isThinking);if(context&&typeof context==='object'&&context.anchorUserId!==(latest?.id||null)){render(c);return;}H.applyPaper(c,n,(typeof context==='object'?context?.completedAt:context)||Date.now());H.advance(c);if(!n)s.paperWarning='未解析到生活纸条，保留已有状态';if(!s.executing85&&!String(kind||'').startsWith('metadata')){s.pendingReply=null;H.contact(c);if(n?.situation?.contact_state!=='away')H.touchChat(c);else s.chatUntil=0;}render(c);};
S.advanceEvents=(c,now=Date.now())=>{const before=JSON.stringify(state(c));H.advance(c,now);return before!==JSON.stringify(state(c));};
S.sleepRemaining=(c,now=Date.now())=>H.status(c,now).kind==='sleep'?Math.max(0,state(c).sleep.wakeAt-now):0;
S.activityRemaining=(c,now=Date.now())=>H.status(c,now).kind==='unavailable'?Math.max(0,state(c).busyUntil-now):0;
S.instructions=c=>{H.advance(c);const s=state(c);return '\n'+prompt+'\n<当前生活资料>'+JSON.stringify({now:Date.now(),localTime:window.UwULocation?.current(c),location:window.UwULocation?.prompt(c),level:s.level,status:H.status(c),sleep:s.sleep,awakeUntil:s.awakeUntil,events:s.events,contacts:s.nodes,retiredEventIds:s.retiredEvents.slice(-30),situation:{activity:s.activityTitle,activity_state:s.activityMode,busy_until:s.busyUntil,phone_mode:s.phoneMode}})+'</当前生活资料>\n';};
S.backgroundPrompt=(c,o)=>{const task=state(c).executing85;return o?.kind==='reply'?'[系统任务：现在方便回复用户，回应最新上下文并更新生活纸条。]'+(task?.share?'本轮合并一次主动发言机会，承接最新上下文，可自然补充，不必另开话题。':'')+(task?.ids?.length?'本轮同时处理到时的联系约定：'+JSON.stringify(state(c).nodes.filter(n=>task.ids.includes(n.id))):''):'[系统任务：现在到了联系时机，根据最新上下文、人设及当前状态自然联系，并更新生活纸条。]'+(task?.motive?'联系缘由：'+task.motive:'这是一次自主分享机会，随当前生活推进，可以联系user，也可以只发布朋友圈或记录书影音，不必同时发聊天消息；不要重复已说完的话题与生活细节。');};
C.ready=(c,kind,now=Date.now())=>H.ready(c,now);C.scheduleDaily=(c,now)=>H.daily(c,now);C.reserve=async(c,o,controller)=>C.allowed(c,o.automatic===true)||(controller.signal.aborted?'stale':'');C.counter=(c,now=Date.now())=>{const date=new Date(now-new Date().getTimezoneOffset()*M).toISOString().slice(0,10);if(c.smartAutoUsage?.date!==date)c.smartAutoUsage={date,count:0};return c.smartAutoUsage;};
C.canCrossReply=()=>false;C.replyOptions=()=>({});C.markInterleave=()=>{};C.activeTyping=(c,now=Date.now())=>{const s=state(c);return s.composing||s.hasDraft&&now-s.lastInputAt<20000;};
const originalAllowed=C.allowed;C.allowed=(c,auto=true)=>{state(c).autoErrorPause=false;return originalAllowed(c,auto);};
async function tick(){if(ticking||typeof db==='undefined'||isGenerating)return;ticking=true;const changed=new Set();try{for(const c of db.characters||[]){const s=state(c);if(!s.enabled||S.busy(c))continue;const previous=JSON.stringify([s.events,s.sleep,s.awakeUntil,s.dailyWindow,s.activityMode,s.phoneMode]);H.advance(c);if(previous!==JSON.stringify([s.events,s.sleep,s.awakeUntil,s.dailyWindow,s.activityMode,s.phoneMode]))changed.add(c);;refreshTodos(c);let u,a;for(let i=(c.history?.length||0)-1;i>=0&&(!u||!a);i--){const m=c.history[i];if(!u&&m.role==='user'&&!m.isWithdrawn&&!m.isContextDisabled&&!m.isThinking&&!m.isManualInsertion)u=m;if(!a&&m.role==='assistant'&&!m.isThinking&&!m.uwuToolCommand)a=m;}if(u&&(!a||c.history.indexOf(u)>c.history.indexOf(a))&&s.lastUserId!==u.id)onUser(c,u);if(C.allowed(c,true)){render(c);continue;}if(window.VideoCallModule?.state?.isCallActive&&window.VideoCallModule.state.currentChat?.id===c.id)continue;let task=H.next(c);if(!task){render(c);continue;}s.executing85=task;s.plan=task;H.touchChat(c);s.inFlight=true;let out;try{await saveData({chat:c});out=await getAiReply(c.id,'private',true,{kind:task.kind,automatic:true});}catch(e){out={status:'error'};}finally{s.inFlight=false;delete s.executing85;}if(out?.status==='ok'&&out.publicationOnly105||out?.status==='metadata'&&task.source==='daily')H.publication105(c,task);else if(out?.status==='ok')H.complete(c,task);else if(['error','empty','metadata'].includes(out?.status)||!out)H.retry(c,task);render(c);changed.add(c);}}finally{ticking=false;if(changed.size)await saveData({chats:[...changed]});}}
function refreshTodos(c){if(window.UwUTodoCalendar109){state(c).todoPlans94=UwUTodoCalendar109.plans(c);return;}if(!window.UwUChatTools)return;state(c).todoPlans94=(window.UwUChatTools.state(c).lists||[]).flatMap(l=>l.items.filter(i=>i.owner==='char'&&i.progress<100&&i.deadline).map(i=>({id:i.id,title:i.text,deadline:i.deadline,nextCheckAt:i.nextCheckAt})));}
function bind(){const input=document.getElementById('message-input');if(!input||input.dataset.h94)return;input.dataset.h94='1';for(const type of ['input','compositionstart','compositionupdate','compositionend'])input.addEventListener(type,e=>{if(typeof currentChatType==='undefined'||currentChatType!=='private')return;const c=db.characters.find(c=>c.id===currentChatId);if(!c||!state(c).enabled)return;const s=state(c);s.lastInputAt=Date.now();s.hasDraft=!!input.value.trim();if(e.type==='compositionstart')s.composing=true;if(e.type==='compositionend')s.composing=false;if(s.awakeUntil>Date.now())H.wake(c);if(s.chatUntil>Date.now())H.touchChat(c);;});window.addEventListener('blur',()=>{for(const c of db.characters||[])if(c.smartReply){c.smartReply.composing=false;;}});}
window.UwURealReply85={refreshTodos,state,status:H.status,awake:(c,now=Date.now())=>state(c).awakeUntil>now,onUser,tick,render,scheduleDaily:H.daily,canCall:(c)=>{const ok=H.notice(c,{content:'',uwuUrgent:true},Date.now(),true);if(ok);return ok;},retry:H.retry,urgent:H.urgent,wakeChance:H.wakeChance,paper:H.applyPaper,range};
S.activeStatus=c=>'手机状态：'+{ring:'响铃',vibrate:'振动',silent:'静音'}[state(c).phoneMode]+'\n当前状态：'+H.status(c).label;
window.addEventListener('uwu-db-ready',()=>{for(const c of db.characters||[]){const s=state(c);delete s.inFlight;delete s.executing85;s.composing=false;}bind();});document.addEventListener('DOMContentLoaded',bind);bind();
})();
