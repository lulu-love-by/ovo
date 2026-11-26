/* Incremental microphone input. File-only providers are explicitly segmented,
   not represented as native streaming ASR. Only a finished utterance reaches chat. */
(()=>{'use strict';
const abort=()=>new DOMException('已停止','AbortError');
class Segmenter{
 constructor({rate,onSegment,onEnd,silenceMs=1500,segmentSilenceMs=180,maxSegmentMs=8000}){
  this.rate=rate;this.onSegment=onSegment;this.onEnd=onEnd;this.endSamples=Math.ceil(rate*silenceMs/1000);
  this.splitSamples=Math.ceil(rate*segmentSilenceMs/1000);this.maxSamples=Math.ceil(rate*maxSegmentMs/1000);
  this.parts=[];this.size=0;this.quiet=0;this.spoken=false;this.segmentSpeech=false;this.done=false;this.pre=[];this.preSize=0;
 }
 feed(samples){
  if(this.done||!samples.length)return;
  const rms=Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length),speech=rms>.015;
  if(!this.spoken&&!speech){this.pre.push(samples);this.preSize+=samples.length;while(this.preSize>this.rate*.25&&this.pre.length>1)this.preSize-=this.pre.shift().length;return;}
  if(!this.spoken){this.spoken=true;this.parts=this.pre;this.size=this.preSize;this.pre=[];this.preSize=0;}
  this.parts.push(samples);this.size+=samples.length;
  if(speech){this.quiet=0;this.segmentSpeech=true;}else this.quiet+=samples.length;
  if(this.segmentSpeech&&(this.size>=this.maxSamples||(this.quiet>=this.splitSamples&&this.size>=this.rate*.6)))this.flush();
  if(this.quiet>=this.endSamples)this.finish();
 }
 flush(){
  if(!this.segmentSpeech){this.parts=[];this.size=0;return;}
  const data=new Float32Array(this.size);let at=0;for(const part of this.parts){data.set(part,at);at+=part.length;}
  this.parts=[];this.size=0;this.segmentSpeech=false;this.onSegment(data,this.rate);
 }
 finish(){if(this.done)return;this.flush();this.done=true;this.onEnd(this.spoken);}
 cancel(){this.done=true;this.parts=[];this.pre=[];this.size=this.preSize=0;}
}
class OrderedTranscriber{
 constructor({transcribe,onText=()=>{},onError=()=>{},signal,maxPending=6}){
  this.transcribe=transcribe;this.onText=onText;this.onError=onError;this.signal=signal;this.maxPending=maxPending;
  this.values=[];this.pending=0;this.count=0;this.error=null;this.tail=Promise.resolve();
 }
 push(audio){
  if(this.error||this.signal?.aborted)throw this.error||abort();
  if(this.pending>=this.maxPending)throw Error('识别服务处理速度跟不上收音，请暂停后重试；不会发送不完整的识别文字');
  this.pending++;const index=this.count++;
  this.tail=this.tail.then(async()=>{
   if(this.error||this.signal?.aborted)throw this.error||abort();
   const text=await this.transcribe(audio);if(this.signal?.aborted)throw abort();
   this.values[index]=text.trim();this.onText(this.text());
  }).catch(e=>{if(!this.error){this.error=e;this.onError(e);}}).finally(()=>{this.pending--;});
 }
 text(){return this.values.filter(Boolean).reduce((all,next)=>all+(/[A-Za-z0-9]$/.test(all)&&/^[A-Za-z0-9]/.test(next)?' ':'')+next,'');}
 async finish(){await this.tail;if(this.signal?.aborted)throw abort();if(this.error)throw this.error;return this.text();}
}
function caption(s,text){if(s.controller.signal.aborted)return;const el=document.getElementById('vc-caption109');if(el){el.hidden=!text;el.textContent=text;}s.caption109=text;}
function cancel(s){s.liveAsr109?.cancel();s.liveAsr109=null;caption(s,'');}
async function listenApi(vc,s,valid,cfg,onFinal){
 cfg={...cfg,mode:'api',language:s.options.language};UwUAudioInput99.validateRecognition108(cfg);
 const controller=new AbortController(),cancelled=()=>controller.abort();s.controller.signal.addEventListener('abort',cancelled,{once:true});
 let recorder=null,segmenter=null,finishing=false,failed=false;
 const cleanup=()=>{recorder?.cancel();if(s.rawCapture99===recorder)s.rawCapture99=null;};
 const fail=e=>{if(failed||finishing||controller.signal.aborted)return;const alive=valid();failed=true;segmenter?.cancel();cleanup();controller.abort();s.controller.signal.removeEventListener('abort',cancelled);s.listening=false;s.recognizing=false;s.micWanted=false;if(alive){caption(s,'识别中断，已识别文字不会自动发送：'+(queue.text()||'无'));showToast(e.message);s.changed();}};
 const queue=new OrderedTranscriber({signal:controller.signal,transcribe:audio=>UwUAudioInput99.transcribe108(audio,{signal:controller.signal,config:cfg}),onText:text=>{if(valid())caption(s,'识别中：'+text);},onError:fail});
 const finish=async spoken=>{
  if(finishing||failed||controller.signal.aborted)return;finishing=true;cleanup();s.listening=false;s.recognizing=true;
  if(valid())caption(s,spoken?'收音结束，正在确认最后的文字…':'未听到说话');
  try{const text=await queue.finish();if(!valid()||controller.signal.aborted)return;
   if(text){caption(s,'');await onFinal(text);}else if(spoken){s.micWanted=false;throw Error('未识别出文字，请重新收音或使用文字输入');}
  }catch(e){if(valid()&&e.name!=='AbortError'){s.micWanted=false;caption(s,queue.text()?'识别未完成：'+queue.text():'');showToast(e.message);}}
  finally{s.controller.signal.removeEventListener('abort',cancelled);if(vc.state.voiceSession98===s){s.recognizing=false;s.changed();}if(s.liveAsr109===handle)s.liveAsr109=null;}
 };
 const handle={cancel(){controller.abort();segmenter?.cancel();cleanup();s.controller.signal.removeEventListener('abort',cancelled);s.listening=false;s.recognizing=false;}};s.liveAsr109=handle;
 caption(s,'正在听，录音会分段转成文字…');
 try{
  recorder=await UwUAudioInput99.capture({signal:controller.signal,maxSeconds:45,onPCM:(samples,rate)=>{
   if(!valid()||controller.signal.aborted)return;
   if(!segmenter)segmenter=new Segmenter({rate,silenceMs:cfg.freeSilenceMs110||1500,onSegment:(data,sampleRate)=>{
    try{queue.push(UwUAudioInput99.wav(data,sampleRate));}catch(e){fail(e);}
   },onEnd:spoken=>void finish(spoken)});
   segmenter.feed(samples);
  },onLimit:()=>segmenter?segmenter.finish():void finish(false)});
  if(!valid()||controller.signal.aborted){recorder.cancel();return;}
  s.rawCapture99=recorder;s.asrController=controller;
 }catch(e){handle.cancel();if(s.liveAsr109===handle)s.liveAsr109=null;throw e;}
}
async function listenBrowser(vc,s,valid,cfg,onFinal){
 const R=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!R)throw Error('当前套壳不支持浏览器识别，请在语音识别设置选择 SiliconFlow 分段识别');
 const recognition=new R();s.recognition=recognition;recognition.lang=s.options.language;recognition.continuous=true;recognition.interimResults=true;
 const pieces=[];let timer=null,completed=false;
 const stop=()=>{clearTimeout(timer);if(!completed)try{recognition.stop();}catch{}};
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(stop,cfg.freeSilenceMs110||1500);};
 const aborted=()=>{completed=true;clearTimeout(timer);recognition.abort();};s.controller.signal.addEventListener('abort',aborted,{once:true});
 recognition.onresult=e=>{if(!valid()||completed)return;clearTimeout(timer);let hasFinal=false;for(let i=e.resultIndex;i<e.results.length;i++){pieces[i]={text:e.results[i][0].transcript,final:e.results[i].isFinal};hasFinal=hasFinal||e.results[i].isFinal;}caption(s,'识别中：'+pieces.map(p=>p?.text||'').join(''));if(hasFinal)schedule();};
 recognition.onspeechend=schedule;
 recognition.onerror=e=>{if(!valid()||completed)return;completed=true;clearTimeout(timer);s.controller.signal.removeEventListener('abort',aborted);s.listening=false;if(e.error!=='aborted'){s.micWanted=false;showToast('浏览器识别失败：'+e.error+'，可在语音识别设置改用 SiliconFlow');}caption(s,'');s.changed();};
 recognition.onend=async()=>{clearTimeout(timer);s.controller.signal.removeEventListener('abort',aborted);if(completed||!valid())return;completed=true;s.listening=false;s.recognizing=true;
  const text=pieces.filter(p=>p?.final).map(p=>p.text).join('').trim();
  try{if(text){caption(s,'');await onFinal(text);}else{s.micWanted=false;caption(s,'本轮未返回最终识别文字，请重新收音');}}
  catch(e){if(valid()&&e.name!=='AbortError')showToast(e.message);}
  finally{if(vc.state.voiceSession98===s){s.recognizing=false;s.changed();}}
 };
 try{recognition.start();caption(s,'正在听…');}catch(e){s.controller.signal.removeEventListener('abort',aborted);throw e;}
}
window.UwULiveAsr109={Segmenter,OrderedTranscriber,caption,cancel,listenApi,listenBrowser};
})();
