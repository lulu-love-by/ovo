/* v98 voice transport, local audio cache and a shared PCM audio clock. */
(()=>{'use strict';
const P=UwUVoiceProtocol98,active=new Map(),memory=new Map();let audioContext=null,replay=null,automatic=Promise.resolve(),cleaning=false;
const uid=()=>crypto.randomUUID(),abortError=()=>new DOMException('已停止','AbortError'),ensure=s=>{if(s?.aborted)throw abortError();};
const cacheDB=new Promise((resolve,reject)=>{const r=indexedDB.open('uwu-voice-audio98',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});cacheDB.catch(()=>{});
async function cacheGet(key){if(memory.has(key))return memory.get(key);const d=await cacheDB;return new Promise((resolve,reject)=>{const r=d.transaction('audio').objectStore('audio').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function cachePut(key,data){memory.set(key,data);const d=await cacheDB;await new Promise((resolve,reject)=>{const tx=d.transaction('audio','readwrite');tx.objectStore('audio').put(data,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('音频未能保存'));});memory.delete(key);}
async function cacheList(){const d=await cacheDB,rows=await new Promise((resolve,reject)=>{const out=[],r=d.transaction('audio').objectStore('audio').openCursor();r.onsuccess=()=>{const c=r.result;if(c){out.push([c.key,c.value]);c.continue();}else resolve(out);};r.onerror=()=>reject(r.error);});for(const pair of memory)if(!rows.some(r=>r[0]===pair[0]))rows.push(pair);return rows;}
function beginCleanup(){if(cleaning||active.size)throw Error('声音正在生成或清理，请稍候');cleaning=true;return ()=>{cleaning=false;};}
async function cacheDelete(keys){if(active.size)throw Error('声音正在生成，请结束后再清理');return discardCache111(keys);}
async function discardCache111(keys){if(keys.some(key=>active.has(key)))throw Error('这段声音正在生成，请稍候再清理');const d=await cacheDB;await new Promise((resolve,reject)=>{const tx=d.transaction('audio','readwrite');for(const key of keys)tx.objectStore('audio').delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});for(const key of keys)memory.delete(key);}

async function unlock(){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('此设备不支持音频播放');audioContext??=new C();if(audioContext.state!=='running')await audioContext.resume();if(audioContext.state!=='running')throw Error('请点击声音按钮允许播放');return audioContext;}

async function ttsRequest111(body,signal){;ensure(signal);;return UwUVoiceDirect111.request(body,signal);}
function config(chat){const c=chat.voice98||{},p=(db.apiSettings?.voiceProfiles98||[]).find(x=>x.id===c.profile);if(!p||!c.voice?.trim())throw Error('请先在角色聊天设置的「专属」中选择语音服务、填写音色 ID');return {profile:structuredClone(p),voice:c.voice.trim(),speed:Number(c.speed)||1,output:{mode:c.outputMode||'speaker',devices:{...(c.outputDevices||{})}}};}
class Clock{
 constructor(ctx,signal){this.ctx=ctx;this.signal=signal;this.next=0;this.nodes=new Set();this.waiters=new Set();this.gain=ctx.createGain();this.gain.connect(ctx.destination);this.started111=false;this.timers111=new Set();signal?.addEventListener('abort',()=>this.stop(),{once:true});}
 stop(){for(const timer of this.timers111)clearTimeout(timer);this.timers111.clear();for(const n of this.nodes){n.onended=null;try{n.stop();n.disconnect();}catch{}}this.nodes.clear();for(const wake of this.waiters)wake();this.waiters.clear();this.next=0;try{this.gain.disconnect();}catch{}}
 wait(){ensure(this.signal);const pending=new Set(this.nodes);if(!pending.size)return Promise.resolve();return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{this.waiters.delete(check);this.failed111=Error('播放完成确认超时，本轮已停止');reject(this.failed111);this.stop();},Math.max(8000,(this.next-this.ctx.currentTime)*1000+8000));this.timers111.add(timeout);const check=()=>{for(const node of pending)if(!this.nodes.has(node))pending.delete(node);if(!pending.size){clearTimeout(timeout);this.timers111.delete(timeout);this.waiters.delete(check);resolve();}};this.waiters.add(check);}).then(()=>{ensure(this.signal);if(this.failed111)throw this.failed111;});}
 async capacity(){while(this.next-this.ctx.currentTime>6){ensure(this.signal);await new Promise(r=>setTimeout(r,40));}ensure(this.signal);}
 schedule(buffer){ensure(this.signal);const source=this.ctx.createBufferSource();source.buffer=buffer;source.connect(this.gain);this.gain.gain.cancelScheduledValues(this.ctx.currentTime);this.gain.gain.setValueAtTime(1,this.ctx.currentTime);this.nodes.add(source);source.onended=()=>{source.disconnect();this.nodes.delete(source);if(!this.nodes.size){this.gain.gain.linearRampToValueAtTime(0,this.ctx.currentTime+.02);}for(const fn of [...this.waiters])fn();};const at=Math.max(this.next,this.ctx.currentTime+.05);source.startAt112=at;source.endAt112=at+buffer.duration;source.start(at);this.next=at+buffer.duration;if(!this.started111){const watch=()=>{if(this.signal?.aborted||this.started111)return;if(this.ctx.state!=='suspended'&&this.ctx.currentTime>=at){this.started111=true;this.onStart111?.();return;}const timer=setTimeout(()=>{this.timers111.delete(timer);watch();},10);this.timers111.add(timer);};watch();}}
 isPlaying112(){const t=this.ctx.currentTime;return this.ctx.state!=='suspended'&&[...this.nodes].some(n=>t>=n.startAt112&&t<n.endAt112);}
 pcm(bytes,rate){const n=bytes.length/2,b=this.ctx.createBuffer(1,n,rate),out=b.getChannelData(0),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);for(let i=0;i<n;i++)out[i]=v.getInt16(i*2,true)/32768;this.schedule(b);}
}
function wav(chunks,rate){const size=chunks.reduce((n,c)=>n+c.length,0),a=new Uint8Array(44+size),v=new DataView(a.buffer),str=(at,s)=>{for(let i=0;i<s.length;i++)a[at+i]=s.charCodeAt(i);};str(0,'RIFF');v.setUint32(4,36+size,true);str(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,size,true);let at=44;for(const c of chunks){a.set(c,at);at+=c.length;}return new Blob([a],{type:'audio/wav'});}
function decode64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function generate(ref,text,cfg,clock,signal){
 ensure(signal);const r=await ttsRequest111({profile:cfg.profile,voice:cfg.voice,speed:cfg.speed,id:ref.key,text},signal),reader=r.body.getReader(),decoder=new TextDecoder(),align=new P.PCMAligner();let buf='',meta=null,ended=false,seq=0,total=0,buffered=[],bufferedBytes=0,all=[];
 async function flush(force=false){if(!clock||!buffered.length)return;if(!force&&clock.next<=clock.ctx.currentTime&&bufferedBytes<meta.rate*.36)return;const b=new Uint8Array(bufferedBytes);let at=0;for(const c of buffered){b.set(c,at);at+=c.length;}buffered=[];bufferedBytes=0;await clock.capacity();clock.pcm(b,meta.rate);}
 async function event(e){ensure(signal);if(e.id!==ref.key||ended)throw Error('音频轮次或结束事件错误');if(e.type==='error')throw Error(e.error||'语音生成失败');if(e.type==='meta'){if(meta||![16000,24000,32000,44100,48000].includes(e.rate)||!['pcm','mp3'].includes(e.format))throw Error('音频格式无效');meta=e;clock?.onTransport112?.(e);return;}
 if(!meta)throw Error('缺少音频格式');if(e.type==='audio'){if(e.seq!==seq++)throw Error('音频数据顺序错误');const raw=decode64(e.data);total+=raw.length;if(total>meta.rate*2*120)throw Error('音频过长');const bytes=meta.format==='pcm'?align.feed(raw):raw;if(bytes.length){all.push(bytes);if(clock&&meta.format==='pcm'){if(all.length===1)clock.onFirstChunk111?.();buffered.push(bytes);bufferedBytes+=bytes.length;await flush();}}}
 else if(e.type==='end'){if(e.chunks!==seq||e.bytes!==total||!total)throw Error('音频数据不完整');if(meta.format==='pcm')align.finish();await flush(true);ended=true;}else throw Error('未知音频事件');}
 try{for(;;){ensure(signal);const {value,done}=await reader.read();buf+=done?decoder.decode():decoder.decode(value,{stream:true});if(buf.length>12e6)throw Error('音频事件过大');let at;while((at=buf.indexOf('\n'))>=0){const line=buf.slice(0,at);buf=buf.slice(at+1);if(line.trim())await event(JSON.parse(line));}if(done)break;}if(buf.trim()||!ended)throw Error('声音未完整生成，已停止，不会自动重新收费');
 const blob=meta.format==='pcm'?wav(all,meta.rate):new Blob(all,{type:'audio/mpeg'}),data={blob,createdAt:Date.now(),text,voice:cfg.voice,provider:cfg.profile.provider,category:ref.category||'char-chat'};ensure(signal);
 try{await cachePut(ref.key,data);ref.status='saved';}catch{ref.status='memory';showToast('声音已生成，但本机保存失败，请立即导出音频');}
 if(clock&&meta.format!=='pcm'){const b=await clock.ctx.decodeAudioData(await blob.arrayBuffer());ensure(signal);await clock.capacity();clock.schedule(b);}return data;
 }catch(e){
 if(clock&&meta?.format==='pcm'&&all.length){try{const partial={blob:wav(all,meta.rate),createdAt:Date.now(),text,voice:cfg.voice,provider:cfg.profile.provider,category:ref.category||'char-chat',partial:true};await cachePut(ref.key,partial);ref.status='partial';}catch{}}
 throw e;
 }finally{await reader.cancel().catch(()=>{});}
}
async function getAudio(owner,text,cfg,clock,signal,{regenerate=false,category='char-chat'}={}){
 if(cleaning)throw Error('正在清理语音数据，请稍候再播放或生成');
 const old=owner.audio98;
 if(regenerate&&old&&active.has(old.key))throw Error('这段声音正在生成，请等待完成');
 if(!old&&!text?.trim())throw Error('这条内容没有可朗读的台词');
 if(!old&&cfg&&window.UwUVoiceExpression111&&!window.UwUVoiceExpression111.expressiveSpeech111(text,cfg.profile,cfg.speed).text)return null;
 if(!regenerate&&old){if(old.status==='cleared')throw Error('声音已清理，请选择「重新生成声音」；不会自动付费重做');const data=await cacheGet(old.key);if(data){if(clock){const b=await clock.ctx.decodeAudioData(await data.blob.arrayBuffer());ensure(signal);await clock.capacity();clock.schedule(b);}return data;}
 if(active.has(old.key)){const result=await active.get(old.key);ensure(signal);if(clock){const b=await clock.ctx.decodeAudioData(await result.blob.arrayBuffer());ensure(signal);await clock.capacity();clock.schedule(b);}return result;}
 throw Error('这段声音尚未完整保存或缓存已被清理，请选择「重新生成声音」；不会自动重复付费');}
 const ref={key:uid(),status:'generating',category:old?.category||category};owner.audio98=ref;const promise=generate(ref,text,cfg,clock,signal).catch(e=>{if(ref.status!=='partial')ref.status='failed';throw e;}).finally(()=>active.delete(ref.key));active.set(ref.key,promise);
 let result;
 try{result=await promise;if(category!=='call')await saveData();}catch(e){
  if(old)owner.audio98=old;
  // Failed replacements must not leave a second (possibly partial) recording behind.
  if(regenerate&&old)await discardCache111([ref.key]).catch(()=>showToast('旧语音已保留，但本次生成的临时缓存清理失败'));
  if(category!=='call')await saveData();throw e;
 }
 // Publish/save the complete replacement before removing its predecessor.
 if(regenerate&&old&&old.key!==ref.key)await discardCache111([old.key]).catch(()=>showToast('新语音已生成，但旧语音缓存清理失败，请稍后清理'));
 return result;
}
function session(chat,options){const controller=new AbortController(),cfg=options.sound?config(chat):null;const s={id:uid(),chat,options:{...options},controller,clock:null,cfg,queue:[],running:false,pending:0,textDone:false,changed:()=>{},idle:null};
 s.enqueue=(owner,speech)=>{if(!s.options.sound||!speech)return;if(s.queue.length>=80)throw Error('本轮语音台词过多');const turn=s.floor111?.active;if(turn){owner.callTurn111={epoch:turn.epoch,turn_id:turn.id,k:++turn.k,status:'published'};(turn.entries111??=[]).push(owner);}s.queue.push({owner,speech,cfg:s.cfg,turn});s.pending++;s.changed();if(!s.running)s.audioPump110=pump(s);};
 s.audioEpoch110=0;s.interruptAudio110=()=>{s.audioEpoch110++;s.audioController?.abort();s.clock?.stop();s.queue=[];s.pending=0;s.audioJob112=null;s.running=false;s.audioPump110=null;};s.cancel=()=>{controller.abort();s.interruptAudio110();};window.UwUCallRuntime111?.install(s);s.awaitAudio111=async signal=>{while(s.running||s.pending||s.queue.length){ensure(signal);const p=s.audioPump110;if(p)await new Promise((resolve,reject)=>{const cancel=()=>reject(abortError());signal?.addEventListener('abort',cancel,{once:true});p.then(resolve,reject).finally(()=>signal?.removeEventListener('abort',cancel));});else await new Promise(r=>setTimeout(r,10));}ensure(signal);};return s;}
async function pump(s){
 const job={epoch:s.audioEpoch110},ahead=[],ac=new AbortController(),cancel=()=>ac.abort();
 s.audioJob112=job;s.running=true;s.audioController=ac;
 const current=()=>s.audioJob112===job&&s.audioEpoch110===job.epoch;
 s.controller.signal.addEventListener('abort',cancel,{once:true});let clock=null;
 try{
  await window.UwUVoiceOutput98?.apply(s.cfg);ensure(ac.signal);
  const ctx=await unlock();ensure(ac.signal);clock=new Clock(ctx,ac.signal);s.clock=clock;
  clock.onTransport112=meta=>{
   if(!current())return;s.metrics111&&(s.metrics111.ttsTransport=meta.format==='pcm'?'PCM 流式':'整段音频');
   if(meta.format!=='pcm'&&!s.wholeNotice112){s.wholeNotice112=true;showToast('当前声音服务使用整段音频，需合成完再播放；逐块播放需要支持 PCM 流式的服务。');}
  };
  while(s.queue.length){
   ensure(ac.signal);if(ahead.length>=2)await ahead.shift();ensure(ac.signal);
   const {owner,speech,cfg,turn}=s.queue.shift();
   if(turn&&!s.floor111.current(turn)){s.pending=Math.max(0,s.pending-1);continue;}
   clock.onFirstChunk111=()=>{if(turn&&!turn.firstAudio111){turn.firstAudio111=true;s.metrics111?.mark('audio.first',turn);}};
   clock.onStart111=()=>{if(turn)s.floor111.speaking(turn);};s.metrics111?.mark('tts.start',turn);
   await getAudio(owner,speech,cfg,clock,ac.signal,{category:'call'});ensure(ac.signal);s.metrics111?.mark('tts.end',turn);
   const done=clock.wait().then(()=>{if(current()){if(owner.callTurn111)owner.callTurn111.status='played';s.metrics111?.mark('sentence.played',turn);}}).finally(()=>{if(current()){s.pending=Math.max(0,s.pending-1);s.changed();}});
   done.catch(()=>{});ahead.push(done);
  }
  await Promise.all(ahead);
 }catch(e){
  ac.abort();if(current()){if(e.name!=='AbortError'){showToast(e.message);s.turnFailure111=e.message;s.textController?.abort();}s.queue=[];s.pending=0;clock?.stop();}
 }finally{
  s.controller.signal.removeEventListener('abort',cancel);clock?.stop();
  if(current()){if(s.audioController===ac)s.audioController=null;s.audioJob112=null;s.running=false;s.changed();if(s.queue.length&&!s.controller.signal.aborted)s.audioPump110=pump(s);}
 }
}

function callActive98(){return typeof VideoCallModule!=='undefined'&&VideoCallModule.state.isCallActive;}
function stopReplay98(){replay?.controller.abort();replay=null;}
async function play(owner,text,chat,regenerate=false){
 if(callActive98())throw Error('请先结束当前通话，再播放其他语音');
 if(replay?.owner===owner&&!regenerate)return replay.promise;
 if(replay){replay.controller.abort();replay=null;}
 const ctrl=new AbortController(),state={controller:ctrl,owner,promise:null};replay=state;
 state.promise=(async()=>{const route={output:{mode:chat.voice98?.outputMode||'speaker',devices:chat.voice98?.outputDevices||{}}};await window.UwUVoiceOutput98?.apply(route);const clock=new Clock(await unlock(),ctrl.signal);ensure(ctrl.signal);try{await getAudio(owner,P.speechText(text),owner.audio98&&!regenerate?null:config(chat),clock,ctrl.signal,{regenerate});await clock.wait();}finally{clock.stop();if(replay===state)replay=null;}})();return state.promise;
}

function collapseTranscript(target,chat){const text=target.closest('.voice-transcript');if(!text||!chat)return false;const row=text.closest('.message-wrapper'),msg=chat.history?.find(m=>m.id===row?.dataset.id);if(!msg||!(msg.userAudio99||msg.audio98||(msg.role!=='user'&&chat.voice98?.enabled)))return false;text.classList.remove('active');row.querySelector('.v98-voice-tools button')?.setAttribute('aria-expanded','false');return true;}
function bindBubble(bubble,msg,chat,text){bubble.dataset.voice98='true';const icon=bubble.querySelector('.play-icon');icon?.setAttribute('role','button');icon?.setAttribute('tabindex','0');icon?.setAttribute('aria-label','播放语音');const start=e=>{if(!(msg.audio98||chat.voice98?.enabled))return;e.stopPropagation();void play(msg,text,chat).catch(e=>{if(e.name!=='AbortError')showToast(e.message);});};bubble.addEventListener('click',e=>{if(e.target.closest('.play-icon'))start(e);});icon?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();start(e);}});}
function bubbleTools(){}
function menuItems(msg,chat){const wrap=fn=>()=>Promise.resolve().then(fn).catch(e=>{if(e.name!=='AbortError')showToast(e.message);});if(msg.userAudio99)return msg.userAudio99.data?[{label:'播放语音',action:wrap(()=>UwUAudioInput99.play(msg,chat))},{label:'导出我的原声',action:wrap(()=>UwUAudioInput99.download(msg))}]:[];if(msg.role==='user'||!(msg.audio98||chat.voice98?.enabled))return [];const text=String(msg.content||'').replace(/^\[.*?的语音[：:]([\s\S]*)\]$/,'$1'),items=[{label:'播放语音',action:wrap(()=>play(msg,text,chat))},{label:'重新生成声音',action:wrap(()=>play(msg,text,chat,true))}];if(msg.audio98&&msg.audio98.status!=='cleared')items.push({label:'导出声音',action:wrap(()=>downloadAudio(msg))});return items;}

