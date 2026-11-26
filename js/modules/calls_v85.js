(() => {
'use strict';
async function initial(vc,c,type){
 const token=Date.now()+'-'+Math.random(),history=c.history,archive=c.activeArchiveId||null;
 vc.state.callAttempt85=token;
 const valid=()=>vc.state.isCallActive&&vc.state.callAttempt85===token&&c.history===history&&(c.activeArchiveId||null)===archive&&SmartMessaging.state(c).enabled;
 const noticed=UwURealReply85.canCall(c);await saveData();
 async function record(label,text){const msg={id:'call85-'+Date.now(),role:'assistant',content:'['+(c.realName||c.name)+label+(type==='video'?'视频':'语音')+'通话]',timestamp:Date.now()};c.history.push(msg);addMessageBubble(msg,c.id,'private');if(text){const reply={id:msg.id+'-text',role:'assistant',content:'['+(c.realName||c.name)+'的消息：'+text+']',timestamp:Date.now()};c.history.push(reply);addMessageBubble(reply,c.id,'private');MessageNotifications.notify(reply,c.id,'private');}await saveData();}
 if(!noticed){
  await new Promise(resolve=>{const started=Date.now();const timer=setInterval(()=>{if(!valid()||Date.now()-started>=60000){clearInterval(timer);resolve();}},250);});
  if(valid()){await record('未接听');showToast('无人接听');await vc.endCall(true);}return {uwuNoConnect:true};
 }
 const controller=new AbortController();vc.state.decisionController=controller;const timeout=setTimeout(()=>controller.abort(),60000);
 try{
 const raw=await getCallReply(c,type,[{role:'user',content:'我正在呼叫你，请决定接听或拒接。通话尚未接通。'}],()=>{},{decision:true,signal:controller.signal});
 if(!valid())return {uwuNoConnect:true};
 const clean=String(raw||'').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g,'');const choice=JSON.parse(clean);
 if(!['accept','reject'].includes(choice.decision)||typeof choice.text!=='string'||!choice.text.trim())throw Error('来电决策格式无效');
 await saveData();
 if(choice.decision==='reject'){await record('拒绝了',choice.text);await vc.endCall(true);return {uwuNoConnect:true};}
 return choice.text;
 }catch(error){if(valid()){await record('未接听');showToast('来电处理失败，未接通');await vc.endCall(true);}return {uwuNoConnect:true};}
 finally{clearTimeout(timeout);if(vc.state.decisionController===controller)vc.state.decisionController=null;}
}
window.UwUCalls85={initial};
})();
