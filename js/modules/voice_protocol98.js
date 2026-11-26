/* Stable call units: only explicit speech tags may enter TTS. */
(function(root){'use strict';
function speechText(value){
 const protected111=[];
 let s=String(value||'').replace(root.UwUVoiceExpression111?.deliveryTag111||/(?!)/g,t=>{protected111.push(t);return '\uE200'+(protected111.length-1)+'\uE201';}).replace(/<(thinking|preplan)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi,'');
 s=s.replace(/「[^」]*」/g,'').replace(/\*[^*]*\*/g,'').replace(/\*[\s\S]*$/,'').replace(/【[^】]*】/g,'').replace(/<[^>]*>/g,'');
 // Parentheses are the app's explicit action/translation notation, including nested ones.
 for(let i=0;i<12&&/[（(]/.test(s);i++)s=s.replace(/[（(][^()（）]*[）)]/g,'');
 s=s.replace(/[（(][\s\S]*$/,'').replace(/\[[^\]]*\]/g,'');
 const quotes=[...s.matchAll(/[“"]([^“”"]+)[”"]/g)];
 if(!protected111.length&&quotes.length&&s.replace(/[“"][^“”"]+[”"]/g,'').replace(/[\s，。！？、：；,.!?:;]/g,''))s=quotes.map(m=>m[1]).join(' ');
 return s.replace(/^[\s“”"「」]+|[\s“”"「」]+$/g,'').replace(/\s+/g,' ').trim().replace(/\uE200(\d+)\uE201/g,(_,i)=>protected111[Number(i)]||'');
}
function stableSentence109(text){
 const opens={'（':'）','(':')','“':'”','「':'」','【':'】','[':']','<':'>'};
 for(const hit of text.matchAll(/[。！？!?；;](?:[”」）)\"]*)/g)){
  const end=hit.index+hit[0].length,prefix=text.slice(0,end),stack=[];let valid=true;
  for(const ch of prefix){if(ch==='"'){if(stack.at(-1)==='"')stack.pop();else stack.push('"');}else if(opens[ch])stack.push(opens[ch]);else if(['）',')','”','」','】',']','>'].includes(ch)){if(stack.at(-1)!==ch){valid=false;break;}stack.pop();}}
  if(valid&&!stack.length)return end;
 }
 return 0;
}
class CallParser{
 constructor(options={}){this.buf='';this.done=false;this.thinking=!!options.thinking;this.incrementalSpeech=!!options.incrementalSpeech&&!options.bilingual;}
 feed(delta){if(this.done)throw Error('通话文字流已结束');this.buf+=delta;if(this.buf.length>200000)throw Error('通话文字过长');const out=[];
 for(;;){
  const audioStart=this.buf.indexOf('<user_audio99');if(audioStart>=0){const audioEnd=this.buf.indexOf('</user_audio99>',audioStart);if(audioEnd>=0){this.buf=this.buf.slice(0,audioStart)+this.buf.slice(audioEnd+15);continue;}if(this.buf.indexOf('[')<0||this.buf.indexOf('[')>=audioStart)return out;}
  if(this.thinking){const m=/<\/(?:thinking|preplan)>/i.exec(this.buf);if(!m)return out;this.buf=this.buf.slice(m.index+m[0].length);this.thinking=false;continue;}
  // Never expose a bracket inside thought XML, including prefilled thought without opening tag.
  const close=this.buf.search(/<\/(?:thinking|preplan)>/i),open=this.buf.search(/<(?:thinking|preplan)\b/i);
  if(close>=0&&(open<0||open<close)){const m=/<\/(?:thinking|preplan)>/i.exec(this.buf);this.buf=this.buf.slice(m.index+m[0].length);continue;}
  if(open>=0){this.buf=this.buf.slice(open);return out;}
  const start=this.buf.indexOf('[');if(start<0)return out;
  let depth=0,end=-1;for(let i=start;i<this.buf.length;i++){if(this.buf[i]==='[')depth++;if(this.buf[i]===']'&&!--depth){end=i;break;}}
  if(end<0){
   if(this.incrementalSpeech){const header=/^([^：:\n]{1,100})[：:]/.exec(this.buf.slice(start+1));
    if(header&&/(?:的)?(?:声音|语音|台词)$/.test(header[1])){const contentStart=start+1+header[0].length,content=this.buf.slice(contentStart),at=stableSentence109(content);
     if(at){const ready=content.slice(0,at).trim();this.buf=this.buf.slice(start,contentStart)+content.slice(at);if(ready)out.push({type:'voice',content:ready,speech:speechText(ready)});continue;}
    }
   }
   return out;
  }
  const unit=this.buf.slice(start+1,end);this.buf=this.buf.slice(end+1);const m=/^([^：:\n]{1,100})[：:]([\s\S]*)$/.exec(unit);if(!m)continue;
  const tag=m[1],content=m[2].trim();if(!content)continue;
  if(/(?:的)?(?:声音|语音|台词)$/.test(tag)){
   let rest=content,at;
   if(this.incrementalSpeech)while((at=stableSentence109(rest))){const ready=rest.slice(0,at).trim();rest=rest.slice(at).trimStart();if(ready)out.push({type:'voice',content:ready,speech:speechText(ready)});}
   if(rest)out.push({type:'voice',content:rest,speech:speechText(rest)});
  }
  else if(/画面|环境|动作|神态|场景/.test(tag))out.push({type:'visual',content,speech:''});
 }
 }
 finish(){if(this.done)return [];const out=this.feed('');this.done=true;if(this.thinking||/<(?:thinking|preplan)\b/i.test(this.buf))throw Error('通话思考流未完整结束');if(/\[[^\]]*$/.test(this.buf))throw Error('通话回复未完整结束，已保留前面的内容');return out;}
}
class PCMAligner{constructor(){this.tail=null;}feed(bytes){if(this.tail!==null){const b=new Uint8Array(bytes.length+1);b[0]=this.tail;b.set(bytes,1);bytes=b;this.tail=null;}if(bytes.length%2){this.tail=bytes[bytes.length-1];return bytes.slice(0,-1);}return bytes;}finish(){if(this.tail!==null)throw Error('音频采样不完整');}}
root.UwUVoiceProtocol98={speechText,CallParser,PCMAligner,stableSentence109};
})(globalThis);
(function(root){'use strict';
async function readText(response,provider,callback,signal,onUsage=()=>{}){const reader=response.body.getReader(),decoder=new TextDecoder();let buf='',full='',terminal=false;async function lineEvent(event){const data=event.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(!data)return;if(data==='[DONE]'){terminal=true;return;}const j=JSON.parse(data);if(j.usageMetadata||j.usage)onUsage(j.usageMetadata||j.usage);if(j.error)throw Error(j.error.message||'模型生成失败');let delta='';if(provider==='gemini'){const c=j.candidates?.[0];delta=c?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('')||'';if(c?.finishReason){if(c.finishReason!=='STOP')throw Error('通话生成提前结束：'+c.finishReason);terminal=true;}}else{const c=j.choices?.[0];delta=c?.delta?.content||'';if(c?.finish_reason){if(!['stop','tool_calls'].includes(c.finish_reason))throw Error('通话生成提前结束：'+c.finish_reason);terminal=true;}}if(delta){full+=delta;await callback(delta);}}
 try{for(;;){if(signal?.aborted)throw new DOMException('已停止','AbortError');const {value,done}=await reader.read();buf+=done?decoder.decode():decoder.decode(value,{stream:true});buf=buf.replace(/\r\n/g,'\n');if(buf.length>1000000)throw Error('模型事件过长');let at;while((at=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,at);buf=buf.slice(at+2);await lineEvent(block);}if(done)break;}if(buf.trim())await lineEvent(buf);if(!terminal)throw Error('通话文字流意外中断，已保留生成内容');return full;}finally{await reader.cancel().catch(()=>{});}}
root.UwUVoiceProtocol98.readText=readText;
})(globalThis);
