// Diagnostics contain service errors and model names, never credentials or request headers.
(()=>{'use strict';
function redact(s,config={}){let out=String(s||'');for(const secret of [config.key,config.apiKey,...String(config.key||'').split(/[,\n]/)].filter(x=>x&&x.length>3))out=out.split(secret).join('[已隐藏密钥]');return out.replace(/Bearer\s+\S+|sk-[\w-]{8,}|([?&](?:key|api_key)=)[^&\s]+/gi,'[已隐藏密钥]').slice(0,3000);}
async function failure(response,stage,config={}){let raw='';try{raw=await response.text();const j=JSON.parse(raw);raw=j.error?.message||j.message||j.detail||raw;if(typeof raw!=='string')raw=JSON.stringify(raw);}catch{}let host='';try{host=new URL(config.url||'').origin;}catch{}const main=typeof db!=='undefined'&&db.apiSettings;const source=config.source96||(main&&config.url===main.url?'主 API':'工坊独立 API');return Error(redact(`${stage}失败（HTTP ${response.status}）\n${source}${host?' · '+host:''}\n模型：${config.model||'未提供'}\n${raw||'服务没有返回错误详情，请查看该接口的服务日志。'}`,config));}
function network(error,stage,config={}){return Error(redact(stage+'网络请求失败\n'+(config.source96||'工坊 API')+' · 模型：'+(config.model||'未提供')+'\n'+(error?.name==='AbortError'?'请求超时或已取消':error?.message||'网络不可达')+'\n可检查接口地址、网络连接及跨域配置。',config));}
window.UwUApiErrors96={redact,failure,network};
})();
