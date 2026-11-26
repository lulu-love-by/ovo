/* Keepsakes never enter prompts unless explicitly shared. */
(()=>{'use strict';const A=()=>UwUAssets96,E=(t,s,c)=>A().E(t,s,c),B=(s,f,c)=>A().B(s,f,c),copy=x=>JSON.parse(JSON.stringify(x));let current,screen,filter='all',query='';const kinds={gift:'礼物',photo:'照片',ticket:'票根',memory:'纪念',note:'纸条'};const state=c=>c.keepsakes97??={items:[],allowImages:false,createdAt:Date.now()};const rows=c=>state(c).items.filter(x=>x.userKey===A().userKey(c));
const capturePending = new WeakMap();
const captureSaving = new WeakSet();
function capture(c, fromOpen = false) {
 if (!c.history) return false;
 const s = state(c);
 const key = A().userKey(c);
 const seen = new Set(s.items.map(item => item.sourceId));
 const ignored = new Set(s.ignoredSources97 || []);
 let changed = false;
 for (const m of c.history) {
  if (m.isWithdrawn || m.isThinking || m.uwuDiary110 || m.uwuKeepsake97 || ignored.has(m.id) || seen.has(m.id)) continue;
  const gift = String(m.content || '').match(/送来的礼物[：:]([^\]]+)/);
  if (!gift) continue;
  const date = A().date(m.timestamp);
  s.items.push({
   id: A().uid(), userKey: m.assetUserKey96 || key, kind: 'gift', title: gift[1].trim().slice(0, 200),
   from: m.role === 'assistant' ? c.realName : c.myName,
   to: m.role === 'assistant' ? c.myName : c.realName,
   givenDate: date, date, sourceId: m.id, sourceAt: m.timestamp, note: '', image: '', createdAt: m.timestamp
  });
  seen.add(m.id);
  changed = true;
 }
 if (changed && fromOpen) capturePending.set(c, {});
 return changed;
}
function saveCaptured(c) {
 const pending = capturePending.get(c);
 if (!pending || captureSaving.has(c)) return;
 captureSaving.add(c);
 saveData({chat: c}).then(() => {
  if (capturePending.get(c) === pending) capturePending.delete(c);
 }).catch(error => {
  console.error(error);
  showToast('拾珍保存失败，下次打开时会重试');
 }).finally(() => captureSaving.delete(c));
}
function open(c) {
 current = c || db.characters.find(character => character.id === currentChatId);
 if (!current) return showToast('请在单人聊天打开拾珍');
 const chat = current;
 if (!screen) {
  screen = E('section', undefined, 'screen');
  screen.id = 'keepsakes97-screen';
  document.getElementById('chat-room-screen').parentElement.append(screen);
 }
 paint();
 switchScreen(screen.id);
 requestAnimationFrame(() => setTimeout(() => {
  const changed = capture(chat, true);
  if (changed && current === chat && screen.classList.contains('active')) paint();
  saveCaptured(chat);
 }, 0));
}
function paint(){const c=current;screen.replaceChildren();const app=E('div',undefined,'k97-app'),h=E('header',undefined,'k97-top');h.append(B('‹',()=>switchScreen('chat-room-screen')),E('small',(c.remarkName||c.realName)+' / '+(c.myName||'我')),B('＋',()=>editor(c)));app.append(h);const body=E('main',undefined,'k97-body');body.append(E('h1','拾珍'),E('small','PERSONAL ARCHIVE','k97-eyebrow'));const nav=E('nav',undefined,'k97-nav');for(const [k,t]of [['all','全部'],...Object.entries(kinds)])nav.append(B(t,()=>{filter=k;paint();},filter===k?'selected':''));body.append(nav);const tools=E('div',undefined,'k97-tools'),search=E('input');search.placeholder='搜索拾珍';search.value=query;search.onchange=()=>{query=search.value;paint();};tools.append(search,B('设置',settings),B('从聊天收藏',()=>pick(c)));body.append(tools);const grid=E('div',undefined,'k97-grid');const list=rows(c).filter(x=>(filter==='all'||x.kind===filter)&&(!query||(x.title+' '+x.note).includes(query))).sort((a,b)=>b.createdAt-a.createdAt);for(const [i,r]of list.entries()){const tile=B('',()=>detail(c,r),'k97-tile'+(i===0?' featured':''));if(r.kind==='ticket')tile.append(ticket(r));else if(r.image){const im=E('img');im.src=r.image;im.alt=r.title;tile.append(im);}else{const place=E('div',undefined,'k97-placeholder');place.innerHTML=r.kind==='gift'?'<svg viewBox="0 0 80 80" fill="none" stroke="currentColor"><path d="M15 32h50v36H15zM10 22h60v10H10zM40 22v46M40 22C10 22 23-2 40 22c17-24 30 0 0 0"/></svg>':'<svg viewBox="0 0 80 80" fill="none" stroke="currentColor"><path d="M17 10h46v60H17zM27 25h26M27 35h19M27 45h26"/></svg>';tile.append(place);}tile.append(E('small',String(i+1).padStart(2,'0'),'k97-index'),E('strong',r.title),E('small',(r.date||r.givenDate||'')+(r.place?' / '+r.place:'')));grid.append(tile);}if(!list.length)grid.append(E('p','把想留下的，收在这里。','k97-empty'));body.append(grid);app.append(body);screen.append(app);}
function ticket(r){const p=E('div',undefined,'k97-ticket');p.append(E('small',r.ticketType||'电影票'),E('strong',r.title||'票根'),E('span',r.date||''),E('small',r.place||''));const lower=E('div',undefined,'k97-ticket-stub');lower.append(E('span',r.time||''),E('span',r.seat||''));p.append(lower);if(r.route)p.append(E('small',r.route));return p;}
function detail(c,r,readOnly=false){const owned=!readOnly&&rows(c).includes(r),d=A().sheet('拾珍');d.box.classList.add('k97-detail');if(r.kind==='ticket')d.box.append(ticket(r));if(r.image){const im=E('img');im.src=r.image;im.className='k97-hero';im.onclick=()=>UwU97.zoom(r.image);d.box.append(im);}d.box.append(E('small',kinds[r.kind]||'纪念','k97-eyebrow'),E('h2',r.title));if(r.from||r.to)d.box.append(E('small',(r.from||'')+' → '+(r.to||'')));if(r.note)d.box.append(E('p',r.note,'k97-note'));for(const [k,l]of [['purchaseDate','购于'],['place','地点／平台'],['givenDate','赠于'],['date','纪念日期']])if(r[k])d.box.append(A().row(l,undefined,r[k]));if(r.exchangeSource110)d.box.append(B('查看原信 ↗',()=>{d.close();window.UwUExchange110?.openSource(c,r.exchangeSource110);}));if(r.sourceId)d.box.append(B('当时的对话 ↗',()=>{d.close();switchScreen('chat-room-screen');const i=c.history.findIndex(m=>m.id===r.sourceId);if(i>=0&&typeof MESSAGES_PER_PAGE!=='undefined'){currentPage=Math.max(currentPage,Math.ceil((c.history.length-i)/MESSAGES_PER_PAGE));renderMessages(false,false);}requestAnimationFrame(()=>document.querySelector('.message-wrapper[data-id="'+CSS.escape(r.sourceId)+'"]')?.scrollIntoView({block:'center'}));}));if(owned)A().actions(d.box,B('编辑',()=>{d.close();editor(c,r);}),B('转发 ↗',()=>share(c,r)),B('生成纪念文字',()=>enrich(c,r,d)));if(owned&&state(c).allowImages)d.box.append(B(r.image?'重新生成配图':'生成配图',()=>generateImage(c,r,d)));if(owned)d.box.append(B('删除藏品',async()=>{if(!confirm('删除这件藏品？聊天记录保留。'))return;await A().mutate(c,()=>{const s=state(c);s.items=s.items.filter(x=>x.id!==r.id);if(r.sourceId)(s.ignoredSources97??=[]).push(r.sourceId);});d.close();paint();}));}
function editor(c,r,seed={}){const d=A().sheet(r?'编辑藏品':'添加藏品'),v=r||seed,kind=A().S(d.box,'类型',Object.entries(kinds),v.kind||'gift'),fields={};for(const [k,l,t]of [['title','名称'],['date','纪念日期','date'],['from','赠送人'],['to','接收人'],['purchaseDate','购买日期','date'],['givenDate','赠送日期','date'],['place','地点／平台'],['ticketType','票根类型（电影／演出／机票等）'],['time','场次／航班'],['seat','座位'],['route','出发地 → 目的地'],['note','留下的话','textarea']])fields[k]=A().F(d.box,l,v[k]||'',t||'text');const url=A().F(d.box,'图片 URL',''),file=A().F(d.box,'相册导入','','file');file.accept='image/*';let image=v.image||'';file.onchange=async()=>{try{if(file.files[0])image=await UwU97.image(file.files[0]);}catch(e){showToast(e.message);}};if(image)d.box.append(B('移除图片',()=>{image='';showToast('保存后移除');}));d.box.append(B('保存',async()=>{if(!fields.title.value.trim())throw Error('请填写名称');if(url.value.trim())image=await UwU97.image(UwU97.safeURL(url.value.trim()));const data={...v,kind:kind.value,image};for(const [k,i]of Object.entries(fields))data[k]=i.value.trim().slice(0,k==='note'?4000:300);await A().mutate(c,()=>{if(r)Object.assign(r,data);else state(c).items.push({...data,id:A().uid(),createdAt:Date.now(),userKey:seed.userKey||A().userKey(c)});});d.close();if(current===c)paint();},'primary'));}
async function share(c,r){const snap=copy(r);delete snap.userKey;delete snap.imageJob97;const m={id:A().uid(),role:'user',content:'[转发拾珍] '+JSON.stringify({...snap,image:undefined}),timestamp:Date.now(),uwuKeepsake97:snap};await A().mutate(c,()=>c.history.push(m));SmartMessaging?.onUser(c,m);switchScreen('chat-room-screen');renderMessages(false,true);;}
function card(c,m){const r=m.uwuKeepsake97,b=B('',()=>{detail(c,r,true);},'k97-share');b.append(E('small','拾珍 · '+(kinds[r.kind]||'纪念'),'k97-eyebrow'));if(r.kind==='ticket')b.append(ticket(r));else if(r.image){const im=E('img');im.src=r.image;im.alt=r.title;im.className=r.kind==='photo'?'k97-share-photo':'k97-share-thumb';b.append(im);}b.append(E('strong',r.title));if(r.date)b.append(E('small',r.date));if(r.kind!=='photo'&&r.note)b.append(E('p',r.note));return b;}
function settings(){const c=current,d=A().sheet('拾珍设置'),on=A().F(d.box,'允许生图',state(c).allowImages,'checkbox');d.box.append(E('small','允许后，新增且需要配图的藏品使用工坊配置生成；票根由排版呈现。'));d.box.append(B('保存',async()=>{await A().mutate(c,()=>state(c).allowImages=on.checked);d.close();if(on.checked)void fillImages(c);},'primary'));}
function pick(c){const d=A().sheet('从聊天收藏');for(const m of c.history.slice(-200).reverse()){if(m.isThinking||m.isWithdrawn||m.uwuKeepsake97)continue;const text=UwU97.history(c,[m])[0].content||'';d.box.append(A().row(text.startsWith('data:')?'照片':String(text).slice(0,100),new Date(m.timestamp).toLocaleString(),'收藏',()=>{const image=m.media97?.items?.find(x=>x.kind==='image')?.src||(m.parts||[]).find(p=>p.type==='image')?.data||'';editor(c,null,{kind:image?'photo':'memory',title:image?'照片':'一段对话',note:image?'':String(text).slice(0,4000),image,sourceId:m.id,date:A().date(m.timestamp)});}));}}
async function enrich(c,r,d){const source=c.history.find(m=>m.id===r.sourceId),config=resolveAuxiliaryApiConfig('assets');const out=await A().requestJSON(config,JSON.stringify({record:{...r,image:undefined},persona:c.persona,source:source?UwU97.history(c,[source])[0].content:'',task:'根据明确记录写简短纪念文字，礼物用赠送人的口吻写选择它的原因。没有依据的购买时间地点不要补写。输出JSON {note:"文字"}'}),undefined,'只输出JSON，不发送聊天消息。');await A().mutate(c,()=>r.note=String(out.note||'').slice(0,4000));;d?.close();detail(c,r);}
const generating=new Set();async function generateImage(c,r,d){if(!state(c).allowImages)throw Error('请先允许生图');if(generating.has(r.id)||r.imageJob97==='pending')return showToast('图片正在生成');generating.add(r.id);r.imageJob97='pending';await saveData({chat:c});try{const settings={...db.workshopSettings,_faceChat97:r.kind==='photo'?c.id:null},prompt='纪念藏品配图，主体为：'+r.title+'。'+r.note+'。礼物使用细腻静物摄影，照片按内容呈现。无文字无水印。';const out=await executeImageGeneration(settings,prompt);const src=/^(data:|https?:)/.test(out.imageData)?out.imageData:'data:image/png;base64,'+out.imageData;const image=await UwU97.image(src);await A().mutate(c,()=>{r.image=image;r.imageJob97=('done');});;d?.close();if(d)detail(c,r);if(current===c&&screen?.classList.contains('active'))paint();}catch(e){r.imageJob97=null;await saveData({chat:c});throw e;}finally{generating.delete(r.id);}}
async function fillImages(c){for(const r of rows(c))if(state(c).allowImages&&!r.image&&!r.imageAttempted97&&['gift','photo'].includes(r.kind)){r.imageAttempted97=true;try{await generateImage(c,r);}catch(e){showToast('拾珍配图：'+e.message);}break;}}

function fromNote(c,n){if(rows(c).some(r=>r.sourceNote===n.id))return showToast('已在拾珍');editor(c,null,{kind:'note',title:'一颗星星',note:n.content,date:A().date(n.createdAt),sourceNote:n.id});}
setInterval(()=>{if(typeof db==='undefined'||document.hidden)return;for(const c of db.characters||[])if(c.keepsakes97?.allowImages)void fillImages(c).catch(console.error);},30000);
window.UwUKeepsakes97={open,paint,state,rows,capture,editor,detail,card,pick,fromNote,fillImages};
})();
