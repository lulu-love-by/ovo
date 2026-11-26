(()=>{'use strict';
// MiniMax JSON and SSE decoding.
async function* miniMaxMessages111(response,signal){
 if(!response.body)throw Error('MiniMax 未返回响应正文');const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',mode=null,payload=[],json=[];
 const parse=text=>{try{return JSON.parse(text);}catch{throw Error('MiniMax 返回数据不完整或格式无效');}};
 const event=()=>{if(!payload.length)return null;const text=payload.join('\n').trim();payload=[];return text==='[DONE]'?{done111:true}:parse(text);};
 function line(raw){const value=raw.replace(/\r$/,'');if(mode==='json'){json.push(value);return null;}if(!mode){if(!value.trim()||value.startsWith(':'))return null;if(/^[\s]*[\[{]/.test(value)){mode='json';json.push(value);return null;}mode='sse';}
  if(value==='')return event();if(value.startsWith('data:'))payload.push(value.slice(5).trimStart());else if(!/^(?:event|id|retry):|^:/.test(value))throw Error('MiniMax 返回格式无法识别，请检查接口协议和地址');return null;
 }
 try{for(;;){if(signal?.aborted)throw new DOMException('已停止','AbortError');const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});if(buffer.length>12e6||json.reduce((n,s)=>n+s.length,0)>12e6||payload.reduce((n,s)=>n+s.length,0)>12e6)throw Error('MiniMax 单个响应事件过大');let at;while((at=buffer.indexOf('\n'))>=0){const raw=buffer.slice(0,at);buffer=buffer.slice(at+1);const result=line(raw);if(result)yield result;}if(done){if(buffer){const result=line(buffer);if(result)yield result;}if(mode==='json'){yield parse(json.join('\n'));}else{const result=event();if(result)yield result;}break;}}
 }finally{await reader.cancel().catch(()=>{});}
}
async function* miniMaxAudio111(response,{signal,format='pcm',rate=32000,key=''}={}){
 let ended=false,done=false,emitted='',received=0,sawMessage=false;const safe=value=>{let text=String(value||'未知错误');if(key)text=text.split(key).join('[隐藏]');return text.slice(0,400);};
 for await(const message of miniMaxMessages111(response,signal)){
  sawMessage=true;if(message.done111){done=true;continue;}if(!message||typeof message!=='object')throw Error('MiniMax 返回了无效响应');
  const status=message.base_resp?.status_code;if(status!==undefined&&Number(status)!==0)throw Error('MiniMax 错误 '+status+'：'+safe(message.base_resp?.status_msg));
  if(message.error)throw Error('MiniMax：'+safe(message.error.message||message.error));if(message.code!==undefined&&Number(message.code)!==0&&!message.data?.audio)throw Error('MiniMax 错误 '+safe(message.code)+'：'+safe(message.message||message.msg));
  const terminal=Number(message.data?.status)===2,audio=message.data?.audio,reported=String(message.extra_info?.audio_format||'').toLowerCase();
  if(reported&&reported!==format)throw Error('MiniMax 返回 '+reported.toUpperCase()+'，与请求的 '+format.toUpperCase()+' 不一致，请检查完整音频模式');
  if(audio!==undefined&&audio!==null&&audio!==''){
   if(typeof audio!=='string'||audio.length%2||!/^[a-f\d]+$/i.test(audio))throw Error('MiniMax 返回的音频不是有效的十六进制数据');let data=audio.toLowerCase();
   // Older gateways may ignore exclude_aggregated_audio and repeat the complete audio in the final event.
   if(terminal&&emitted&&data.startsWith(emitted))data=data.slice(emitted.length);
   if(data.length){received+=data.length/2;if(received>rate*2*120)throw Error('单段音频超过两分钟');emitted+=data;yield Uint8Array.from(data.match(/../g),h=>parseInt(h,16));}
  }
  if(terminal)ended=true;
 }
 if(signal?.aborted)throw new DOMException('已停止','AbortError');if(!received)throw Error(sawMessage?'MiniMax 未返回音频，请检查模型、音色 ID、余额或服务返回信息':'MiniMax 返回了空响应');
 if(!ended&&!done)throw Error('MiniMax 音频流结束，但未收到完成标记（已接收 '+received+' 字节），未保存为完整声音');
}

window.UwUMiniMax111={miniMaxMessages111,miniMaxAudio111};
})();
