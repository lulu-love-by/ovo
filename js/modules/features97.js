/* v97 shared UI, per-character image references and context boundary. */
(()=>{'use strict';const A=()=>window.UwUAssets96,E=(t,s,c)=>A().E(t,s,c),B=(s,f,c)=>A().B(s,f,c);let settingsChar;
const copy=x=>JSON.parse(JSON.stringify(x));
function currency(c){if(c?.currency97)return {code:c.currency97,symbol:new Intl.NumberFormat('en',{style:'currency',currency:c.currency97,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value||c.currency97};return window.UwUTransferCurrency95?.currency(c)||{code:'CNY',symbol:'¥'};}
function money(n,c){const v=currency(c);return v.symbol+' '+(Number(n||0)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function safeURL(s){const u=new URL(s);if(!['https:','http:'].includes(u.protocol))throw Error('请填写图片的 http(s) URL');return u.href;}
async function image(source,max=960,quality=.8,type='image/webp',maxDataLength=900000){
 let url,own=false,im;
 const load=src=>new Promise((resolve,reject)=>{
  const i=new Image();let done=false;const timer=setTimeout(()=>finish(Error('读取图片超时，请重新从相册选择')),30000);
  function finish(error){if(done)return;done=true;clearTimeout(timer);i.onload=i.onerror=null;if(error){i.src='';reject(error);}else resolve(i);}
  if(/^https?:/i.test(src))i.crossOrigin='anonymous';
  i.onload=()=>finish(i.naturalWidth>0&&i.naturalHeight>0?null:Error('图片没有有效尺寸，请重新选择'));
  i.onerror=()=>finish(Error('无法解码这张图片，请尝试从相册导出为 JPEG 或 PNG 后重新选择'));
  i.src=src;
 });
 try{
  if(source instanceof Blob){if(!source.size)throw Error('所选图片文件为空，请重新选择');url=URL.createObjectURL(source);own=true;}else url=source;
  try{im=await load(url);}catch(error){
   if(!(source instanceof Blob))throw error;
   // Some iOS file-provider blobs fail through an object URL; read their bytes instead.
   const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片文件读取失败，请先下载原图再选择'));reader.onabort=()=>reject(Error('图片读取已取消'));reader.readAsDataURL(source);});
   im=await load(raw);
  }
  let limit=Math.max(64,Math.min(4096,Number(max)||960)),last;
  for(let attempt=0;attempt<5;attempt++){
   const cv=document.createElement('canvas'),ratio=Math.min(1,limit/Math.max(im.naturalWidth,im.naturalHeight));
   cv.width=Math.max(1,Math.round(im.naturalWidth*ratio));cv.height=Math.max(1,Math.round(im.naturalHeight*ratio));
   try{
    const ctx=cv.getContext('2d');if(!ctx)throw Error('无法分配图片画布');
    if(type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);}
    ctx.drawImage(im,0,0,cv.width,cv.height);
    const data=cv.toDataURL(type,quality);
    if(!/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(data)||data.length<64)throw Error('图片压缩没有生成有效文件');
    if(data.length<=maxDataLength)return data;
    last=Error('压缩后的图片仍过大，请裁剪后重新选择');
   }catch(error){last=error;}finally{cv.width=0;cv.height=0;}
   if(limit<=128)break;limit=Math.max(128,Math.floor(limit/2));quality=Math.min(quality,.7);
  }
  throw Error('图片处理失败：'+(last?.message||'无法生成有效图片')+'。请重新选择图片');
 }finally{if(own)URL.revokeObjectURL(url);if(im)im.src='';}
}
function zoom(src){const d=A().sheet('图片预览'),i=E('img');i.src=src;i.className='v97-zoom';d.box.append(i);}
function worldSelect(box,c,w){const selected=new Set(w.worldBookIds97||[]),wrap=E('details');wrap.append(E('summary','绑定世界书'));for(const b of db.worldBooks||[]){const i=A().F(wrap,b.name||b.title||'世界书',selected.has(b.id),'checkbox');i.onchange=async()=>{i.checked?selected.add(b.id):selected.delete(b.id);try{await A().mutate(c,()=>w.worldBookIds97=[...selected]);}catch(e){selected.clear();for(const id of w.worldBookIds97||[])selected.add(id);i.checked=selected.has(b.id);showToast(e.message||'保存失败');}};}box.append(wrap);return selected;}
function face(c){return c.face97??={enabled:false,images:[],primary:null,single:false};}
function previews(c){const host=document.getElementById('face-previews97');if(!host)return;host.replaceChildren();const f=face(c);for(const r of f.images){const b=B('',()=>editFace(c,r),'v97-face-thumb');const im=E('img');im.src=r.data;im.alt='参考图';b.append(im,E('small',(r.id===f.primary?'主图 · ':'')+(r.enabled!==false?'已选':'未选')));host.append(b);}}
const faceDataLimit115 = 320000;
const faceSize115 = 512;
const faceCompactions115 = new WeakMap();

function compactFaceData115(source) {
    return image(source, faceSize115, .74, 'image/webp', faceDataLimit115);
}

function compactOldFaceRefs115(c) {
    const pending = faceCompactions115.get(c);
    if (pending) return pending;
    const task = (async () => {
        const updates = [];
        for (const record of face(c).images) {
            const original = record.data;
            if (typeof original !== 'string' || (
                /^data:image\/webp;/i.test(original) && original.length <= faceDataLimit115
            )) continue;
            try {
                const data = await compactFaceData115(original);
                if (data.length < original.length) updates.push({id: record.id, original, data});
            } catch (error) {
                console.warn('锁脸参考图压缩失败，保留原图', error);
            }
        }
        if (!updates.length) return;
        await A().mutate(c, () => {
            for (const update of updates) {
                const record = face(c).images.find(item => item.id === update.id);
                if (record?.data === update.original) record.data = update.data;
            }
        });
        if (settingsChar === c && currentChatId === c.id) previews(c);
    })().finally(() => faceCompactions115.delete(c));
    faceCompactions115.set(c, task);
    return task;
}

function editFace(c, record) {
    const config = face(c);
    const dialog = A().sheet(record ? '参考图' : '添加参考图');
    const url = A().F(dialog.box, '图片 URL', record?.url || '');
    const file = A().F(dialog.box, '从相册导入', '', 'file');
    file.accept = 'image/*';
    let newData;
    let cropping = false;
    let preview;

    async function cropSource(source) {
        if (cropping) return false;
        cropping = true;
        try {
            const cropped = await UwUImageCrop110.crop(source, {
                aspect: 1, title: '裁剪锁脸参考图', output: faceSize115, type: 'image/png'
            });
            if (!cropped) return false;
            newData = await compactFaceData115(cropped);
            url.value = '';
            if (preview) preview.src = newData;
            return true;
        } finally {
            cropping = false;
        }
    }

    file.onchange = async () => {
        if (!file.files[0]) return;
        try { await cropSource(file.files[0]); }
        catch (error) { showToast(error.message); }
        finally { file.value = ''; }
    };
    if (record) {
        preview = E('img');
        preview.src = record.data;
        preview.className = 'v97-face-preview';
        preview.onclick = () => zoom(newData || record.data);
        dialog.box.append(preview);
    }
    dialog.box.append(B('裁剪参考图', async () => {
        const source = url.value.trim() || newData || record?.data;
        if (!source) throw Error('请先添加图片');
        await cropSource(source);
    }));
    const chosen = A().F(dialog.box, '本次使用此图', record?.enabled !== false, 'checkbox');
    const primary = A().F(dialog.box, '设为主参考图', !config.primary || config.primary === record?.id, 'checkbox');
    const single = A().F(dialog.box, '接口只支持单图（仅使用主参考图）', config.single, 'checkbox');
    dialog.box.append(B('保存', async () => {
        if (cropping) throw Error('请先完成裁剪');
        const sourceUrl = url.value.trim();
        if (sourceUrl && sourceUrl !== record?.url && !await cropSource(safeURL(sourceUrl))) return;
        await A().mutate(c, () => {
            const live = record && config.images.find(item => item.id === record.id);
            if (record && !live) throw Error('这张参考图已删除');
            if (!newData && !live?.data) throw Error('请添加图片');
            if (!live && config.images.length >= 6) throw Error('最多保存6张参考图');
            const id = live?.id || A().uid();
            const fields = {data: newData || live.data, url: url.value.trim(), enabled: chosen.checked};
            if (live) Object.assign(live, fields);
            else config.images.push({id, ...fields});
            if (primary.checked) config.primary = id;
            config.single = single.checked;
        });
        if (settingsChar === c && currentChatId === c.id) previews(c);
        dialog.close();
    }, 'primary'));
    if (record) dialog.box.append(B('删除参考图', async () => {
        await A().mutate(c, () => {
            config.images = config.images.filter(item => item.id !== record.id);
            if (config.primary === record.id) config.primary = config.images[0]?.id || null;
        });
        if (settingsChar === c && currentChatId === c.id) previews(c);
        dialog.close();
    }));
}
function refs(settings){const c=db.characters.find(x=>x.id===settings._faceChat97);if(!c?.face97?.enabled)return [];const f=face(c),all=f.images.filter(i=>i.enabled!==false);all.sort((a,b)=>(b.id===f.primary)-(a.id===f.primary));return (f.single?all.slice(0,1):all).map(i=>i.data);}
function loadSettings(c){settingsChar=c;const f=face(c);document.getElementById('face-enabled97').checked=f.enabled;document.getElementById('face-add97').onclick=()=>editFace(c);document.getElementById('allow-remark97').checked=!!c.allowRemark97;let s=document.getElementById('currency-select97');if(!s){const label=E('div',undefined,'kkt-item');label.append(E('span','资产／转账币种'));s=E('select');s.id='currency-select97';for(const [v,t]of [['','跟随当地货币开关'],...['CNY','USD','EUR','GBP','JPY','KRW','HKD','TWD','CAD','AUD','CHF','SGD'].map(v=>[v,v])]){const o=E('option',t);o.value=v;s.append(o);}label.append(s);document.getElementById('setting-transfer-local-currency95').closest('.kkt-group').append(label);}s.value=c.currency97||'';previews(c);void compactOldFaceRefs115(c).catch(error=>console.warn('保存压缩后的锁脸图失败',error));}
function saveSettings(c){c.allowRemark97=document.getElementById('allow-remark97')?.checked===true;face(c).enabled=document.getElementById('face-enabled97')?.checked===true;c.currency97=document.getElementById('currency-select97')?.value||'';}
function history(c,rows){return rows.map(m=>{if(m.isWithdrawn)return m;if(m.uwuDiary110)return window.UwUExchange110?.hiddenHistory(m)||{...m,content:'[交换日记卡片]',parts:undefined};if(m.uwuNote97)return window.UwUNotes97?.expand(c,m)||{...m,content:'[条件纸条]',parts:undefined};if(m.uwuKeepsake97)return {...m,content:'[转发拾珍] '+JSON.stringify({...m.uwuKeepsake97,image:undefined}),parts:undefined};if(m.uwuAssetShare96)return {...m,content:m.content,parts:undefined};return window.UwUMedia97?.history(m)||m;});}
function install(){const panel=document.getElementById('panel-function-area'),host=panel?.querySelector('.expansion-grid,.function-swiper-container');if(host&&!document.getElementById('keepsakes97-entry')){for(const [id,title,order,fn,path]of [['keepsakes97-entry','拾珍',97,()=>UwUKeepsakes97.open(),'<path d="M6 3h12v18l-6-4-6 4z"/>'],['notes97-entry','条件纸条',98,()=>UwUNotes97.compose(),'<path d="M9 3h6M10 3v5l-4 6v6h12v-6l-4-6V3"/><path d="m12 11 1 2 2 .3-1.5 1.5.4 2.2-1.9-1-1.9 1 .4-2.2L9 13.3l2-.3z"/>']]){const b=B('',fn,'expansion-item');b.id=id;b.dataset.functionOrder=order;b.innerHTML='<div class="expansion-item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">'+path+'</svg></div><span class="expansion-item-name">'+title+'</span>';host.append(b);}setupFunctionPanelSwiper();}for(const [hostId,id] of [['workshop-sub-llm','expand-enabled97'],['workshop-gpt-sub-llm','expand-gpt-enabled97']]){const ws=document.getElementById(hostId);if(ws&&!document.getElementById(id)){const l=E('label',undefined,'v97-expand-setting'),i=E('input');i.type='checkbox';i.id=id;i.checked=db.workshopSettings?.expandEnabled97!==false;i.onchange=async()=>{db.workshopSettings??={};db.workshopSettings.expandEnabled97=i.checked;for(const other of ['expand-enabled97','expand-gpt-enabled97']){const el=document.getElementById(other);if(el)el.checked=i.checked;}await saveData();};l.append(i,E('span','启用提示词扩写（关闭后直接使用图片描述）'));ws.prepend(l);}}const pv=document.getElementById('send-pv-form');if(pv&&!document.getElementById('real-media97')){const b=B('从相册选择照片／视频',()=>{document.getElementById('send-pv-modal').classList.remove('visible');UwUMedia97.select();});b.id='real-media97';pv.prepend(b);}
const cacheForm=document.getElementById('clean-image-cache-form');document.getElementById('media-clean97')?.remove();if(cacheForm&&!document.getElementById('media-clean-filter97')){const b=B('按聊天／日期筛选媒体',()=>{document.getElementById('clean-image-cache-modal').classList.remove('visible');UwUMedia97.cleanup();});b.id='media-clean-filter97';b.style.marginTop='12px';cacheForm.append(b);}}

window.UwU97={currency,money,image,zoom,worldSelect,refs,loadSettings,saveSettings,history,install,copy,safeURL};
document.addEventListener('DOMContentLoaded',install);window.addEventListener('uwu-db-ready',install);setInterval(()=>{if(typeof db!=='undefined'&&window.UwUDataGuard90?.status?.().ready)install();},3000);
})();
