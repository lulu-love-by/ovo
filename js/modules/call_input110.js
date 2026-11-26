/* The microphone stays open across listening / reasoning / speaking in the live route.
   Finalized transcripts alone enter the existing role-play call request. */
(()=>{'use strict';
const now=()=>performance.now(),abort=()=>new DOMException('已停止','AbortError');
class Utterances{
 constructor({provider,onText=()=>{},onFinal,onSpeechStart=()=>{},onEmpty=()=>{},onError=()=>{}}){this.provider=provider;this.onText=onText;this.onFinal=onFinal;this.onSpeechStart=onSpeechStart;this.onEmpty=onEmpty;this.onError=onError;this.queue=[];this.active=null;this.current=null;this.group=null;this.epoch=0;this.closed=false;}
 start(){
  if(this.closed)return;
  if(!this.group||this.group.committed)this.group={id:++this.epoch,spans:[],sent:false,committed:false,version:0};else if(this.group.sent){this.group.sent=false;this.group.version++;}
  const span={group:this.group,frames:[],ended:false,started:false,text:null};this.group.spans.push(span);this.current=span;this.queue.push(span);span.meta111=this.onSpeechStart();this.drain();return span;
 }
 frame(bytes,voiced114){const span=this.current;if(!span||this.closed)return;if(span.started&&!span.ending)this.provider.audio(bytes,{voiced114});else{span.frames.push({bytes,voiced114});if(span.frames.length>150)throw Error('识别收尾等待超过3秒，已暂停，避免漏掉你的后半句话');}}
 end(){const span=this.current;if(!span)return;span.ended=true;this.current=null;if(span.started)this.endActive(span);}
 drain(){if(this.active||this.closed||!this.queue.length)return;const span=this.queue.shift();this.active=span;
  try{span.providerId=this.provider.begin();span.started=true;for(const frame of span.frames)this.provider.audio(frame.bytes,{voiced114:frame.voiced114});span.frames=[];if(span.ended)this.endActive(span);}
  catch(e){this.fail(e);}
 }
 endActive(span){if(span.ending||this.closed)return;span.ending=true;
  Promise.resolve().then(()=>this.provider.end()).then(text=>{if(this.closed||this.active!==span)return;span.text=text;this.active=null;this.preview();this.drain();this.maybeSubmit(span.group);}).catch(e=>this.fail(e));
 }
 interim(text,id){if(this.closed||!this.active||this.active.providerId!==id)return;this.active.interim=text;this.preview();}
 preview(){if(!this.group)return;this.onText(UwUGeminiLive110.joinText(this.group.spans.map(p=>p.text??p.interim??'')));}
 maybeSubmit(group){if(this.closed||group!==this.group||group.sent||this.current||group.spans.some(p=>p.text===null))return;group.sent=true;const version=group.version,valid=()=>!this.closed&&group===this.group&&group.sent&&group.version===version&&!this.current;const text=UwUGeminiLive110.joinText(group.spans.map(p=>p.text)).trim();if(text)Promise.resolve(this.onFinal(text,group.id,valid)).then(accepted=>{if(valid()&&accepted!==false)group.committed=true;}).catch(e=>this.fail(e));else{group.committed=true;this.onEmpty(group.spans.map(p=>p.meta111));}}
 fail(error){if(this.closed)return;this.closed=true;this.queue=[];this.onError(error);}
 cancel(){this.closed=true;this.queue=[];this.current=null;this.group=null;}
}
function interrupt(vc,s){
 if(!vc.state.isCallActive||vc.state.voiceSession98!==s)return;
 if(s.floor111)s.floor111.speechStart();else{s.replyEpoch110=(s.replyEpoch110||0)+1;s.textController?.abort();s.interruptAudio110?.();}
 vc.state.isGenerating=false;vc.state.isAiSpeaking=false;document.getElementById('vc-call-avatar')?.classList.remove('processing');s.changed();
}
async function start(vc,s,cfg,onFinal){
 if(s.realtime110)return s.realtime110;
 const inputSession111=s.inputSessionSeq111=(s.inputSessionSeq111||0)+1;const clientConfig=UwUGeminiLive110.config(cfg);const parent=s.controller.signal;if(parent.aborted)throw abort();const controller=new AbortController(),parentAbort=()=>controller.abort();parent.addEventListener('abort',parentAbort,{once:true});
 const alive=()=>!controller.signal.aborted&&!parent.aborted&&vc.state.isCallActive&&vc.state.voiceSession98===s&&s.micWanted;
 let unlockMic=null;let recorder=null,framer=null,utterances=null,capturing=false,quiet=0,voiced=0,pre=[],stopped=false,lastTranscript112='',noise114=.002,lastVoiceAt114=null,frameCount114=0,lastEndFrame114=-Infinity;
 const silenceFrames=Math.ceil(UwUGeminiLive110.timing114(cfg).silenceMs/20);
 const caption=text=>{if(alive())UwULiveAsr109.caption(s,text);};
 const stop=()=>{if(stopped)return;stopped=true;controller.abort();recorder?.cancel();framer?.cancel();utterances?.cancel();client.close();unlockMic?.();parent.removeEventListener('abort',parentAbort);if(s.realtime110===handle)s.realtime110=null;s.listening=false;s.micStream111=null;};
 const fail=e=>{const visible=alive();stop();if(visible){s.micWanted=false;UwULiveAsr109.caption(s,'实时识别暂停，未自动切换服务。'+(lastTranscript112?'\n未确认字幕（未发送）：'+lastTranscript112:''));if(e.name!=='AbortError')showToast(e.message);s.changed();}};
 const handle={stop,cancel:stop,submit(){if(capturing){capturing=false;quiet=voiced=0;lastEndFrame114=frameCount114;utterances.end();}}};
 const client=new (window.UwULiveBridge111?.WorkerClient||UwUGeminiLive110.Client)(clientConfig,{signal:controller.signal,onInterim:(text,id)=>utterances?.interim(text,id)});
 s.halfDuplex111=false;const echoEvents111=[];s.realtime110=handle;client.onClose=e=>{if(!stopped&&e.name!=='AbortError')fail(e);};
 utterances=new Utterances({provider:client,onText:text=>{lastTranscript112=text;caption(text?'识别中：'+text:'正在听…');},onSpeechStart:()=>{
  const wasPlaying=!!(s.running||s.pending);if(vc.state.isGenerating||s.running||s.pending){const resumed=now()-(s.lastSubmitted110||0)<1500;interrupt(vc,s);if(resumed){s.falseEndCount110=(s.falseEndCount110||0)+1;if(s.metrics111)s.metrics111.falseEnds++;}}
  else s.floor111?.speechStart();return {wasPlaying};
 },onEmpty:spans=>{if(spans.some(p=>p?.wasPlaying)){const t=now();echoEvents111.push(t);while(echoEvents111[0]<t-60000)echoEvents111.shift();if(echoEvents111.length>2&&!s.halfDuplex111){s.halfDuplex111=true;showToast('检测到多次外放回声，已切换为轮流说话。戴耳机后可重开麦克风恢复打断。');}}s.floor111?.inputEmpty();s.changed();},onFinal:async(text,id,isCurrent)=>{
  if(!alive()||!isCurrent())return false;s.metrics111?.mark('asr.final',id);await s.audioPump110?.catch(()=>{});if(!alive()||!isCurrent())return false;
  s.lastSubmitted110=now();s.lastInputId110=inputSession111+':'+id;lastTranscript112='';caption('');await onFinal(text);return true;
 },onError:fail});
 try{
  unlockMic=await window.UwUCallRuntime111?.microphoneLock(controller.signal);caption('正在连接 Google Live 转写…');await client.connect();if(!alive()){stop();return;}
  recorder=await UwUAudioInput99.capture({signal:controller.signal,maxSeconds:Infinity,keepAudio:false,frameSize:1024,worklet111:'prefer',onPCM:(samples,rate)=>{
   if(!alive())return;
   try{
    if(!framer)framer=new UwUGeminiLive110.PCMFramer(rate,(bytes,rms)=>{
     if(!alive())return;if(s.halfDuplex111&&(vc.state.isGenerating||s.running||s.pending)){pre=[];voiced=quiet=0;return;}
     frameCount114++;const speaking=!!s.clock?.isPlaying112?.(),continuation114=Math.max(.004,Math.min(.012,noise114*2.2)),resuming114=!speaking&&!capturing&&utterances.group&&!utterances.group.committed&&frameCount114-lastEndFrame114<=75,threshold=speaking?.04:resuming114?continuation114:.015,minVoice=speaking?10:resuming114?2:3;
     if(!capturing){
      if(!speaking&&rms<threshold)noise114+=.04*(Math.min(rms,.01)-noise114);if(rms>continuation114)lastVoiceAt114=now();pre.push({bytes,voiced114:rms>Math.max(.004,Math.min(.012,noise114*2.2))});if(pre.length>12)pre.shift();voiced=rms>threshold?voiced+1:0;
      if(voiced>=minVoice){capturing=true;quiet=0;utterances.start();for(const frame of pre)utterances.frame(frame.bytes,frame.voiced114);pre=[];}
      return;
     }
     const voiced114=rms>Math.max(.004,Math.min(.012,noise114*2.2));if(voiced114)lastVoiceAt114=now();utterances.frame(bytes,voiced114);quiet=voiced114?0:quiet+1;
     if(quiet>=silenceFrames){if(lastVoiceAt114!==null)s.metrics111?.mark('speech.last_audio',null,lastVoiceAt114);s.metrics111?.mark('vad.end');capturing=false;quiet=voiced=0;lastEndFrame114=frameCount114;utterances.end();}
    });
    framer.feed(samples);
   }catch(e){fail(e);}
  }});
  if(!alive()){recorder.cancel();stop();return;}
  s.listening=true;s.micStream111=recorder.stream;for(const track of recorder.stream?.getAudioTracks()||[])track.addEventListener('ended',()=>{if(!stopped)fail(Error('麦克风轨道已停止，实时识别已暂停'));},{once:true});s.liveTransport112=client.mode112==='direct'?'兼容实时连接':'独立实时连接';s.captureMode112=recorder.captureMode112||'worklet';if(s.metrics111)s.metrics111.inputTransport=s.liveTransport112+' / '+(s.captureMode112==='compatible'?'兼容收音':'音频工作线程');if(client.mode112==='direct'||s.captureMode112==='compatible')showToast('已启用兼容实时模式，仍持续传音频、实时出字');caption('正在听 · Google Live'+(client.mode112==='direct'||s.captureMode112==='compatible'?'（兼容实时模式）':''));s.changed();
 }catch(e){stop();throw e;}
 return handle;
}
window.UwUCallInput110={Utterances,start,interrupt};
})();
