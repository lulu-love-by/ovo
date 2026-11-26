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
const definitions=[
 {id:'contacts',name:'角色设定',entity:'contacts',keys:['chatFolders'],note:'新增角色需勾选此项；已有角色保留未选中的聊天与记忆'},
 {id:'chats',name:'聊天记录与存档',entity:'chats',note:'仅恢复已有相同 ID 的角色；新增角色请同时选择角色设定'},
 {id:'memories',name:'日记、总结与向量记忆',entity:'memories'},
 {id:'api',name:'API 设置与预设',keys:['apiSettings','apiPresets','uwuEmbeddingPresets']},
 {id:'cot',name:'思维链设置与预设',keys:['cotSettings','cotPresets','inlineThinkingEnabled','statusThinkingEnabled']},
 {id:'chatCss',name:'聊天美化',keys:['bubbleCssPresets'],entity:'look',note:'包含当前 CSS、预设、背景、主题、双语显示、头像形状与时间戳；头像图片属于角色设定'},
 {id:'globalCss',name:'全局美化与界面主题',keys:['globalCss','globalCssPresets','moreProfileCardBg','uwuNightMode','uwuExchangeNight112','uwuNightLinked112','themeSettings','themePresets']},
 {id:'desktop',name:'桌面壁纸与布局',keys:['wallpaper','homeScreenMode','homeLayoutOrder','homeLayoutPages','homeLayoutGrid']},
 {id:'icons',name:'APP 图标',keys:['customIcons']},
 {id:'widgets',name:'桌面小组件',keys:['insWidgetSettings','homeWidgetSettings','widgetTemplates','addedWidgets','homeSignature']},
 {id:'fonts',name:'字体',keys:['fontUrl','fontPresets','fontSizeScale'],tables:['customFonts']},
 {id:'worldbooks',name:'世界书',keys:['worldBooks','worldBookPresets']},
 {id:'styles',name:'文风',keys:['uwuWritingStyles']},
 {id:'personas',name:'用户人设',keys:['myPersonaPresets','activePersonaId']},
 {id:'calendar',name:'日历与生理期',keys:['uwuCalendar']},
 {id:'music',name:'音乐',keys:['uwuMusic','uwuMusicAuto']},
 {id:'stories',name:'小剧场',keys:['uwuShortStories']},
 {id:'reader',name:'阅读器书籍、划线与段评',keys:['uwuReaderRules','uwuReaderShelf'],reader:true},
 {id:'stickers',name:'表情包',keys:['myStickers']},
 {id:'status',name:'状态栏预设与当前配置',keys:['statusBarPresets'],entity:'status',note:'包含角色状态栏开关、提示词、正则、HTML 模板及已保存的渲染记录'},
 {id:'sounds',name:'提示音',keys:['globalSendSound','globalReceiveSound','multiMsgSoundEnabled','soundPresets']},
 {id:'workshop',name:'生图设置与工坊记录',keys:['workshopSettings','workshopLlmPresets','workshopPromptPresets'],tables:['workshopHistory','workshopVibeGroups']},
 {id:'photos',name:'相册与封面',entity:'photos',keys:['galleryPresets','uwuReviewCovers'],tables:['characterPhotos']},
 {id:'preferences',name:'其他界面偏好',keys:['savedKeyboardHeight','hasSeenVideoCallDisclaimer','hasSeenVideoCallAvatarHint','backupReminderSettings','stUnlocked']},
 {id:'recovery',name:'数据恢复记录',recovery:true},
 {id:'extensions',name:'其他扩展数据',extensions:true}
];
const mapped=new Set(definitions.flatMap(d=>d.keys||[]));
const keyLabels={moreProfileCardBg:'更多页背景',homeSignature:'桌面签名',uwuNightMode:'夜间模式',uwuExchangeNight112:'交换日记夜间模式',uwuNightLinked112:'夜间联动初始化',apiSettings:'API 配置',apiPresets:'API 预设',uwuEmbeddingPresets:'向量 API 预设',cotSettings:'思维链设置',cotPresets:'思维链预设',bubbleCssPresets:'聊天美化预设',globalCss:'当前全局 CSS',globalCssPresets:'全局美化预设',themePresets:'桌面预设',themeSettings:'当前主题',wallpaper:'壁纸',homeScreenMode:'桌面模式',homeLayoutOrder:'桌面排序',homeLayoutPages:'桌面分页',homeLayoutGrid:'格子布局',customIcons:'自定义图标',fontUrl:'当前字体',fontPresets:'字体预设',fontSizeScale:'字体大小',worldBooks:'世界书条目',worldBookPresets:'世界书组合预设',uwuWritingStyles:'文风',widgetTemplates:'组件模板',addedWidgets:'已添加组件',uwuReaderRules:'目录规则',uwuReaderShelf:'书架设置',uwuCalendar:'日历',uwuMusic:'音乐数据',uwuMusicAuto:'音乐偏好',uwuShortStories:'小剧场数据',myStickers:'表情包',myPersonaPresets:'用户人设预设',customFonts:'字体文件',workshopHistory:'生图历史',workshopVibeGroups:'工坊分组',characterPhotos:'相册图片'};
function describe(key,value){const status=Array.isArray(value)?value.length+' 项':meaningful(value)?'已保存':'空';return (keyLabels[key]||key)+'：'+status;}

