/* Direct TTS returns the same audio events as CF, so bubbles and calls share playback/cache logic. */
(()=>{'use strict';
const aborted=()=>new DOMException('已停止','AbortError');
function validateUpstream(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('语音接口须使用不含用户名密码的 HTTPS 地址');return u.href;}
function voiceEndpoint98(base,path,voice=''){const u=new URL(base.replace('{voice_id}',encodeURIComponent(voice)));let p=u.pathname.replace(/\/$/,'');if(p.endsWith(path)||base.includes('{voice_id}'))return u.href;if(!p||p==='/'||p.endsWith('/v1')||p.endsWith('/api'))u.pathname=p.replace(/\/v1$/,'')+path;return u.href;}
function voiceRequest98(d,env){
 const expressiveSpeech111=globalThis.UwUVoiceExpression111.expressiveSpeech111;
 const p=d.profile||{},provider=p.provider;if(!['minimax-cn','minimax-global','elevenlabs','fish','openai'].includes(provider))throw Error('请选择支持的语音协议');
 const delivery=expressiveSpeech111(d.text,p,d.speed),text=delivery.text,voice=String(d.voice||'').trim();if(!text||text.length>6000||!voice||voice.length>300)throw Error('台词或音色 ID 无效');
 if(!p.key||!p.model)throw Error('语音服务缺少密钥或模型');
 const base=String(p.url||'').replace(/\/$/,''),speed=Math.max(.7,Math.min(1.2,delivery.speed));let endpoint,body,headers={'Content-Type':'application/json',Authorization:'Bearer '+p.key},rate=24000,format=p.whole?'mp3':'pcm';
 const full=path=>voiceEndpoint98(base,path,voice);
 if(provider.startsWith('minimax')){rate=32000;endpoint=full('/v1/t2a_v2');const group=String(p.groupId||p.group_id||'').trim();if(group){const u=new URL(endpoint);u.searchParams.set('GroupId',group);endpoint=u.href;}body={model:p.model,text,stream:!p.whole,output_format:'hex',stream_options:{exclude_aggregated_audio:true},voice_setting:{voice_id:voice,speed,vol:delivery.volume,pitch:0,...(delivery.emotion?{emotion:delivery.emotion}:{})},audio_setting:{sample_rate:rate,format,channel:1}};}
 else if(provider==='elevenlabs'){endpoint=full('/v1/text-to-speech/'+encodeURIComponent(voice)+'/stream');const u=new URL(endpoint);u.searchParams.set('output_format',p.whole?'mp3_44100_128':'pcm_24000');endpoint=u.href;headers={'Content-Type':'application/json','xi-api-key':p.key};body={text,model_id:p.model,voice_settings:{speed}};}
 else if(provider==='fish'){rate=p.whole?44100:24000;endpoint=full('/v1/tts');headers.model=p.model;body={text,reference_id:voice,format,sample_rate:rate,prosody:{speed}};}
 else{endpoint=full('/v1/audio/speech');body={model:p.model,input:text,voice,response_format:format,speed,...(delivery.instructions?{instructions:delivery.instructions}:{})};}
 return {endpoint:validateUpstream(endpoint,env),headers,body,rate,format,provider,whole:!!p.whole};
}
function b64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
async function* audioEvents(up,spec,id,signal,key){let total=0,seq=0;const chunk=bytes=>{if(signal.aborted)throw aborted();total+=bytes.length;if(total>spec.rate*2*120)throw Error('单段音频超过两分钟');return bytes.length?{type:'audio',seq:seq++,data:b64(bytes),id}:null;};yield {type:'meta',rate:spec.rate,format:spec.format,id};
 if(spec.provider.startsWith('minimax')){for await(const bytes of UwUMiniMax111.miniMaxAudio111(up,{signal,format:spec.format,rate:spec.rate,key})){const event=chunk(bytes);if(event)yield event;}}
 else{if((up.headers.get('Content-Type')||'').includes('json'))throw Error('语音接口返回了 JSON，未返回音频');if(!up.body)throw Error('语音接口未返回音频');const reader=up.body.getReader();try{for(;;){if(signal.aborted)throw aborted();const {value,done}=await reader.read();if(done)break;const event=chunk(value);if(event)yield event;}}finally{await reader.cancel().catch(()=>{});}}
 if(signal.aborted)throw aborted();if(!total)throw Error('语音接口返回空音频');yield {type:'end',chunks:seq,bytes:total,id};
}
async function request(body,signal){if(signal?.aborted)throw aborted();const spec=voiceRequest98(body),controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});let expired=false,closed=false;const timer=setTimeout(()=>{expired=true;controller.abort();},120000),cleanup=()=>{if(closed)return;closed=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);};let up;
 try{up=await fetch(spec.endpoint,{method:'POST',headers:spec.headers,body:JSON.stringify(spec.body),signal:controller.signal,uwuNative97:true,redirect:'error'});if(!up.ok){await up.body?.cancel();throw Error('语音服务 HTTP '+up.status+'，请检查余额、模型、音色及接口地址');}if(spec.format==='pcm'&&/(?:audio\/(?:mpeg|mp3|wav)|audio\/x-wav)/i.test(up.headers.get('Content-Type')||'')){await up.body?.cancel();throw Error('服务未按请求返回 PCM 音频，请为该中转站开启完整音频模式');}
 if(controller.signal.aborted)throw aborted();const iterator=audioEvents(up,spec,body.id,controller.signal,body.profile?.key),encoder=new TextEncoder();const stream=new ReadableStream({async pull(out){try{const {value,done}=await iterator.next();if(done){cleanup();out.close();}else out.enqueue(encoder.encode(JSON.stringify(value)+'\n'));}catch(e){cleanup();controller.abort();out.error(expired?Error('语音合成超时'):e);}},async cancel(){controller.abort();cleanup();await iterator.return().catch(()=>{});}});return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store'}});
 }catch(e){cleanup();controller.abort();if(expired)throw Error('语音合成超时');if(signal?.aborted||e.name==='AbortError')throw aborted();if(e instanceof TypeError||e.name==='TypeError')throw Error('语音直连失败，请检查网络、接口地址及服务是否允许浏览器跨域访问；未自动切换CF。');throw e;}
}
window.UwUVoiceDirect111={request,voiceRequest98};
})();
