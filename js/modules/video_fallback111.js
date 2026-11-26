(()=>{'use strict';
// A single image-only retry, only after an explicit media compatibility rejection.
function videoRejected111(status,text){
 if(![400,413,415,422,501].includes(status))return false;
 if(status===413||status===415)return true;
 return /(?:video|audio|mime|codec|视频|音频|音轨)/i.test(text)&&/(?:not.support|unsupported|invalid|unknown|unrecognized|not.allowed|not.accept|expected|only.support|不支持|不接受|无法处理|无效|类型错误)/i.test(text);
}
function frameBody111(body,rows){
 if(!Array.isArray(rows)||!rows.length)return null;let ordinal=0,replaced=0,missing=false;
 const out=JSON.parse(JSON.stringify(body));let videos=0,images=0;
 for(const m of [...(out.messages||[]),...(out.contents||[])])for(const p of (Array.isArray(m.content)?m.content:m.parts||[])){const d=p.inline_data||p.inlineData,mime=d?.mime_type||d?.mimeType||'';if(p.type==='video_url'||/^video\//.test(mime))videos++;else if(p.type==='image_url'||/^image\//.test(mime))images++;}
 if(!videos||images+videos>12)return null;const budget=Math.max(1,Math.min(10,Math.floor((12-images)/videos)));
 for(const m of [...(out.messages||[]),...(out.contents||[])]){
  const gemini=Array.isArray(m.parts),parts=gemini?m.parts:Array.isArray(m.content)?m.content:null;if(!parts)continue;let changed=false;
  const next=parts.flatMap(p=>{
   const media=p.inline_data||p.inlineData,isVideo=p.type==='video_url'||/^video\//.test(media?.mime_type||media?.mimeType||'');if(!isVideo)return [p];
   const index=ordinal++,row=rows.find(r=>r.index===index),frames=row?.frames?.slice(0,budget);if(!frames?.length||frames.some(f=>!/^data:image\/(?:jpeg|png|webp);base64,/.test(f.data||''))){missing=true;return [p];}
   changed=true;replaced++;return frames.flatMap(f=>{const label=(row.label||'视频')+' · 非重复帧 · '+f.time+'秒（无声音）';return gemini?[{text:label},{inline_data:{mime_type:f.data.match(/^data:([^;]+)/)[1],data:f.data.split(',')[1]}}]:[{type:'text',text:label},{type:'image_url',image_url:{url:f.data,detail:'low'}}];});
  });
  if(changed){for(const p of next)if(typeof p.text==='string')p.text=p.text.replace(/完整视频（含文件音轨）/g,'非重复帧（无声音）');const note='接口未接受视频输入，本次视频已改为非重复帧，只能识别提供的画面，不推测声音及缺失画面。';next.push(gemini?{text:note}:{type:'text',text:note});if(gemini)m.parts=next;else m.content=next;}
 }
 return replaced&&!missing?out:null;
}
async function fetchVideoFallback111(send,body,rows,signal){
 const first=await send(body);if(first.ok||signal?.aborted||undefined||!rows?.length)return {response:first,body,used:false};
 if(![400,413,415,422,501].includes(first.status))return {response:first,body,used:false};
 const detail=await first.clone().text();if(!videoRejected111(first.status,detail))return {response:first,body,used:false};
 const fallback=frameBody111(body,rows);if(!fallback)return {response:first,body,used:false};
 if(signal?.aborted)throw new DOMException('已停止','AbortError');
 return {response:await send(fallback),body:fallback,used:true};
}

window.UwUVideoFallback111={videoRejected111,frameBody111,fetchVideoFallback111};
})();
