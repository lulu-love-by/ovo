// Shared, keyless Open-Meteo client. No model calls and no device geolocation.
(() => {
'use strict';
const G=globalThis,TTL=180*60000,FAIL=2*60000,mem=new Map(),pending=new Map();
function cacheMinutes108(settings){const raw=settings?.weatherCacheMinutes108;if(raw===undefined||raw===null||raw==='')return 180;const n=Number(raw);return Number.isFinite(n)&&n>=1&&n<=1440?Math.round(n):180;}
const clean=v=>String(v||'').trim().slice(0,100);
const key=v=>clean(v).normalize('NFKC').toLowerCase().replace(/[\s'’_-]/g,'').replace(/(市|区|县)$/,'');
const queryKey=v=>JSON.stringify([clean(v?.city),clean(v?.district)]);
const validZone=z=>{try{if(!z)return false;new Intl.DateTimeFormat('en',{timeZone:z}).format();return true;}catch{return false;}};
const geoOK=g=>g&&typeof g.latitude==='number'&&typeof g.longitude==='number'&&Number.isFinite(g.latitude)&&Number.isFinite(g.longitude)&&Math.abs(g.latitude)<=90&&Math.abs(g.longitude)<=180;
function remember(k,v){if(mem.size>160)mem.delete(mem.keys().next().value);mem.set(k,v);return v;}
async function cached(k,ttl,fn,storage){
 let hit=mem.get(k);if(!hit&&storage)try{hit=await storage.get(k);}catch{}
 if(hit&&Date.now()-hit.at<(hit.failed?FAIL:ttl))return hit.value;
 if(pending.has(k))return pending.get(k);
 const task=(async()=>{try{const value=await fn(),item=remember(k,{at:Date.now(),value});if(storage)try{await storage.put(k,item);}catch{}return value;}catch(e){remember(k,{at:Date.now(),failed:true,value:{error:clean(e.message)||'查询失败'}});return {error:clean(e.message)||'查询失败'};}finally{pending.delete(k);}})();pending.set(k,task);return task;
}
async function json(url,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);let problem;const host=new URL(url).hostname;
 try{const r=await fetch(url,{signal:controller.signal,credentials:'omit',...(typeof window==='undefined'&&host==='api.met.no'?{headers:{'User-Agent':'UwUWeather/107 (personal weather client)'}}:{})});if(!r.ok){let detail='';try{const text=await r.text();try{const d=JSON.parse(text);detail=clean(d.reason||d.message||'');}catch{}}catch{}throw Error(host+' HTTP '+r.status+(detail?'：'+detail:''));}const d=await r.json();if(d.error)throw Error(host+'：'+clean(d.reason||'接口错误'));return d;}catch(e){problem=e;}finally{clearTimeout(timer);}
 if(problem.name==='AbortError'||problem.name==='TimeoutError')throw Error(host+' 查询超时');
 throw Error((problem.message||host+' 连接失败'));
}

const label=g=>[g.name,g.admin2,g.admin1,g.country].filter((x,i,a)=>x&&a.indexOf(x)===i).join(' · ');
async function search(name,country='',storage,language='zh'){
 const u=new URL('https://geocoding-api.open-meteo.com/v1/search');u.search=new URLSearchParams({name:clean(name),count:'100',language,format:'json',...(country?{countryCode:country}:{})});
 const result=await cached('geo107:'+u.search,30*86400000,async()=>{const d=await json(u.href);return (d.results||[]).filter(geoOK).map(g=>({id:g.id,name:clean(g.name),latitude:g.latitude,longitude:g.longitude,timezone:g.timezone,country:clean(g.country),country_code:g.country_code,admin1:clean(g.admin1),admin2:clean(g.admin2),admin3:clean(g.admin3),admin4:clean(g.admin4),admin1_id:g.admin1_id,admin2_id:g.admin2_id,population:g.population||0,feature_code:g.feature_code}));},storage);
 if(result.error)throw Error(result.error);return result;
}
function distance(a,b){const r=Math.PI/180,x=(b.latitude-a.latitude)*r,y=(b.longitude-a.longitude)*r,h=Math.sin(x/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin(y/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)));}
function candidates(rows,name){const exact=rows.filter(g=>key(g.name)===key(name));return exact.length?exact:rows;}
const russianCities115 = [
 ['莫斯科','Moscow','Москва'],
 ['圣彼得堡','Saint Petersburg','Санкт-Петербург','St Petersburg','St. Petersburg','Saint-Petersburg','Санкт Петербург'],
 ['新西伯利亚','Novosibirsk','Новосибирск'],
 ['叶卡捷琳堡','Yekaterinburg','Екатеринбург','Ekaterinburg'],
 ['喀山','Kazan','Казань'],
 ['下诺夫哥罗德','Nizhny Novgorod','Нижний Новгород'],
 ['车里雅宾斯克','Chelyabinsk','Челябинск'],
 ['克拉斯诺亚尔斯克','Krasnoyarsk','Красноярск'],
 ['萨马拉','Samara','Самара'],
 ['乌法','Ufa','Уфа'],
 ['顿河畔罗斯托夫','Rostov-on-Don','Ростов-на-Дону'],
 ['鄂木斯克','Omsk','Омск'],
 ['符拉迪沃斯托克','Vladivostok','Владивосток','海参崴'],
 ['伊尔库茨克','Irkutsk','Иркутск'],
 ['加里宁格勒','Kaliningrad','Калининград']
];
const russianByName115 = new Map(russianCities115.flatMap(names => names.map(name => [key(name), names])));
const cityAliases={曼彻斯特:['Manchester','GB'],伦敦:['London','GB'],伯明翰:['Birmingham','GB'],利物浦:['Liverpool','GB'],爱丁堡:['Edinburgh','GB'],格拉斯哥:['Glasgow','GB'],柏林:['Berlin','DE'],慕尼黑:['Munich','DE'],法兰克福:['Frankfurt','DE'],汉堡:['Hamburg','DE'],科隆:['Cologne','DE'],巴黎:['Paris','FR'],里昂:['Lyon','FR'],罗马:['Rome','IT'],米兰:['Milan','IT'],马德里:['Madrid','ES'],巴塞罗那:['Barcelona','ES'],洛杉矶:['Los Angeles','US'],纽约:['New York','US'],旧金山:['San Francisco','US'],西雅图:['Seattle','US'],波士顿:['Boston','US'],芝加哥:['Chicago','US'],悉尼:['Sydney','AU'],墨尔本:['Melbourne','AU'],多伦多:['Toronto','CA'],温哥华:['Vancouver','CA'],东京:['Tokyo','JP'],大阪:['Osaka','JP'],首尔:['Seoul','KR'],釜山:['Busan','KR'],釜山廣域市:['Busan','KR'],釜山广域市:['Busan','KR'],부산:['Busan','KR'],부산광역시:['Busan','KR'],Pusan:['Busan','KR'],上海:['Shanghai','CN'],北京:['Beijing','CN'],西安:["Xi'an",'CN'],广州:['Guangzhou','CN'],佛山:['Foshan','CN'],深圳:['Shenzhen','CN']};
// Verified public geographic records. Coordinates are area reference points, not weather observations.
const shanghaiAreas106=[['黄浦区',310101,121.490317,31.222771],['徐汇区',310104,121.43752,31.179973],['长宁区',310105,121.4222,31.218123],['静安区',310106,121.448224,31.229003],['普陀区',310107,121.392499,31.241701],['虹口区',310109,121.491832,31.26097],['杨浦区',310110,121.522797,31.270755],['闵行区',310112,121.375972,31.111658],['宝山区',310113,121.489934,31.398896],['嘉定区',310114,121.250333,31.383524],['浦东新区',310115,121.567706,31.245944],['金山区',310116,121.330736,30.724697],['松江区',310117,121.223543,31.03047],['青浦区',310118,121.113021,31.151209],['奉贤区',310120,121.458472,30.912345],['崇明区',310151,121.397516,31.626946]];
const verifiedCities106={Busan:{id:1838524,name:'釜山',latitude:35.10168,longitude:129.03004,country:'韩国',country_code:'KR',admin1:'釜山',timezone:'Asia/Seoul',population:3285147,feature_code:'PPLA',source105:'GeoNames'},西安:{id:'cn-610100',adcode106:610100,name:'西安市',latitude:34.263161,longitude:108.948024,country:'中国',country_code:'CN',admin1:'陕西省',timezone:'Asia/Shanghai',source105:'DataV.GeoAtlas'},曼彻斯特:{id:2643123,name:'曼彻斯特',latitude:53.48095,longitude:-2.23743,country:'英国',country_code:'GB',admin1:'英格兰',timezone:'Europe/London',source105:'GeoNames / Open-Meteo'},上海:{id:'cn-310000',adcode106:310000,name:'上海市',latitude:31.231706,longitude:121.472644,country:'中国',country_code:'CN',admin1:'上海市',timezone:'Asia/Shanghai',source105:'DataV.GeoAtlas'},圣彼得堡:{id:498817,name:'圣彼得堡',latitude:59.93863,longitude:30.31413,country:'俄罗斯',country_code:'RU',admin1:'圣彼得堡',timezone:'Europe/Moscow',population:5351935,feature_code:'PPLA',source105:'GeoNames'}};
const provinces106={北京:110000,天津:120000,河北:130000,山西:140000,内蒙古:150000,辽宁:210000,吉林:220000,黑龙江:230000,上海:310000,江苏:320000,浙江:330000,安徽:340000,福建:350000,江西:360000,山东:370000,河南:410000,湖北:420000,湖南:430000,广东:440000,广西:450000,海南:460000,重庆:500000,四川:510000,贵州:520000,云南:530000,西藏:540000,陕西:610000,甘肃:620000,青海:630000,宁夏:640000,新疆:650000};
const cnKey106=v=>clean(v).normalize('NFKC').toLowerCase().replace(/\s/g,'').replace(/(?:省|市|壮族自治区|回族自治区|维吾尔自治区|自治区)$/,'');
async function chinaAreas106(code,storage){
 const data=await cached('cn-areas106:'+code,30*86400000,async()=>{const d=await json('https://geo.datav.aliyun.com/areas_v3/bound/'+code+'_full.json');return (d.features||[]).map(f=>f.properties).filter(p=>p&&Array.isArray(p.center)).map(p=>({name:p.name,adcode:p.adcode,level:p.level,longitude:p.center[0],latitude:p.center[1]}));},storage);
 return data.error?[]:data;
}
async function chinaDistrict106(name,city,storage){
 if(city.country_code!=='CN'||!/[\u3400-\u9fff]/.test(name))return [];
 const cityName=Object.keys(cityAliases).find(n=>key(cityAliases[n][0])===key(city.name))||city.name;
 if(cnKey106(cityName)==='上海')return shanghaiAreas106.filter(r=>key(r[0])===key(name)).map(r=>({id:'cn-'+r[1],adcode106:r[1],name:r[0],longitude:r[2],latitude:r[3],admin1:'上海市',country:'中国',country_code:'CN',timezone:'Asia/Shanghai',source105:'DataV.GeoAtlas'}));
 let code=city.adcode106||provinces106[cnKey106(city.admin1)]||provinces106[cnKey106(cityName)];if(!code)return [];
 let rows=await chinaAreas106(code,storage);if(!['北京','天津','重庆'].includes(cnKey106(cityName))&&!city.adcode106){const parent=rows.find(r=>cnKey106(r.name)===cnKey106(cityName));if(!parent)return [];code=parent.adcode;rows=await chinaAreas106(code,storage);}
 return rows.filter(r=>r.level==='district'&&key(r.name)===key(name)&&distance(r,city)<250).map(r=>({...r,id:'cn-'+r.adcode,adcode106:r.adcode,admin1:city.admin1,admin2:city.name,country:'中国',country_code:'CN',timezone:city.timezone||'Asia/Shanghai',source105:'DataV.GeoAtlas'}));
}
const unique=rows=>rows.filter((g,i,a)=>a.findIndex(h=>h.id&&h.id===g.id||h.country_code===g.country_code&&distance(g,h)<1)===i);
function cityAlias115(name) {
 const russian = russianByName115.get(key(name));
 if (russian) return [russian[1], 'RU'];
 return Object.hasOwn(cityAliases, name) ? cityAliases[name] : Object.values(cityAliases).find(a=>key(a[0])===key(name));
}
const cityKey115 = name => key(name).replace(/[.。]/g, '');
const secondaryPlace115 = name => /(?:区|县|旗|村|乡|镇|街道)$|\b(?:county|district|village)$/i.test(name);
let regionNames115;
function cityQuery115(input) {
 const [city='', region=''] = clean(input).normalize('NFKC').split(',',2).map(part=>part.trim());
 if (!region) return {city:city.replace(/市$/,''),country:''};
 if (!regionNames115) {
  regionNames115 = new Map([['uk','GB'],['俄国','RU'],['俄罗斯','RU'],['russianfederation','RU']]);
  for (const language of ['zh','en','ru']) {
   let names;
   try { names=new Intl.DisplayNames([language],{type:'region',fallback:'none'}); } catch { continue; }
   for (let a=65;a<=90;a++) for (let b=65;b<=90;b++) {
    const code=String.fromCharCode(a,b), name=names.of(code);
    if (name && name!==code) {
     const canonical=Intl.Locale?new Intl.Locale('und-'+code).region:regionNames115.get(cityKey115(name))||code;
     regionNames115.set(cityKey115(name),canonical);
     regionNames115.set(code.toLowerCase(),canonical);
    }
   }
  }
 }
 return {city:city.replace(/市$/,''),country:regionNames115.get(cityKey115(region))||null};
}
function cityNames115(name, alias) {
 return new Set([name,...(russianByName115.get(key(name))||[]),...(alias?[alias[0],...Object.keys(cityAliases).filter(n=>key(cityAliases[n][0])===key(alias[0]))]:[])].map(cityKey115));
}
function isCity115(g,country) {
 if (!geoOK(g)||!g.name||!/^[A-Z]{2}$/.test(g.country_code)||country&&g.country_code!==country||secondaryPlace115(g.name)) return false;
 if (/^PPLC$|^PPLA1?$/.test(g.feature_code)) return true;
 if (g.feature_code==='PPLA2') return g.population>=50000||g.country_code==='CN'&&/市$/.test(g.name);
 return (g.feature_code==='ADM1'||g.feature_code==='ADM2')&&g.country_code==='CN'&&/市$/.test(g.name);
}
function cityRows107(rows,name,alias,country='',exactIndexedName=false){
 const names=cityNames115(name,alias), original=cityKey115(name);
 return rows.filter(g=>isCity115(g,country)&&(exactIndexedName||
  (names.has(cityKey115(g.name))&&(!alias||country||g.country_code===alias[1]||cityKey115(g.name)===original))));
}

async function wikidataCities115(name,country,storage) {
 const endpoint='https://www.wikidata.org/w/api.php';
 const wiki=params=>endpoint+'?'+new URLSearchParams({...params,format:'json',origin:'*'});
 const rows=await cached('wikidata-city115:'+JSON.stringify([name,country]),30*86400000,async()=>{
  const result=await json(wiki({action:'wbsearchentities',search:name,language:'zh',type:'item',limit:'15'}));
  const expected=cityKey115(name);
  const matches=(result.search||[]).filter(item=>/^Q[1-9]\d{0,11}$/.test(item.id)&&
   [item.match?.text,item.label].some(text=>typeof text==='string'&&cityKey115(text)===expected));
  const ids=[...new Set(matches.map(item=>item.id))].slice(0,6);
  if (!ids.length) return [];
  const data=await json(wiki({action:'wbgetentities',ids:ids.join('|'),props:'claims'}));
  const geonames=new Set();
  for (const id of ids) {
   const claims=data.entities?.[id]?.claims;
   if (!claims?.P625?.some(claim=>claim.rank!=='deprecated'&&claim.mainsnak?.datavalue?.value?.globe?.endsWith('/Q2'))) continue;
   for (const claim of claims.P1566||[]) {
    const value=claim.mainsnak?.datavalue?.value;
    if (claim.rank!=='deprecated'&&typeof value==='string'&&/^[1-9]\d{0,10}$/.test(value)) geonames.add(value);
   }
  }
  const results=await Promise.allSettled([...geonames].slice(0,6).map(async id=>{
   const place=await json('https://geocoding-api.open-meteo.com/v1/get?'+new URLSearchParams({id,language:'zh'}));
   return String(place.id)===id&&isCity115(place,country)?{...place,source105:'Wikidata / GeoNames'}:null;
  }));
  if (results.length&&results.every(result=>result.status==='rejected')) throw results[0].reason;
  return results.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[]);
 },storage);
 if (rows.error) throw Error(rows.error);
 return rows;
}
async function photonCities115(name, country, storage) {
 const url=new URL('https://photon.komoot.io/api/');
 url.search=new URLSearchParams({q:name,limit:'15',layer:'city',lang:/[\u3400-\u9fff]/.test(name)?'zh':/[\u0400-\u052f]/.test(name)?'ru':'en',...(country?{countrycode:country}:{})});
 const rows=await cached('photon-city115:'+url.search,30*86400000,async()=>{
  const data=await json(url.href);
  return (data.features||[]).flatMap(feature=>{
   const p=feature.properties||{}, code=clean(p.countrycode).toUpperCase();
   if (p.osm_key!=='place'||p.osm_value!=='city'||!p.name||!/^[A-Z]{2}$/.test(code)||country&&code!==country||secondaryPlace115(p.name)) return [];
   const [longitude,latitude]=feature.geometry?.coordinates||[];
   const row={id:'osm-'+p.osm_type+'-'+p.osm_id,name:clean(p.name),latitude,longitude,country_code:code,country:clean(p.country),admin1:clean(p.state),source105:'OpenStreetMap'};
   return geoOK(row)?[row]:[];
  });
 },storage);
 if (rows.error) throw Error(rows.error);
 return rows;
}
async function cities(name,storage) {
 const {city:base,country}=cityQuery115(name);
 if (!base) return [];
 if (country===null) throw Error('未识别逗号后的国家，请检查国家名称');
 const russian=russianByName115.get(key(base));
 const alias=cityAlias115(base);
 const verifiedName=[russian?.[0],base,alias?.[0]].find(value=>value&&Object.hasOwn(verifiedCities106,value));
 const known=verifiedName?verifiedCities106[verifiedName]:null;
 // Preserve authoritative domestic city records, and use the other verified places as candidates.
 if (known?.country_code==='CN'&&(!country||country==='CN')) return [{...known,cityLevel107:true}];
 const seed=known&&(!country||known.country_code===country)?[known]:[];
 const order=rows=>unique(rows).sort((a,b)=>(b.population||0)-(a.population||0)).slice(0,12).map(g=>({...g,cityLevel107:true}));
 let problem, succeeded=false;
 const find=async(term,language,exactIndexedName=false)=>{
  try {
   const rows=await search(term,country,storage,language);
   succeeded=true;
   return cityRows107(rows,base,alias,country,exactIndexedName);
  } catch(error) {problem=error;return [];}
 };
 const primary=async()=>{
  const local=russian||/[\u0400-\u052f]/.test(base)?'ru':'en';
  // Open-Meteo uses exact indexed-name matching for a two-character query.
  const raw=await find(base,'zh',/^\p{Script=Han}{2}$/u.test(base));
  if (raw.length) return raw;
  const alternatives=[[alias?.[0]||base,local],...(russian?[[russian[2],'ru']]:[])];
  const rows=await Promise.all(alternatives.map(([term,language])=>find(term,language)));
  return rows.flat();
 };
 const rows=await primary();
 if (rows.length||seed.length) return order([...seed,...rows]);

 const names=cityNames115(base,alias);
 const fallback=[photonCities115(base,country,storage).then(matches=>matches.filter(g=>names.has(cityKey115(g.name))))];
 if (/\p{Script=Han}/u.test(base)) fallback.push(wikidataCities115(base,country,storage));
 const results=await Promise.allSettled(fallback);
 const matches=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
 if (!succeeded&&results.every(result=>result.status==='rejected')) throw problem||results[0].reason;
 return order(matches);
}

async function photonDistrict(name,city,storage){
 const u=new URL('https://photon.komoot.io/api/');u.search=new URLSearchParams({q:clean(city.name)+' '+clean(name),limit:'10',lat:String(city.latitude),lon:String(city.longitude),countrycode:city.country_code||''});for(const layer of ['district','locality','county'])u.searchParams.append('layer',layer);
 const out=await cached('photon105:'+u.search,30*86400000,async()=>{const d=await json(u.href);return (d.features||[]).map(f=>{const p=f.properties||{},c=f.geometry?.coordinates||[];return {id:'osm-'+p.osm_type+'-'+p.osm_id,name:clean(p.name),latitude:c[1],longitude:c[0],country_code:clean(p.countrycode).toUpperCase(),country:clean(p.country)||city.country,admin1:clean(p.state),admin2:clean(p.city)||city.name,timezone:city.timezone,source105:'OpenStreetMap / Photon'};}).filter(geoOK);},storage);
 if(out.error)return [];return out.filter(g=>key(g.name)===key(name)&&g.country_code===city.country_code&&distance(g,city)<100);
}
async function districts(name,city,storage){
 const domestic=await chinaDistrict106(name,city,storage);if(domestic.length)return domestic;
 let rows=[];try{rows=await search(name,city.country_code,storage);if(!rows.length&&/[区县]$/.test(name))rows=await search(name.slice(0,-1),city.country_code,storage);}catch{}
 const municipality=city.country_code==='CN'&&(['上海','北京','天津','重庆'].some(n=>key(city.name)===key(n))||['shanghai','beijing','tianjin','chongqing'].includes(key(city.name)));
 rows=candidates(rows,name).filter(g=>g.country_code===city.country_code&&distance(g,city)<=160&&(!g.admin1_id||!city.admin1_id||g.admin1_id===city.admin1_id)&&(municipality||!g.admin2_id||!city.admin2_id||g.admin2_id===city.admin2_id));
 if(!rows.length)rows=await photonDistrict(name,city,storage);
 return unique(rows).sort((a,b)=>distance(a,city)-distance(b,city));
}

function savedValid(v){const g=v?.geo105,{city,country}=cityQuery115(v?.city);const expected=country||(!g?.cityChosen115&&cityAlias115(city)?.[1]);return country!==null&&g?.query===queryKey(v)&&geoOK(g)&&g.resolver107===true&&(!expected||g.country_code===expected);}
async function resolve(v,storage){
 if(!clean(v?.city))return null;
 if(savedValid(v))return v.geo105;
 const rows=await cities(v.city,storage);if(rows.length!==1)throw Error(rows.length?'城市有多个匹配，请在设置中选择具体地点':'未识别城市，请检查名称或使用当地名称');
 let geo=rows[0];if(clean(v.district)){let areas;try{areas=await districts(v.district,geo,storage);}catch{areas=[];}if(areas.length>1)throw Error('区域有多个匹配，请在设置中选择具体地点');geo=areas.length?areas[0]:{...geo,fallback105:true};}
 return {...geo,query:queryKey(v),resolver105b:true,resolver106:true,resolver107:true,cityChosen115:true};
}
const codes={0:'晴',1:'大部晴朗',2:'多云',3:'阴',45:'雾',48:'雾凇',51:'小毛毛雨',53:'毛毛雨',55:'强毛毛雨',56:'轻冻毛毛雨',57:'强冻毛毛雨',61:'小雨',63:'中雨',65:'大雨',66:'轻冻雨',67:'强冻雨',71:'小雪',73:'中雪',75:'大雪',77:'雪粒',80:'小阵雨',81:'阵雨',82:'强阵雨',85:'小阵雪',86:'强阵雪',95:'雷雨',96:'雷雨伴小冰雹',99:'雷雨伴大冰雹'};
const symbols107={clearsky:'晴',fair:'大部晴朗',partlycloudy:'多云',cloudy:'阴',fog:'雾',lightrain:'小雨',rain:'雨',heavyrain:'大雨',lightrainshowers:'小阵雨',rainshowers:'阵雨',heavyrainshowers:'强阵雨',lightsnow:'小雪',snow:'雪',heavysnow:'大雪',lightsnowshowers:'小阵雪',snowshowers:'阵雪',heavysnowshowers:'强阵雪',lightsleet:'小雨夹雪',sleet:'雨夹雪',heavysleet:'强雨夹雪'};
async function weather(geo,storage,ttl=TTL){
 const k='weather107:'+geo.latitude.toFixed(4)+','+geo.longitude.toFixed(4);
 return cached(k,ttl,async()=>{let primaryError;
 try{const u=new URL('https://api.open-meteo.com/v1/forecast');u.search=new URLSearchParams({latitude:geo.latitude.toFixed(4),longitude:geo.longitude.toFixed(4),current:'temperature_2m,apparent_temperature,weather_code,is_day,precipitation,wind_speed_10m',timezone:'auto',timeformat:'unixtime',forecast_days:'1'});const d=await json(u.href,{weatherCacheMinutes108:ttl/60000}),c=d.current;if(!c||!Number.isFinite(c.temperature_2m)||!Number.isFinite(c.time)||Math.abs(Date.now()-c.time*1000)>90*60000)throw Error('Open-Meteo 数据缺失或已过期');return {at:c.time*1000,temp:c.temperature_2m,feels:c.apparent_temperature,text:codes[c.weather_code]||'天气状况未知',precip:c.precipitation,wind:c.wind_speed_10m,source:'Open-Meteo',timezone:d.timezone};}catch(e){primaryError=e;}
 try{const u=new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');u.search=new URLSearchParams({lat:geo.latitude.toFixed(4),lon:geo.longitude.toFixed(4)});const d=await json(u.href,{weatherCacheMinutes108:ttl/60000}),entries=(d.properties?.timeseries||[]).filter(e=>Math.abs(Date.now()-Date.parse(e.time))<=90*60000).sort((a,b)=>Math.abs(Date.now()-Date.parse(a.time))-Math.abs(Date.now()-Date.parse(b.time))),e=entries[0],v=e?.data?.instant?.details;if(!e||!Number.isFinite(v?.air_temperature))throw Error('MET Norway 数据缺失或已过期');const next=e.data.next_1_hours||e.data.next_6_hours||{},symbol=(next.summary?.symbol_code||'').replace(/_(day|night|polartwilight)$/,'');return {at:Date.parse(e.time),temp:v.air_temperature,text:symbol.includes('thunder')?'雷雨':symbols107[symbol]||'天气状况未知',precip:next.details?.precipitation_amount,wind:Number.isFinite(v.wind_speed)?Math.round(v.wind_speed*36)/10:undefined,source:'MET Norway',timezone:geo.timezone};}catch(e){throw Error('天气查询失败：'+clean(primaryError.message)+'；'+clean(e.message));}
 },storage);
}
function retry107(){for(const [k,v]of mem)if(v.failed)mem.delete(k);}

async function get(v,storage,options={}){if(!clean(v?.city))return null;try{const geo=await resolve(v,storage),ttl=cacheMinutes108(options)*60000,data=await weather(geo,storage,ttl);if(data.error)return {error:data.error};if(Date.now()-data.at>ttl+90*60000)return {error:'天气数据已过期'};return {...data,place:label(geo),city:clean(v.city),district:geo.fallback105?'':clean(v.district),fallback:geo.fallback105?'区域未匹配，使用市级天气':'',zone:validZone(v.timeZone)?v.timeZone:geo.timezone||data.timezone};}catch(e){return {error:clean(e.message)};}}
function localTime(zone,now=Date.now()){try{return new Intl.DateTimeFormat('sv-SE',{timeZone:validZone(zone)?zone:'UTC',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);}catch{return '';}}
async function prompt(settings,storage,options={}){
 if(!['char','user'].some(s=>clean(settings?.[s]?.city)))return '';
 // Bound the entire location/weather lookup; the shared request continues filling caches.
 const partial=[];const task=Promise.all(['char','user'].map((side,i)=>get(settings?.[side],storage,settings).then(value=>partial[i]=value)));
 if(options.waitUntil)options.waitUntil(task);
 let timer;const budget=Number.isFinite(options.maxWaitMs)?Math.max(0,Math.min(1000,options.maxWaitMs)):250;
 const values=await Promise.race([task,new Promise(resolve=>{timer=setTimeout(()=>resolve(['char','user'].map((side,i)=>partial[i]!==undefined?partial[i]:clean(settings?.[side]?.city)?{error:'天气正在后台更新，本轮暂未提供'}:null)),budget);})]).finally(()=>clearTimeout(timer));
 return '\n<实时天气背景>\n双方所在地、当地时间、时差及天气仅作为日历一类的背景信息，帮助理解当前情境，不是每轮需要回应的话题。仅在与当前交流自然相关时使用，不主动反复播报，也不因天气信息固定追加穿衣、带伞等生活提醒。不将双方天气混用，不把天气预报当作已经发生的事实；数据缺失或过期时，不自行编造。天气为位置附近的模型估计，不代表整个区每一处的实测。\n'+values.map((v,i)=>{const side=['char','user'][i],cfg=settings?.[side]||{};return side+'：'+JSON.stringify(!v?{天气:'未设置'}:v.error?{城市:cfg.city,区域:cfg.district||'',天气:'不可用',说明:v.error}:{地点:v.place,天气范围:v.fallback?'市级':v.district?'区域':'城市',...(v.fallback?{说明:v.fallback}:{}),当地时间:localTime(v.zone),天气:v.text,温度:v.temp,体感温度:v.feels,降水毫米:v.precip,风速公里每小时:v.wind,数据时间:localTime(v.zone,v.at),来源:v.source});}).join('\n')+'\n</实时天气背景>\n';
}
const browserStorage=typeof window==='undefined'?null:{async get(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},async put(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
G.UwUWeather105={TTL,cacheMinutes108,clean,key,queryKey,validZone,version:'108.weather1',geoOK,savedValid,cityRows107,retry107,label,cities,districts,resolve,get,prompt,localTime,browserStorage};
})();
