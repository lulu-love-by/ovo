// Desktop-only snapshots: widget source code travels with the preset, never chat/API data.
(() => {'use strict';
const KEY='uwuHomePresets92';
const fields=['wallpaper','homeScreenMode','customIcons','homeLayoutGrid','homeLayoutPages','homeLayoutOrder','homeFreeLayout','addedWidgets','insWidgetSettings','homeWidgetSettings','homeSignature'];
const own=(v,k)=>!!v&&Object.prototype.hasOwnProperty.call(v,k),clone=v=>JSON.parse(JSON.stringify(v));
let edits=Promise.resolve();
function edit(work){const job=edits.catch(()=>{}).then(work);edits=job;return job;}
const id=()=> 'home_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
function list(){return Array.isArray(db[KEY])?db[KEY]:[];}
function templates(rows){if(!Array.isArray(rows))throw Error('小组件模板不是列表');const seen=new Set();for(const t of rows){if(!t||typeof t.id!=='string'||!t.id||seen.has(t.id)||typeof t.html!=='string'||typeof t.css!=='string'||typeof t.size!=='string'||!/^([1-4])x([1-6])$/.test(t.size)||t.js!==undefined&&typeof t.js!=='string')throw Error('小组件模板缺少代码或 ID 重复');seen.add(t.id);}return rows;}
function validatePreset(p){
 if(!p||typeof p.name!=='string'||!p.name.trim()||!p.data||typeof p.data!=='object'||Array.isArray(p.data))throw Error('桌面主题预设结构无效');
 const data={};for(const k of fields)if(own(p.data,k))Object.defineProperty(data,k,{value:clone(p.data[k]),enumerable:true,writable:true,configurable:true});
 for(const k of ['addedWidgets','homeLayoutPages','homeLayoutOrder'])if(own(data,k)&&!(k==='homeLayoutPages'&&data[k]===null)&&!Array.isArray(data[k]))throw Error(k+' 格式无效');
 for(const k of ['customIcons','insWidgetSettings','homeWidgetSettings'])if(own(data,k)&&(!data[k]||typeof data[k]!=='object'||Array.isArray(data[k])))throw Error(k+' 格式无效');
 if(own(data,'homeLayoutGrid')&&data.homeLayoutGrid!==null){const g=data.homeLayoutGrid;if(g.version!==1||!g.positions||typeof g.positions!=='object'||Array.isArray(g.positions)||!Number.isInteger(g.pageCount)||g.pageCount<1||g.pageCount>500)throw Error('桌面格子布局格式无效');for(const p of Object.values(g.positions))if(!p||!['page','row','col','rows','cols'].every(k=>Number.isInteger(p[k]))||p.page<0||p.page>=500||p.row<0||p.col<0||p.rows<1||p.cols<1||p.row+p.rows>6||p.col+p.cols>4)throw Error('桌面格子位置无效');}
 const instances=new Set();for(const w of data.addedWidgets||[]){if(!w||typeof w.id!=='string'||!w.id||instances.has(w.id)||typeof w.templateId!=='string'||w.vars!==undefined&&(!w.vars||typeof w.vars!=='object'||Array.isArray(w.vars)))throw Error('桌面组件实例无效');instances.add(w.id);}
 const embedded=p.data.widgetTemplates??p.widgetTemplates;const source=embedded===undefined?[]:clone(templates(embedded));data.widgetTemplates=source;
 return {id:typeof p.id==='string'?p.id:id(),name:p.name.trim(),includesWidgets:source.length>0,widgetRefs:(data.addedWidgets||[]).map(w=>{const t=source.find(t=>t.id===w.templateId)||(p.widgetRefs||[]).find(t=>t.id===w.templateId);return {id:w.templateId,name:t?.name||w.templateId,size:t?.size||''};}).filter((w,i,a)=>a.findIndex(x=>x.id===w.id)===i),data};
}
function parse(input){if(!input||input.type!=='uwu-home-preset'||input.version!==1||!Array.isArray(input.presets)||!input.presets.length)throw Error('请选择桌面主题预设 JSON 文件');return input.presets.map(validatePreset);}
function missing(p,local=[]){const available=new Set([...local,...p.data.widgetTemplates].map(t=>t.id));return (p.data.addedWidgets||[]).filter(w=>!available.has(w.templateId)).map(w=>w.templateId).filter((v,i,a)=>a.indexOf(v)===i);}
async function commit(patch){const G=window.UwUDataGuard90;if(!G)throw Error('数据保护组件未加载');await G.ensureFresh();const before=db,next={...before,...patch};db=next;try{await G.replace(next,async()=>{for(const [key,value]of Object.entries(patch))await dexieDB.globalSettings.put({key,value});});}catch(e){if(db===next)db=before;throw e;}}
async function capture(name){
 const G=window.UwUDataGuard90;if(!G)throw Error('数据保护组件未加载');await saveData();await G.ensureFresh();
 const data=await dexieDB.transaction('r',dexieDB.globalSettings,async()=>{const out={};for(const key of [...fields,'widgetTemplates']){const row=await dexieDB.globalSettings.get(key);if(row&&row.value!==undefined)out[key]=clone(row.value);}return out;});
 const used=new Set((data.addedWidgets||[]).map(w=>w.templateId));data.widgetTemplates=(data.widgetTemplates||[]).filter(t=>used.has(t.id));
 const result=validatePreset({name,data});const absent=missing(result);if(absent.length)throw Error('当前桌面缺少 '+absent.length+' 种组件模板，未导出不完整主题');result.includesWidgets=true;return result;
}
function pack(presets){const rows=presets.map(validatePreset);for(const p of rows)if(missing(p).length)throw Error('预设缺少组件模板，请先补齐模板或保存当前完整桌面');return {type:'uwu-home-preset',version:1,exportedAt:Date.now(),presets:rows.map(p=>({...p,includesWidgets:true}))};}
async function importPresetsNow(input){const incoming=parse(input),current=list().slice(),names=new Set(current.map(p=>p.name));for(const p of incoming){const base=p.name;let n=2;while(names.has(p.name))p.name=base+' ('+(n++)+')';names.add(p.name);p.id=id();current.push(p);}await commit({[KEY]:current});return incoming;}
async function saveCurrentNow(name){const p=await capture(name);const current=list().slice();if(current.some(x=>x.name===p.name)){let n=2,base=p.name;while(current.some(x=>x.name===p.name))p.name=base+' ('+(n++)+')';}current.push(p);await commit({[KEY]:current});return p;}
async function applyPresetNow(presetId){const raw=list().find(p=>p.id===presetId);if(!raw)throw Error('桌面预设不存在');const p=validatePreset(raw),local=clone(db.widgetTemplates||[]),absent=missing(p,local);if(absent.length)throw Error('此旧预设缺少 '+absent.length+' 种组件模板，当前桌面未改变');
 const patch={},remap=new Map();for(const t of p.data.widgetTemplates){const same=local.find(x=>x.id===t.id);if(!same)local.push(clone(t));else if(JSON.stringify(same)!==JSON.stringify(t)){const mapped=nextId=>{const next=clone(t);next.id=nextId;for(const key of ['html','css','js'])if(typeof next[key]==='string')next[key]=next[key].split(t.id).join(next.id);return next;};const reused=local.find(x=>x.id.startsWith(t.id+'_home_')&&JSON.stringify(x)===JSON.stringify(mapped(x.id)));const next=reused||mapped(t.id+'_'+id());remap.set(t.id,next.id);if(!reused)local.push(next);}}
 for(const key of fields)if(own(p.data,key))patch[key]=clone(p.data[key]);
 if(p.data.widgetTemplates.length)patch.widgetTemplates=local;
 if(patch.addedWidgets)for(const w of patch.addedWidgets)if(remap.has(w.templateId))w.templateId=remap.get(w.templateId);
 if((own(patch,'homeLayoutPages')||own(patch,'homeLayoutOrder'))&&!own(patch,'homeLayoutGrid'))patch.homeLayoutGrid=null;
 await commit(patch);return p;
}
async function removeNow(presetId){if(!list().some(p=>p.id===presetId))return;await commit({[KEY]:list().filter(p=>p.id!==presetId)});}
const importPresets=input=>edit(()=>importPresetsNow(input)),saveCurrent=name=>edit(()=>saveCurrentNow(name)),applyPreset=presetId=>edit(()=>applyPresetNow(presetId)),remove=presetId=>edit(()=>removeNow(presetId));
function download(value,name){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='uwu_home_preset_'+name.replace(/[\\/:*?"<>|]/g,'_')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function exportPreset(presetId){let p=validatePreset(list().find(p=>p.id===presetId));const ids=new Set((p.data.addedWidgets||[]).map(w=>w.templateId)),available=new Map((db.widgetTemplates||[]).filter(t=>ids.has(t.id)).map(t=>[t.id,t]));for(const t of p.data.widgetTemplates)available.set(t.id,t);p.data.widgetTemplates=[...available.values()];const out=pack([p]);download(out,p.name);return out;}
function openManager(){const U=window.ReaderUI89;if(!U)throw Error('预设面板未加载');const panel=U.sheet('桌面主题预设');
 function draw(){panel.box.replaceChildren();panel.box.append(U.E('p','包含壁纸、图标、分页布局、组件配置和组件模板。导入只新增预设，点击应用后才切换桌面。','r89-hint'));
  const bar=U.E('div');bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap';bar.append(U.B('保存当前桌面',async()=>{const name=prompt('桌面预设名称');if(!name?.trim())return;await saveCurrent(name.trim());draw();showToast('桌面已保存，已附带组件模板');}),U.B('导入预设',()=>input.click()),U.B('导出当前桌面',async()=>{const name=prompt('导出的桌面名称','当前桌面');if(!name?.trim())return;const p=await capture(name.trim());download(pack([p]),p.name);}));
  const input=U.E('input');input.type='file';input.accept='.json';input.hidden=true;input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const rows=await importPresets(JSON.parse(await file.text()));draw();const count=rows.reduce((n,p)=>n+missing(p,db.widgetTemplates||[]).length,0);showToast(count?'预设已新增；其中有旧预设缺少组件模板，应用前需补齐':'预设已新增，现有预设和当前桌面保留');}catch(e){showToast('导入失败：'+e.message);}finally{input.value='';}};bar.append(input);panel.box.append(bar);
  if(!list().length)panel.box.append(U.E('p','还没有保存的桌面预设','r89-hint'));
  for(const p of list()){const row=U.E('div',undefined,'storage-setting-item'),info=U.E('div');info.append(U.E('strong',p.name));const absent=missing(validatePreset(p),db.widgetTemplates||[]);info.append(U.E('p',absent.length?'缺少 '+absent.length+' 种组件模板':'组件模板可用','r89-hint'));const actions=U.E('div');actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap';actions.append(U.B('应用',async()=>{await applyPreset(p.id);panel.close();if(typeof setupHomeScreen==='function')setupHomeScreen();if(typeof applyWallpaper==='function')applyWallpaper(db.wallpaper);if(typeof renderCustomizeForm==='function')renderCustomizeForm();showToast('桌面主题已应用');}),U.B('导出',()=>exportPreset(p.id)),U.B('删除',async()=>{if(!confirm('删除这份桌面预设？当前桌面不会改变。'))return;await remove(p.id);draw();}));row.append(info,actions);panel.box.append(row);}
 }draw();return panel;}
window.UwUHomePresets92={fields,KEY,list,parse,validatePreset,capture,pack,importPresets,saveCurrent,applyPreset,remove,exportPreset,missing,openManager};
})();