const entityKeys=id=>id==='chats'?chatFields:id==='memories'?memoryFields:id==='look'?lookFields:id==='photos'?photoFields:id==='status'?statusFields:null;
function entityField(key,kind){const keys=entityKeys(kind);return keys?keys.includes(key):!['id',...chatFields,...memoryFields,...lookFields,...photoFields,...statusFields].includes(key);}
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
 return data;
}
function entityValues(record,kind){
 const values=[];if(!record||typeof record!=='object'||Array.isArray(record))return values;
 for(const key of Object.keys(record))if(entityField(key,kind)){
  if(key==='archives'&&kind==='chats'&&Array.isArray(record[key])&&record[key].length&&record[key].every(a=>a&&typeof a==='object'&&!has(a,'name')&&!has(a,'createdAt')&&!entityValues(a.data,'chats').length))continue;
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
  const emptyEntities=d.entity&&(!Array.isArray(input.selectedSections)||input.selectedSections.includes(d.id))&&['contacts','chats','memories'].includes(d.entity)&&['characters','groups'].some(k=>Array.isArray(data[k])&&data[k].length===0);
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
 for(const row of report.rows){const label=U.E('label',undefined,'storage-setting-item'),info=U.E('div',undefined,'storage-setting-info'),check=U.E('input');check.type='checkbox';check.checked=mode==='export';check.dataset.section=row.id;
 info.append(U.E('strong',row.name),U.E('span',row.empty?'空数据（导入将替换对应的已有内容）':row.note||'文件中包含此板块','storage-setting-desc'));if(mode==='import'&&row.entity&&typeof db!=='undefined'){let matched=0,total=0;for(const table of ['characters','groups'])for(const record of report.data[table]||[]){total++;if((db[table]||[]).some(c=>c.id===record.id))matched++;}info.append(U.E('span','本机可匹配 '+matched+' / '+total+' 个角色或群聊','storage-setting-desc'));}for(const detail of row.details){const line=U.E('span',detail,'storage-setting-desc');line.style.display='block';info.append(line);}label.append(info,check);panel.box.append(label);checks.set(row.id,check);}
 const actions=U.E('div');actions.style.cssText='display:flex;gap:8px;margin:16px 0;flex-wrap:wrap';
 actions.append(U.B('选择全部界面美化',()=>{const appearance=new Set(['chatCss','globalCss','desktop','icons','widgets','fonts','status']);for(const row of report.rows)checks.get(row.id).checked=appearance.has(row.id);}),U.B('选择有内容的',()=>{for(const row of report.rows)checks.get(row.id).checked=!row.empty;}),U.B('全不选',()=>{for(const c of checks.values())c.checked=false;}));panel.box.append(actions);
 const confirm=U.B(mode==='import'?'替换选中的板块':'导出选中的板块',()=>{const ids=[...checks].filter(([,c])=>c.checked).map(([id])=>id);if(!ids.length){showToast('请至少勾选一个板块');return;}finish(ids);});panel.box.append(confirm,U.B('取消',()=>finish(null)));
 });}
