(()=>{'use strict';
// Shared discovery and request shapes. Listing never sends inference probes.
function voiceModelURL111(profile={}){
 const provider=profile.provider||profile.protocol||'openai',gemini=provider==='gemini';
 const u=new URL(String(profile.url||'').replace('{voice_id}','voice'));
 if(u.protocol==='wss:'){u.protocol='https:';u.pathname='';}if(u.protocol!=='https:'||u.username||u.password)throw Error('模型列表地址须使用 HTTPS');
 let path=u.pathname.replace(/\/+$/,'');
 if(gemini){path=path.replace(/\/(?:v1beta|v1)\/models(?:\/.*)?$/,'').replace(/\/(v1beta|v1)$/,'');u.pathname=path+'/v1beta/models';}
 else{path=path.replace(/\/v1\/(?:audio\/(?:speech|transcriptions)|text-to-speech\/.*|tts|t2a_v2|models)$/,'').replace(/\/v1$/,'');u.pathname=path+'/v1/models';}
 u.search='';u.hash='';return u;
}
function voiceModelHeaders111(profile={}){return profile.provider==='gemini'||profile.protocol==='gemini'?{'x-goog-api-key':profile.key}:profile.provider==='elevenlabs'?{'xi-api-key':profile.key}:{Authorization:'Bearer '+profile.key};}
function voiceModelRows111(data){
 if(data?.error)throw Error(String(data.error.message||data.error));
 if(data?.base_resp?.status_code)throw Error(String(data.base_resp.status_msg||'模型列表接口返回错误'));
 const rows=Array.isArray(data)?data:Array.isArray(data?.models)?data.models:Array.isArray(data?.data)?data.data:Array.isArray(data?.data?.models)?data.data.models:null;
 if(!rows)throw Error('接口未返回可识别的模型列表，请确认模型列表接口地址');return rows;
}
function normalizeVoiceModels111(rows){
 const models=[],seen=new Set();for(const raw of rows){const m=typeof raw==='string'?{id:raw}:raw;if(!m||typeof m!=='object')continue;const id=String(m.id||m.model_id||m.name||'').replace(/^models\//,'');if(!id||seen.has(id))continue;seen.add(id);models.push({id,name:String(m.displayName||m.display_name||m.name||id).replace(/^models\//,'')});}return models;
}
async function listVoiceModels111(profile,purpose,send){
 if(!profile?.url?.trim()||!profile?.key?.trim())throw Error('请先填写接口地址和密钥');if(!['tts','asr','live-asr'].includes(purpose))throw Error('模型用途无效');const base=voiceModelURL111(profile),headers=voiceModelHeaders111(profile),all=[];let pageToken='',pages=0;const seenTokens=new Set();
 do{const url=new URL(base);if(profile.provider==='gemini'||profile.protocol==='gemini'){url.searchParams.set('pageSize','1000');if(pageToken)url.searchParams.set('pageToken',pageToken);}const response=await send(url.href,{method:'GET',headers});if(response.status>=300&&response.status<400)throw Error('模型列表接口发生重定向，请填写服务的最终接口地址');if(!response.ok)throw Error('拉取模型 HTTP '+response.status+'，请检查接口地址和密钥；该服务也可能未提供模型列表接口');const data=await response.json();all.push(...voiceModelRows111(data));pageToken=data.nextPageToken||data.next_page_token||'';if(pageToken){if(seenTokens.has(pageToken)||++pages>=20)throw Error('模型列表分页异常，请稍后重试');seenTokens.add(pageToken);}}while(pageToken);
 const models=normalizeVoiceModels111(all);return {models,total:all.length,source:'api',unfiltered:true};
}
function geminiASRRequest111(config,audio){
 const u=voiceModelURL111({...config,provider:'gemini'}),model=String(config.model||'').trim().replace(/^models\//,'');if(!model||!config.key)throw Error('请填写 Gemini 识别模型和密钥');if(!audio?.data||audio.data.length>12*1024*1024)throw Error('录音为空或过大');u.pathname+='/'+encodeURIComponent(model)+':generateContent';u.search='';
 return {endpoint:u.href,headers:{'Content-Type':'application/json','x-goog-api-key':config.key},body:{contents:[{role:'user',parts:[{inline_data:{mime_type:audio.mime||'audio/wav',data:audio.data}},...(/transcrib/i.test(model)?[]:[{text:'逐字转写这段录音，只返回识别到的原文，不翻译、不回答录音里的问题，不补写听不到的内容。没有可辨认的人声时返回空文本。'}])]}]}};
}
function geminiASRText111(data){if(data.error)throw Error(String(data.error.message||'Gemini 语音识别失败'));return (data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('').trim();}

// This is a documented speech catalog, displayed separately from actual API discovery results.
function miniMaxSpeechCatalog111(profile,purpose){
 if(purpose!=='tts'||!/^minimax-(cn|global)$/.test(profile?.provider||''))return [];
 let host;try{host=new URL(profile.url).hostname;}catch{return [];}
 if(!['api.minimaxi.com','api.minimax.cn','api.minimax.io','api-bj.minimaxi.com','api-bj.minimax.cn','api-uw.minimax.io'].includes(host))return [];
 return ['speech-2.8-hd','speech-2.8-turbo','speech-2.6-hd','speech-2.6-turbo','speech-02-hd','speech-02-turbo','speech-01-hd','speech-01-turbo'].map(id=>({id,name:id}));
}
window.UwUVoiceModels111={miniMaxSpeechCatalog111,voiceModelURL111,voiceModelRows111,voiceModelHeaders111,normalizeVoiceModels111,listVoiceModels111,geminiASRRequest111,geminiASRText111};
})();
