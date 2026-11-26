// Route only to output devices actually exposed by the browser. Never infer an earpiece from low volume.
(()=>{'use strict';
const isEar=label=>/earpiece|receiver|听筒|受话器/i.test(label||''),isSpeaker=label=>/speaker|扬声器|免提/i.test(label||'');
async function devices(){return navigator.mediaDevices?.enumerateDevices?(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audiooutput'):[];}
function supported(){return typeof (window.AudioContext||window.webkitAudioContext)?.prototype?.setSinkId==='function';}
async function apply(cfg){const ctx=await UwUVoice98.unlock(),mode=cfg?.output?.mode||'speaker',saved=cfg?.output?.devices?.[mode];if(!ctx.setSinkId){if(mode==='earpiece')throw Error('当前浏览器或 APK 未开放听筒切换，请使用免提／系统输出');return;}
 const rows=await devices(),match=rows.find(d=>d.deviceId===saved)||(mode==='earpiece'?rows.find(d=>isEar(d.label)):rows.find(d=>isSpeaker(d.label)));
 if(mode==='earpiece'&&!match)throw Error('没有可用的听筒输出，请先在角色专属设置中选择设备');try{await ctx.setSinkId(match?.deviceId||'');}catch{throw Error('无法使用所选输出设备，请在角色专属设置中重新选择');}}
function render(box,c){const U=UwUAssets96,cfg=c.voice98||{},line=U.E('hr');line.className='v98-output-separator';const section=U.E('section',undefined,'v98-output-settings'),mode=U.S(section,'语音播放方式',[['speaker','免提／系统输出'],['earpiece','听筒']],cfg.outputMode||'speaker'),status=U.E('small',undefined,'v98-output-status');mode.id='voice-output-mode98';let selected={...(cfg.outputDevices||{})};
 const update=async()=>{if(!supported()){status.textContent='当前环境未开放听筒切换，免提模式跟随系统输出。';mode.querySelector('option[value="earpiece"]').disabled=true;return;}const rows=await devices();const has=rows.some(d=>isEar(d.label));status.textContent=has?'已检测到听筒输出。':'听筒是否可用取决于系统提供的输出设备；默认输出可能是耳机。';};void update().catch(()=>status.textContent='暂时无法读取输出设备');
 const choose=U.B('选择输出设备',async()=>{if(!supported())throw Error('当前环境无法切换输出设备');const current=mode.value;let device;if(navigator.mediaDevices?.selectAudioOutput){device=await navigator.mediaDevices.selectAudioOutput(selected[current]?{deviceId:selected[current]}:{});}else{const rows=await devices(),m=U.sheet('选择播放设备');if(!rows.length)m.box.append(U.E('p','系统没有公开可选的播放设备。'));for(const row of rows){m.box.append(U.B(row.label||'音频输出设备',async()=>{if(current==='earpiece'&&!isEar(row.label))throw Error('这个设备没有被系统识别为听筒');selected[current]=row.deviceId;status.textContent='已选：'+(row.label||'音频输出设备')+'，保存角色设置后生效';m.close();}));}return;}
 if(!device)return;if(current==='earpiece'&&!isEar(device.label))throw Error('所选设备没有被系统识别为听筒');selected[current]=device.deviceId;status.textContent='已选：'+(device.label||'音频输出设备')+'，保存角色设置后生效';});
 choose.disabled=!supported();section.append(choose,status);box.append(line,section);return ()=>({outputMode:mode.value,outputDevices:{...selected}});}
let read=null;window.UwUVoiceOutput98={apply,supported,render,load(box,c){read=render(box,c);},save(c){if(read)Object.assign(c.voice98,read());}};
})();
