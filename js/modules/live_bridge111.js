/* Same Google Live API in both transports. Only worker boot failure, before any
   microphone data is sent, permits the direct-WebSocket compatibility path. */
(()=>{'use strict';
class WorkerClient{
 constructor(config,{signal,onInterim=()=>{}}={}){this.config=config;this.signal=signal;this.onInterim=onInterim;this.pending=new Map();this.id=0;this.request=0;this.closed=false;this.ready112=false;this.mode112='worker';this.abort=()=>this.close();signal?.addEventListener('abort',this.abort,{once:true});}
 detail112(event){let text=String(event?.message||'工作线程未能加载');if(this.config.key)text=text.split(this.config.key).join('***');return text.slice(0,220);}
 async compatible112(reason){
  if(this.closed||this.ready112||this.switching112)return;
  this.switching112=true;this.mode112='direct';this.workerBootError112=reason;
  this.worker?.terminate();this.worker=null;
  try{
   this.direct112=new UwUGeminiLive110.Client(this.config,{signal:this.signal,onInterim:this.onInterim});
   this.direct112.onClose=e=>{if(!this.closed)this.close(e);};
   this.direct112.onResume111=()=>this.onResume111?.();
   await this.direct112.connect();if(this.closed)return;
   this.ready112=true;clearTimeout(this.timer);this.resolve?.();this.resolve=this.reject=null;
  }catch(e){if(!this.closed)this.close(e);}
 }
 connect(){
  if(this.signal?.aborted)return Promise.reject(new DOMException('已停止','AbortError'));
  return new Promise((resolve,reject)=>{
   this.resolve=resolve;this.reject=reject;this.timer=setTimeout(()=>this.close(Error('实时连接超时，请检查网络与 Google 模型权限')),17000);
   try{
    this.worker=new Worker('js/modules/live_worker111.js?v=108tailfix1');
    this.worker.onmessage=({data:m})=>{
     if(this.closed||this.switching112)return;
     if(m.type==='ready'){this.ready112=true;clearTimeout(this.timer);this.resolve?.();this.resolve=this.reject=null;}
     else if(m.type==='interim')this.onInterim(m.text,m.id);
     else if(m.type==='final'){const p=this.pending.get(m.request);this.pending.delete(m.request);p?.resolve(m.text);}
     else if(m.type==='fatal')this.close(Error(m.message));
     else if(m.type==='resumed')this.onResume111?.();
    };
    this.worker.onerror=event=>{
     event.preventDefault?.();if(this.closed||this.switching112)return;
     const detail=this.detail112(event);
     if(!this.ready112)void this.compatible112(detail);
     else this.close(Error('实时工作线程在收音期间中断：'+detail+'。未重发录音，请重新开启麦克风。'));
    };
    this.worker.onmessageerror=()=>this.close(Error('实时线程消息传递失败，本段未自动重发'));
    this.send('connect',{config:this.config});
   }catch(e){void this.compatible112(this.detail112(e));}
  });
 }
 send(type,data={},transfer=[]){if(this.closed)throw new DOMException('已停止','AbortError');this.worker.postMessage({type,...data},transfer);}
 begin(){if(this.direct112)return this.direct112.begin();this.send('begin');return ++this.id;}
 audio(bytes,meta={}){if(this.direct112){this.direct112.audio(bytes,meta);return;}const copy=bytes.slice();this.send('audio',{bytes:copy.buffer,voiced114:meta.voiced114},[copy.buffer]);}
 end(){if(this.direct112)return this.direct112.end();const request=++this.request;return new Promise((resolve,reject)=>{this.pending.set(request,{resolve,reject});try{this.send('end',{request});}catch(e){this.pending.delete(request);reject(e);}});}
 close(error=new DOMException('已停止','AbortError')){if(this.closed)return;this.closed=true;clearTimeout(this.timer);this.reject?.(error);this.resolve=this.reject=null;for(const p of this.pending.values())p.reject(error);this.pending.clear();this.direct112?.close(error);try{this.worker?.postMessage({type:'close'});}catch{}this.worker?.terminate();this.signal?.removeEventListener('abort',this.abort);this.onClose?.(error);}
}
window.UwULiveBridge111={WorkerClient};
})();
