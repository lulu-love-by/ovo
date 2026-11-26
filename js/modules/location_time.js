// Per-chat cities, optional districts, IANA time zones and weather preview.
(() => {
'use strict';
const aliases = {
 'Asia/Shanghai':'北京 上海 广州 深圳 佛山 西安 成都 重庆 天津 杭州 南京 苏州 武汉 长沙 郑州 济南 青岛 大连 沈阳 哈尔滨 长春 石家庄 太原 合肥 福州 厦门 南昌 昆明 贵阳 南宁 海口 兰州 西宁 银川 呼和浩特 乌鲁木齐 拉萨 珠海 东莞 中山 惠州 汕头 宁波 温州 无锡 徐州 洛阳 绍兴 扬州 南通 beijing shanghai guangzhou shenzhen foshan xian xi\'an chengdu chongqing hangzhou nanjing wuhan changsha',
 'Asia/Hong_Kong':'香港 hongkong', 'Asia/Macau':'澳门 macau', 'Asia/Taipei':'台北 台中 高雄 台湾 taipei',
 'Asia/Tokyo':'东京 大阪 京都 横滨 福冈 札幌 tokyo osaka kyoto', 'Asia/Seoul':'首尔 釜山 济州 seoul busan',
 'Asia/Singapore':'新加坡 singapore', 'Asia/Bangkok':'曼谷 清迈 bangkok', 'Asia/Kuala_Lumpur':'吉隆坡 kualalumpur',
 'Asia/Jakarta':'雅加达 jakarta', 'Asia/Ho_Chi_Minh':'胡志明市 河内 hanoi', 'Asia/Manila':'马尼拉 manila',
 'Asia/Kolkata':'新德里 孟买 德里 mumbai delhi', 'Asia/Dubai':'迪拜 阿布扎比 dubai',
 'Europe/Berlin':'柏林 慕尼黑 法兰克福 汉堡 科隆 波恩 斯图加特 莱比锡 德累斯顿 杜塞尔多夫 海德堡 munich münchen frankfurt hamburg cologne köln bonn stuttgart leipzig dresden düsseldorf heidelberg berlin',
 'Europe/Paris':'巴黎 里昂 马赛 paris lyon', 'Europe/London':'伦敦 曼彻斯特 爱丁堡 london manchester edinburgh',
 'Europe/Rome':'罗马 米兰 威尼斯 佛罗伦萨 rome milan', 'Europe/Madrid':'马德里 巴塞罗那 madrid barcelona',
 'Europe/Lisbon':'里斯本 lisbon', 'Europe/Amsterdam':'阿姆斯特丹 amsterdam', 'Europe/Brussels':'布鲁塞尔 brussels',
 'Europe/Zurich':'苏黎世 日内瓦 zurich geneva', 'Europe/Vienna':'维也纳 vienna', 'Europe/Prague':'布拉格 prague',
 'Europe/Stockholm':'斯德哥尔摩 stockholm', 'Europe/Oslo':'奥斯陆 oslo', 'Europe/Copenhagen':'哥本哈根 copenhagen',
 'Europe/Helsinki':'赫尔辛基 helsinki', 'Europe/Moscow':'莫斯科 moscow', 'Europe/Istanbul':'伊斯坦布尔 istanbul',
 'America/New_York':'纽约 波士顿 华盛顿 费城 迈阿密 newyork boston washington philadelphia miami',
 'America/Chicago':'芝加哥 达拉斯 休斯敦 chicago dallas houston', 'America/Denver':'丹佛 denver',
 'America/Los_Angeles':'洛杉矶 旧金山 西雅图 拉斯维加斯 圣迭戈 losangeles sanfrancisco seattle lasvegas sandiego',
 'America/Phoenix':'凤凰城 phoenix', 'America/Toronto':'多伦多 渥太华 蒙特利尔 toronto ottawa montreal',
 'America/Vancouver':'温哥华 vancouver', 'America/Mexico_City':'墨西哥城 mexicocity',
 'America/Sao_Paulo':'圣保罗 里约热内卢 saopaulo', 'America/Argentina/Buenos_Aires':'布宜诺斯艾利斯 buenosaires',
 'Pacific/Honolulu':'檀香山 火奴鲁鲁 honolulu', 'Australia/Sydney':'悉尼 sydney', 'Australia/Melbourne':'墨尔本 melbourne',
 'Australia/Brisbane':'布里斯班 brisbane', 'Australia/Perth':'珀斯 perth', 'Australia/Adelaide':'阿德莱德 adelaide',
 'Pacific/Auckland':'奥克兰 惠灵顿 auckland wellington', 'Africa/Cairo':'开罗 cairo', 'Africa/Johannesburg':'约翰内斯堡 johannesburg'
};
const clean = s => String(s || '').trim().slice(0, 80);
const key = s => clean(s).normalize('NFKC').toLowerCase().replace(/[\s_]+/g, '');
const validation = new Map();
const valid = zone => {
 if (!zone) return false;
 if (!validation.has(zone)) {
  try { new Intl.DateTimeFormat('en', {timeZone:zone}).format(); validation.set(zone,true); }
  catch { validation.set(zone,false); }
 }
 return validation.get(zone);
};
let zones;
function zoneList() {
 if (!zones) {
  let supported = []; try { supported = Intl.supportedValuesOf('timeZone'); } catch {}
  zones = [...new Set(['UTC', ...Object.keys(aliases), ...supported])].filter(valid);
 }
 return zones;
}
function infer(city) {
 const name = key(city).replace(/市$/, ''); if (!name) return '';
 for (const [zone, names] of Object.entries(aliases)) if (names.split(' ').some(x => key(x).replace(/市$/, '') === name)) return zone;
 const matches = zoneList().filter(z => key(z) === name || key(z.split('/').pop()) === name);
 return matches.length === 1 ? matches[0] : '';
}
function deviceZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
function config(chat, side) {
 const saved = chat?.locationSettings?.[side] || {};
 const city = clean(saved.city), zone = clean(saved.timeZone);
 return {city, timeZone:valid(zone) ? zone : infer(city) || deviceZone(), configured:!!(city || zone), unknown:!!city && !valid(zone) && !infer(city)};
}
const formats = new Map();
function parts(zone, date) {
 if (!formats.has(zone)) formats.set(zone, new Intl.DateTimeFormat('en-CA', {timeZone:zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'}));
 return Object.fromEntries(formats.get(zone).formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type,p.value]));
}
function at(chat, side, date = new Date()) {
 const c = config(chat, side), instant = new Date(date);
 if (!Number.isFinite(instant.getTime())) return {...c, offset:0, day:'未知日期', stamp:'未知时间', short:'时间未知'};
 const p = parts(c.timeZone, instant);
 const offset = Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(+new Date(date) / 1000) * 1000) / 60000);
 return {...c, offset, day:p.year + '-' + p.month + '-' + p.day, stamp:p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute, short:p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute};
}
function enabled(chat) { return ['char','user'].some(s => { const v = chat?.locationSettings?.[s]; return !!(clean(v?.city) || clean(v?.timeZone)); }); }
function current(chat, date = new Date()) { return enabled(chat) ? at(chat,'char',date).stamp + '（角色当地，' + config(chat,'char').timeZone + '）' : ''; }
function prompt(chat, date = new Date()) {
 if (!enabled(chat)) return '';
 const c = at(chat,'char',date), u = at(chat,'user',date), diff = c.offset - u.offset;
 const amount = Math.abs(diff), delta = (Math.floor(amount / 60) ? Math.floor(amount / 60) + '小时' : '') + (amount % 60 ? amount % 60 + '分钟' : '');
 const describe = (label, value) => label + '：' + JSON.stringify({城市:value.city || '未设置', 时区:value.timeZone, 当地时间:value.stamp, ...(value.unknown ? {说明:'城市时区未识别，暂按设备时区估算'} : {})});
 return '\n<双方所在地与当地时间>\n' + describe('char（角色）',c) + '\n' + describe('user（用户）',u) + '\n当前时差：' + (diff ? 'char比user' + (diff > 0 ? '快' : '慢') + delta : '双方当前无时差') + '。\n以上为同一时刻，日期也按各自所在地计算；时差随夏令时自动变化。聊天历史时间标记采用user当地时间。角色安排与睡眠按char当地时间理解，不把一方的昼夜套用到另一方。不必每轮报时或提及时差。\n</双方所在地与当地时间>\n';
}
const ui105 = new Map();
function row(side, label) {
 return `<div class="kkt-item"><label class="kkt-item-label" for="setting-${side}-city">${label}所在城市</label><div class="kkt-item-control" style="min-width:0"><input id="setting-${side}-city" type="text" maxlength="80" autocomplete="off" placeholder="如：上海、北京、纽约" style="width:100%;min-width:0;text-align:right;border:0;background:transparent"></div></div><div class="kkt-item"><label class="kkt-item-label" for="setting-${side}-district">区／县／区域</label><div class="kkt-item-control" style="min-width:0"><input id="setting-${side}-district" type="text" maxlength="80" autocomplete="off" placeholder="选填，如：浦东新区" style="width:100%;min-width:0;text-align:right;border:0;background:transparent"></div></div><div class="kkt-item" style="flex-wrap:wrap"><label class="kkt-item-label" for="setting-${side}-timezone">时区</label><div class="kkt-item-control" style="min-width:0;max-width:65%"><select id="setting-${side}-timezone" style="max-width:100%;border:0;background:transparent;text-align:right" aria-label="${label}所在时区"></select></div><small id="setting-${side}-time-preview" style="flex-basis:100%;margin-top:6px;color:#999;font-size:11px"></small><small id="setting-${side}-weather-preview" style="flex-basis:100%;margin-top:4px;color:#999;font-size:11px;line-height:1.5;overflow-wrap:anywhere"></small><select id="setting-${side}-place-choice" aria-label="选择具体地点" hidden style="width:100%;margin-top:8px;max-width:100%;font-size:12px"></select></div>` + (side==='user'?`<div class="kkt-item"><label class="kkt-item-label" for="setting-weather-cache-minutes108">天气缓存时长（分钟）</label><div class="kkt-item-control"><input id="setting-weather-cache-minutes108" type="number" min="1" max="1440" step="1" value="180" inputmode="numeric" style="width:85px;text-align:right;border:0;background:transparent"></div></div>`:'');
}
function load(chat) {
 const W=window.UwUWeather105;
 const cacheInput=document.getElementById('setting-weather-cache-minutes108');if(cacheInput)cacheInput.value=String(W?.cacheMinutes108(chat.locationSettings)??180);
 for (const side of ['char','user']) {
  const el=id=>document.getElementById('setting-'+side+'-'+id),city=el('city'),district=el('district'),zone=el('timezone'),preview=el('time-preview'),weather=el('weather-preview'),choice=el('place-choice');
  if(!city||!zone||!preview||!district||!W)continue;
  const saved=chat.locationSettings?.[side]||{},u={city,district,zone,preview,weather,choice,geo:null,cityGeo:null,version:0,timer:0,pending:null,query:'',choiceRows:[],choiceKind:''};ui105.set(side,u);
  city.value=clean(saved.city);district.value=clean(saved.district);zone.replaceChildren();
  const automatic=document.createElement('option');automatic.value='';automatic.textContent='自动识别 / 跟随设备';zone.appendChild(automatic);
  const all=zoneList();if(valid(saved.timeZone)&&!all.includes(saved.timeZone))all.push(saved.timeZone);
  for(const value of all){const option=document.createElement('option');option.value=value;option.textContent=value;zone.appendChild(option);}
  zone.value=saved.mode==='manual'?saved.timeZone:'';
  const values=()=>({city:clean(city.value),district:clean(district.value)});
  if(W.savedValid({...values(),geo105:saved.geo105})){u.geo=saved.geo105;u.cityGeo=saved.cityGeo105||(!district.value?saved.geo105:null);}
  u.update=()=>{const selected=zone.value||u.cityGeo?.timezone||u.geo?.timezone||infer(city.value)||(!city.value.trim()?deviceZone():'');city.setCustomValidity(selected?'':'这个城市暂未识别，请选择具体地点或手动选择时区');preview.textContent=selected?selected+' · '+at({locationSettings:{[side]:{city:city.value,timeZone:selected}}},side).stamp:'暂未识别这个城市，请选择具体地点或手动选择时区';};
  const choose=(rows,kind)=>{u.choiceRows=rows;u.choiceKind=kind;choice.replaceChildren();const ph=document.createElement('option');ph.value='';ph.textContent='有多个匹配，请选择'+(kind==='city'?'城市':'区域');choice.append(ph);rows.forEach((g,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=W.label(g);choice.append(o);});choice.hidden=false;weather.textContent=ph.textContent;};
  const showWeather=async(version)=>{u.update();if(!u.geo)return;weather.textContent='正在查询天气…';const v=values(),result=await W.get({...v,geo105:u.geo,timeZone:zone.value||u.geo.timezone},W.browserStorage,{weatherCacheMinutes108:document.getElementById('setting-weather-cache-minutes108')?.value||180});if(u.version!==version||!weather.isConnected)return;weather.textContent=(result?.error?W.label(u.geo)+' · '+result.error:'')||(!result?'填写城市后可查询天气':result.place+' · '+result.text+' · '+Math.round(result.temp)+'°C'+(Number.isFinite(result.feels)?' · 体感'+Math.round(result.feels)+'°C':'')+' · 数据时间 '+W.localTime(result.zone,result.at)+' · '+result.source+(result.fallback?' · '+result.fallback:''));};
  u.resolve=async(force=false)=>{clearTimeout(u.timer);if(u.pending&&!force)return u.pending;const version=++u.version,v=values();choice.hidden=true;u.query=W.queryKey(v);u.update();if(!v.city){u.geo=null;u.cityGeo=null;weather.textContent='填写城市后可查询天气';return;}
   const task=(async()=>{try{weather.textContent='正在识别地点…';if(!u.cityGeo){const rows=await W.cities(v.city,W.browserStorage);if(version!==u.version)return;if(rows.length>1){choose(rows,'city');return;}if(!rows.length)throw Error('未识别城市，请检查名称或使用当地名称');u.cityGeo=rows[0];}u.update();let geo=u.cityGeo;
    if(v.district){let rows;try{rows=await W.districts(v.district,u.cityGeo,W.browserStorage);}catch{rows=[];}if(version!==u.version)return;if(rows.length>1){choose(rows,'district');return;}geo=rows.length?rows[0]:{...u.cityGeo,fallback105:true};}
    if(version!==u.version)return;u.geo={...geo,query:W.queryKey(v),resolver105b:true,resolver106:true,resolver107:true};await showWeather(version);
   }catch(e){if(version===u.version){u.geo=null;weather.textContent=e.message;u.update();}}finally{if(u.pending===task)u.pending=null;}})();u.pending=task;return task;};
  choice.onchange=async()=>{if(choice.value==='')return;const g=u.choiceRows[Number(choice.value)];if(!g)return;choice.hidden=true;if(u.choiceKind==='city'){u.cityGeo=g;u.geo=null;await u.resolve(true);}else{u.geo={...g,query:W.queryKey(values()),resolver105b:true,resolver106:true,resolver107:true};await showWeather(++u.version);}};
  city.oninput=()=>{u.version++;u.cityGeo=null;u.geo=null;u.pending=null;choice.hidden=true;u.update();clearTimeout(u.timer);u.timer=setTimeout(()=>void u.resolve(),700);};
  district.oninput=()=>{u.version++;u.geo=null;u.pending=null;choice.hidden=true;clearTimeout(u.timer);u.timer=setTimeout(()=>void u.resolve(),700);};
  zone.onchange=()=>{u.update();if(u.geo)void showWeather(++u.version);};
  weather.onclick=()=>{W.retry107();if(u.geo)void showWeather(++u.version);else void u.resolve(true);};weather.title='点击重新查询';u.update();if(u.geo)void showWeather(u.version);else void u.resolve();
 }
}
async function read() {
 const result={},W=window.UwUWeather105;
 const cacheInput=document.getElementById('setting-weather-cache-minutes108'),minutes=Number(cacheInput?.value??180);
 if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('天气缓存时长请填写1—1440之间的整数分钟');
 result.weatherCacheMinutes108=minutes;
 for(const side of ['char','user']){
  const u=ui105.get(side);if(!u||!u.city.isConnected)return null;
  if(u.timer){clearTimeout(u.timer);u.timer=0;await u.resolve();}else if(u.pending)await u.pending;
  const city=clean(u.city.value),district=clean(u.district.value),manual=clean(u.zone.value),timeZone=manual||u.cityGeo?.timezone||u.geo?.timezone||infer(city);
  if((city||manual)&&!valid(timeZone))throw Error('请为'+(side==='char'?'角色':'自己')+'选择具体地点或正确时区');
  const v={city,district,timeZone,mode:manual?'manual':'auto'};
  if(u.geo&&u.geo.query===W.queryKey(v)){v.geo105=u.geo;v.cityGeo105=u.cityGeo;}
  result[side]=v;
 }
 return result;
}
window.UwULocation = {infer,valid,at,current,prompt,row,load,read,enabled};
})();
