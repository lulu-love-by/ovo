/* StarHub call contract: one floor, immutable resident prefix, final-only input,
   actual playback completion and one terminal event for every output turn. */
(()=>{'use strict';
const stamp=()=>performance.now();
class Metrics{
 constructor(){this.events=[];this.cache={status:'尚未收到服务商缓存用量',readTokens:null};this.falseEnds=0;this.lateDiscard=0;}
 mark(name,turn,at=stamp()){this.events.push({name,turn:turn?.id??turn??null,at:Math.round(at)});if(this.events.length>200)this.events.shift();}
 report114(){
  const all=this.events,start=all.findLastIndex(e=>e.name==='generation.start');if(start<0)return '尚无回复请求；请说一句话并等待回复后再打开。';
  const gen=all[start],next=all.findIndex((e,i)=>i>start&&e.name==='generation.start'),rows=all.slice(start,next<0?undefined:next),before=all.slice(0,start),get=n=>rows.find(e=>e.name===n),prev=n=>before.findLast(e=>e.name===n),lines=[];
  const duration=(label,a,b)=>lines.push(label+'：'+(a&&b&&b.at>=a.at?((b.at-a.at)/1000).toFixed(2)+' 秒':'尚无记录'));
  const last=prev('speech.last_audio'),end=prev('vad.end'),final=prev('asr.final'),request=get('model.request'),first=get('model.first_delta'),speech=get('text.first_speech'),visible=get('text.first_stable'),played=get('playback.start');
  if(last){duration('停止说话 → 本地收尾',last,end);duration('本地收尾 → 识别提交',end,final);duration('识别提交 → 模型请求',final,request);}else lines.push('本轮没有麦克风收尾记录（可能是开场白或打字）');
  duration('模型请求 → 首个正文片段',request,first);duration('首个片段 → 首条可展示内容',first,visible);duration('首个片段 → 首句台词',first,speech);duration('首句台词 → 开始播放',speech,played);duration('停止说话 → 首句台词',last,speech);
  if(this.model114)lines.push('回复模型：'+this.model114.name+'；通话思考：'+(this.model114.thinking?'开启':'关闭')+'；系统提示约 '+this.model114.chars+' 字符（不是 token 数）');
  return lines.join('\n');
 }

 usage(u){if(!u)return;const n=u.cachedContentTokenCount??u.prompt_tokens_details?.cached_tokens??u.cache_read_input_tokens;if(Number.isFinite(n))this.cache={status:n>0?'服务商报告缓存命中':'服务商报告缓存命中为0',readTokens:n};}
}
class Floor{
 constructor({stop=()=>{},metrics=new Metrics()}={}){this.state='IDLE';this.epoch=0;this.sequence=0;this.active=null;this.seen=new Set();this.stop=stop;this.metrics=metrics;}
 speechStart(){if(this.state==='CLOSING')return;const old=this.active;this.epoch++;this.active=null;this.state='LISTENING';this.stop(old,this.epoch);if(old)this.finish(old,'interrupted');this.metrics.mark('speech.start');}
 inputEmpty(){if(this.state==='LISTENING'&&!this.active){this.state='IDLE';this.metrics.mark('speech.empty');}}
 acquire(source='manual',key){const expected=source==='user'?'LISTENING':'IDLE';if(this.state!==expected||this.active)return null;if(key!==undefined&&this.seen.has(key))return null;if(key!==undefined){this.seen.add(key);if(this.seen.size>200)this.seen.delete(this.seen.values().next().value);}const turn={id:++this.sequence,epoch:this.epoch,source,started:stamp(),generated:false,done:false,k:0};this.active=turn;this.state='GENERATING';this.metrics.mark('generation.start',turn);return turn;}
 current(turn){const ok=!!turn&&!turn.done&&this.active===turn&&turn.epoch===this.epoch&&this.state!=='CLOSING';if(!ok)this.metrics.lateDiscard++;return ok;}
 speaking(turn){if(!this.current(turn)||turn.speaking)return;turn.speaking=true;this.state='SPEAKING';this.metrics.mark('playback.start',turn);}
 generated(turn){if(!this.current(turn))return;turn.generated=true;this.metrics.mark('generation.end',turn);}
 finish(turn,reason='complete'){if(!turn||turn.done)return false;turn.done=true;turn.reason=reason;for(const entry of turn.entries111||[])if(entry.callTurn111.status!=='played')entry.callTurn111.status=reason==='interrupted'?'interrupted':'playback_unknown';this.metrics.mark('TURN_DONE:'+reason,turn);if(this.active===turn){this.active=null;if(this.state!=='CLOSING')this.state='IDLE';}return true;}
 close(){if(this.state==='CLOSING')return;this.state='CLOSING';const turn=this.active;this.epoch++;this.active=null;this.stop(turn,this.epoch);this.finish(turn,'closed');}
}
function install(s){const metrics=s.metrics111=new Metrics();s.floor111=new Floor({metrics,stop:()=>{s.replyEpoch110=(s.replyEpoch110||0)+1;s.textController?.abort();s.interruptAudio110?.();}});s.controller.signal.addEventListener('abort',()=>s.floor111.close(),{once:true});return s.floor111;}
async function microphoneLock(signal){if(!navigator.locks?.request)return ()=>{};return new Promise((resolve,reject)=>{let release;const held=new Promise(r=>release=r);navigator.locks.request('uwu-realtime-call111',{ifAvailable:true},async lock=>{if(!lock){reject(Error('另一个页面正在实时通话，请先挂断那一通'));return;}if(signal.aborted){release();reject(new DOMException('已停止','AbortError'));return;}const stop=()=>release();signal.addEventListener('abort',stop,{once:true});resolve(()=>{signal.removeEventListener('abort',stop);release();});await held;}).catch(reject);});}
window.UwUCallRuntime111={Floor,Metrics,install,microphoneLock};
})();
