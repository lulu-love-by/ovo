(function(root){'use strict';
// App controls are translated only at the selected provider's request boundary.
const deliveryTag111=/\((?:语速[:：](?:慢|正常|快)|情绪[:：](?:happy|sad|angry|fearful|disgusted|surprised|calm)|语气[:：](?:轻声|耳语|强调)|停顿[:：](?:\d+(?:\.\d+)?|\.\d+)|叹气|轻笑|笑声|吸气|呼气)\)/g;
function stripDelivery111(text){return String(text||'').replace(deliveryTag111,'');}
function voiceCapabilities111(profile={}){
 const provider=String(profile.provider||''),model=String(profile.model||'').trim().toLowerCase();
 const caps={kind:'basic',emotions:false,tones:[],sounds:[],pause:'none'};
 if(provider.startsWith('minimax')){
  caps.kind='minimax';caps.pause='seconds';caps.emotions=/^speech-(?:2\.[68]|02|01)-(?:hd|turbo)$/.test(model);caps.tones=['轻声'];
  if(/^speech-2\.6-(?:hd|turbo)$/.test(model))caps.tones.push('耳语');
  if(/^speech-2\.8-(?:hd|turbo)$/.test(model))caps.sounds=['叹气','轻笑','笑声','吸气','呼气'];
 }else if(provider==='fish'){
  if(['s2-pro','s2.1-pro','s2.1-pro-free','s1'].includes(model)){
   caps.kind=model==='s1'?'fish-s1':'fish-s2';caps.emotions=true;caps.tones=['轻声','耳语','强调'];caps.sounds=['叹气','轻笑','笑声'];caps.pause='cue';
   if(caps.kind==='fish-s2')caps.sounds.push('吸气','呼气');
  }
 }else if(provider==='elevenlabs'){
  if(['eleven_v3','eleven_v4','eleven_v3_conversational','eleven_v4_turbo'].includes(model)){
   caps.kind='eleven-tags';caps.emotions=true;caps.tones=['轻声','耳语','强调'];caps.sounds=['叹气','轻笑','笑声','吸气','呼气'];caps.pause='cue';
  }else if(['eleven_multilingual_v2','eleven_monolingual_v1','eleven_multilingual_v1','eleven_flash_v2','eleven_flash_v2_5','eleven_turbo_v2','eleven_turbo_v2_5'].includes(model)){
   caps.kind='eleven-legacy';caps.pause='ssml';
  }
 }else if(provider==='openai'&&/^gpt-4o-mini-tts(?:-\d{4}-\d{2}-\d{2})?$/.test(model)){
  caps.kind='openai-instructions';caps.emotions=true;caps.tones=['轻声','耳语','强调'];caps.pause='punctuation';
 }
 return caps;
}
function expressiveSpeech111(value,profile={},baseSpeed=1){
 const caps=voiceCapabilities111(profile),source=String(value||''),nodes=[];let at=0;
 for(const match of source.matchAll(deliveryTag111)){
  nodes.push({type:'text',value:source.slice(at,match.index)});at=match.index+match[0].length;
  const parts=match[0].slice(1,-1).split(/[:：]/);nodes.push({type:parts.length>1?parts[0]:'sound',value:parts.length>1?parts[1]:parts[0]});
 }
 nodes.push({type:'text',value:source.slice(at)});
 let factor=1,emotion='',tone='',text='',previousPause=false,usedPause=false;
 const bracket=tag=>caps.kind==='fish-s1'?'('+tag+')':'['+tag+']';
 const emotions={happy:'happy',sad:'sad',angry:'angry',fearful:'scared',disgusted:'disgusted',surprised:'surprised',calm:'calm'};
 const sounds=caps.kind==='minimax'?{叹气:'(sighs)',轻笑:'(chuckle)',笑声:'(laughs)',吸气:'(inhale)',呼气:'(exhale)'}:caps.kind==='eleven-tags'?{叹气:'[sighs]',轻笑:'[chuckles]',笑声:'[laughs]',吸气:'[inhales deeply]',呼气:'[exhales]'}:{叹气:bracket('sighing'),轻笑:bracket('chuckling'),笑声:bracket('laughing'),吸气:bracket('inhale'),呼气:bracket('exhale')};
 for(let i=0;i<nodes.length;i++){
  const n=nodes[i];
  if(n.type==='text'){text+=n.value;if(n.value.trim())previousPause=false;continue;}
  if(n.type==='语速'){factor=({慢:.85,正常:1,快:1.12})[n.value];continue;}
  if(n.type==='情绪'){
   if(caps.emotions){emotion=n.value;
    if(caps.kind.startsWith('fish-'))text+=bracket(emotions[n.value]);
    else if(caps.kind==='eleven-tags')text+=bracket(n.value==='disgusted'?'appalled':emotions[n.value]);
   }continue;
  }
  if(n.type==='语气'){
   if(caps.tones.includes(n.value)){tone=n.value;
    if(caps.kind.startsWith('fish-'))text+=bracket(({轻声:'soft tone',耳语:'whispering',强调:'emphasis'})[n.value]);
    else if(caps.kind==='eleven-tags')text+=bracket(({轻声:'softly',耳语:'whispers',强调:'emphasis'})[n.value]);
   }continue;
  }
  if(n.type==='sound'){if(caps.sounds.includes(n.value))text+=sounds[n.value];continue;}
  if(n.type==='停顿'){
   const seconds=Number(n.value),hasWords=part=>/[\p{L}\p{N}]/u.test(part.filter(p=>p.type==='text').map(p=>p.value).join(''));
   if(previousPause||!Number.isFinite(seconds)||seconds<.01||seconds>2||!hasWords(nodes.slice(0,i))||!hasWords(nodes.slice(i+1)))continue;
   previousPause=true;
   if(caps.pause==='seconds')text+='<#'+seconds.toFixed(2)+'#>';
   else if(caps.pause==='ssml')text+='<break time="'+seconds.toFixed(2)+'s" />';
   else if(caps.kind.startsWith('fish-'))text+=bracket(seconds<.7?'break':'long-break');
   else if(caps.kind==='eleven-tags')text+=bracket(seconds<.7?'short pause':'long pause');
   else if(caps.pause==='punctuation'){text+='…';usedPause=true;}
  }
 }
 let instructions='';
 if(caps.kind==='openai-instructions'){
  const cues=[];
  if(emotion)cues.push('Use a '+({happy:'happy',sad:'sad',angry:'angry',fearful:'fearful',disgusted:'disgusted',surprised:'surprised',calm:'calm'})[emotion]+' emotional tone appropriate to the words.');
  if(tone)cues.push(({轻声:'Speak softly and naturally.',耳语:'Speak in a natural whisper.',强调:'Emphasize the meaning naturally without shouting.'})[tone]);
  if(usedPause)cues.push('Use brief natural pauses at ellipses; do not speak punctuation names.');
  if(cues.length)instructions='Speak only the supplied input in its original language. Keep the selected voice and a natural conversational delivery. '+cues.join(' ');
 }
 return {text:text.trim(),speed:Math.max(.7,Math.min(1.2,(Number(baseSpeed)||1)*factor)),emotion:caps.kind==='minimax'?(tone==='耳语'?'whisper':emotion):'',volume:caps.kind==='minimax'&&tone==='轻声'?.85:1,instructions};
}

function prompt111(chat){
 let profile={};try{profile=root.UwUVoice98.config(chat).profile;}catch{return '';}
 const caps=voiceCapabilities111(profile);
 let prompt='\n<声音表达>根据人设、当时情绪与话意自然说话，可以有嗯、啊、唉等真正说出口的语气词，不必刻意补全书面句。表达变化按情境选择，不要每句添加或反复表演。需要改变语速时，在该条语音或声音标签内开头使用(语速:慢)或(语速:快)，只影响这一条；普通语速无需标记。';
 if(caps.emotions)prompt+='确有需要时在标签开头选择(情绪:happy)、(情绪:sad)、(情绪:angry)、(情绪:fearful)、(情绪:disgusted)、(情绪:surprised)或(情绪:calm)，一条声音以一种情绪为主，其余时候交由声音自然表达。';
 if(caps.tones.length)prompt+='需要时可选择'+caps.tones.map(t=>'(语气:'+t+')').join('、')+'，不必每句指定。';
 if(caps.pause!=='none')prompt+='说话内容之间可用(停顿:0.3)表示语义停顿，通常0.1至0.6秒，不要每个标点都加。'+(['cue','punctuation'].includes(caps.pause)?'当前模型将其作为自然长短停顿提示，不保证精确秒数。':'');
 if(caps.sounds.length)prompt+='此模型支持非语言声音，可在合适位置少量使用'+caps.sounds.map(t=>'('+t+')').join('、')+'。';
 prompt+='只使用以上列出的合成控制标记，不自创英文、方括号或其他服务商的标记；标记不属于说出口的台词，只能出现在语音/声音标签内。动作与场景仍放在原有动作或画面标签，不把动作描述写成台词。</声音表达>\n';return prompt;
}
root.UwUVoiceExpression111={deliveryTag111,stripDelivery111,voiceCapabilities111,expressiveSpeech111,prompt111};
})(globalThis);