async function downloadAudio(owner){const data=owner.audio98&&await cacheGet(owner.audio98.key);if(!data)throw Error('还没有已保存的声音');download(data.blob,'UwU-'+owner.audio98.key+(data.blob.type.includes('wav')?'.wav':'.mp3'));}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function onNewMessage(msg,chat){if(msg.role!=='assistant'||!chat.voice98?.enabled||!chat.voice98?.autoGenerate||msg.audio98)return;const m=/^\[.*?的语音[：:]([\s\S]*)\]$/.exec(msg.content||'');if(!m)return;const cfg=config(chat);automatic=automatic.catch(()=>{}).then(async()=>{if(msg.audio98)return;if(chat.voice98.autoPlay&&!callActive98()){await play(msg,m[1],chat);}else{await getAudio(msg,P.speechText(m[1]),cfg,null,new AbortController().signal);}}).catch(e=>showToast(e.message));}
function historyTools(host,record,chat){const U=UwUAssets96,rows=(record.context||[]).filter(m=>m.role==='ai'&&m.type==='voice'&&m.audio98&&['saved','partial','memory'].includes(m.audio98.status));const own=(record.context||[]).filter(m=>m.role==='user'&&m.userAudio99?.data);if(!rows.length&&!own.length)return;const d=document.createElement('div');d.className='v98-history-audio';d.append(U.E('h4','已保存的声音'));for(const msg of rows){const line=U.E('div',undefined,'v98-audio-row');line.append(U.E('span',(msg.audio98.status==='partial'?'[部分声音] ':'')+(window.UwUVoiceExpression111?.stripDelivery111(P.speechText(msg.content))??P.speechText(msg.content))),U.B('播放',()=>play(msg,msg.content,chat)),U.B('导出',()=>downloadAudio(msg)));d.append(line);}for(const msg of own){const line=U.E('div',undefined,'v98-audio-row');line.append(U.E('span','我 · '+(msg.userAudio99.transcript||'原声录音')),U.B('播放',()=>UwUAudioInput99.play(msg,chat)),U.B('导出',()=>UwUAudioInput99.download(msg)));d.append(line);}host.append(d);}
async function backupAudio(){const d=await cacheDB,rows=await new Promise((resolve,reject)=>{const r=d.transaction('audio').objectStore('audio').openCursor(),out=[];r.onsuccess=()=>{const c=r.result;if(c){out.push([c.key,c.value]);c.continue();}else resolve(out);};r.onerror=()=>reject(r.error);});for(const pair of memory)if(!rows.some(x=>x[0]===pair[0]))rows.push(pair);const zip=new JSZip(),manifest=[];for(const [key,data]of rows){zip.file(key+'.audio',await data.blob.arrayBuffer());manifest.push({key,text:data.text,voice:data.voice,provider:data.provider,category:data.category,type:data.blob.type,createdAt:data.createdAt});}zip.file('manifest.json',JSON.stringify(manifest));download(await zip.generateAsync({type:'blob'}),'UwU_声音缓存备份.zip');}
async function importAudio(file){const zip=await JSZip.loadAsync(file),list=JSON.parse(await zip.file('manifest.json').async('text'));if(!Array.isArray(list)||list.length>20000)throw Error('音频备份格式无效');for(const item of list){if(!/^[\w-]{1,100}$/.test(item.key)||!zip.file(item.key+'.audio'))throw Error('音频备份内容缺失');const bytes=await zip.file(item.key+'.audio').async('uint8array');if(bytes.length>20e6)throw Error('单个音频过大');await cachePut(item.key,{blob:new Blob([bytes],{type:item.type}),text:item.text,voice:item.voice,provider:item.provider,category:item.category,createdAt:item.createdAt});}await window.UwUVoiceStorage99?.restored(list.map(i=>i.key));showToast('声音缓存已导入');}
window.UwUVoice98={ttsRequest111,stopReplay98,collapseTranscript,config,unlock,session,play,bindBubble,bubbleTools,menuItems,onNewMessage,historyTools,downloadAudio,backupAudio,importAudio,Clock,cacheGet,getAudio,cacheList,cacheDelete,beginCleanup,isGenerating:()=>active.size>0};
})();