function selectedRows(report,ids){const wanted=new Set(ids);if(!wanted.size)throw Error('未选择板块');for(const id of wanted)if(!report.rows.some(r=>r.id===id))throw Error('选择了备份中不存在的板块');return report.rows.filter(r=>wanted.has(r.id));}
function validateList(key,value){if(!Array.isArray(value))throw Error(key+' 不是有效列表');const seen=new Set();for(const r of value){if(!r||typeof r!=='object'||Array.isArray(r)||!((typeof r.id==='string'&&r.id)||(Number.isSafeInteger(r.id)&&r.id>=0))||seen.has(r.id))throw Error(key+' 含无效或重复 ID');seen.add(r.id);}}
function validateEntities(data,rows){const kinds=rows.filter(r=>r.entity).map(r=>r.entity);if(!kinds.length)return;
 for(const t of ['characters','groups'])if(has(data,t)){validateList(t,data[t]);for(const r of data[t]){if(kinds.includes('chats')){for(const key of ['history','callHistory','archives'])if(has(r,key)&&!Array.isArray(r[key]))throw Error('聊天的 '+key+' 格式无效');if(r.archives){validateList('存档',r.archives);for(const a of r.archives)if(a.data!==undefined&&(!a.data||typeof a.data!=='object'||Array.isArray(a.data)))throw Error('存档正文格式无效');}}}}
}
function mergeRecord(old,incoming,kinds,archive=false){const out={...old};
 for(const key of Object.keys(incoming))if(key!=='id'&&kinds.some(kind=>entityField(key,kind))){
  if(key==='archives'&&Array.isArray(incoming.archives))out.archives=incoming.archives.map(a=>{const prior=(old.archives||[]).find(x=>x.id===a.id);const next={...a};const base={...old,...prior?.data};delete base.archives;if(a.data)next.data=mergeRecord(base,a.data,kinds,true);return next;});
  else put(out,key,clone(incoming[key]));
 }
 if(!archive&&!kinds.includes('chats')&&Array.isArray(old.archives)&&Array.isArray(incoming.archives))out.archives=old.archives.map(a=>{const source=incoming.archives.find(x=>x.id===a.id);return source?.data?{...a,data:mergeRecord(a.data||{},source.data,kinds,true)}:a;});
 if(archive&&has(incoming,'id'))out.id=old.id||incoming.id;
 return out;
}
function project(input,ids){const report=inspect(input),rows=selectedRows(report,ids),data=report.data,out={};
 for(const r of rows)for(const key of [...r.keys,...r.extensions])put(out,key,data[key]);
 const kinds=rows.filter(r=>r.entity).map(r=>r.entity);
 if(kinds.length)for(const table of ['characters','groups'])if(has(data,table))out[table]=data[table].map(r=>{const projected={id:r.id,...mergeRecord({},r,kinds)};if(!kinds.includes('chats')&&Array.isArray(r.archives)&&r.archives.length){projected.archives=r.archives.map(a=>({id:a.id,data:mergeRecord({},a.data||{},kinds,true)}));}return projected;});
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
 for(const key of fields){if((key.endsWith('Presets')||['worldBooks','myStickers','widgetTemplates','addedWidgets','homeLayoutOrder','homeLayoutPages','chatFolders'].includes(key))&&!Array.isArray(data[key]))throw Error(key+' 不是有效列表');}
 for(const key of ['apiSettings','cotSettings','customIcons','themeSettings','insWidgetSettings','homeWidgetSettings'])if(fields.has(key)&&(!data[key]||typeof data[key]!=='object'||Array.isArray(data[key])))throw Error(key+' 不是有效设置对象');
 for(const key of ['worldBooks','myStickers'])if(fields.has(key))validateList(key,data[key]);
 let reader,extra,recovery;
 if(rows.some(r=>r.reader)){if(!window.ReaderBackup89)throw Error('阅读器恢复组件未加载');reader=window.ReaderBackup89.validate(data.uwuReaderBackup);}
 const tables={};for(const r of rows)for(const table of r.tables)tables[table]=data.uwuExtraTables90.tables[table];
 if(Object.keys(tables).length){if(!window.UwUExtraBackup90)throw Error('附加恢复组件未加载');extra=window.UwUExtraBackup90.prepare({version:1,tables});}
 if(rows.some(r=>r.recovery))recovery=guard.validateRecovery(data.uwuDataRecovery90);
 await guard.ensureFresh();
 const before=db,next={...before},kinds=rows.filter(r=>r.entity).map(r=>r.entity),changedTables=[];let skipped=0,matched=0;
 if(kinds.length&&!kinds.includes('contacts')){for(const t of ['characters','groups'])for(const record of data[t]||[]){if((before[t]||[]).some(c=>c.id===record.id))matched++;else skipped++;}if(skipped&&!matched)throw Error('未匹配到本机角色，请同时导入角色设定；聊天备份需与相同 ID 的角色配套');}
 if(kinds.length)for(const table of ['characters','groups'])if(has(data,table)){
  const result=(before[table]||[]).slice();
  for(const incoming of data[table]){const i=result.findIndex(r=>r.id===incoming.id);if(i<0){if(kinds.includes('contacts'))result.push(mergeRecord({id:incoming.id,history:[],callHistory:[]},incoming,kinds));}else result[i]=mergeRecord(result[i],incoming,kinds);}
  next[table]=result;changedTables.push(table);
 }
 const extensionFields=rows.flatMap(r=>r.extensions),extras={...(before.uwuBackupExtras||{})};
 for(const key of fields){if(mapped.has(key))put(next,key,clone(data[key]));else{put(extras,key,clone(data[key]));if(has(before,key))put(next,key,clone(data[key]));}}
 if(extensionFields.length)next.uwuBackupExtras=extras;
 if(fields.has('homeLayoutPages')||fields.has('homeLayoutOrder'))if(!fields.has('homeLayoutGrid'))next.homeLayoutGrid=null;
 if(reader)await window.ReaderBackup89.beforeRestore();
 db=next;
 try{
  await guard.replace(next,async()=>{
   for(const t of changedTables)await dexieDB[t].bulkPut(next[t]);
   for(const key of fields)if(['worldBooks','myStickers'].includes(key)){await dexieDB[key].clear();await dexieDB[key].bulkPut(next[key]);}else if(mapped.has(key)||has(before,key))await dexieDB.globalSettings.put({key,value:next[key]});
   if(fields.has('homeLayoutPages')||fields.has('homeLayoutOrder'))if(!fields.has('homeLayoutGrid'))await dexieDB.globalSettings.put({key:'homeLayoutGrid',value:null});
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
window.UwUSelectiveBackup91={inspect,project,apply,choose,importFile,exportFile,definitions,classifyEntity:key=>['contacts','chats','memories','look','photos','status'].filter(kind=>entityField(key,kind))};
})();
