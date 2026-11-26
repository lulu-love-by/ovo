// File-driven selective replacement. Never infer missing sections as empty data.
(() => {'use strict';
const has=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const put=(o,k,v)=>Object.defineProperty(o,k,{value:v,enumerable:true,writable:true,configurable:true});
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const chatFields=['history','callHistory','archives','activeArchiveId','greetingArchives'];
const memoryFields=['memoryJournals','journalAutomation','vectorMemory','memoryMode','uwuVectorMemory','uwuMemoryMode'];
const lookFields=['customBubbleCss','useCustomBubbleCss','theme','chatBg','bilingualModeEnabled','bilingualBubbleStyle','bilingualAutoShow','avatarMode','avatarRadius','bubbleBlurEnabled','titleLayout','showTimestamp','timestampStyle','timestampPosition'];
const statusFields=['statusPanel','showStatus','showStatusUpdateMsg'];
const photoFields=['gallery'];
const reserved=new Set(['characters','groups','modules','version','timestamp','_exportVersion','_exportTimestamp','uwuReaderBackup','uwuExtraTables90','uwuDataRecovery90','uwuBackupExtras','__chunks__','selectionVersion','selectedSections']);
const storyLibraryFields=['presets','presetFolders'];
const definitions=[
 {id:'chatAll',name:'聊天全部（不含美化）',entity:'allChat',keys:['chatFolders','functionPanelOrder115','myPersonaPresets','activePersonaId','myStickers','galleryPresets','uwuReviewCovers','globalSendSound','globalReceiveSound','multiMsgSoundEnabled','soundPresets','hasSeenVideoCallDisclaimer','hasSeenVideoCallAvatarHint'],tables:['characterPhotos'],note:'含双方人设、消息存档、记忆、全部聊天设置、加号面板、动态、书影音、偷看及相册'},
 {id:'chatBeauty',name:'聊天美化与状态栏',entity:'allLook',keys:['bubbleCssPresets','statusBarPresets','uwuChatMotion','uwuTextEffects','uwuTextEffectButtonPosition95'],note:'含当前及存档内的聊天外观、状态栏配置与记录'},
 {id:'desktop',name:'桌面主题（图标、组件与布局）',keys:['wallpaper','homeScreenMode','customIcons','homeLayoutGrid','homeLayoutPages','homeLayoutOrder','homeFreeLayout','widgetTemplates','addedWidgets','insWidgetSettings','homeWidgetSettings','homeSignature','uwuHomePresets92'],note:'整套桌面，包括组件模板代码、布局、壁纸与预设库'},
 {id:'globalBeauty',name:'全局美化与字体',keys:['globalCss','globalCssPresets','moreProfileCardBg','uwuNightMode','uwuExchangeNight112','uwuNightLinked112','themeSettings','themePresets','fontUrl','fontPresets','fontSizeScale','savedKeyboardHeight'],tables:['customFonts']},
 {id:'libraries',name:'世界书、文风、预设与思维链',keys:['worldBooks','worldBookPresets','uwuWritingStyles','cotSettings','cotPresets','inlineThinkingEnabled','statusThinkingEnabled','uwuStoryLibrary92']},
 {id:'music',group:'apps',name:'音乐',keys:['uwuMusic','uwuMusicAuto']},
 {id:'reader',group:'apps',name:'阅读器',keys:['uwuReaderRules','uwuReaderShelf'],reader:true},
 {id:'workshop',group:'apps',name:'生图与工坊',keys:['workshopSettings','workshopLlmPresets','workshopPromptPresets'],tables:['workshopHistory','workshopVibeGroups']},
 {id:'calendar',group:'apps',name:'日历与生理期',keys:['uwuCalendar']},
 {id:'stories',group:'apps',name:'小剧场文稿',keys:['uwuShortStories'],note:'文稿、草稿、总结、阅读排版；创作预设归预设库'},
 {id:'assets96',group:'apps',name:'资产与账本',keys:['uwuAssets96']},
 {id:'preferences',group:'apps',name:'其他应用设置',keys:['backupReminderSettings','stUnlocked']},
 {id:'api',name:'API 配置与预设',keys:['apiSettings','apiPresets','uwuEmbeddingPresets'],note:'全局聊天 API 与向量 API；角色专属覆盖设置随聊天保存'},
 {id:'extensions',name:'其他扩展数据',extensions:true,note:'保持独立，默认不选'}
];
const mapped=new Set(definitions.flatMap(d=>d.keys||[]));
const keyLabels={functionPanelOrder115:'聊天功能面板排序',uwuTextEffectButtonPosition95:'文字效果按钮位置',uwuChatMotion:'iMessage 交互动效',uwuTextEffects:'文字动态效果',uwuHomePresets92:'桌面主题预设库',homeFreeLayout:'旧版自由布局',uwuStoryLibrary92:'生成预设',chatFolders:'聊天文件夹',activePersonaId:'当前用户人设',globalSendSound:'发送提示音',globalReceiveSound:'接收提示音',multiMsgSoundEnabled:'多消息提示音',soundPresets:'提示音预设',galleryPresets:'相册预设',uwuReviewCovers:'书影音封面设置',hasSeenVideoCallDisclaimer:'通话提示状态',hasSeenVideoCallAvatarHint:'通话头像提示状态',statusBarPresets:'状态栏预设',savedKeyboardHeight:'键盘高度记录',workshopSettings:'生图设置',workshopLlmPresets:'生图扩写接口预设',workshopPromptPresets:'生图提示词预设',backupReminderSettings:'备份提醒',stUnlocked:'功能解锁标记',inlineThinkingEnabled:'聊天思维链显示',statusThinkingEnabled:'状态栏思维链显示',moreProfileCardBg:'更多页背景',homeSignature:'桌面签名',uwuNightMode:'夜间模式',uwuExchangeNight112:'交换日记夜间模式',uwuNightLinked112:'夜间联动初始化',apiSettings:'API 配置',apiPresets:'API 预设',uwuEmbeddingPresets:'向量 API 预设',cotSettings:'思维链设置',cotPresets:'思维链预设',bubbleCssPresets:'聊天美化预设',globalCss:'当前全局 CSS',globalCssPresets:'全局美化预设',themePresets:'桌面预设',themeSettings:'当前主题',wallpaper:'壁纸',homeScreenMode:'桌面模式',homeLayoutOrder:'桌面排序',homeLayoutPages:'桌面分页',homeLayoutGrid:'格子布局',customIcons:'自定义图标',fontUrl:'当前字体',fontPresets:'字体预设',fontSizeScale:'字体大小',worldBooks:'世界书条目',worldBookPresets:'世界书组合预设',uwuWritingStyles:'文风',widgetTemplates:'组件模板',addedWidgets:'已添加组件',uwuReaderRules:'目录规则',uwuReaderShelf:'书架设置',uwuCalendar:'日历',uwuMusic:'音乐数据',uwuMusicAuto:'音乐偏好',uwuShortStories:'小剧场数据',myStickers:'表情包',myPersonaPresets:'用户人设预设',customFonts:'字体文件',workshopHistory:'生图历史',workshopVibeGroups:'工坊分组',characterPhotos:'相册图片'};
function describe(key,value){const status=Array.isArray(value)?value.length+' 项':meaningful(value)?'已保存':'空';return (keyLabels[key]||key)+'：'+status;}

const entityKeys=id=>id==='chats'?chatFields:id==='memories'?memoryFields:id==='look'?lookFields:id==='photos'?photoFields:id==='status'?statusFields:null;
const peekLookFields=['wallpaper','momentsCover'];
function entityField(key,kind){if(key==='peekScreenSettings'&&['allChat','allLook'].includes(kind))return true;if(kind==='allChat')return key!=='id'&&![...lookFields,...statusFields].includes(key);if(kind==='allLook')return [...lookFields,...statusFields].includes(key);const keys=entityKeys(kind);return keys?keys.includes(key):!['id',...chatFields,...memoryFields,...lookFields,...photoFields,...statusFields].includes(key);}
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('备份根数据格式无效');
 const source=has(input,'modules')?input.modules:input;
 if(!source||typeof source!=='object'||Array.isArray(source))throw Error('备份板块结构无效');
 const data={};
 // Older exports may retain a newer setting only inside their extension object.
 if(source.uwuBackupExtras&&typeof source.uwuBackupExtras==='object'&&!Array.isArray(source.uwuBackupExtras))for(const [k,v]of Object.entries(source.uwuBackupExtras))if(!reserved.has(k))put(data,k,v);
 for(const [k,v]of Object.entries(source))if(k!=='uwuBackupExtras')put(data,k,v);
 if(source.__chunks__&&source._exportVersion!=='3.0')for(const table of ['characters','groups'])if(Array.isArray(data[table]))data[table]=data[table].map(r=>{
  if(!r||!Array.isArray(r.history)||typeof r.history[0]!=='string')return r;
  const history=[];for(const id of r.history){if(!has(source.__chunks__,id))throw Error('旧备份缺少聊天分块');const part=JSON.parse(source.__chunks__[id]);if(!Array.isArray(part))throw Error('旧备份聊天分块无效');history.push(...part);}return {...r,history};
 });
 if(data.uwuShortStories&&typeof data.uwuShortStories==='object'&&!Array.isArray(data.uwuShortStories)){
  const app={...data.uwuShortStories},library={};let found=false;
  for(const key of storyLibraryFields)if(has(app,key)){library[key]=app[key];delete app[key];found=true;}
  if(found&&!has(data,'uwuStoryLibrary92'))data.uwuStoryLibrary92=library;
  data.uwuShortStories=app;
 }
 return data;
}
function entityValues(record,kind){
 const values=[];if(!record||typeof record!=='object'||Array.isArray(record))return values;
 for(const key of Object.keys(record))if(entityField(key,kind)){
  if(key==='peekScreenSettings'&&['allChat','allLook'].includes(kind)){const part=Object.fromEntries(Object.entries(record[key]||{}).filter(([k])=>kind==='allLook'?peekLookFields.includes(k):!peekLookFields.includes(k)));if(Object.keys(part).length)values.push(part);continue;}
  if(key==='archives'&&['chats','allChat'].includes(kind)&&Array.isArray(record[key])&&record[key].length&&record[key].every(a=>a&&typeof a==='object'&&!has(a,'name')&&!has(a,'createdAt')&&!entityValues(a.data,kind).length))continue;
  values.push(record[key]);
 }
 for(const a of Array.isArray(record.archives)?record.archives:[])values.push(...entityValues(a?.data,kind));
 return values;
}
function entityPresent(data,kind){return ['characters','groups'].some(t=>Array.isArray(data[t])&&data[t].some(r=>entityValues(r,kind).length));}

function meaningful(v){if(Array.isArray(v))return v.length>0;if(v&&typeof v==='object')return Object.values(v).some(meaningful);return typeof v==='string'?!!v.trim():typeof v==='number'?v!==0:v===true;}
function extensionKeys(data){return Object.keys(data).filter(k=>!mapped.has(k)&&!reserved.has(k)&&!k.startsWith('__uwu_'));}
function inspect(input){const data=normalize(input),rows=[];
 for(const d of definitions){
  const keys=(d.keys||[]).filter(k=>has(data,k)),tables=(d.tables||[]).filter(k=>has(data.uwuExtraTables90?.tables,k));
  const entity=d.entity&&entityPresent(data,d.entity),reader=d.reader&&has(data,'uwuReaderBackup'),recovery=d.recovery&&has(data,'uwuDataRecovery90'),extensions=d.extensions?extensionKeys(data):[];
  // Explicit empty entity arrays still constitute an available section.
  const emptyEntities=d.entity&&(!Array.isArray(input.selectedSections)||input.selectedSections.includes(d.id))&&['contacts','chats','memories','allChat'].includes(d.entity)&&['characters','groups'].some(k=>Array.isArray(data[k])&&data[k].length===0);
  if(!keys.length&&!tables.length&&!entity&&!emptyEntities&&!reader&&!recovery&&!extensions.length)continue;
  const values=keys.map(k=>data[k]).concat(tables.map(k=>data.uwuExtraTables90.tables[k]),extensions.map(k=>data[k]));
  if(entity)for(const t of ['characters','groups'])for(const r of data[t]||[])values.push(...entityValues(r,d.entity));
  if(reader)values.push(data.uwuReaderBackup?.books,data.uwuReaderBackup?.comments);
  if(recovery)values.push(data.uwuDataRecovery90);
  const empty=!values.some(meaningful);
  const details=keys.map(k=>describe(k,data[k])).concat(tables.map(k=>describe(k,data.uwuExtraTables90.tables[k])));
  if(entity||emptyEntities)details.push('角色 '+(Array.isArray(data.characters)?data.characters.length:0)+' 个，群聊 '+(Array.isArray(data.groups)?data.groups.length:0)+' 个');
  if(reader)details.push('书籍 '+(data.uwuReaderBackup?.books?.length||0)+' 本，段评 '+(data.uwuReaderBackup?.comments?.length||0)+' 条');
  if(recovery)details.push('恢复记录 '+(data.uwuDataRecovery90?.length||0)+' 项');
  if(d.id==='cot'&&Array.isArray(data.cotPresets)&&data.cotPresets.length&&!data.cotPresets.some(p=>p&&!['default','default_gpt','default_uwu','default_tt','default_call_uwu','default_call_tt'].includes(p.id)))details.push('仅包含内置思维链，没有自定义预设');
  rows.push({...d,keys,tables,extensions,entity:entity||emptyEntities?d.entity:null,reader:!!reader,recovery:!!recovery,empty,details});
 }
 if(!rows.length)throw Error('没有识别到可导入的板块');
 return {data,rows};
}
function choose(report,mode){return new Promise(resolve=>{
 const U=window.ReaderUI89;if(!U)throw Error('板块选择面板未加载，未修改数据');
 const panel=U.sheet(mode==='import'?'选择要替换的板块':'选择要导出的板块'),checks=new Map();let settled=false;
 const finish=value=>{if(settled)return;settled=true;resolve(value);panel.close();};panel.onClose=()=>finish(null);
 panel.box.append(U.E('p',mode==='import'?'仅勾选的板块会替换；未勾选、文件中缺少的内容保持原样。空数据也会替换，请仔细选择。':'导出勾选的板块。精简／通用格式仍使用数据管理中的选择。','r89-hint'));
 let apps=null,appsCheck=null;
 const syncApps=()=>{if(!appsCheck)return;const values=appRows.map(r=>checks.get(r.id)?.checked||false);appsCheck.checked=values.every(Boolean);appsCheck.indeterminate=values.some(Boolean)&&!appsCheck.checked;};
 const appRows=report.rows.filter(r=>r.group==='apps');
 for(const row of report.rows){
  if(row.group==='apps'&&!apps){const details=U.E('details'),summary=U.E('summary'),caption=U.E('span','其他 APP 功能'),all=U.E('input');all.type='checkbox';all.checked=mode==='export';all.setAttribute('aria-label','选择全部其他 APP');all.onclick=e=>e.stopPropagation();all.onchange=()=>{for(const r of appRows)checks.get(r.id).checked=all.checked;};summary.append(caption,all);details.append(summary);panel.box.append(details);apps=details;appsCheck=all;}
  const label=U.E('label',undefined,'storage-setting-item'),info=U.E('div',undefined,'storage-setting-info'),check=U.E('input');check.type='checkbox';check.checked=mode==='export'&&row.id!=='extensions';check.dataset.section=row.id;
 info.append(U.E('strong',row.name),U.E('span',row.empty?'空数据（导入将替换对应的已有内容）':row.note||'文件中包含此板块','storage-setting-desc'));if(mode==='import'&&row.entity&&typeof db!=='undefined'){let matched=0,total=0;for(const table of ['characters','groups'])for(const record of report.data[table]||[]){total++;if((db[table]||[]).some(c=>c.id===record.id))matched++;}info.append(U.E('span','本机可匹配 '+matched+' / '+total+' 个角色或群聊','storage-setting-desc'));}for(const detail of row.details){const line=U.E('span',detail,'storage-setting-desc');line.style.display='block';info.append(line);}label.append(info,check);(row.group==='apps'?apps:panel.box).append(label);checks.set(row.id,check);if(row.group==='apps')check.onchange=syncApps;}
 const actions=U.E('div');actions.style.cssText='display:flex;gap:8px;margin:16px 0;flex-wrap:wrap';
 actions.append(U.B('选择全部界面美化',()=>{const appearance=new Set(['chatBeauty','globalBeauty','desktop']);for(const row of report.rows)checks.get(row.id).checked=appearance.has(row.id);syncApps();}),U.B('选择有内容的',()=>{for(const row of report.rows)checks.get(row.id).checked=row.id!=='extensions'&&!row.empty;syncApps();}),U.B('全不选',()=>{for(const c of checks.values())c.checked=false;syncApps();}));panel.box.append(actions);
 const confirm=U.B(mode==='import'?'替换选中的板块':'导出选中的板块',()=>{const ids=[...checks].filter(([,c])=>c.checked).map(([id])=>id);if(!ids.length){showToast('请至少勾选一个板块');return;}finish(ids);});panel.box.append(confirm,U.B('取消',()=>finish(null)));
 });}
function selectedRows(report,ids){const wanted=new Set(ids);if(!wanted.size)throw Error('未选择板块');for(const id of wanted)if(!report.rows.some(r=>r.id===id))throw Error('选择了备份中不存在的板块');return report.rows.filter(r=>wanted.has(r.id));}
function validateList(key,value){if(!Array.isArray(value))throw Error(key+' 不是有效列表');const seen=new Set();for(const r of value){if(!r||typeof r!=='object'||Array.isArray(r)||!((typeof r.id==='string'&&r.id)||(Number.isSafeInteger(r.id)&&r.id>=0))||seen.has(r.id))throw Error(key+' 含无效或重复 ID');seen.add(r.id);}}
function validateEntities(data,rows){const kinds=rows.filter(r=>r.entity).map(r=>r.entity);if(!kinds.length)return;
 for(const t of ['characters','groups'])if(has(data,t)){validateList(t,data[t]);for(const r of data[t]){if((kinds.includes('chats')||kinds.includes('allChat'))){for(const key of ['history','callHistory','archives'])if(has(r,key)&&!Array.isArray(r[key]))throw Error('聊天的 '+key+' 格式无效');if(r.archives){validateList('存档',r.archives);for(const a of r.archives)if(a.data!==undefined&&(!a.data||typeof a.data!=='object'||Array.isArray(a.data)))throw Error('存档正文格式无效');}}}}
}
function mergeRecord(old,incoming,kinds,archive=false){const out={...old};
 for(const key of Object.keys(incoming))if(key!=='id'&&kinds.some(kind=>entityField(key,kind))){
  if(key==='archives'&&Array.isArray(incoming.archives))out.archives=incoming.archives.map(a=>{const prior=(old.archives||[]).find(x=>x.id===a.id);const next={...a};const base={...old,...prior?.data};delete base.archives;if(a.data)next.data=mergeRecord(base,a.data,kinds,true);return next;});
  else if(key==='peekScreenSettings'&&incoming[key]&&typeof incoming[key]==='object'){const entries=Object.entries(incoming[key]).filter(([k])=>kinds.includes(peekLookFields.includes(k)?'allLook':'allChat'));if(entries.length){const value={...(old[key]||{})};for(const [k,v]of entries)put(value,k,clone(v));out[key]=value;}}
  else put(out,key,clone(incoming[key]));
 }
 if(!archive&&!(kinds.includes('chats')||kinds.includes('allChat'))&&Array.isArray(old.archives)&&Array.isArray(incoming.archives))out.archives=old.archives.map(a=>{const source=incoming.archives.find(x=>x.id===a.id);return source?.data?{...a,data:mergeRecord(a.data||{},source.data,kinds,true)}:a;});
 if(archive&&has(incoming,'id'))out.id=old.id||incoming.id;
 return out;
}
function project(input,ids){const report=inspect(input),rows=selectedRows(report,ids),data=report.data,out={};
 for(const r of rows)for(const key of [...r.keys,...r.extensions])put(out,key,data[key]);
 const kinds=rows.filter(r=>r.entity).map(r=>r.entity);
 if(kinds.length)for(const table of ['characters','groups'])if(has(data,table))out[table]=data[table].map(r=>{const projected={id:r.id,...mergeRecord({},r,kinds)};if(!(kinds.includes('chats')||kinds.includes('allChat'))&&Array.isArray(r.archives)&&r.archives.length){projected.archives=r.archives.map(a=>({id:a.id,data:mergeRecord({},a.data||{},kinds,true)}));}return projected;});
 const tables={};for(const r of rows)for(const t of r.tables)tables[t]=data.uwuExtraTables90.tables[t];
 if(Object.keys(tables).length)out.uwuExtraTables90={version:1,tables};
 if(rows.some(r=>r.reader))out.uwuReaderBackup=data.uwuReaderBackup;
 if(rows.some(r=>r.recovery))out.uwuDataRecovery90=data.uwuDataRecovery90;
 return {version:typeof appVersion!=='undefined'?appVersion:'2.8.2',timestamp:new Date().toISOString(),selectionVersion:1,selectedSections:rows.map(r=>r.id),modules:out};
}
async function apply(input,ids){
 const guard=window.UwUDataGuard90;if(!guard)throw Error('数据保护组件未加载，未修改数据');guard.assertReady();
 const report=inspect(input),rows=selectedRows(report,ids),data=report.data;
 validateEntities(data,rows);
 const fields=new Set(rows.flatMap(r=>[...r.keys,...r.extensions]));
 // null means pagination has not been initialized; it is also exported by this version.
 for(const key of fields){if(key==='homeLayoutPages'&&data[key]===null)continue;if((key.endsWith('Presets')||['worldBooks','myStickers','widgetTemplates','addedWidgets','homeLayoutOrder','homeLayoutPages','chatFolders'].includes(key))&&!Array.isArray(data[key]))throw Error(key+' 不是有效列表');}
 for(const key of ['apiSettings','cotSettings','customIcons','themeSettings','insWidgetSettings','homeWidgetSettings'])if(fields.has(key)&&(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key])))throw Error(key+' 不是有效设置对象');
 for(const key of ['worldBooks','myStickers'])if(fields.has(key))validateList(key,data[key]);
 let reader,extra,recovery;
 if(rows.some(r=>r.reader)){if(!window.ReaderBackup89)throw Error('阅读器恢复组件未加载');reader=window.ReaderBackup89.validate(data.uwuReaderBackup);}
 const tables={};for(const r of rows)for(const table of r.tables)tables[table]=data.uwuExtraTables90.tables[table];
 if(Object.keys(tables).length){if(!window.UwUExtraBackup90)throw Error('附加恢复组件未加载');extra=window.UwUExtraBackup90.prepare({version:1,tables});}
 if(rows.some(r=>r.recovery))recovery=guard.validateRecovery(data.uwuDataRecovery90);
 if(fields.has('uwuStoryLibrary92')){if(!data.uwuStoryLibrary92||typeof data.uwuStoryLibrary92!=='object'||Array.isArray(data.uwuStoryLibrary92))throw Error('创作预设库格式无效');for(const key of storyLibraryFields)if(has(data.uwuStoryLibrary92,key)&&!Array.isArray(data.uwuStoryLibrary92[key]))throw Error('创作预设列表无效');}
 if(rows.some(r=>r.id==='desktop')){
  if(!window.UwUHomePresets92)throw Error('桌面预设组件未加载');
  if(has(data,'uwuHomePresets92')){if(!Array.isArray(data.uwuHomePresets92))throw Error('桌面预设库不是列表');data.uwuHomePresets92=data.uwuHomePresets92.map(p=>window.UwUHomePresets92.validatePreset(p));}
  const source={};for(const key of window.UwUHomePresets92?.fields||[])if(has(data,key))source[key]=data[key];
  source.widgetTemplates=has(data,'widgetTemplates')?data.widgetTemplates:db.widgetTemplates||[];
  if(!window.UwUHomePresets92)throw Error('桌面预设组件未加载');const p=window.UwUHomePresets92.validatePreset({name:'恢复桌面',data:source});if(window.UwUHomePresets92.missing(p).length)throw Error('备份缺少桌面组件模板，未替换桌面');
 }
 await guard.ensureFresh();
 const before=db,next={...before},kinds=rows.filter(r=>r.entity).map(r=>r.entity),changedTables=[];let skipped=0,matched=0;
 if(kinds.length&&!(kinds.includes('contacts')||kinds.includes('allChat'))){for(const t of ['characters','groups'])for(const record of data[t]||[]){if((before[t]||[]).some(c=>c.id===record.id))matched++;else skipped++;}if(skipped&&!matched)throw Error('未匹配到本机角色，请同时导入角色设定；聊天备份需与相同 ID 的角色配套');}
 if(kinds.length)for(const table of ['characters','groups'])if(has(data,table)){
  const result=(before[table]||[]).slice();
  for(const incoming of data[table]){const i=result.findIndex(r=>r.id===incoming.id);if(i<0){if((kinds.includes('contacts')||kinds.includes('allChat')))result.push(mergeRecord({id:incoming.id,history:[],callHistory:[]},incoming,kinds));}else result[i]=mergeRecord(result[i],incoming,kinds);}
  next[table]=result;changedTables.push(table);
 }
 const extensionFields=rows.flatMap(r=>r.extensions),extras={...(before.uwuBackupExtras||{})};
 for(const key of fields){if(mapped.has(key))put(next,key,clone(data[key]));else{put(extras,key,clone(data[key]));if(has(before,key))put(next,key,clone(data[key]));}}
 if(fields.has('uwuShortStories')||fields.has('uwuStoryLibrary92')){
  const combined={...(before.uwuShortStories||{})};
  if(fields.has('uwuShortStories'))Object.assign(combined,clone(data.uwuShortStories));
  if(fields.has('uwuStoryLibrary92'))for(const key of storyLibraryFields)if(has(data.uwuStoryLibrary92,key))combined[key]=clone(data.uwuStoryLibrary92[key]);
  next.uwuShortStories=combined;delete next.uwuStoryLibrary92;
 }
 if(extensionFields.length)next.uwuBackupExtras=extras;
 if(fields.has('homeLayoutPages')||fields.has('homeLayoutOrder'))if(!fields.has('homeLayoutGrid'))next.homeLayoutGrid=null;
 if(reader)await window.ReaderBackup89.beforeRestore();
 db=next;
 try{
  await guard.replace(next,async()=>{
   for(const t of changedTables)await dexieDB[t].bulkPut(next[t]);
   for(const key of fields)if(['worldBooks','myStickers'].includes(key)){await dexieDB[key].clear();await dexieDB[key].bulkPut(next[key]);}else if(key==='uwuStoryLibrary92'){}else if(mapped.has(key)||has(before,key))await dexieDB.globalSettings.put({key,value:next[key]});
   if(fields.has('homeLayoutPages')||fields.has('homeLayoutOrder'))if(!fields.has('homeLayoutGrid'))await dexieDB.globalSettings.put({key:'homeLayoutGrid',value:null});
   if(fields.has('uwuStoryLibrary92')&&!fields.has('uwuShortStories'))await dexieDB.globalSettings.put({key:'uwuShortStories',value:next.uwuShortStories});
   if(extensionFields.length)await dexieDB.globalSettings.put({key:'uwuBackupExtras',value:extras});
   if(reader)await window.ReaderBackup89.restore(reader,true);
   if(extra){for(const table of Object.keys(extra.tables))if(table!=='customFonts')await dexieDB[table].clear();await window.UwUExtraBackup90.restore(extra,true);}
  },recovery);
 }catch(error){if(db===next)db=before;throw error;}
 if(reader)window.ReaderBackup89.afterRestore();
 for(const table of changedTables)for(const c of before[table]||[]){window.VectorMemory?.suspend?.(c);window.JournalAutomation?.suspend?.(c);}
 const result=rows.map(r=>r.name);result.skipped=skipped;return result;
}
let busy=false;
async function importFile(event){const input=event.target,file=input.files?.[0];if(!file)return;if(busy){input.value='';return;}busy=true;const label=document.getElementById('storage-import-label'),text=document.getElementById('storage-import-text');label?.classList.add('disabled');if(text)text.textContent='识别文件中…';
 try{const content=file.name.toLowerCase().endsWith('.ee')?await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text():await file.text();
  if(!window.UwUBackupCodec)throw Error('备份解码组件未加载');const data=window.UwUBackupCodec.unpack(window.UwUBackupCodec.parseText(content));const report=inspect(data);if(text)text.textContent='选择导入板块';const ids=await window.UwUSelectiveBackup91.choose(report,'import');if(!ids)return;
  const result=await apply(data,ids);showToast(result.skipped?'所选板块已替换；'+result.skipped+' 个未匹配角色已跳过，未选内容已保留':'所选板块已替换，未选内容已保留，即将刷新');setTimeout(()=>window.location.reload(),1500);
 }catch(e){console.error('选择性导入失败',e);showToast('导入失败：'+e.message);}finally{busy=false;input.value='';label?.classList.remove('disabled');if(text)text.textContent='导入备份';}
}
async function exportFile(){if(busy)return;busy=true;const button=document.getElementById('storage-export-btn'),text=document.getElementById('storage-export-text');if(button)button.disabled=true;
 try{if(!window.UwUDataGuard90)throw Error('数据保护组件未加载');const source=await window.UwUDataGuard90.backup(),report=inspect(source),ids=await window.UwUSelectiveBackup91.choose(report,'export');if(!ids)return;const selected=project(source,ids),mode=document.getElementById('storage-backup-format')?.value==='compatible'?'compatible':'compact';let blob,ext='ee';try{blob=await window.UwUBackupExport.createBlob(selected,{mode,onProgress:s=>{if(text)text.textContent=s;}});}catch(e){blob=await window.UwUBackupExport.createBlob(selected,{mode,compress:false});ext='json';}
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='UwU_板块备份_'+new Date().toISOString().slice(0,10)+'.'+ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);showToast('所选板块已导出');
 }catch(e){console.error('选择性导出失败',e);showToast('导出失败：'+e.message);}finally{busy=false;if(button)button.disabled=false;if(text)text.textContent='导出备份';}
}
window.UwUBackupGroups92=window.UwUSelectiveBackup91={inspect,project,apply,choose,importFile,exportFile,definitions,classifyEntity:key=>['allChat','allLook'].filter(kind=>entityField(key,kind))};
})();
