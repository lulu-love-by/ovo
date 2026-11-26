// Independent manuscripts: no chat-history writes, normal-chat prompts or memory indexing.
(() => {
'use strict';
const jobs=new Map();let saveQueue=Promise.resolve();
const clone=v=>JSON.parse(JSON.stringify(v)),id=()=> 'ss_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);
const defaults={thinkingTags:[{start:'<thinking>',end:'</thinking>'},{start:'<think>',end:'</think>'}],headerPrompt:'',headerPromptEnabled:false,footerPrompt:'',footerPromptEnabled:false,contextPages:6,charPerson:'第三人称',userPerson:'第二人称',minWords:'',maxWords:'',wordMode:'range',referenceMemory:false,memoryMode:'all',memoryCount:10,summaryCount:3,autoSummary:false,summaryInterval:5};
const readerDefaults={font:'serif',size:18,line:1.9,letter:0,paragraph:1.2,margin:24,indent:false,align:'left',background:'#faf9f5',color:'#303238',image:'',imageOpacity:.18,imagePosition:'center',customFont:null};
const PROMPT=`[独立短打创作]
根据提供的资料与本次指令，创作一篇独立的短打小说；续写时承接本篇已有内容。

[资料读取]
请先阅读并理解以下标签内的资料：
<char_persona>：char的人设。
<user_persona>：user的人设。
<worldbook>：本篇绑定的世界书。
<writing_style>：本篇绑定的文风。
<story_instruction>：本次创作或续写指令。
<reference_memory>：选择参考时提供的收藏记忆。
<story_summary>：本篇已有总结。
<story_context>：本篇提供的前文。
<persistent_instruction>：用户设为常驻的初始创作指令，每次继续遵循；本次明确调整优先。

未提供或为空的资料不假装已知；未指定的故事细节可以合理创作。

[人物与创作要求]
 - 理解双方人设中的性格、语气、动机与行为逻辑，并落实到人物言行。
 - 本次指令可以调整双方关系、社会身份、背景与人物变化；明确改动按指令执行，其余沿用所提供的设定。
 - 叙述方式、描写、节奏和语言遵循所选文风；本次指令明确提出的具体要求优先，未指定的部分沿用文风与设定。
 - 根据故事需要描写双方人物，不替人物强加缺少依据的反应。情节与人物变化保持合理衔接。
 - 参考记忆仅在提供时使用，与本篇明确改设冲突的内容不直接套用。本篇故事独立于主线。

[描写人称]
 - char与user分别使用本次设置的第一、第二或第三人称。
 - 人物对话中的人称按说话者与交谈对象正常使用，不受叙述人称限制。
 - 双方都使用第一人称时，切换视角须明确区分，避免两个“我”混淆。

[篇幅]
 - 设置了目标字数范围时，以该范围作为本次生成的篇幅要求。
 - 设置了“不少于”字数时，以该字数作为下限，不设字数上限。
 - 未设置字数要求时，遵循本次指令中的字数要求。
 - 两者均未指定时，根据内容自然安排篇幅。
 - 字数要求针对本次生成，不将已有正文计入。不用重复内容凑字数。

[输出]
 - 首次输出标题和正文，续写不重复标题。
 - 使用普通文字和正常标点，段落间空一行，不加格式标记、代码块或字面的换行转义符。
 - 只输出作品，不附分析、解释或字数汇报。

[续写]
 - 依据本篇提供的最新正文、总结和新指令继续创作，承接已发生事件、人物状态与未完情节。
 - 新指令明确要求改变走向、跳转时间或切换场景时，按要求推进；否则自然接续，不重新开篇或大段复述前文。
 - 总结只作为前文参考，不直接复述为正文。不强制每次生成都收尾，也不固定制造悬念。`;
function state(){const s=db.uwuShortStories??={version:1,documents:[],categories:[]};s.drafts??=[];s.presets??=[];s.presetFolders??=[];for(const d of s.documents)normalizeDoc(d);return s;}
function normalizeDoc(d){
 for(const p of d.pages||[])for(const row of [p,...(p.variants||[])]){if(row.rawResponse&&row.manualBoundary===undefined&&row.unclosedThinking===undefined){const parsed=splitThinking(row.rawResponse,p.generationSettings||d.settings);row.unclosedThinking=parsed.unclosed;if(parsed.unclosed){row.content=parsed.body;row.thinking=[row.nativeThinking||'',parsed.thinking].filter(Boolean).join('\n\n');}}}
 if(d.summarySchema===2)return d;
 d.settings=validateSettings(d.settings);d.summaries??=[];
 const usable=[...d.summaries].reverse().find(s=>!s.stale&&(s.sources||[]).every(h=>d.pages.some(p=>p.id===h.id&&fingerprint(p)===h.hash)));
 for(const s of d.summaries){s.kind=s.kind||'legacy';s.archived=s!==usable;s.sources??=[];}
 d.initialInstructionId=d.pages.find(p=>p.role==='user')?.id||null;d.summarySchema=2;return d;
}
function styles(){return db.uwuWritingStyles??=[];}
function changed(){window.dispatchEvent(new CustomEvent('uwu-stories-change'));}
function persist(key='uwuShortStories'){
 const owner=db,value=clone(db[key]);
 const task=saveQueue.catch(()=>{}).then(async()=>{
  if(db!==owner||db[key]===undefined)throw Error('数据已切换，未覆盖新数据');
  if(window.UwUDataGuard90)await window.UwUDataGuard90.settingCurrent(key,owner);else if(typeof dexieDB!=='undefined'&&dexieDB?.globalSettings)await dexieDB.globalSettings.put({key,value});else await saveData();
 });saveQueue=task;return task;
}
function get(docId){return state().documents.find(d=>d.id===docId);}
function check(doc){if(get(doc.id)!==doc)throw Error('文稿已删除或数据已替换');}
function event(doc){doc.updatedAt=Date.now();changed();}
function validateSettings(raw){
 const x={...defaults,...raw};if(Array.isArray(x.thinkingTags)&&x.thinkingTags.some(t=>(t.start||t.end)&&(!t.start||!t.end||t.start===t.end)))throw Error('请为思维链标签填写不同的起始和结束内容');x.thinkingTags=(Array.isArray(x.thinkingTags)?x.thinkingTags:defaults.thinkingTags).map(t=>({start:String(t.start||''),end:String(t.end||'')})).filter(t=>t.start&&t.end&&t.start!==t.end);for(const k of ['headerPrompt','footerPrompt'])x[k]=String(x[k]??'');for(const k of ['headerPromptEnabled','footerPromptEnabled'])x[k]=x[k]===true;if(raw?.summaryCount===undefined&&raw?.summaryEnabled!==undefined)x.summaryCount=raw.summaryEnabled?1:0;delete x.summaryEnabled;if(!Number.isSafeInteger(Number(x.summaryCount))||Number(x.summaryCount)<0||Number(x.summaryCount)>500)throw Error('参考总结条数须为0至500');x.summaryCount=Number(x.summaryCount);if(!['all','recent'].includes(x.memoryMode))throw Error('请选择有效的收藏日记读取方式');if(x.referenceMemory&&x.memoryMode==='recent'&&(!Number.isSafeInteger(Number(x.memoryCount))||Number(x.memoryCount)<1))throw Error('最近日记条数须为正整数');if(Number.isSafeInteger(Number(x.memoryCount))&&Number(x.memoryCount)>0)x.memoryCount=Number(x.memoryCount);x.wordMode=raw?.wordMode||(x.minWords!==''&&x.maxWords===''?'minimum':'range');if(!['range','minimum'].includes(x.wordMode))throw Error('请选择有效字数要求');if(x.wordMode==='minimum')x.maxWords='';for(const k of ['charPerson','userPerson'])if(!['第一人称','第二人称','第三人称'].includes(x[k]))throw Error('请选择有效描写人称');
 for(const k of ['minWords','maxWords']){if(x[k]===null||x[k]===undefined)x[k]='';if(x[k]!==''&&(!Number.isSafeInteger(Number(x[k]))||Number(x[k])<1||Number(x[k])>100000))throw Error('目标字数须为1至100000的整数或留空');if(x[k]!=='')x[k]=Number(x[k]);}
 if(x.minWords!==''&&x.maxWords!==''&&x.minWords>x.maxWords)throw Error('最少字数不能超过最多字数');
 if(!Number.isSafeInteger(Number(x.contextPages))||Number(x.contextPages)<1||Number(x.contextPages)>500)throw Error('上下文读取页数须为1至500');
 if(!Number.isSafeInteger(Number(x.summaryInterval))||Number(x.summaryInterval)<1||Number(x.summaryInterval)>500)throw Error('总结间隔须为1至500页');
 x.contextPages=Number(x.contextPages);x.summaryInterval=Number(x.summaryInterval);return x;
}
function sourceRows(ids,rows){return [...new Set(ids||[])].map(id=>rows.find(r=>r.id===id&&r.type!=='folder')).filter(Boolean).map(r=>({id:r.id,name:r.name,content:String(r.content||'')}));}
function memories(chat){
 const rows=window.JournalAutomation?.favorites?window.JournalAutomation.favorites(chat):(chat.memoryJournals||[]).filter(j=>j.isFavorited&&!j.needsUpdate);
 return rows.map(j=>({id:j.id,title:j.title||'',content:String(j.content||''),createdAt:Number(j.createdAt)||0})).sort((a,b)=>a.createdAt-b.createdAt);
}
function selectedMemories(doc,settings){const rows=doc.referenceMemory||[];return settings.memoryMode==='recent'?rows.slice(-settings.memoryCount):rows;}
function draft(chat,options){
 if(!(db.characters||[]).includes(chat))throw Error('请选择当前单人聊天角色');
 const settings=validateSettings(options.settings),s=state(),doc={id:id(),charId:chat.id,charName:chat.realName||chat.name||chat.remarkName||'角色',userName:chat.myName||'你',senderName:chat.remarkName||chat.realName||chat.name||'角色',persona:String(chat.persona||''),userPersona:String(chat.myPersona||''),title:String(options.title||'未命名文稿').slice(0,120),categoryId:s.categories.some(c=>c.id===options.categoryId&&c.charId===chat.id)?options.categoryId:null,settings,generationPresetId:String(options.generationPresetId||''),worldbooks:sourceRows(options.worldBookIds,db.worldBooks||[]),writingStyles:sourceRows(options.styleIds,styles()),summaryWorldbooks:sourceRows(options.summaryWorldBookIds,db.worldBooks||[]),referenceMemory:settings.referenceMemory?memories(chat):[],pages:[],summaries:[],summarySchema:2,initialInstructionId:null,reader:{...readerDefaults,...state().lastReader},readPosition:{page:0,scroll:0},createdAt:Date.now(),updatedAt:Date.now(),notice:null,job:null};
 return doc;
}
async function create(chat,options){const doc=draft(chat,options),s=state();
 s.documents.push(doc);try{await persist();}catch(e){s.documents=s.documents.filter(d=>d!==doc);throw e;}changed();return doc;
}
// Creation drafts and binding combinations live beside manuscripts, never in chat history.
async function saveDraft(charId,data,oldId=null){
 if(!(db.characters||[]).some(c=>c.id===charId))throw Error('角色已不存在');
 const list=state().drafts,old=list.find(d=>d.id===oldId&&d.charId===charId),before=old?clone(old):null;
 const value={title:String(data.title||''),categoryId:data.categoryId||null,settings:clone(data.settings||defaults),worldBookIds:[...new Set(data.worldBookIds||[])],styleIds:[...new Set(data.styleIds||[])],summaryWorldBookIds:[...new Set(data.summaryWorldBookIds||[])],instruction:String(data.instruction||''),presetId:data.presetId||'',ui:clone(data.ui||{}),updatedAt:Date.now()};
 let row=old;if(row)Object.assign(row,value);else list.push(row={id:id(),charId,createdAt:Date.now(),...value});
 try{await persist();}catch(e){if(before)Object.assign(row,before);else list.splice(list.indexOf(row),1);throw e;}changed();return row;
}
async function removeDraft(draftId){const list=state().drafts,at=list.findIndex(d=>d.id===draftId);if(at<0)return;const [row]=list.splice(at,1);try{await persist();}catch(e){list.splice(at,0,row);throw e;}changed();}
function requirePresetFolder(folderId){if(folderId&&!state().presetFolders.some(f=>f.id===folderId))throw Error('预设文件夹已删除');return folderId||null;}
async function savePresetFolder(name,parentId=null,folderId=null){name=String(name||'').trim();if(!name)throw Error('请填写文件夹名称');parentId=requirePresetFolder(parentId);const folders=state().presetFolders,old=folders.find(f=>f.id===folderId);if(folderId&&!old)throw Error('文件夹已删除');let at=parentId,seen=new Set();while(at){if(at===folderId||seen.has(at))throw Error('不能移入自身或子文件夹');seen.add(at);at=folders.find(f=>f.id===at)?.parentId;}
 const before=old?{...old}:null,row=old||{id:id()};Object.assign(row,{name,parentId});if(!old)folders.push(row);try{await persist();}catch(e){if(before)Object.assign(row,before);else folders.splice(folders.indexOf(row),1);throw e;}changed();return row;}
async function moveLibraryPreset(kind,presetId,folderId){folderId=requirePresetFolder(folderId);const rows=kind==='generation'?state().presets:[];const row=rows.find(p=>p.id===presetId);if(!row)throw Error('预设已删除');const old=row.folderId;row.folderId=folderId;try{await persist();}catch(e){row.folderId=old;throw e;}changed();}
async function removePresetFolder(folderId){const s=state(),at=s.presetFolders.findIndex(f=>f.id===folderId);if(at<0)return;const folder=s.presetFolders[at],changes=[];for(const row of [...s.presetFolders,...s.presets]){const key=s.presetFolders.includes(row)?'parentId':'folderId';if(row[key]===folderId){changes.push([row,key,row[key]]);row[key]=folder.parentId||null;}}s.presetFolders.splice(at,1);try{await persist();}catch(e){s.presetFolders.splice(at,0,folder);for(const [row,key,value]of changes)row[key]=value;throw e;}changed();}
function presetConfig(preset){const config=clone(preset.config||{worldBookIds:preset.worldBookIds||[],styleIds:preset.styleIds||[]});return config;}
async function savePreset(name,config,stylesOrId=[],oldId=null){
 name=String(name||'').trim();if(!name)throw Error('请填写预设名称');const legacy=Array.isArray(config),presetId=legacy?oldId:typeof stylesOrId==='string'?stylesOrId:oldId;
 const value={name,worldBookIds:[...new Set((legacy?config:config.worldBookIds)||[])],styleIds:[...new Set((legacy?stylesOrId:config.styleIds)||[])],updatedAt:Date.now()};
 if(!legacy){value.config={};for(const key of ['title','categoryId','categoryName','charId','settings','worldBookIds','styleIds','summaryWorldBookIds'])if(config[key]!==undefined)value.config[key]=clone(config[key]);value.version=2;}
 if(!legacy&&Object.hasOwn(config,'folderId'))value.folderId=requirePresetFolder(config.folderId);
 const list=state().presets,old=list.find(p=>p.id===presetId),before=old?clone(old):null;let row=old;if(row)Object.assign(row,value);else list.push(row={id:id(),...value});
 try{await persist();}catch(e){if(before)Object.assign(row,before);else list.splice(list.indexOf(row),1);throw e;}changed();return row;
}

async function removePreset(presetId){const list=state().presets,at=list.findIndex(p=>p.id===presetId);if(at<0)return;const [row]=list.splice(at,1);try{await persist();}catch(e){list.splice(at,0,row);throw e;}changed();}
function escapeData(text){return String(text||'').replace(/</g,'＜').replace(/>/g,'＞');}
const tag=(name,text)=>`<${name}>\n${escapeData(text)}\n</${name}>`;
function substitutions(doc,text){return String(text||'').replace(/\{\{char\}\}/g,doc.charName).replace(/\{\{user\}\}/g,doc.userName);}
function fingerprint(p){let h=2166136261;const s=p.role+'\n'+p.content;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return String(h>>>0);}
function summaryFingerprint(s){return fingerprint({role:s.kind||'small',content:s.content+'\n'+JSON.stringify(s.sources||[])});}
function validSummary(doc,s){return !!s&&!s.archived&&!s.stale&&!!s.content?.trim()&&(s.sources||[]).every(x=>doc.pages.some(p=>p.id===x.id&&fingerprint(p)===x.hash))&&(s.sourceSummaries||[]).every(x=>{const child=doc.summaries.find(v=>v.id===x.id);return child&&child.kind!=='large'&&validSummary(doc,child)&&summaryFingerprint(child)===x.hash;});}
function latestSummary(doc){return [...doc.summaries].reverse().find(s=>validSummary(doc,s));}
function selectedSummaries(doc,settings=doc.settings){
 const count=validateSettings(settings).summaryCount;if(!count)return [];
 const selected=[],covered=new Set(),represented=new Set();for(const s of [...doc.summaries].reverse()){
  if(!validSummary(doc,s)||covered.has(s.id)||(s.sources.length&&s.sources.every(h=>represented.has(h.id+':'+h.hash))))continue;selected.push(s);for(const h of s.sources)represented.add(h.id+':'+h.hash);
  for(const x of s.sourceSummaries||[])covered.add(x.id);
  if(selected.length===count)break;
 }return selected.sort((a,b)=>Math.min(...a.sources.map(h=>doc.pages.findIndex(p=>p.id===h.id)))-Math.min(...b.sources.map(h=>doc.pages.findIndex(p=>p.id===h.id))));
}
function initialInstruction(doc){return doc.pages.find(p=>p.id===doc.initialInstructionId&&p.role==='user');}
function prepare(doc,instruction,settings=doc.settings,excludeIds=[]){
 settings=validateSettings(settings);const summaries=selectedSummaries(doc,settings),initial=initialInstruction(doc),pinned=initial?.persistent&&!excludeIds.includes(initial.id)?initial:null;
 const pages=doc.pages.filter(p=>!(p.role==='assistant'&&(p.unclosedThinking||splitThinking(p.content,settings).unclosed))&&!excludeIds.includes(p.id)&&!['failed','generating'].includes(p.status)&&p.content?.trim()&&p.id!==pinned?.id).slice(-settings.contextPages);
 const sections=[['内置规则',PROMPT],['人物',tag('char_persona',doc.charName+'\n'+doc.persona)+'\n'+tag('user_persona',doc.userName+'\n'+doc.userPersona)],['世界书',tag('worldbook',doc.worldbooks.map(w=>w.name+'\n'+substitutions(doc,w.content)).join('\n\n'))],['文风',tag('writing_style',doc.writingStyles.map(w=>w.name+'\n'+substitutions(doc,w.content)).join('\n\n'))],['本次指令',[pinned?tag('persistent_instruction',substitutions(doc,pinned.content)):'',tag('story_instruction',substitutions(doc,instruction))].filter(Boolean).join('\n\n')],['记忆',settings.referenceMemory?tag('reference_memory',selectedMemories(doc,settings).map(m=>(m.title||'')+'\n'+m.content).join('\n\n')):''],['总结',summaries.length?tag('story_summary',summaries.map(s=>`${s.kind==='large'?'大总结':'小总结'} · ${summaryRange(doc,s)}\n${s.content}`).join('\n\n')):''],['最近前文',tag('story_context',pages.map(p=>`第${doc.pages.indexOf(p)+1}页 · ${p.role==='user'?'创作指令':'正文'}\n${p.role==='assistant'?splitThinking(p.content,settings).body:p.content}`).join('\n\n'))],['生成设置',`char描写：${settings.charPerson}；user描写：${settings.userPerson}。\n${settings.wordMode==='minimum'&&settings.minWords!==''?`本次篇幅：不少于${settings.minWords}字，不设字数上限。`:settings.minWords!==''||settings.maxWords!==''?`本次目标字数：${settings.minWords!==''?'至少'+settings.minWords+'字':''}${settings.minWords!==''&&settings.maxWords!==''?'，':''}${settings.maxWords!==''?'至多'+settings.maxWords+'字':''}。`:'未设置字数范围，按本次指令中的字数要求；指令也未指定时自然安排。'}\n${doc.pages.some(p=>p.role==='assistant'&&!excludeIds.includes(p.id)&&p.content)?'本次为续写，不重复作品标题。':'本次为首次创作，第一行单独输出作品标题，空一行后输出正文。'}`]];
 const token=text=>typeof countTextTokens==='function'?countTextTokens(text):Math.ceil(text.length*.9);
 let messages=[{role:'system',content:sections[0][1]},{role:'user',content:sections.slice(1).map(x=>x[1]).filter(Boolean).join('\n\n')}];
 const extra=[];if(settings.headerPromptEnabled&&settings.headerPrompt.trim()){const content=substitutions(doc,settings.headerPrompt);messages.unshift({role:'system',content});extra.push({name:'头部提示词',tokens:token(content)});}if(settings.footerPromptEnabled&&settings.footerPrompt.trim()){const content=substitutions(doc,settings.footerPrompt);messages.push({role:'user',content});extra.push({name:'尾部提示词',tokens:token(content)});}
 const breakdown=sections.map(([name,text])=>({name,tokens:token(text)}));
 breakdown.push(...extra);
 return {messages,breakdown,tokens:messages.reduce((n,m)=>n+token(m.content)+4,0),pageIds:pages.map(p=>p.id),summaryIds:summaries.map(s=>s.id),summaryId:summaries.at(-1)?.id||null};
}
function validateSummaryApi(value){
 const x={provider:value?.provider||'newapi',url:String(value?.url||'').trim(),key:String(value?.key||'').trim(),model:String(value?.model||'').trim(),temperatureEnabled:value?.temperatureEnabled===true,temperature:Number(value?.temperature??.7)};
 const n=['url','key','model'].filter(k=>x[k]).length;if(!n)return null;if(n!==3)throw Error('总结 API 的地址、密钥和模型须填完整，或全部留空跟随正文');
 if(!['newapi','deepseek','claude','gemini'].includes(x.provider))throw Error('请选择有效的API服务商');if(x.temperatureEnabled&&(!Number.isFinite(x.temperature)||x.temperature<0||x.temperature>2))throw Error('温度须为0至2');return x;
}
function apiConfig(summary=false){
 const custom=summary?validateSummaryApi(state().summaryApi):null,config=custom?{...custom,isSecondaryApi:false}:resolveAuxiliaryApiConfig('shortStories'),label=custom?'总结独立API':config.isSecondaryApi?'副API':'主API';
 if(!['url','key','model'].every(k=>String(config[k]||'').trim()))throw Error('请先在API设置中完整配置'+label);
 if((typeof BLOCKED_API_DOMAINS!=='undefined'?BLOCKED_API_DOMAINS:[]).some(d=>config.url.includes(d)))throw Error('此API地址不可使用');
 return {...config,streamEnabled:true};
}
function splitThinking(raw,settings=defaults,final=true){
 const tags=validateSettings(settings).thinkingTags;let body='',thinking='',cursor=0,unclosed=false;
 while(cursor<raw.length){let match=null;for(const t of tags){const at=raw.indexOf(t.start,cursor);if(at>=0&&(!match||at<match.at))match={...t,at};}if(!match){let rest=raw.slice(cursor);if(!final){let cut=0;for(const t of tags)for(let n=1;n<t.start.length;n++)if(rest.endsWith(t.start.slice(0,n)))cut=Math.max(cut,n);if(cut)rest=rest.slice(0,-cut);}body+=rest;break;}
 body+=raw.slice(cursor,match.at);const from=match.at+match.start.length,to=raw.indexOf(match.end,from);if(to<0){if(final)body+=raw.slice(match.at);else thinking+=raw.slice(from);unclosed=true;break;}thinking+=raw.slice(from,to)+'\n\n';cursor=to+match.end.length;
 }return {body:body.trim(),thinking:thinking.trim(),unclosed};
}
function interruptionText(d){
 if(!d)return '接口未提供更多详情';const rows=[];if(d.finish)rows.push('停止标记：'+d.finish);if(d.finishMessage)rows.push('接口说明：'+d.finishMessage);if(d.blockReason)rows.push('输入拦截原因：'+d.blockReason);if(d.safetyRatings?.length)rows.push('安全分类与评分：'+JSON.stringify(d.safetyRatings));if(d.contentFilterResults)rows.push('内容过滤详情：'+JSON.stringify(d.contentFilterResults));if(d.incomplete)rows.push('输出流未正常结束；未收到明确停止原因');if(rows.length<=1)rows.push('接口未提供更多详情');return rows.join('\n');
}
function outputParts(data,provider,stream){
 if(provider==='gemini'){const cand=data.candidates?.[0];return {text:(cand?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join(''),thinking:(cand?.content?.parts||[]).filter(p=>p.thought).map(p=>p.text||'').join(''),finish:cand?.finishReason,finishMessage:cand?.finishMessage,blockReason:data.promptFeedback?.blockReason,safetyRatings:cand?.safetyRatings||data.promptFeedback?.safetyRatings,usage:data.usageMetadata};}
 const c=data.choices?.[0];return {text:(stream?c?.delta?.content:c?.message?.content)||'',thinking:(stream?c?.delta?.reasoning_content??c?.delta?.reasoning:c?.message?.reasoning_content??c?.message?.reasoning)||'',finish:c?.finish_reason,contentFilterResults:c?.content_filter_results||data.prompt_filter_results,usage:data.usage};
}
async function request(messages,signal,onText=()=>{},summary=false,settings=defaults){
 const config=apiConfig(summary),q=buildChatApiRequest(config,messages,{temperature:config.temperatureEnabled?Number(config.temperature):undefined});if(config.provider==='gemini'){q.endpoint=q.endpoint.replace(':generateContent',':streamGenerateContent');q.endpoint+=(q.endpoint.includes('?')?'&':'?')+'alt=sse';}else q.requestBody.stream=true;
 ;
 const apiFetch97=(fetch);const r=await apiFetch97(q.endpoint,{method:'POST',headers:q.headers,body:JSON.stringify(q.requestBody),signal});
 if(!r.ok){let detail=await r.text();if(config.key)detail=detail.split(config.key).join('[隐藏]');throw Error('API返回 '+r.status+'：'+detail.slice(0,600));}
 let text='',thinking='',finish=null,usage=null,ended=false,streamed=false,details={};const accept=(data,stream)=>{if(data.error)throw Error(String(data.error.message||'API返回错误'));const o=outputParts(data,config.provider,stream);if(typeof o.text!=='string')throw Error('API正文格式不支持');text+=o.text;if(typeof o.thinking==='string')thinking+=o.thinking;for(const k of ['finishMessage','blockReason','safetyRatings','contentFilterResults'])if(o[k])details[k]=o[k];if(o.finish)finish=o.finish;if(o.usage)usage=o.usage;if(o.text||o.thinking){const parsed=splitThinking(text,settings,false);onText(parsed.body,{thinking:[thinking,parsed.thinking].filter(Boolean).join('\n\n'),raw:text,unclosed:parsed.unclosed});}};
 if((r.headers.get('content-type')||'').includes('text/event-stream')){
  streamed=true;const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',payload=[];
  const consume=line=>{if(line===''){if(payload.length){const raw=payload.join('\n');payload=[];if(raw==='[DONE]')ended=true;else accept(JSON.parse(raw),true);}return;}if(line.startsWith('data:'))payload.push(line.slice(5).trimStart());};
  try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let at;while((at=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,at).replace(/\r$/,''));buffer=buffer.slice(at+1);}}buffer+=decoder.decode();if(buffer)consume(buffer.replace(/\r$/,''));consume('');}finally{reader.releaseLock();}
 }else{const data=await r.json();if(Array.isArray(data)){for(const x of data)accept(x,false);}else accept(data,false);}
 if(signal.aborted)throw Error('生成已停止');const filtered=!!details.blockReason||/SAFETY|RECITATION|BLOCKLIST|PROHIBITED|SPII|content_filter/i.test(finish||'');
 const incomplete=streamed&&!finish&&!ended;details={...details,finish,incomplete};const parsed=splitThinking(text,settings,true);if(parsed.unclosed)details.finishMessage=[details.finishMessage,'思维链起始标签没有对应的结束标签，原文已保留，请手动选择正文起始行。'].filter(Boolean).join('\n');const result={text:parsed.body,raw:text,nativeThinking:thinking,thinking:[thinking,parsed.thinking].filter(Boolean).join('\n\n'),unclosedThinking:parsed.unclosed,details,finish,usage,incomplete,filtered,truncated:filtered||incomplete||parsed.unclosed||/length|MAX_TOKENS/i.test(finish||'')};
 if(!result.text.trim()){const error=Error(filtered?'接口返回内容过滤，未收到正文。':result.thinking?'接口只返回了思考内容，没有正文。':'API没有返回正文');error.result=result;throw error;}return result;
}
function parseFirst(text){const lines=String(text).replace(/^\uFEFF/,'').trim().split(/\r?\n/),line=lines[0].replace(/^#{1,6}\s*/, '').trim();if(lines.length>1&&line.length>0&&line.length<=100)return {title:line.replace(/^《|》$/g,''),body:lines.slice(1).join('\n').replace(/^\s*\n/,'')};return {title:null,body:text.trim()};}
async function generate(doc,instruction,settings=doc.settings,retry=false){
 check(doc);;if(jobs.has(doc.id))throw Error('本篇正在生成，请稍候');if(!String(instruction||'').trim())throw Error('请填写创作或续写指令');apiConfig();const originalStore=state();
 settings=validateSettings(settings);let user,answer;
 if(retry&&doc.job?.userId&&doc.job?.targetId){user=doc.pages.find(p=>p.id===doc.job.userId);answer=doc.pages.find(p=>p.id===doc.job.targetId);if(!user||!answer)throw Error('原任务记录不完整');instruction=user.content;}else{user={id:id(),role:'user',content:String(instruction),createdAt:Date.now(),status:'complete'};answer={id:id(),role:'assistant',content:'',createdAt:Date.now(),status:'generating'};answer.instructionId=user.id;answer.generationSettings=clone(settings);doc.pages.push(user,answer);if(!doc.initialInstructionId&&doc.pages.length===2)doc.initialInstructionId=user.id;}
 if(retry&&answer.content)return reroll(doc,answer.id);const prior={settings:doc.settings,job:doc.job,answer:clone(answer)};doc.settings=settings;answer.status='generating';answer.content='';answer.thinking='';answer.rawResponse='';answer.interruption=null;answer.unclosedThinking=false;answer.nativeThinking='';delete answer.manualBoundary;
 const firstResponse=!doc.pages.some(p=>p!==answer&&p.role==='assistant'&&p.content),prepared=prepare(doc,instruction,settings,[user.id,answer.id]),job={id:id(),kind:'story',status:'running',userId:user.id,targetId:answer.id,instruction:String(instruction),startedAt:Date.now(),error:'',tokens:prepared.tokens},controller=new AbortController();doc.job=job;jobs.set(doc.id,controller);event(doc);
 try{await persist();}catch(e){jobs.delete(doc.id);if(!retry)doc.pages=doc.pages.filter(p=>p!==user&&p!==answer);else Object.assign(answer,prior.answer);doc.settings=prior.settings;doc.job=prior.job;changed();throw e;}
 let lastSave=Date.now();const valid=()=>state()===originalStore&&get(doc.id)===doc&&doc.job===job;
 try{
  const result=await request(prepared.messages,controller.signal,(text,meta)=>{if(meta){answer.thinking=meta.thinking;answer.rawResponse=meta.raw;}if(!valid()){controller.abort();return;}if(firstResponse){const parsed=parseFirst(text);if(parsed.title&&parsed.body.trim()){doc.title=parsed.title;answer.generatedTitle=parsed.title;answer.content=parsed.body;}else answer.content=text;}else answer.content=text;changed();if(Date.now()-lastSave>4000){lastSave=Date.now();void persist().catch(()=>{});}},false,settings);
  if(!valid())return;
  if(firstResponse&&!result.unclosedThinking){const parsed=parseFirst(result.text);if(parsed.title){doc.title=parsed.title;answer.generatedTitle=parsed.title;}answer.content=parsed.body;}else answer.content=result.text.trim();
  if(!answer.content.trim())throw Error('API只返回了标题，没有正文，请重试');
  answer.cfPending97=null;;answer.thinking=result.thinking;answer.nativeThinking=result.nativeThinking;answer.unclosedThinking=result.unclosedThinking;answer.rawResponse=result.raw;answer.interruption=result.truncated?result.details:null;
  answer.status=result.truncated?'partial':'complete';answer.updatedAt=Date.now();job.status=result.truncated?'partial':'complete';job.usage=result.usage;job.error=result.filtered?'接口返回内容过滤（'+result.finish+'），已保留收到的正文。可在续写中修改指令后继续。':result.incomplete?'输出流未正常结束，已保留收到的正文，可继续续写。':result.unclosedThinking?'思考标签未闭合，原文已保留，请选择正文起始行。':result.truncated?'输出达到接口上限，已保留正文，可继续续写。':'';doc.notice={id:id(),pageId:answer.id,status:'pending'};event(doc);
  try{await persist();}catch(e){job.status='save_failed';job.error='正文已生成但保存失败，请重试保存';changed();return;}
  ;
  window.dispatchEvent(new CustomEvent('uwu-story-ready',{detail:{id:doc.id,noticeId:doc.notice.id}}));
 }catch(e){if(valid()){
  if(e.result){answer.thinking=e.result.thinking;answer.nativeThinking=e.result.nativeThinking;answer.unclosedThinking=e.result.unclosedThinking;answer.rawResponse=e.result.raw;answer.interruption=e.result.details;}const hasText=!!answer.content.trim();answer.status=hasText?'partial':'failed';job.status=controller.signal.aborted?'stopped':'failed';job.error=String(e.message).slice(0,700);if(!answer.interruption)answer.interruption={finish:controller.signal.aborted?'USER_STOP':null,finishMessage:job.error};
  if(hasText)doc.notice={id:id(),pageId:answer.id,status:'pending'};
  event(doc);try{await persist();if(hasText)window.dispatchEvent(new CustomEvent('uwu-story-ready',{detail:{id:doc.id,noticeId:doc.notice.id}}));}catch(saveError){job.status='save_failed';job.error='保存失败，请重试保存';}
 }}
 finally{if(jobs.get(doc.id)===controller)jobs.delete(doc.id);changed();}
 if(valid()&&['complete','partial'].includes(job.status))scheduleAutoSummary111(doc);
}
function summaryRange(doc,s){const indices=(s.sources||[]).map(h=>doc.pages.findIndex(p=>p.id===h.id)+1).filter(n=>n>0);return indices.length?`第 ${Math.min(...indices)}–${Math.max(...indices)} 页`:'原楼层已删除';}
function pendingSummaryPages(doc){const covered=new Set(doc.summaries.filter(s=>s.kind!=='large'&&validSummary(doc,s)).flatMap(s=>s.sources.map(h=>h.id)));return doc.pages.filter(p=>p.role==='assistant'&&p.content?.trim()&&['complete','partial'].includes(p.status)&&!p.unclosedThinking&&!splitThinking(p.content,doc.settings).unclosed&&!covered.has(p.id));}
function needsSummary(doc){return pendingSummaryPages(doc).length>=doc.settings.summaryInterval;}
const autoSummaryTimers111=new WeakMap();
function scheduleAutoSummary111(doc){
 if(!doc?.settings?.autoSummary||autoSummaryTimers111.has(doc))return;
 const owner=db;const timer=setTimeout(()=>{autoSummaryTimers111.delete(doc);if(db===owner&&get(doc.id)===doc)void autoSummarize111(doc);},0);autoSummaryTimers111.set(doc,timer);
}
async function autoSummarize111(doc){
 if(get(doc.id)!==doc||!doc.settings.autoSummary||jobs.has(doc.id)||!needsSummary(doc))return;
 try{await summarize(doc);}catch(e){if(get(doc.id)===doc){doc.summaryError=String(e.message);doc.summaryStatus='failed';await persist().catch(()=>{});changed();}}
}
async function summarize(doc,selectedIds=null){
 check(doc);;if(jobs.has(doc.id))throw Error('本篇正在生成，请稍候');apiConfig(true);
 const large=Array.isArray(selectedIds),chosen=large?doc.summaries.filter(s=>selectedIds.includes(s.id)&&s.kind!=='large'&&validSummary(doc,s)).sort((a,b)=>Math.min(...a.sources.map(h=>doc.pages.findIndex(p=>p.id===h.id)))-Math.min(...b.sources.map(h=>doc.pages.findIndex(p=>p.id===h.id)))):[];
 if(large&&(!chosen.length||chosen.length!==new Set(selectedIds).size))throw Error('请选择有效的小总结');
 const pages=large?doc.pages.filter(p=>chosen.some(s=>s.sources.some(h=>h.id===p.id))):pendingSummaryPages(doc);
 if(!large&&!pages.length)throw Error('没有未总结的正文；可先编辑已有总结或新增正文');
 const controller=new AbortController(),owner=state(),hashes=pages.map(p=>({id:p.id,hash:fingerprint(p)})),sourceSummaries=chosen.map(s=>({id:s.id,hash:summaryFingerprint(s)}));
 const input=[tag('summary_worldbook',(doc.summaryWorldbooks||[]).map(w=>w.name+'\n'+substitutions(doc,w.content)).join('\n\n')),large?tag('selected_summaries',chosen.map(s=>`${summaryRange(doc,s)}\n${s.content}`).join('\n\n')):tag('manuscript_pages',pages.map(p=>`第${doc.pages.indexOf(p)+1}页 · 正文\n${p.content}`).join('\n\n'))].join('\n\n');
 const prompt=large?'将用户选中的小总结按剧情顺序整理成一条大总结，合并重复事实，保留人物关系、重要事件、当前状态、伏笔与未完线索。仅依据所选内容，不臆造缺失过程。':'只总结本次提供的正文，生成一条独立的分段小总结。按事件先后记录已发生事实、人物关系与状态变化、当前场景及未完动作、重要约定、伏笔和待续线索。准确保留姓名、时间和关键细节，避免空泛评价。不要把人物计划、猜测或尚未发生的事写成已发生事实。';
 jobs.set(doc.id,controller);doc.summaryStatus='running';doc.summaryError='';changed();
 try{const result=await request([{role:'system',content:prompt+' 不续写，不评价，不引入主线聊天。summary_worldbook提供额外总结规范，有内容时遵循。直接输出总结。'},{role:'user',content:input}],controller.signal,()=>{},true,doc.settings);
  if(state()!==owner||get(doc.id)!==doc)throw Error('文稿已切换或删除');if(result.truncated)throw Error('总结未完整返回，原记录保留');
  if(!hashes.every(h=>doc.pages.some(p=>p.id===h.id&&fingerprint(p)===h.hash)))throw Error('正文已修改，请重新总结');
  const summary={id:id(),kind:large?'large':'small',content:result.text.trim(),sources:hashes,sourceSummaries,through:Math.max(0,...pages.map(p=>doc.pages.indexOf(p)+1)),createdAt:Date.now(),stale:false};
  const pending97=doc.summaryPending97;doc.summaries.push(summary);doc.summaryPending97=null;doc.summaryStatus='complete';try{await persist();}catch(e){doc.summaries=doc.summaries.filter(s=>s!==summary);doc.summaryPending97=pending97;throw e;};changed();return summary;
 }catch(e){if(get(doc.id)===doc){doc.summaryStatus='failed';doc.summaryError=String(e.message);await persist().catch(()=>{});}throw e;}finally{if(jobs.get(doc.id)===controller)jobs.delete(doc.id);changed();}
}
async function mutate(doc,fn){check(doc);if(jobs.has(doc.id))throw Error('请先等待或停止本篇生成');const before=clone(doc);try{fn();doc.updatedAt=Date.now();await persist();}catch(e){for(const k of Object.keys(doc))delete doc[k];Object.assign(doc,before);changed();throw e;}changed();}
function divisionSource(p){return String(p.rawResponse||p.content||'');}
async function divideThinking(doc,pageId,line,expectedSource,variantId=null){return mutate(doc,()=>{
 const p=doc.pages.find(p=>p.id===pageId);if(!p||p.role!=='assistant')throw Error('请选择正文楼层');const target=variantId?p.variants?.find(v=>v.id===variantId):p;if(!target)throw Error('版本已不存在');const source=divisionSource(target);if(source!==expectedSource)throw Error('内容已变化，请重新选择');const lines=source.split(/\r?\n/);if(!Number.isInteger(line)||line<0||line>=lines.length||!lines.slice(line).join('\n').trim())throw Error('请选择有效的正文起始行');
 const settings=p.generationSettings||doc.settings;let prefix=lines.slice(0,line).join('\n');for(const t of validateSettings(settings).thinkingTags)prefix=prefix.split(t.start).join('').split(t.end).join('');const content=lines.slice(line).join('\n').trim(),thinking=[target.nativeThinking||'',prefix.trim()].filter(Boolean).join('\n\n');ensureVariants(p);
 const next={...variantOf(target),content,thinking,unclosedThinking:false,manualBoundary:line,rawResponse:source};p.variants.push(next);
 if(!variantId||variantId===p.selectedVariantId)Object.assign(p,{content,thinking,unclosedThinking:false,manualBoundary:line,selectedVariantId:next.id,rawResponse:source});
 });}
async function editPage(doc,pageId,text){return mutate(doc,()=>{const p=doc.pages.find(p=>p.id===pageId);if(!p)throw Error('楼层不存在');if(!text.trim())throw Error('内容不能为空');if(p.role==='assistant')ensureVariants(p);p.content=text;p.status='complete';p.updatedAt=Date.now();if(p.role==='assistant'){const v=variantOf(p);p.variants.push(v);p.selectedVariantId=v.id;}});}
async function editSummary(doc,summaryId,text){return mutate(doc,()=>{const s=doc.summaries.find(s=>s.id===summaryId);if(!s)throw Error('总结不存在');if(!text.trim())throw Error('总结不能为空');s.content=text.trim();s.sources=s.sources.filter(h=>doc.pages.some(p=>p.id===h.id)).map(h=>{const p=doc.pages.find(p=>p.id===h.id);return {id:p.id,hash:fingerprint(p)};});s.sourceSummaries=(s.sourceSummaries||[]).filter(h=>doc.summaries.some(v=>v.id===h.id)).map(h=>({id:h.id,hash:summaryFingerprint(doc.summaries.find(v=>v.id===h.id))}));s.stale=false;s.updatedAt=Date.now();});}
async function deleteSummary(doc,summaryId){return mutate(doc,()=>{doc.summaries=doc.summaries.filter(s=>s.id!==summaryId);});}
async function saveSummarySettings(doc,settings,bookIds,auto=true){await mutate(doc,()=>{doc.settings=validateSettings({...doc.settings,...settings});doc.summaryWorldbooks=sourceRows(bookIds,db.worldBooks||[]);});if(auto)scheduleAutoSummary111(doc);}
async function saveSummaryApi(value){const next=validateSummaryApi(value);if(next&&(typeof BLOCKED_API_DOMAINS!=='undefined'?BLOCKED_API_DOMAINS:[]).some(d=>next.url.includes(d)))throw Error('此API地址不可使用');const s=state(),old=s.summaryApi;s.summaryApi=next;try{await persist();}catch(e){s.summaryApi=old;throw e;}changed();}
async function setPersistent(doc,value){return mutate(doc,()=>{const p=initialInstruction(doc);if(!p)throw Error('初始指令已删除');p.persistent=!!value;});}
async function deletePage(doc,pageId){return mutate(doc,()=>{if(!doc.pages.some(p=>p.id===pageId))throw Error('楼层已删除');doc.pages=doc.pages.filter(p=>p.id!==pageId);if(doc.initialInstructionId===pageId)doc.initialInstructionId=null;if(doc.job?.targetId===pageId||doc.job?.userId===pageId)doc.job=null;if(doc.notice?.pageId===pageId)doc.notice=null;if(doc.rollDraft?.pageId===pageId)doc.rollDraft=null;});}
function variantOf(p){return {id:id(),content:p.content,status:p.status,generatedTitle:p.generatedTitle||null,manualBoundary:p.manualBoundary,unclosedThinking:!!p.unclosedThinking,nativeThinking:p.nativeThinking||'',thinking:p.thinking||'',rawResponse:p.rawResponse||'',interruption:p.interruption||null,createdAt:Date.now()};}
function ensureVariants(p){p.variants??=[];if(!p.selectedVariantId){const v=variantOf(p);p.variants.push(v);p.selectedVariantId=v.id;}return p.variants;}
async function selectVariant(doc,pageId,variantId){return mutate(doc,()=>{const p=doc.pages.find(p=>p.id===pageId),v=p?.variants?.find(v=>v.id===variantId);if(!v)throw Error('版本不存在');if(!v.content?.trim())throw Error('空版本不能选用');Object.assign(p,{content:v.content,status:v.status,generatedTitle:v.generatedTitle,manualBoundary:v.manualBoundary,unclosedThinking:!!v.unclosedThinking,nativeThinking:v.nativeThinking||'',thinking:v.thinking||'',rawResponse:v.rawResponse||'',interruption:v.interruption||null,selectedVariantId:v.id,updatedAt:Date.now()});if(v.generatedTitle&&doc.pages.find(p=>p.role==='assistant')===p)doc.title=v.generatedTitle;});}
function rollContext(doc,pageId){const at=doc.pages.findIndex(p=>p.id===pageId),p=doc.pages[at];if(!p||p.role!=='assistant')throw Error('请选择正文楼层');const instruction=doc.pages.find(p=>p.id===p.instructionId)||[...doc.pages.slice(0,at)].reverse().find(p=>p.role==='user');if(!instruction)throw Error('本层创作指令已删除，无法重 roll');const view={...doc,pages:doc.pages.slice(0,at)};return {p,instruction,prepared:prepare(view,instruction.content,p.generationSettings||doc.settings,[instruction.id]),first:!view.pages.some(p=>p.role==='assistant'&&p.content)};}
function finishRoll(doc){const draft=doc.rollDraft,p=doc.pages.find(p=>p.id===draft?.pageId);if(p&&draft&&(draft.content?.trim()||draft.thinking||draft.rawResponse||draft.interruption)){ensureVariants(p);const v={...draft,id:draft.id||id(),status:draft.status==='complete'?'complete':'partial'};if(!p.variants.some(x=>x.id===v.id))p.variants.push(v);}doc.rollDraft=null;}
async function reroll(doc,pageId){
 check(doc);;if(jobs.has(doc.id))throw Error('本篇正在生成，请稍候');apiConfig();const {p,instruction,prepared,first}=rollContext(doc,pageId),owner=state(),controller=new AbortController(),before=clone(doc);ensureVariants(p);const draft={id:id(),pageId,content:'',status:'generating',createdAt:Date.now()},job={id:id(),kind:'roll',status:'running',userId:instruction.id,targetId:pageId,instruction:instruction.content,error:''};doc.rollDraft=draft;doc.job=job;jobs.set(doc.id,controller);changed();
 try{await persist();}catch(e){jobs.delete(doc.id);Object.assign(doc,before);changed();throw e;}
 const valid=()=>state()===owner&&get(doc.id)===doc&&doc.job===job;let last=Date.now();const accept=(text,meta)=>{if(meta){draft.thinking=meta.thinking;draft.rawResponse=meta.raw;}if(!valid()){controller.abort();return;}const parsed=first?parseFirst(text):{body:text};draft.content=parsed.body;draft.generatedTitle=parsed.title||null;changed();if(Date.now()-last>4000){last=Date.now();void persist().catch(()=>{});}};
 try{const result=await request(prepared.messages,controller.signal,accept,false,p.generationSettings||doc.settings);if(!valid())return;accept(result.text);;draft.thinking=result.thinking;draft.nativeThinking=result.nativeThinking;draft.unclosedThinking=result.unclosedThinking;draft.rawResponse=result.raw;if(result.unclosedThinking){draft.content=result.text;draft.generatedTitle=null;}draft.interruption=result.truncated?result.details:null;draft.status=result.truncated?'partial':'complete';if(!draft.content.trim())throw Error('没有收到正文');job.status=result.truncated?'partial':'complete';job.error=result.truncated?'候选版未完整返回，已保留收到的内容':'';
 }catch(e){if(valid()){if(e.result){draft.thinking=e.result.thinking;draft.nativeThinking=e.result.nativeThinking;draft.unclosedThinking=e.result.unclosedThinking;draft.rawResponse=e.result.raw;draft.interruption=e.result.details;}draft.status='partial';job.status=controller.signal.aborted?'stopped':'failed';job.error=String(e.message).slice(0,700);}}
 finally{if(valid()){finishRoll(doc);try{await persist();}catch(e){job.status='save_failed';job.error='候选版保存失败，请重试保存';}}if(jobs.get(doc.id)===controller)jobs.delete(doc.id);changed();}
}
async function configure(doc,options){check(doc);if(jobs.has(doc.id))throw Error('请先等待本篇生成完成');const old={settings:doc.settings,generationPresetId:doc.generationPresetId,worldbooks:doc.worldbooks,writingStyles:doc.writingStyles,summaryWorldbooks:doc.summaryWorldbooks,referenceMemory:doc.referenceMemory};doc.settings=validateSettings(options.settings);if(Object.hasOwn(options,'generationPresetId'))doc.generationPresetId=String(options.generationPresetId||'');if(options.worldBookIds)doc.worldbooks=sourceRows(options.worldBookIds,db.worldBooks||[]);if(options.styleIds)doc.writingStyles=sourceRows(options.styleIds,styles());if(options.summaryWorldBookIds)doc.summaryWorldbooks=sourceRows(options.summaryWorldBookIds,db.worldBooks||[]);if(doc.settings.referenceMemory&&!old.settings.referenceMemory){const chat=(db.characters||[]).find(c=>c.id===doc.charId);doc.referenceMemory=chat?memories(chat):[];}event(doc);try{await persist();}catch(e){Object.assign(doc,old);throw e;}}
async function category(charId,name,parentId=null,oldId=null){name=String(name||'').trim();if(!name)throw Error('请填写分类名称');const s=state();if(parentId&&!s.categories.some(c=>c.id===parentId&&c.charId===charId))throw Error('分类不存在');let row=s.categories.find(c=>c.id===oldId&&c.charId===charId);const before=row?clone(row):null;if(row)row.name=name;else{s.categories.push(row={id:id(),charId,name,parentId});}try{await persist();}catch(e){if(before)Object.assign(row,before);else s.categories=s.categories.filter(c=>c!==row);throw e;}changed();return row;}
async function deleteCategory(charId,categoryId){const s=state(),old=clone(s);s.categories=s.categories.filter(c=>!(c.charId===charId&&c.id===categoryId));for(const d of s.documents)if(d.charId===charId&&d.categoryId===categoryId)d.categoryId=null;try{await persist();}catch(e){Object.assign(s,old);throw e;}changed();}
async function remove(doc){check(doc);const s=state();jobs.get(doc.id)?.abort();jobs.delete(doc.id);const pos=s.documents.indexOf(doc);s.documents.splice(pos,1);try{await persist();}catch(e){s.documents.splice(pos,0,doc);throw e;}changed();}
function stop(doc){jobs.get(doc.id)?.abort();}
async function rename(doc,title){check(doc);const old=doc.title;doc.title=String(title||'').trim().slice(0,120);if(!doc.title){doc.title=old;throw Error('标题不能为空');}try{await persist();}catch(e){doc.title=old;throw e;}changed();}
async function move(doc,categoryId){check(doc);if(categoryId&&!state().categories.some(c=>c.id===categoryId&&c.charId===doc.charId))throw Error('分类不存在');const old=doc.categoryId;doc.categoryId=categoryId;try{await persist();}catch(e){doc.categoryId=old;throw e;}changed();}
async function saveReader(doc,reader){check(doc);const old=doc.reader,oldGlobal=state().lastReader;doc.reader={...readerDefaults,...reader};state().lastReader=clone(doc.reader);try{await persist();}catch(e){doc.reader=old;state().lastReader=oldGlobal;throw e;}changed();}
async function acknowledge(doc,status,noticeId){check(doc);const notice=doc.notice;if(!notice||noticeId&&notice.id!==noticeId)return;const old=notice.status;notice.status=status;try{await persist();}catch(e){notice.status=old;throw e;}changed();}
async function retrySave(doc){check(doc);await persist();if(doc.job?.status==='save_failed'){doc.job.status=doc.pages.find(p=>p.id===doc.job.targetId)?.content?'complete':'failed';await persist();if(doc.notice?.status==='pending')window.dispatchEvent(new CustomEvent('uwu-story-ready',{detail:{id:doc.id,noticeId:doc.notice.id}}));}changed();}
async function recover(){let dirty=false;for(const d of state().documents){normalizeDoc(d);if(d.job?.status==='running'){if(d.job.kind==='roll')finishRoll(d);d.job.status='interrupted';d.job.error='页面退出或刷新中断了生成，已保留收到的内容，可手动重试';for(const p of d.pages)if(p.status==='generating')p.status=p.content?'partial':'failed';dirty=true;}if(d.summaryStatus==='running'){d.summaryStatus='failed';d.summaryError='总结已中断，旧总结保留';dirty=true;}}if(dirty)await persist();changed();for(const d of state().documents)scheduleAutoSummary111(d);}
window.UwUStories={scheduleAutoSummary111,autoSummarize111,needsSummary,state,styles,id,clone,defaults,readerDefaults,PROMPT,get,draft,create,saveDraft,removeDraft,savePreset,presetConfig,removePreset,requirePresetFolder,savePresetFolder,moveLibraryPreset,removePresetFolder,prepare,generate,summarize,latestSummary,validSummary,selectedSummaries,pendingSummaryPages,summaryRange,initialInstruction,editPage,editSummary,deleteSummary,saveSummarySettings,saveSummaryApi,setPersistent,deletePage,reroll,rollContext,selectVariant,configure,category,deleteCategory,remove,stop,rename,move,saveReader,acknowledge,retrySave,persist,recover,busy:doc=>jobs.has(doc.id),validateSettings,parseFirst,splitThinking,interruptionText,divisionSource,divideThinking};
window.addEventListener('uwu-story-ready',e=>{const d=get(e.detail?.id);if(d)scheduleAutoSummary111(d);});
window.addEventListener('uwu-db-ready',()=>void recover().catch(e=>console.error('文稿恢复失败',e.message)));
window.addEventListener('pagehide',()=>{if(db.uwuShortStories)void persist().catch(()=>{});});
})();
