/* Standalone Google Live Transcribe worker. */
/* Google Live Transcribe: continuous PCM input, speculative subtitles and final text.
   No conversational audio model is selected automatically and there is no silent fallback. */
(()=>{'use strict';
const abort=()=>new DOMException('已停止','AbortError');
const DEFAULT_MODEL='gemini-3.5-transcribe-live';
const DEFAULT_URL='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
function joinText(parts){return parts.filter(Boolean).reduce((all,next)=>all+(/[A-Za-z0-9]$/.test(all)&&/^[A-Za-z0-9]/.test(next)?' ':'')+next,'');}
function timing114(cfg={}){
 const old=Number(cfg.liveSilenceMs110),legacy=!cfg.tailGuard114&&(!Number.isFinite(old)||old===0||old===300);
 return {silenceMs:legacy?800:Math.max(500,Math.min(3000,old||800)),settleMs:350};
}
const normal114=text=>String(text||'').replace(/[\s，。！？、：；,.!?:;“”"「」（）()]/g,'');
function duration114(value){if(typeof value==='string'&&/^\d+(?:\.\d+)?s$/.test(value))return Number(value.slice(0,-1));if(value&&typeof value==='object'){const n=Number(value.seconds||0)+Number(value.nanos||0)/1e9;return Number.isFinite(n)?n:null;}return typeof value==='number'&&Number.isFinite(value)?value:null;}
function addFinal114(turn,final){
 const rawStart=final.startOffset??final.start_offset,rawEnd=final.endOffset??final.end_offset,start=duration114(rawStart),end=duration114(rawEnd),text=final.text;
 const key=rawStart!==undefined||rawEnd!==undefined?JSON.stringify([rawStart,rawEnd]):null;
 let found=key?turn.parts.find(p=>p.key===key):null;
 if(!found&&start!==null)found=turn.parts.find(p=>p.start114===start);
 if(found){if(found.end114!==null&&end!==null&&end<found.end114)return;Object.assign(found,{key,text,start114:start,end114:end});}
 else{
  const whole=joinText(turn.parts.map(p=>p.text)),target=turn.interimTarget114?.text||'';
  // Some services revise an entire cumulative span. Replace its confirmed prefix;
  // never duplicate it in front of the revised full text.
  if(start===null&&normal114(whole).length>=3&&normal114(text)===normal114(target)&&normal114(text).startsWith(normal114(whole))){turn.parts=[{key,text,start114:start,end114:end}];}
  else turn.parts.push({key,text,start114:start,end114:end});
 }
 if(start!==null)turn.parts=turn.parts.filter(p=>p===found||p.start114===start||!(p.start114!==null&&p.end114!==null&&end!==null&&p.start114>=start&&p.end114<=end));
 if(turn.parts.every(p=>p.start114!==null))turn.parts.sort((a,b)=>a.start114-b.start114);
}
function pendingTail114(turn){
 const target=turn.interimTarget114;if(!target)return false;
 const wanted=normal114(target.text),whole=normal114(joinText(turn.parts.map(p=>p.text)));
 if(!wanted||whole.includes(wanted))return false;
 const finalEnds=turn.parts.map(p=>p.end114).filter(Number.isFinite);
 if(target.end114!==null&&finalEnds.length)return Math.max(...finalEnds)<target.end114;
 // Keep a known missing suffix instead of replacing the full subtitle with an
 // earlier finalized prefix. Other differences can be legitimate ASR corrections.
 return !!whole&&wanted.startsWith(whole)&&wanted.length>whole.length;
}
function config(old=db.apiSettings?.asr98||{}){
 const key=String(old.geminiKey110||'').trim(),model=String(old.geminiModel110||DEFAULT_MODEL).trim().replace(/^models\//,'');
 if(!key)throw Error('请先在语音识别设置填写 Google AI Studio 的 API 密钥');
 if(!model.includes('transcribe')||!model.includes('live'))throw Error('实时识别须选择 Live 转写模型，不能在这里填写普通聊天或语音生成模型');
 const url=new URL(old.geminiUrl110||DEFAULT_URL);if(url.protocol!=='wss:'||url.username||url.password)throw Error('实时识别地址必须使用 WSS');
 url.searchParams.set('key',key);return {key,model,url:url.toString(),resume111:old.resume111!==false,finalSettleMs114:timing114(old).settleMs};
}
class PCMFramer{
 constructor(rate,onFrame){if(!(rate>=8000&&rate<=192000))throw Error('麦克风采样率不支持');this.rate=rate;this.onFrame=onFrame;this.tail=new Float32Array(0);this.phase=0;this.samples=[];this.done=false;}
 feed(input){
  if(this.done)return;const data=new Float32Array(this.tail.length+input.length);data.set(this.tail);data.set(input,this.tail.length);let pos=this.phase,step=this.rate/16000;
  while(Math.floor(pos)+1<data.length){const at=Math.floor(pos),f=pos-at;this.samples.push(data[at]*(1-f)+data[at+1]*f);pos+=step;if(this.samples.length===320)this.emit();}
  const used=Math.min(data.length,Math.floor(pos));this.tail=data.slice(used);this.phase=pos-used;
 }
 emit(){if(!this.samples.length)return;const bytes=new Uint8Array(this.samples.length*2),view=new DataView(bytes.buffer);let sum=0;for(let i=0;i<this.samples.length;i++){const v=Math.max(-1,Math.min(1,this.samples[i]));view.setInt16(i*2,v<0?v*32768:v*32767,true);sum+=v*v;}const rms=Math.sqrt(sum/this.samples.length);this.samples=[];this.onFrame(bytes,rms);}
 finish(){if(this.done)return;this.emit();this.done=true;this.tail=new Float32Array(0);}
 cancel(){this.done=true;this.samples=[];this.tail=new Float32Array(0);}
}
class Client{
 constructor(cfg,{socketFactory=url=>new WebSocket(url),onInterim=()=>{},signal,timeoutMs=15000,settleMs}={}){
  this.cfg=cfg;this.socketFactory=socketFactory;this.onInterim=onInterim;this.signal=signal;this.timeoutMs=timeoutMs;this.settleMs=settleMs??cfg.finalSettleMs114??350;
  this.socket=null;this.ready=false;this.closed=false;this.turn=null;this.sequence=0;this.readTail=Promise.resolve();this.connection111=0;this.wireQueue111=[];this.rotateWanted111=false;this.reconnecting111=false;this.abortListener=()=>this.close(abort());signal?.addEventListener('abort',this.abortListener,{once:true});
 }
 clean(message){return String(message||'').split(this.cfg.key).join('***').slice(0,350);}
 connect(){
  if(this.signal?.aborted)return Promise.reject(abort());
  return new Promise((resolve,reject)=>{
   const connection=++this.connection111;this.setupResolve=resolve;this.setupReject=reject;this.setupTimer=setTimeout(()=>this.close(Error('实时识别连接超时，请检查网络、密钥和模型权限')),this.timeoutMs);
   try{this.socket=this.socketFactory(this.cfg.url);}catch(e){this.close(Error('无法建立实时识别连接'));return;}
   this.socket.onopen=()=>{if(this.closed||connection!==this.connection111)return;try{this.send({setup:{model:'models/'+this.cfg.model,generationConfig:{responseModalities:['TEXT']},inputAudioTranscription:{mode:'VERBATIM'},realtimeInputConfig:{automaticActivityDetection:{disabled:true}},...(this.cfg.resume111?{sessionResumption:this.resumeHandle111?{handle:this.resumeHandle111}:{},contextWindowCompression:{slidingWindow:{}}}:{})}},true);}catch(e){this.close(e);}};
   this.socket.onmessage=event=>{this.readTail=this.readTail.then(async()=>{const data=typeof event.data==='string'?event.data:await event.data.text();if(this.closed||connection!==this.connection111)return;this.receive(JSON.parse(data));}).catch(()=>this.close(Error('实时识别事件无法解析，未提交本轮内容')));};
   this.socket.onerror=()=>{if(connection!==this.connection111)return;this.close(Error('实时识别连接失败；请检查当前网络是否能访问 Google Live'));};
   this.socket.onclose=event=>{if(!this.closed&&connection===this.connection111)this.close(Error('实时识别连接关闭（'+event.code+'）'+(event.reason?'：'+this.clean(event.reason):'')+'；请检查模型权限或免费限额'));};
  });
 }
 send(message,setup=false){
  if(!setup&&this.reconnecting111&&!this.closed){this.wireQueue111.push(message);if(this.wireQueue111.length>160){this.close(Error('实时接续等待过久，未提交的收音已停止，请重新开启麦克风'));throw Error('实时接续失败');}return;}if(this.closed||(!setup&&!this.ready)||this.socket?.readyState!==1)throw Error('实时识别连接尚未就绪');
  if(this.socket.bufferedAmount>131072)throw Error('实时音频上传积压，已停止本轮收音，请检查网络');
  this.socket.send(JSON.stringify(message));
 }
 receive(event){
  if(event.error){this.close(Error('Google Live：'+this.clean(event.error.message||event.error.status||'请求失败')));return;}
  if(event.setupComplete||event.setup_complete){this.ready=true;this.reconnecting111=false;for(const message of this.wireQueue111.splice(0))this.send(message);clearTimeout(this.setupTimer);this.setupResolve?.();this.setupResolve=this.setupReject=null;}
  const resume=event.sessionResumptionUpdate||event.session_resumption_update;if(resume?.resumable&&(resume.newHandle||resume.new_handle))this.resumeHandle111=resume.newHandle||resume.new_handle;
  if(event.goAway||event.go_away){this.rotateWanted111=true;if(!this.turn)void this.rotate111().catch(e=>this.close(e));}
  const content=event.serverContent||event.server_content,turn=this.turn;if(!content||!turn)return;
  const interim=content.interimInputTranscription||content.interim_input_transcription;
  if(interim?.text){
   const text=interim.text.trim(),duplicate=turn.hasFinal112&&turn.finalVoiceRev113===turn.voiceRev113&&(text===joinText(turn.parts.map(p=>p.text)).trim()||text===turn.parts.at(-1)?.text.trim());
   if(!duplicate){turn.interimTarget114={text:interim.text,end114:duration114(interim.endOffset??interim.end_offset)};turn.interimPending113=true;const whole=joinText(turn.parts.map(p=>p.text));this.onInterim(interim.text.startsWith(whole)?interim.text:joinText([whole,interim.text]),turn.id);}
  }
  const final=content.inputTranscription||content.input_transcription;
  if(final&&typeof final.text==='string'){
   turn.hasFinal112=true;turn.finalVoiceRev113=turn.voiceRev113;addFinal114(turn,final);
   turn.interimPending113=pendingTail114(turn)||!!(interim?.text&&normal114(interim.text)!==normal114(final.text)&&!normal114(joinText(turn.parts.map(p=>p.text))).includes(normal114(interim.text)));
   if(!turn.interimPending113)turn.interimTarget114=null;
   const whole=joinText(turn.parts.map(p=>p.text));this.onInterim(turn.interimPending113&&turn.interimTarget114?.text.startsWith(whole)?turn.interimTarget114.text:whole,turn.id);this.maybeComplete();
  }
  if(content.turnComplete||content.turn_complete){turn.terminal=true;this.maybeComplete();}
  // An interruption stops conversational output, not authoritative input text.
  // On this ASR-only channel, resumed speech must not close the connection.
  if(content.interrupted)turn.terminal=false;
 }
 maybeComplete(){
  const turn=this.turn;clearTimeout(turn?.settleTimer);
  // Live Transcribe's authoritative inputTranscription is the final ASR result.
  // It is independent of a conversational model's turnComplete event.
  if(!turn?.ending||!turn.hasFinal112||turn.interimPending113||turn.finalVoiceRev113!==turn.voiceRev113)return;
  const version=turn.finalVersion113=(turn.finalVersion113||0)+1;
  turn.settleTimer=setTimeout(()=>{
   if(this.turn!==turn||this.closed||turn.finalVersion113!==version||turn.interimPending113||turn.finalVoiceRev113!==turn.voiceRev113)return;
   clearTimeout(turn.timer);this.turn=null;if(this.rotateWanted111)void this.rotate111().catch(e=>this.close(e));
   turn.resolve(joinText(turn.parts.map(p=>p.text)).trim());
  },this.settleMs);
 }

 async rotate111(){
  if(this.closed||this.reconnecting111)return;if(this.turn){this.rotateWanted111=true;return;}
  this.rotateWanted111=false;this.reconnecting111=true;this.ready=false;const old=this.socket;this.connection111++;if(old){old.onclose=old.onerror=old.onmessage=null;try{old.close();}catch{}}
  await this.connect();this.onResume111?.();
 }
 begin(){if(this.turn)throw Error('上一段实时识别尚未结束');this.send({realtimeInput:{activityStart:{}}});const id=++this.sequence;this.turn={id,parts:[],ending:false,terminal:false,voiceRev113:0,finalVoiceRev113:-1,interimPending113:false};return id;}
 audio(bytes,{voiced114}={}){if(!this.turn||this.turn.ending)throw Error('当前没有可接收音频的识别段');const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let energy=0;for(let i=0;i+1<bytes.length;i+=2){const v=view.getInt16(i,true)/32768;energy+=v*v;}if(typeof voiced114==='boolean'?voiced114:energy/Math.max(1,bytes.length/2)>.006*.006)this.turn.voiceRev113++;let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));this.send({realtimeInput:{audio:{data:btoa(binary),mimeType:'audio/pcm;rate=16000'}}});}
 end(){const turn=this.turn;if(!turn)throw Error('没有正在进行的实时识别');if(turn.promise)return turn.promise;turn.ending=true;
  turn.promise=new Promise((resolve,reject)=>{turn.resolve=resolve;turn.reject=reject;turn.timer=setTimeout(()=>this.close(Error(turn.hasFinal112?'最后一段语音仍有未确认的转写，字幕已保留，未自动发送':'Google 尚未返回最终转写（只收到中间字幕或没有转写），字幕已保留，未自动发送')),this.timeoutMs);});
  try{this.send({realtimeInput:{activityEnd:{}}});this.maybeComplete();}catch(e){this.close(e);}return turn.promise;
 }
 close(error=abort()){
  if(this.closed)return;this.closed=true;this.ready=false;this.wireQueue111=[];clearTimeout(this.setupTimer);this.setupReject?.(error);this.setupResolve=this.setupReject=null;
  const turn=this.turn;this.turn=null;if(turn){clearTimeout(turn.timer);clearTimeout(turn.settleTimer);turn.reject?.(error);}
  this.signal?.removeEventListener('abort',this.abortListener);try{this.socket?.close();}catch{}
  this.onClose?.(error);
 }
}
async function test(old){const cfg=config(old),controller=new AbortController(),client=new Client(cfg,{signal:controller.signal});try{await client.connect();}finally{client.close();}}
globalThis.UwUGeminiLive110={DEFAULT_MODEL,DEFAULT_URL,config,timing114,PCMFramer,Client,joinText,test};
})();

let client=null,epoch=0;
const emit=(type,data)=>postMessage({type,...data});
self.onmessage=async({data:m})=>{try{
 if(m.type==='connect'){const mine=++epoch;client?.close();client=new UwUGeminiLive110.Client(m.config,{onInterim:(text,id)=>{if(mine===epoch)emit('interim',{text,id});}});client.onClose=e=>{if(mine===epoch&&e.name!=='AbortError')emit('fatal',{message:e.message});};client.onResume111=()=>emit('resumed',{});await client.connect();emit('ready',{});}
 else if(m.type==='begin'){client.begin();}
 else if(m.type==='audio'){client.audio(new Uint8Array(m.bytes),{voiced114:m.voiced114});}
 else if(m.type==='end'){const text=await client.end();emit('final',{request:m.request,text});}
 else if(m.type==='close'){epoch++;client?.close();client=null;close();}
 }catch(e){emit('fatal',{message:e.message||'实时识别工作线程失败'});}};
