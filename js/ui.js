// --- 界面交互逻辑 (js/ui.js) ---

// DOM 元素缓存 (将在脚本加载时初始化)
const homeScreen = document.getElementById('home-screen');
let chatRoomScreen = document.getElementById('chat-room-screen');
let chatExpansionPanel = document.getElementById('chat-expansion-panel');
let panelFunctionArea = document.getElementById('panel-function-area');
let panelStickerArea = document.getElementById('panel-sticker-area');
let messageArea = document.getElementById('message-area');
let chatRoomHeaderDefault = document.getElementById('chat-room-header-default');
let chatRoomHeaderSelect = document.getElementById('chat-room-header-select');
let multiSelectBar = document.getElementById('multi-select-bar');
let multiSelectTitle = document.getElementById('multi-select-title');
let selectCount = document.getElementById('select-count');
let deleteSelectedBtn = document.getElementById('delete-selected-btn');
let chatRoomTitle = document.getElementById('chat-room-title');
let chatRoomStatusText = document.getElementById('chat-room-status-text');
let typingIndicator = document.getElementById('typing-indicator');
let messageInput = document.getElementById('message-input');
let getReplyBtn = document.getElementById('get-reply-btn');
let regenerateBtn = document.getElementById('regenerate-btn');

// 绑定功能面板按钮
function setupAirDropPanelBtn() {
    const airdropPanelBtn = document.getElementById('airdrop-panel-btn');
    if (airdropPanelBtn) {
        // 移除旧的监听器以防重复绑定
        const newBtn = airdropPanelBtn.cloneNode(true);
        airdropPanelBtn.parentNode.replaceChild(newBtn, airdropPanelBtn);
        
        newBtn.addEventListener('click', async () => {
            document.getElementById('chat-expansion-panel').classList.remove('visible');
            if (currentChatType !== 'private') {
                showToast('隔空投送仅支持私聊');
                return;
            }
            const chat = db.characters.find(c => c.id === currentChatId);
            if (!chat) return;

            if (!dexieDB) {
                showToast('数据库未就绪');
                return;
            }

            try {
                const photos = await dexieDB.characterPhotos.where('charId').equals(chat.id).reverse().sortBy('timestamp');
                if (photos.length > 0) {
                    showAirDropPreview(photos[0], chat);
                } else {
                    showToast('TA的相册空空如也');
                }
            } catch (error) {
                console.error("Load AirDrop Error:", error);
                showToast('加载失败');
            }
        });
    }
}

// 屏幕切换
const switchScreen = (targetId) => {
    const returningFromSettings=targetId==='chat-room-screen'&&!!document.querySelector('#chat-settings-screen.active, #group-settings-screen.active');
    if(targetId==='home-screen')window.UwUWidgetStyles?.sync();
    if(targetId==='music-screen')window.UwUMusicHost?.mount();
    window.UwUNight?.apply(targetId);
    if(targetId==='chat-settings-screen'||targetId==='group-settings-screen'){const chat=(targetId==='chat-settings-screen'?db.characters:db.groups).find(c=>c.id===currentChatId);window.VectorMemoryUI?.mountModeSettings(targetId,chat);}
    if (targetId === 'api-settings-screen') {window.UwUReviewsAPI?.setup();window.UwUReviewsAPI?.refresh();window.MessageNotifications?.onApiOpen();if(typeof populateApiSelect==='function')populateApiSelect();if(typeof setupMainApiPresetControls==='function')setupMainApiPresetControls();}
    // 离开聊天室时清理自定义样式
    if (targetId !== 'chat-room-screen') {
        const customStyles = document.querySelectorAll('style[id^="custom-bubble-style-for-"]');
        customStyles.forEach(style => style.remove());
    } else {
        // 返回聊天室时重新应用样式
        if (typeof currentChatId !== 'undefined' && currentChatId) {
            const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
            if (chat) {
                updateCustomBubbleStyle(currentChatId, chat.customBubbleCss, chat.useCustomBubbleCss);
            }
        }
    }
    
    // 修复：实时获取所有 screen 元素，确保动态创建的页面也能被正确隐藏
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(targetId);
    if (targetScreen) targetScreen.classList.add('active');
    if(returningFromSettings){currentPage=1;renderMessages(false,false);window.ChatViewWork?.followLatest(messageArea);}
    
    // 关闭所有覆盖层和侧边栏
    const overlays = document.querySelectorAll('.modal-overlay, .action-sheet-overlay, .settings-sidebar');
    overlays.forEach(o => o.classList.remove('visible', 'open'));

    // 离开设置页面时清空CSS预览区域，防止预览样式(可能是全局的)污染其他页面
    if (targetId !== 'chat-settings-screen' && targetId !== 'group-settings-screen') {
        const previewContainers = document.querySelectorAll('.bubble-css-preview');
        previewContainers.forEach(el => el.innerHTML = '');
    }

    // 控制全局底栏显示与状态
    const globalNav = document.getElementById('global-bottom-nav');
    if (globalNav) {
        if (targetId === 'chat-list-screen' || targetId === 'contacts-screen' || targetId === 'more-screen') {
            globalNav.style.display = 'flex';
            // 更新选中状态
            const navItems = globalNav.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                if (item.getAttribute('data-target') === targetId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        } else {
            globalNav.style.display = 'none';
        }
    }

    if(targetId==='chat-list-screen'&&typeof renderChatList==='function')renderChatList();
    if (targetId === 'more-screen') {
        renderMoreScreen();
    }

    if (targetId === 'world-book-screen') {
        if (typeof renderWorldBookList === 'function') renderWorldBookList();
    }
};

function renderMoreScreen() {
    let myName = 'User Name';
    let myAvatar = 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg';

    let activePersona = null;
    if (db.activePersonaId) {
        activePersona = db.myPersonaPresets.find(p => p.id === db.activePersonaId);
    }
    
    if (!activePersona && db.myPersonaPresets && db.myPersonaPresets.length > 0) {
        activePersona = db.myPersonaPresets[0];
    }

    if (activePersona) {
        myName = activePersona.name || 'User';
        myAvatar = activePersona.avatar || myAvatar;
    } else if (db.characters && db.characters.length > 0) {
        const firstChar = db.characters[0];
        myName = firstChar.myName || 'User Name';
        myAvatar = firstChar.myAvatar || 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg';
    }
    
    const avatarEl = document.getElementById('more-my-avatar');
    const nameEl = document.getElementById('more-my-name');
    const dateEl = document.getElementById('more-date-display');

    if (avatarEl) avatarEl.src = myAvatar;
    if (nameEl) nameEl.textContent = myName;
    
    // 更新日期显示 (格式: YYYY#MMDD)
    if (dateEl) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        dateEl.textContent = `${year}#${month}${day}`;
    }

    // 应用自定义背景图
    const bgLayer = document.querySelector('.glass-background-layer');
    if (bgLayer && db.moreProfileCardBg) {
        bgLayer.style.backgroundImage = `url('${db.moreProfileCardBg}')`;
    }

    // 触发搜索引导
    if (window.GuideSystem) {
        window.GuideSystem.check('guide_search_entry');
    }
}

function setupMoreCardBgModal() {
    const modal = document.getElementById('more-card-bg-modal');
    const form = document.getElementById('more-card-bg-form');
    const preview = document.getElementById('more-card-bg-preview');
    const urlInput = document.getElementById('more-card-bg-url-input');
    const fileUpload = document.getElementById('more-card-bg-file-upload');
    
    // 绑定点击事件到背景层
    // 注意：由于 renderMoreScreen 可能会被多次调用，我们需要使用事件委托或者确保只绑定一次
    // 这里我们使用事件委托绑定到 document，在 renderMoreScreen 中不需要重复绑定
    document.body.addEventListener('click', (e) => {
        // 只要点击了更多界面的个人卡片区域（包括背景和内容），都触发更换背景
        // 这样可以避免因为内容层遮挡背景层导致点击无效
        // 2026-01-21 修改：将点击范围限定在背景层 (glass-background-layer)，避免点击头像/名字触发
        if (e.target.classList.contains('glass-background-layer')) {
            // 打开模态框
            modal.classList.add('visible');
            urlInput.value = '';
            fileUpload.value = null;
            preview.style.backgroundImage = `url('${db.moreProfileCardBg || 'https://i.postimg.cc/XvFDdTKY/Smart-Select-20251013-023208.jpg'}')`;
            preview.innerHTML = '';
        }
    });

    // URL 输入预览
    urlInput.addEventListener('input', () => {
        if (urlInput.value) {
            preview.style.backgroundImage = `url('${urlInput.value}')`;
            preview.innerHTML = '';
        }
    });

    // 文件上传预览
    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.style.backgroundImage = `url('${e.target.result}')`;
                preview.innerHTML = '';
                // 临时存储 base64，提交时使用
                fileUpload.dataset.base64 = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 保存
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        let newBg = db.moreProfileCardBg;

        if (fileUpload.files.length > 0 && fileUpload.dataset.base64) {
            newBg = fileUpload.dataset.base64;
        } else if (urlInput.value) {
            newBg = urlInput.value;
        }

        if (newBg !== db.moreProfileCardBg) {
            db.moreProfileCardBg = newBg;
            await saveData();
            renderMoreScreen(); // 重新渲染以应用更改
            showToast('背景已更新');
        }
        
        modal.classList.remove('visible');
        // 清理
        fileUpload.dataset.base64 = '';
    });
}

// 右键菜单
function createContextMenu(items, x, y) {
    removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);

    items.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (item.danger) menuItem.classList.add('danger');
        menuItem.textContent = item.label;
        menuItem.onclick = () => {
            item.action();
            removeContextMenu();
        };
        menu.appendChild(menuItem);
    });

    const rect = menu.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const padding = 10; // 屏幕边缘间距

    // 水平方向调整
    if (x + rect.width > winWidth - padding) {
        x = winWidth - rect.width - padding;
    }
    if (x < padding) {
        x = padding;
    }
    
    // 垂直方向调整
    if (y + rect.height > winHeight - padding) {
        // 如果下方空间不足，向上弹出
        y = y - rect.height;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = 'visible';

    document.addEventListener('click', removeContextMenu, {once: true});
}

function removeContextMenu() {
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
}

// 更新气泡样式
function updateCustomBubbleStyle(chatId, css, enabled) {
    const STYLE_TAG_CLASS = 'dynamic-chat-style-tag';
    const existingStyles = document.querySelectorAll(`.${STYLE_TAG_CLASS}, style[id^="custom-bubble-style-for-"]`);
    existingStyles.forEach(el => el.remove());

    const activeChat=typeof db!=='undefined'?(db.characters.find(c=>c.id===chatId)||db.groups.find(c=>c.id===chatId)):null;
    const metadataChat=activeChat?{...activeChat,useCustomBubbleCss:enabled,customBubbleCss:css||''}:null;
    if (!UwUChatTime115.enabled(metadataChat)) {
        UwUChatTime115.clearWithin(document.getElementById('message-area'));
        UwUChatTime115.clearWithin(document.getElementById('chat-room-header-default'));
    }
    if(metadataChat) {
        const messages=new Map((activeChat.history||[]).map(m=>[String(m.id),m]));
        document.querySelectorAll('#chat-room-screen .message-wrapper[data-id]').forEach(row=>{
            const message=messages.get(row.dataset.id);
            if(message)uwuQuoteMetadata111(row,message,metadataChat);
        });
        uwuRefreshChatHeader111(metadataChat);
    }
    if (!enabled || !css) return;

    // 获取 chat 对象以支持模板变量
    let chat = null;
    if (typeof db !== 'undefined') {
        chat = db.characters.find(c => c.id === chatId) || db.groups.find(g => g.id === chatId);
    }

    // 处理模板变量 ({{char_avatar}}, {{user_avatar}} 等)
    // processTemplate 定义在 js/utils.js 中
    const processedCss = (typeof processTemplate === 'function' && chat) ? processTemplate(css, chat) : css;

    const styleElement = document.createElement('style');
    styleElement.id = `custom-bubble-style-for-${chatId}`;
    styleElement.className = STYLE_TAG_CLASS;

    styleElement.textContent = processedCss;

    document.head.appendChild(styleElement);
}

function updateBubbleCssPreview(previewContainer, css, useDefault, theme) {
    previewContainer.innerHTML = '';

    const sentBubble = document.createElement('div');
    sentBubble.className = 'message-bubble sent';
    sentBubble.textContent = '这是我方气泡。';
    sentBubble.style.alignSelf = 'flex-end';
    sentBubble.style.borderBottomRightRadius = '5px';

    const receivedBubble = document.createElement('div');
    receivedBubble.className = 'message-bubble received';
    receivedBubble.textContent = '这是对方气泡。';
    receivedBubble.style.alignSelf = 'flex-start';
    receivedBubble.style.borderBottomLeftRadius = '5px';

    [sentBubble, receivedBubble].forEach(bubble => {
        bubble.style.maxWidth = '70%';
        bubble.style.padding = '8px 12px';
        bubble.style.wordWrap = 'break-word';
        bubble.style.lineHeight = '1.4';
    });

    if (useDefault || !css) {
        sentBubble.style.backgroundColor = theme.sent.bg;
        sentBubble.style.color = theme.sent.text;
        sentBubble.style.borderRadius = '18px';
        sentBubble.style.borderBottomRightRadius = '5px';
        receivedBubble.style.backgroundColor = theme.received.bg;
        receivedBubble.style.color = theme.received.text;
        receivedBubble.style.borderRadius = '18px';
        receivedBubble.style.borderBottomLeftRadius = '5px';
    } else {
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            #${previewContainer.id} {
                ${css}
            }
        `;
        previewContainer.appendChild(styleTag);
    }
    previewContainer.appendChild(receivedBubble);
    previewContainer.appendChild(sentBubble);
}

// 主屏幕逻辑
let currentPageIndex = 0;
let homeSortables = [];
let isHomeEditMode = false;
let homePressTimer = null;

/**
 * 初始分页计算算法：仅在迁移旧数据或初始化时使用
 * 将小组件按顺序填充到 4x6 的网格页面中，返回 ID 的二维数组
 */
function calculatePagesFromIds(ids, allItemsHtmlMap) {
    const PAGE_COLS = 4;
    const PAGE_ROWS = 6;
    let pages = [];
    let currentPageIds = [];
    let grid = Array(PAGE_ROWS).fill(null).map(() => Array(PAGE_COLS).fill(false));
    let currR = 0;
    let currC = 0;

    ids.forEach(id => {
        const html = allItemsHtmlMap[id];
        if (!html) return;
        
        let rows = 1, cols = 1;
        const match = html.match(/grid-item-(\d+)x(\d+)/);
        if (match) {
            rows = parseInt(match[1]);
            cols = parseInt(match[2]);
        }
        
        let placed = false;
        while (currR <= PAGE_ROWS - rows) {
            let canFit = true;
            if (currC + cols > PAGE_COLS) {
                canFit = false;
            } else {
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (grid[currR + i][currC + j]) {
                            canFit = false;
                            break;
                        }
                    }
                    if (!canFit) break;
                }
            }

            if (canFit) {
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        grid[currR + i][currC + j] = true;
                    }
                }
                currentPageIds.push(id);
                placed = true;
                currC += cols;
                if (currC >= PAGE_COLS) {
                    currC = 0;
                    currR++;
                }
                break;
            } else {
                currC++;
                if (currC >= PAGE_COLS) {
                    currC = 0;
                    currR++;
                }
            }
        }
        
        if (!placed) {
            pages.push(currentPageIds);
            currentPageIds = [id];
            grid = Array(PAGE_ROWS).fill(null).map(() => Array(PAGE_COLS).fill(false));
            currR = 0;
            currC = 0;
            if (rows <= PAGE_ROWS && cols <= PAGE_COLS) {
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        grid[i][j] = true;
                    }
                }
                currC = cols;
                if (currC >= PAGE_COLS) {
                    currC = 0;
                    currR = 1;
                }
            }
        }
    });
    
    if (currentPageIds.length > 0) {
        pages.push(currentPageIds);
    }
    
    while (pages.length < 2) {
        pages.push([]);
    }
    
    return pages;
}

// Positions are explicit 0-based cells. Empty cells and empty intermediate pages are intentional.
let homeGridWriteBusy=false;
function homeItemSize(html){const match=String(html).match(/grid-item-(\d+)x(\d+)/);return {rows:Math.max(1,Math.min(6,Number(match?.[1])||1)),cols:Math.max(1,Math.min(4,Number(match?.[2])||1))};}
function homePositionValid(p){return p&&Number.isSafeInteger(p.page)&&p.page>=0&&p.page<500&&Number.isSafeInteger(p.row)&&p.row>=0&&Number.isSafeInteger(p.col)&&p.col>=0&&p.row+p.rows<=6&&p.col+p.cols<=4;}
function homeCells(p){const cells=[];for(let r=p.row;r<p.row+p.rows;r++)for(let c=p.col;c<p.col+p.cols;c++)cells.push(`${p.page}:${r}:${c}`);return cells;}
function syncHomeLayoutLists(){
 const model=db.homeLayoutGrid,positions=model.positions;
 model.pageCount=Math.max(1,model.pageCount,...Object.values(positions).map(p=>p.page+1));
 db.homeLayoutPages=Array.from({length:model.pageCount},()=>[]);
 Object.keys(positions).sort((a,b)=>positions[a].page-positions[b].page||positions[a].row-positions[b].row||positions[a].col-positions[b].col).forEach(id=>db.homeLayoutPages[positions[id].page].push(id));
 db.homeLayoutOrder=db.homeLayoutPages.flat();
}
function ensureHomeGrid(allItems){
 const before=JSON.stringify([db.homeLayoutGrid,db.homeLayoutPages,db.homeLayoutOrder]),saved=db.homeLayoutGrid?.version===1?db.homeLayoutGrid:null;
 const legacy=Array.isArray(db.homeLayoutPages)?db.homeLayoutPages:[db.homeLayoutOrder||Object.keys(allItems)],hints={},order=[];
 legacy.forEach((page,index)=>(Array.isArray(page)?page:[]).forEach(id=>{if(allItems[id]&&!order.includes(id)){hints[id]=index;order.push(id);}}));
 for(const id of Object.keys(allItems))if(!order.includes(id))order.push(id);
 const positions=Object.create(null),occupied=new Set(),put=(id,p)=>{positions[id]=p;homeCells(p).forEach(cell=>occupied.add(cell));};
 const find=(page,size,start=0)=>{for(let index=start;index<24;index++){const p={page,row:Math.floor(index/4),col:index%4,...size};if(homePositionValid(p)&&homeCells(p).every(cell=>!occupied.has(cell)))return p;}return null;};
 if(saved){
  // Reserve locked rectangles first when recovering an inconsistent imported layout.
  for(const id of [...order].sort((a,b)=>Number(!!saved.positions?.[b]?.locked)-Number(!!saved.positions?.[a]?.locked))){const old=saved.positions?.[id];if(!old)continue;const p={page:old.page,row:old.row,col:old.col,...homeItemSize(allItems[id]),locked:old.locked===true};if(homePositionValid(p)&&homeCells(p).every(cell=>!occupied.has(cell)))put(id,p);}
 }
 const cursors={};
 for(const id of order){
  if(positions[id])continue;
  const old=saved?.positions?.[id],size=homeItemSize(allItems[id]);let page=Number.isSafeInteger(old?.page)&&old.page>=0&&old.page<500?old.page:(hints[id]||0),p=null;
  while(!p&&page<500){p=find(page,size,saved?0:(cursors[page]||0));if(!p)page++;}
  if(!p)throw Error('主页页面过多，请先整理布局');
  p.locked=old?.locked===true;put(id,p);if(!saved)cursors[page]=p.row*4+p.col+p.cols;
 }
 const count=Number.isSafeInteger(saved?.pageCount)&&saved.pageCount>0&&saved.pageCount<=500?saved.pageCount:Math.max(1,legacy.length);
 db.homeLayoutGrid={version:1,pageCount:count,positions};syncHomeLayoutLists();
 return before!==JSON.stringify([db.homeLayoutGrid,db.homeLayoutPages,db.homeLayoutOrder]);
}
function homeDropPlan(id,p){
 const positions=db.homeLayoutGrid.positions,old=positions[id];
 if(!homePositionValid(p))return {ok:false,label:'超出页面范围'};
 if(old?.locked)return {ok:false,label:'请先解锁'};
 const overlaps=(a,b)=>a.page===b.page&&a.row<b.row+b.rows&&a.row+a.rows>b.row&&a.col<b.col+b.cols&&a.col+a.cols>b.col;
 const displaced=Object.entries(positions).filter(([key,q])=>key!==id&&overlaps(p,q));
 if(displaced.some(([,q])=>q.locked))return {ok:false,label:'此处已锁定'};
 const next=JSON.parse(JSON.stringify(positions));next[id]={...p,locked:false};
 for(const [key]of displaced)delete next[key];
 for(const [key,q]of displaced){
  let target=null;const free=c=>homePositionValid(c)&&Object.values(next).every(v=>!overlaps(c,v));
  const original={...old,rows:q.rows,cols:q.cols,locked:false};if(free(original))target=original;
  for(let page=p.page;!target&&page<500;page++)for(let cell=0;cell<24&&!target;cell++){const c={page,row:Math.floor(cell/4),col:cell%4,rows:q.rows,cols:q.cols,locked:false};if(free(c))target=c;}
  if(!target)return {ok:false,label:'没有足够空间'};next[key]=target;
 }
 return {ok:true,label:displaced.length?'移动并让位':'放在这里',positions:next};
}
function homeDropAllowed(id,p){return homeDropPlan(id,p);}
function homeGridMetrics(grid){
 const rect=grid.getBoundingClientRect(),style=getComputedStyle(grid),px=key=>parseFloat(style[key])||0;
 const left=px('paddingLeft'),right=px('paddingRight'),top=px('paddingTop'),bottom=px('paddingBottom');
 const gap=(key,fallback)=>{const n=parseFloat(style[key]);return Number.isFinite(n)?n:fallback;},gapX=gap('columnGap',15),gapY=gap('rowGap',0);
 const tracks=(value,count,fallback)=>{const rows=String(value||'').trim().split(/\s+/);return rows.length===count&&rows.every(v=>/^\d+(\.\d+)?px$/.test(v))?rows.map(parseFloat):Array(count).fill(fallback);};
 const columns=tracks(style.gridTemplateColumns,4,Math.max(0,(rect.width-left-right-gapX*3)/4));
 const rows=tracks(style.gridTemplateRows,6,70);
 const offsets=(sizes,gap)=>{let offset=0;return sizes.map(size=>{const start=offset;offset+=size+gap;return start;});};
 return {rect,left,right,top,bottom,gapX,gapY,col:columns[0],row:rows[0],columns,rows,columnStarts:offsets(columns,gapX),rowStarts:offsets(rows,gapY)};
}
function homeTrackIndex(starts,coordinate,max){let best=0;for(let i=1;i<=max;i++)if(Math.abs(starts[i]-coordinate)<Math.abs(starts[best]-coordinate))best=i;return best;}
function homeTrackSpan(sizes,gap,start,count){return sizes.slice(start,start+count).reduce((sum,n)=>sum+n,0)+Math.max(0,count-1)*gap;}
const HOME_LOCK_OPEN='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M7 9V6a3.5 3.5 0 0 1 6.8-1.2"/><path d="M10 12v2"/></svg>';
const HOME_LOCK_CLOSED='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3M10 12v2"/></svg>';
function refreshHomeLocks(){
 for(const item of homeScreen.querySelectorAll('.home-grid-layout > [data-id]')){
  const p=db.homeLayoutGrid?.positions[item.dataset.id],button=item.querySelector(':scope > .home-position-lock');if(!button)continue;
  const locked=p?.locked===true,name=item.querySelector('.app-name')?.textContent||'小组件';item.classList.toggle('home-position-locked',locked);
  button.innerHTML=locked?HOME_LOCK_CLOSED:HOME_LOCK_OPEN;button.setAttribute('aria-pressed',String(locked));button.setAttribute('aria-label',(locked?'解锁':'锁定')+name+'的位置');button.title=locked?'解锁位置':'锁定位置';button.disabled=homeGridWriteBusy;
 }
}
async function toggleHomePositionLock(id){
 if(homeGridWriteBusy||document.querySelector('.home-drag-preview'))return;
 const owner=db,p=db.homeLayoutGrid?.positions[id];if(!p)return;const old=p.locked;
 homeGridWriteBusy=true;p.locked=!old;refreshHomeLocks();
 try{await saveData();if(db===owner&&typeof triggerHapticFeedback==='function')triggerHapticFeedback('light');}
 catch(error){if(db===owner&&db.homeLayoutGrid?.positions[id])db.homeLayoutGrid.positions[id].locked=old;if(typeof showToast==='function')showToast('锁定状态未保存，已恢复');}
 finally{homeGridWriteBusy=false;refreshHomeLocks();}
}
function decorateHomeGrid(){
 for(const grid of homeScreen.querySelectorAll('.home-grid-layout')){

  for(const item of [...grid.children].filter(el=>el.dataset.id)){
   const p=db.homeLayoutGrid.positions[item.dataset.id];if(!p)continue;
   item.style.gridColumn=`${p.col+1} / span ${p.cols}`;item.style.gridRow=`${p.row+1} / span ${p.rows}`;
   const button=document.createElement('button');button.type='button';button.className='home-position-lock';button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void toggleHomePositionLock(item.dataset.id);});item.append(button);
  }
 }refreshHomeLocks();
}

function setupHomeScreen() {
    const previousSwiper=document.getElementById('home-screen-swiper');
    const previousPage=previousSwiper?.clientWidth?Math.round(previousSwiper.scrollLeft/previousSwiper.clientWidth):currentPageIndex;
    const keepEditing=isHomeEditMode;
    homeSortables.forEach(controller=>controller.destroy());homeSortables=[];
    homeScreenBindings?.abort();homeScreenBindings=new AbortController();
    window.UwUWidgetStyles?.sync();
    const getIcon = (id) => db.customIcons[id] || defaultIcons[id].url;
    if (!db.insWidgetSettings) {
        db.insWidgetSettings = {
            avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg',
            bubble1: '„- ω -„',
            avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg',
            bubble2: 'ｷ...✩'
        };
    }
    const insWidget = db.insWidgetSettings;

    // 定义所有可用的组件和应用
    const allItems = {
        'app-chat': `<div class="grid-item-1x1" data-id="app-chat"><a href="#" class="app-icon" data-target="chat-list-screen"><img src="${getIcon('chat-list-screen')}" alt="404" class="icon-img"><span class="app-name">${defaultIcons['chat-list-screen'].name}</span></a></div>`,
        'app-api': `<div class="grid-item-1x1" data-id="app-api"><a href="#" class="app-icon" data-target="api-settings-screen"><img src="${getIcon('api-settings-screen')}" alt="API" class="icon-img"><span class="app-name">${defaultIcons['api-settings-screen'].name}</span></a></div>`,
        'app-wallpaper': `<div class="grid-item-1x1" data-id="app-wallpaper"><a href="#" class="app-icon" data-target="wallpaper-screen"><img src="${getIcon('wallpaper-screen')}" alt="Wallpaper" class="icon-img"><span class="app-name">${defaultIcons['wallpaper-screen'].name}</span></a></div>`,
        'app-worldbook': `<div class="grid-item-1x1" data-id="app-worldbook"><a href="#" class="app-icon" data-target="world-book-screen"><img src="${getIcon('world-book-screen')}" alt="World Book" class="icon-img"><span class="app-name">${defaultIcons['world-book-screen'].name}</span></a></div>`,
        'app-customize': `<div class="grid-item-1x1" data-id="app-customize"><a href="#" class="app-icon" data-target="customize-screen"><img src="${getIcon('customize-screen')}" alt="Customize" class="icon-img"><span class="app-name">${defaultIcons['customize-screen'].name}</span></a></div>`,
        'app-tutorial': `<div class="grid-item-1x1" data-id="app-tutorial"><a href="#" class="app-icon" data-target="tutorial-screen"><img src="${getIcon('tutorial-screen')}" alt="Tutorial" class="icon-img"><span class="app-name">${defaultIcons['tutorial-screen'].name}</span></a></div>`,
        'app-console': `<div class="grid-item-1x1" data-id="app-console"><a href="#" class="app-icon" data-target="console-screen"><img src="${getIcon('console-screen')}" alt="Console" class="icon-img"><span class="app-name">${defaultIcons['console-screen'].name}</span></a></div>`,
        'app-widget-market': `<div class="grid-item-1x1" data-id="app-widget-market"><a href="#" class="app-icon" data-target="widget-market-screen"><img src="${getIcon('widget-market-screen')}" alt="小组件" class="icon-img"><span class="app-name">小组件</span></a></div>`,
        'app-reader': `<div class="grid-item-1x1" data-id="app-reader"><a href="#" class="app-icon" data-target="reader-bookshelf-screen"><img src="${getIcon('reader-bookshelf-screen')}" alt="阅读器" class="icon-img"><span class="app-name">${defaultIcons['reader-bookshelf-screen'].name}</span></a></div>`,
        'app-placeholder': `<div class="grid-item-1x1" data-id="app-placeholder"><a href="#" class="app-icon" data-target="music-screen"><img src="${getIcon('placeholder-app')}" alt="<3" class="icon-img"><span class="app-name">${defaultIcons['placeholder-app'].name}</span></a></div>`
    };

    // 收集需要执行的 JS 代码
    const widgetScripts = [];

    // 注入自定义小组件
    if (db.addedWidgets && db.widgetTemplates) {
        db.addedWidgets.forEach(instance => {
            const template = db.widgetTemplates.find(t => t.id === instance.templateId);
            if (template) {
                // 修复：必须替换 {{id}} 占位符，否则 HTML 无法匹配注入的 CSS 选择器
                let html = template.html.replace(/{{id}}/g, template.id);
                // 替换变量
                const vars = { ...template.defaultVars, ...instance.vars };
                for (const [key, value] of Object.entries(vars)) {
                    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
                }
                
                // 收集 JS 代码
                if (template.js) {
                    let jsCode = template.js.replace(/{{id}}/g, template.id);
                    for (const [key, value] of Object.entries(vars)) {
                        jsCode = jsCode.replace(new RegExp(`{{${key}}}`, 'g'), value);
                    }
                    widgetScripts.push({ id: instance.id, code: jsCode });
                }
                
                // 转换尺寸类名 (4x2 对应 grid-item-2x4)
                let sizeClass = `grid-item-${template.size}`;
                if (template.size === '4x2') sizeClass = 'grid-item-2x4';
                
                allItems[instance.id] = `
                    <div class="${sizeClass} custom-widget-item" data-id="${instance.id}" style="position:relative;min-width:0;min-height:0;isolation:isolate;">
                        <div class="custom-widget-container" style="width:100%; height:100%; position:relative; overflow:hidden; contain:paint; isolation:isolate;">
                            ${html}
                        </div>
                            <button class="delete-widget-btn" data-id="${instance.id}" style="display:none; position:absolute; top:-5px; right:-5px; background:#ff3b30; color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; z-index:10; align-items:center; justify-content:center; font-size:14px;">×</button>
                    </div>`;
            }
        });
    }

    if(!db.homeLayoutPages)db.homeLayoutPages=calculatePagesFromIds(db.homeLayoutOrder||Object.keys(allItems),allItems);
    if(ensureHomeGrid(allItems))void saveData().catch(()=>{if(typeof showToast==='function')showToast('主页布局未保存，请稍后重试');});

    // 生成 HTML
    let swiperHtml = '';
    let indicatorHtml = '';
    
    db.homeLayoutPages.forEach((pageIds, index) => {
        let pageHtml = pageIds.map(id => allItems[id] || '').join('');
        swiperHtml += `
        <div class="home-screen-page">
            <div class="home-grid-layout" id="home-grid-layout-${index + 1}">
                ${pageHtml}
            </div>
        </div>`;
        indicatorHtml += `<span class="dot ${index === 0 ? 'active' : ''}"></span>`;
    });

    const homeScreenHTML = `
    <div class="home-screen-swiper" id="home-screen-swiper">
        ${swiperHtml}
    </div>
    <div class="page-indicator">
        ${indicatorHtml}
    </div>
    <div class="dock-container">
        <div class="dock dock-normal">
            <a href="#" class="app-icon" id="day-mode-btn"><img src="${getIcon('day-mode-btn')}" alt="日间" class="icon-img"></a>
            <a href="#" class="app-icon" id="night-mode-btn"><img src="${getIcon('night-mode-btn')}" alt="夜间" class="icon-img"></a>
            <a href="#" class="app-icon" data-target="storage-analysis-screen"><img src="${getIcon('storage-analysis-screen')}" alt="存储" class="icon-img"></a>
        </div>
        <div class="dock dock-edit" style="display: none;">
            <a href="#" class="app-icon" id="add-widget-btn">
                <div class="icon-img" style="background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
            </a>
            <a href="#" class="app-icon" id="finish-edit-btn">
                <div class="icon-img" style="background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
            </a>
        </div>
    </div>`;

    
    homeScreen.innerHTML = homeScreenHTML;
    decorateHomeGrid();


    // 执行收集到的小组件 JS 代码
    // 先清理旧的脚本标签
    document.querySelectorAll('.widget-dynamic-script').forEach(el => el.remove());
    widgetScripts.forEach(scriptData => {
        try {
            const scriptEl = document.createElement('script');
            scriptEl.className = 'widget-dynamic-script';
            scriptEl.setAttribute('data-widget-id', scriptData.id);
            // 使用 IIFE 包装，避免变量污染全局作用域
            scriptEl.textContent = `(function() { \n${scriptData.code}\n })();`;
            document.body.appendChild(scriptEl);
        } catch (e) {
            console.error(`Error executing script for widget ${scriptData.id}:`, e);
        }
    });

    // 拦截长按菜单，防止与编辑模式冲突
    homeScreen.addEventListener('contextmenu', (e) => {
        // 如果长按的是可编辑元素（如签名档），则允许弹出系统菜单
        if (e.target.closest('[contenteditable="true"]')) {
            return;
        }
        // 否则阻止默认菜单弹出，确保顺利进入编辑模式
        e.preventDefault();
    },{signal:homeScreenBindings.signal});

    // 监听滑动事件更新指示器
    const swiper = document.getElementById('home-screen-swiper');
    if (swiper) {
        swiper.addEventListener('scroll', () => {
            const pageIndex = Math.round(swiper.scrollLeft / swiper.clientWidth);
            updatePageIndicator(pageIndex);
        });

        // PC 端鼠标拖拽翻页逻辑
        let isDown = false;
        let startX;
        let scrollLeft;
        let dragDistance = 0;

        swiper.addEventListener('mousedown', (e) => {
            // 如果点击的是可编辑元素、图标，或者处于编辑模式，不触发翻页拖拽
            if (e.target.closest('[contenteditable]') || e.target.closest('.home-grid-layout > [data-id]') || e.target.closest('.app-icon') || isHomeEditMode) return;
            
            isDown = true;
            dragDistance = 0;
            swiper.style.scrollSnapType = 'none'; // 拖拽时临时禁用吸附，保证丝滑
            swiper.style.cursor = 'grabbing';
            startX = e.pageX - swiper.offsetLeft;
            scrollLeft = swiper.scrollLeft;
        });

        const handleDragEnd = () => {
            if (!isDown) return;
            isDown = false;
            swiper.style.cursor = '';
            
            // 恢复吸附前，根据拖拽距离判断是否需要主动翻页
            const threshold = 50; // 触发翻页的最小拖拽距离
            const pageWidth = swiper.clientWidth;
            const currentPage = Math.round(scrollLeft / pageWidth);
            
            if (Math.abs(dragDistance) > threshold) {
                // 拖拽距离足够，主动滚动到下一页/上一页
                const targetPage = dragDistance > 0 ? currentPage - 1 : currentPage + 1;
                // 确保目标页在合法范围内
                const maxPage = swiper.children.length - 1;
                const finalPage = Math.max(0, Math.min(targetPage, maxPage));
                
                swiper.scrollTo({
                    left: finalPage * pageWidth,
                    behavior: 'smooth'
                });
            } else {
                // 拖拽距离不够，回弹到当前页
                swiper.scrollTo({
                    left: currentPage * pageWidth,
                    behavior: 'smooth'
                });
            }

            // 延迟恢复吸附，等待平滑滚动动画完成
            setTimeout(() => {
                swiper.style.scrollSnapType = 'x mandatory';
            }, 300);
        };

        swiper.addEventListener('mouseleave', handleDragEnd);
        swiper.addEventListener('mouseup', handleDragEnd);

        swiper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - swiper.offsetLeft;
            dragDistance = x - startX;
            const walk = dragDistance * 1.5; // 滚动速度倍率
            swiper.scrollLeft = scrollLeft - walk;
        });
    }

    const polaroidImage = db.homeWidgetSettings?.polaroidImage;
    if (polaroidImage) {
        updatePolaroidImage(polaroidImage);
    }

    updateClock();
    applyWallpaper(db.wallpaper);
    applyHomeScreenMode(db.homeScreenMode);
    
    document.getElementById('day-mode-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        applyHomeScreenMode('day');
    });
    document.getElementById('night-mode-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        applyHomeScreenMode('night');
    });
    
    // 绑定应用点击事件
    homeScreen.querySelectorAll('.app-icon[data-target]').forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            if (isHomeEditMode) return; // 编辑模式下禁止点击
            const target = icon.getAttribute('data-target');
            if (target === 'world-book-screen') renderWorldBookList();
            else if (target === 'customize-screen') renderCustomizeForm();
            else if (target === 'tutorial-screen') renderTutorialContent();
            else if (target === 'widget-market-screen') {
                if (typeof renderWidgetMarket === 'function') renderWidgetMarket();
                switchScreen(target);
            }
            else switchScreen(target);
        });
    });

    // 绑定编辑模式按钮
    const addWidgetBtn = document.getElementById('add-widget-btn');
    if (addWidgetBtn) {
        addWidgetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof renderWidgetAddModal === 'function') {
                renderWidgetAddModal();
            }
            const modal = document.getElementById('widget-add-modal');
            if (modal) modal.classList.add('visible');
        });
    }
    
    const closeWidgetAddModalBtn = document.getElementById('close-widget-add-modal-btn');
    const widgetAddModal = document.getElementById('widget-add-modal');
    if (closeWidgetAddModalBtn && widgetAddModal) {
        closeWidgetAddModalBtn.addEventListener('click', () => {
            widgetAddModal.classList.remove('visible');
        });
        // 点击遮罩层关闭
        widgetAddModal.addEventListener('click', (e) => {
            if (e.target === widgetAddModal) {
                widgetAddModal.classList.remove('visible');
            }
        });
    }

    const finishEditBtn = document.getElementById('finish-edit-btn');
    if (finishEditBtn) {
        finishEditBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exitHomeEditMode();
        });
    }

    // 绑定删除小组件按钮
    homeScreen.querySelectorAll('.delete-widget-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const instanceId = btn.getAttribute('data-id');
            if (confirm('确定要删除这个小组件吗？')) {
                db.addedWidgets = db.addedWidgets.filter(w => w.id !== instanceId);
                if(db.homeLayoutGrid?.positions)delete db.homeLayoutGrid.positions[instanceId];
                // 从分页数据中删除
                if (db.homeLayoutPages) {
                    db.homeLayoutPages = db.homeLayoutPages.map(page => page.filter(id => id !== instanceId));
                }
                db.homeLayoutOrder = db.homeLayoutOrder.filter(id => id !== instanceId);
                await saveData();
                setupHomeScreen();
            }
        });
    });

    updateBatteryStatus();

    const homeWidgetContainer = homeScreen.querySelector('.home-widget-container');

    // Central Circle Click
    const centralCircle = homeWidgetContainer?.querySelector('.central-circle');
    if (centralCircle) {
        centralCircle.addEventListener('click', () => {
            if (isHomeEditMode) return;
            const modal = document.getElementById('ins-widget-avatar-modal');
            const preview = document.getElementById('ins-widget-avatar-preview');
            const urlInput = document.getElementById('ins-widget-avatar-url-input');
            const fileUpload = document.getElementById('ins-widget-avatar-file-upload');
            const targetInput = document.getElementById('ins-widget-avatar-target');

            targetInput.value = 'centralCircle'; 
            preview.style.backgroundImage = `url("${db.homeWidgetSettings.centralCircleImage}")`;
            preview.innerHTML = '';
            urlInput.value = '';
            fileUpload.value = null;
            modal.classList.add('visible');
        });
    }

    // Blur to Save Logic
    homeScreen.addEventListener('blur', async (e) => {
        const target = e.target;
        if (target.hasAttribute('contenteditable')) {
            const oval = target.closest('.satellite-oval');
            if (oval) { 
                const part = oval.dataset.widgetPart;
                const prop = target.classList.contains('satellite-emoji') ? 'emoji' : 'text';
                const newValue = target.textContent.trim();

                if (db.homeWidgetSettings[part] && db.homeWidgetSettings[part][prop] !== newValue) {
                    db.homeWidgetSettings[part][prop] = newValue;
                    await saveData();
                    showToast('小组件已更新');
                }
            } else if (target.id === 'widget-signature') { 
                const newSignature = target.textContent.trim();
                if (db.homeSignature !== newSignature) {
                    db.homeSignature = newSignature;
                    await saveData();
                    showToast('签名已保存');
                }
            } else if (target.id === 'ins-widget-bubble-1' || target.id === 'ins-widget-bubble-2') { 
                 const bubbleId = target.id === 'ins-widget-bubble-1' ? 'bubble1' : 'bubble2';
                 const newText = target.textContent.trim();
                 if (db.insWidgetSettings[bubbleId] !== newText) {
                     db.insWidgetSettings[bubbleId] = newText;
                     await saveData();
                     showToast('小组件文字已保存');
                 }
            }
        }
    }, {capture:true,signal:homeScreenBindings.signal}); 
    
    const signatureWidget = document.getElementById('widget-signature');
    if (signatureWidget) {
        signatureWidget.textContent = db.homeSignature || '';
    }

    homeScreen.addEventListener('click', (e) => {
        if(Date.now()<homeClickSuppressUntil&&!e.target.closest('.home-position-lock')){e.preventDefault();e.stopImmediatePropagation();return;}
        // 编辑模式下的点击拦截逻辑
        if (isHomeEditMode) {
            // 检查点击的是否是网格内的小组件或应用图标
            const gridItem = e.target.closest('.home-grid-layout > div');
            if (gridItem) {
                // 如果点击的是删除按钮，放行
                if (e.target.closest('.delete-widget-btn,.home-position-lock')) {
                    return;
                }
                // 否则拦截所有点击，防止触发跳转或小组件内部逻辑
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        const activeEl = document.activeElement;
        if (activeEl && activeEl.hasAttribute('contenteditable') && e.target !== activeEl) {
            activeEl.blur();
        }
        
        // 点击空白处退出编辑模式
        if (isHomeEditMode && !e.target.closest('.home-grid-layout > div')) {
            exitHomeEditMode();
        }
    }, {capture:true,signal:homeScreenBindings.signal}); // 使用捕获阶段以确保最高优先级拦截

    homeScreen.querySelectorAll('.satellite-emoji').forEach(span => {
        span.addEventListener('input', (e) => {
            const chars = [...e.target.textContent];
            if (chars.length > 1) {
                e.target.textContent = chars[0];
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(e.target);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    });

    // 初始化 SortableJS
    initHomeSortables();
    if(keepEditing)enterHomeEditMode();
    const restoredSwiper=document.getElementById('home-screen-swiper');
    if(restoredSwiper){currentPageIndex=Math.max(0,Math.min(previousPage,restoredSwiper.children.length-1));const behavior=restoredSwiper.style.scrollBehavior;restoredSwiper.style.scrollBehavior='auto';restoredSwiper.scrollLeft=currentPageIndex*restoredSwiper.clientWidth;restoredSwiper.style.scrollBehavior=behavior;updatePageIndicator(currentPageIndex);}
}

// Freeze the grid while dragging. Only the preview follows the finger; commit one move on release.
let homeClickSuppressUntil = 0;
let homeScreenBindings = null;
function initHomeSortables() {
    homeSortables.forEach(controller => controller.destroy());
    homeSortables = [];
    const swiper = document.getElementById('home-screen-swiper');
    if (!swiper) return;
    const bindings = new AbortController();
    const options = {signal: bindings.signal};
    let press = null, drag = null, timer = null, frame = null, mouseBlockedUntil = 0, saving = false;
    let delay = isHomeEditMode ? 0 : 450;
    const items = grid => [...grid.children].filter(el => el.hasAttribute('data-id'));
    const grids = () => [...swiper.querySelectorAll('.home-grid-layout')];
    const pageIndex = () => Math.max(0, Math.min(grids().length - 1, Math.round(swiper.scrollLeft / (swiper.clientWidth || 1))));
    const goToPage = index => {
        swiper.scrollLeft = index * swiper.clientWidth;
        currentPageIndex = index;
        updatePageIndicator(index);
    };
    const clearPress = () => { clearTimeout(timer); timer = null; press = null; };
    function addSparePage() {
        const last = grids().at(-1);
        if (last && !items(last).length) return null;
        const page = document.createElement('div');
        page.className = 'home-screen-page';
        const grid = document.createElement('div');
        grid.className = 'home-grid-layout edit-mode';
        grid.id = 'home-grid-layout-' + (grids().length + 1);

        page.append(grid);swiper.append(page);
        const dot = document.createElement('span');dot.className = 'dot';
        homeScreen.querySelector('.page-indicator')?.append(dot);
        return page;
    }
    function activate() {
        if (!press || !press.item.isConnected || saving) return;
        const seed = press;
        if(db.homeLayoutGrid.positions[seed.item.dataset.id]?.locked){enterHomeEditMode();clearPress();homeClickSuppressUntil=Date.now()+650;return;}
        const rect = seed.item.getBoundingClientRect();
        clearTimeout(timer);timer = null;
        enterHomeEditMode();
        const preview = seed.item.cloneNode(true);
        // Retain widget/icon appearance when the fixed preview leaves scoped home styles.
        const originals=[seed.item,...seed.item.querySelectorAll('*')],copies=[preview,...preview.querySelectorAll('*')];
        originals.forEach((node,index)=>{const copy=copies[index];if(!copy?.style)return;const style=getComputedStyle(node);for(const key of ['font','color','background','border','border-radius','box-shadow','display','align-items','justify-content','gap','padding','width','height','object-fit','opacity'])copy.style.setProperty(key,style.getPropertyValue(key));copy.style.pointerEvents='none';});
        for (const node of [preview, ...preview.querySelectorAll('*')]) {
            node.removeAttribute('id');node.removeAttribute('data-id');node.removeAttribute('contenteditable');
        }
        preview.classList.add('home-drag-preview');preview.setAttribute('aria-hidden','true');
        Object.assign(preview.style,{position:'fixed',left:'0',top:'0',width:rect.width+'px',height:rect.height+'px',margin:'0'});
        const marker = document.createElement('div');marker.className='home-drop-marker';marker.setAttribute('aria-hidden','true');
        document.body.append(preview,marker);
        const original = {snap:swiper.style.scrollSnapType,behavior:swiper.style.scrollBehavior,overflow:swiper.style.overflowX};
        swiper.style.scrollSnapType='none';swiper.style.scrollBehavior='auto';swiper.style.overflowX='hidden';
        drag={...seed,preview,marker,original,originPage:pageIndex(),offsetX:seed.x-rect.left,offsetY:seed.y-rect.top,width:rect.width,height:rect.height,spare:addSparePage(),destination:null,edge:0,edgeSince:0,flippedAt:0};
        seed.item.classList.add('home-drag-source');swiper.classList.add('home-reordering');
        homeClickSuppressUntil=Date.now()+700;
        window.getSelection()?.removeAllRanges();
        if (typeof triggerHapticFeedback==='function') triggerHapticFeedback('light');
        paint();
    }
    function showMarker(rect,label) {
        if(!drag)return;
        drag.marker.style.display='block';
        Object.assign(drag.marker.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
        drag.marker.textContent=label;
    }
    function locate() {
        const d=drag,grid=grids()[pageIndex()];if(!d||!grid)return;
        const m=homeGridMetrics(grid),box=m.rect;d.destination=null;d.marker.style.display='none';d.marker.classList.remove('is-blocked');
        if(d.x<box.left||d.x>box.right||d.y<box.top||d.y>box.bottom)return;
        const source=db.homeLayoutGrid.positions[d.item.dataset.id];if(!source)return;
        const col=homeTrackIndex(m.columnStarts,d.x-d.offsetX-box.left-m.left+grid.scrollLeft,4-source.cols);
        const row=homeTrackIndex(m.rowStarts,d.y-d.offsetY-box.top-m.top+grid.scrollTop,6-source.rows);
        const position={...source,page:pageIndex(),row,col},key=[position.page,row,col].join(':');
        if(d.lastCell!==key){d.lastCell=key;d.dropPlan=homeDropAllowed(d.item.dataset.id,position);}
        const allowed=d.dropPlan;
        const original=source.page===position.page&&source.row===row&&source.col===col;
        showMarker({left:box.left+m.left+m.columnStarts[col]-grid.scrollLeft,top:box.top+m.top+m.rowStarts[row]-grid.scrollTop,width:homeTrackSpan(m.columns,m.gapX,col,source.cols),height:homeTrackSpan(m.rows,m.gapY,row,source.rows)},original?'原位置':allowed.label);
        d.marker.classList.toggle('is-blocked',!allowed.ok);
        if(allowed.ok&&!original)d.destination={grid,position};
    }
    function paint() {
        if(!drag)return;
        const d=drag,now=Date.now(),bounds=swiper.getBoundingClientRect();
        d.preview.style.transform=`translate3d(${d.x-d.offsetX}px,${d.y-d.offsetY}px,0)`;
        const threshold=Math.min(30,bounds.width*.1),index=pageIndex();
        let edge=0;
        if(d.y>bounds.top+12&&d.y<bounds.bottom-12){
            if(d.x>=bounds.left&&d.x<bounds.left+threshold&&index>0)edge=-1;
            else if(d.x<=bounds.right&&d.x>bounds.right-threshold&&index<grids().length-1)edge=1;
        }
        if(edge!==d.edge){d.edge=edge;d.edgeSince=now;}
        if(edge&&now-d.edgeSince>=600&&now-d.flippedAt>=1100){goToPage(index+edge);d.flippedAt=now;d.edgeSince=now;if(typeof triggerHapticFeedback==='function')triggerHapticFeedback('light');}
        locate();frame=requestAnimationFrame(paint);
    }
    function cleanup(cancelled) {
        if(!drag){clearPress();return null;}
        const d=drag;drag=null;clearPress();cancelAnimationFrame(frame);frame=null;
        d.preview.remove();d.marker.remove();d.item.classList.remove('home-drag-source');swiper.classList.remove('home-reordering');
        if(d.spare&&!items(d.spare.firstElementChild).length){d.spare.remove();homeScreen.querySelector('.page-indicator .dot:last-child')?.remove();}
        if(cancelled)goToPage(d.originPage);
        swiper.style.scrollSnapType=d.original.snap;swiper.style.scrollBehavior=d.original.behavior;swiper.style.overflowX=d.original.overflow;
        homeClickSuppressUntil=Date.now()+650;return d;
    }
    async function finish(cancelled=false) {
        if(!drag){clearPress();return;}
        if(!cancelled)locate();
        const d=drag,destination=d.destination,owner=db;
        const before={grid:JSON.parse(JSON.stringify(db.homeLayoutGrid)),pages:db.homeLayoutPages.map(page=>[...page]),order:[...db.homeLayoutOrder]};
        const moved=!cancelled&&destination&&d.item.isConnected&&homeDropAllowed(d.item.dataset.id,destination.position).ok;
        if(moved){
            db.homeLayoutGrid.positions=homeDropPlan(d.item.dataset.id,destination.position).positions;
            db.homeLayoutGrid.pageCount=Math.max(db.homeLayoutGrid.pageCount,destination.position.page+1);syncHomeLayoutLists();
            for(const [id,p]of Object.entries(db.homeLayoutGrid.positions)){const item=homeScreen.querySelector('[data-id="'+id+'"]'),grid=grids()[p.page];if(item&&grid){grid.append(item);item.style.gridColumn=`${p.col+1} / span ${p.cols}`;item.style.gridRow=`${p.row+1} / span ${p.rows}`;}}
        }
        cleanup(cancelled);
        if(!moved)return;
        saving=true;homeGridWriteBusy=true;
        const keepEditing=isHomeEditMode;
        const redraw=()=>{if(db!==owner||!homeScreen.isConnected)return;setupHomeScreen();if(keepEditing)enterHomeEditMode();const next=document.getElementById('home-screen-swiper'),index=db.homeLayoutGrid.positions[d.item.dataset.id]?.page||0;if(next){const behavior=next.style.scrollBehavior;next.style.scrollBehavior='auto';next.scrollLeft=index*next.clientWidth;next.style.scrollBehavior=behavior;currentPageIndex=index;updatePageIndicator(index);}};
        refreshHomeLocks();
        try{if(typeof saveData==='function')await saveData();}
        catch(error){if(db===owner){db.homeLayoutGrid=before.grid;db.homeLayoutPages=before.pages;db.homeLayoutOrder=before.order;redraw();}if(typeof showToast==='function')showToast('图标位置未保存，已恢复原布局');}
        finally{saving=false;homeGridWriteBusy=false;refreshHomeLocks();}
    }

    function start(e,point,kind) {
        if(press||drag||saving||homeGridWriteBusy||kind==='mouse'&&(e.button!==0||Date.now()<mouseBlockedUntil))return;
        const item=e.target.closest('.home-grid-layout > [data-id]');
        if(!item||!swiper.contains(item)||e.target.closest('.delete-widget-btn,button,input,textarea,select,[contenteditable="true"],a:not(.app-icon)'))return;
        if(isHomeEditMode&&db.homeLayoutGrid.positions[item.dataset.id]?.locked)return;
        press={item,kind,pointerId:point.identifier,x:point.clientX,y:point.clientY,startX:point.clientX,startY:point.clientY};
        if(delay>0)timer=setTimeout(activate,delay);
    }
    function move(e,point,kind) {
        if(!press||press.kind!==kind||!point)return;
        press.x=point.clientX;press.y=point.clientY;
        const distance=Math.hypot(press.x-press.startX,press.y-press.startY);
        if(!drag){if(delay===0&&distance>=6)activate();else if(distance>10)clearPress();}
        if(drag){drag.x=point.clientX;drag.y=point.clientY;if(e.cancelable)e.preventDefault();}
    }
    const touchPoint=e=>[...(e.changedTouches||[]),...(e.touches||[])].find(p=>p.identifier===press?.pointerId);
    swiper.addEventListener('mousedown',e=>start(e,e,'mouse'),options);
    document.addEventListener('mousemove',e=>move(e,e,'mouse'),options);
    document.addEventListener('mouseup',e=>{if(press?.kind==='mouse'){if(drag){drag.x=e.clientX;drag.y=e.clientY;}void finish();}},options);
    swiper.addEventListener('touchstart',e=>{mouseBlockedUntil=Date.now()+900;if(e.touches.length!==1){void finish(true);return;}start(e,e.touches[0],'touch');},{...options,passive:true});
    document.addEventListener('touchmove',e=>{if(e.touches.length!==1){void finish(true);return;}move(e,touchPoint(e),'touch');},{...options,passive:false});
    document.addEventListener('touchend',e=>{if(press?.kind==='touch'&&[...e.changedTouches].some(p=>p.identifier===press.pointerId)){mouseBlockedUntil=Date.now()+900;const point=touchPoint(e);if(drag&&point){drag.x=point.clientX;drag.y=point.clientY;}void finish();}},{...options,passive:true});
    document.addEventListener('touchcancel',()=>{if(press?.kind==='touch')void finish(true);},options);
    document.addEventListener('dragstart',e=>{if(e.target.closest('.home-grid-layout > [data-id]'))e.preventDefault();},options);
    window.addEventListener('blur',()=>void finish(true),options);
    window.addEventListener('pagehide',()=>void finish(true),options);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void finish(true);},options);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')void finish(true);},options);
    homeSortables.push({option(key,value){if(key==='delay')delay=value;},destroy(){cleanup(true);bindings.abort();}});
}

function enterHomeEditMode() {
    isHomeEditMode = true;
    const gridLayouts = document.querySelectorAll('.home-grid-layout');
    
    gridLayouts.forEach(layout => {
        layout.classList.add('edit-mode');
        
        // 禁用所有 contenteditable
        layout.querySelectorAll('[contenteditable]').forEach(el => {
            el.setAttribute('data-editable', 'true');
            el.removeAttribute('contenteditable');
        });

        // 显示删除按钮
        layout.querySelectorAll('.delete-widget-btn').forEach(btn => {
            btn.style.display = 'flex';
        });
    });

    // 将所有 Sortable 实例的 delay 设为 0
    homeSortables.forEach(sortable => {
        sortable.option('delay', 0);
    });

    // 切换 Dock
    const dockNormal = document.querySelector('.dock-normal');
    const dockEdit = document.querySelector('.dock-edit');
    if (dockNormal && dockEdit) {
        dockNormal.style.display = 'none';
        dockEdit.style.display = 'flex';
    }
}

function exitHomeEditMode() {
    isHomeEditMode = false;
    const gridLayouts = document.querySelectorAll('.home-grid-layout');
    
    gridLayouts.forEach(layout => {
        layout.classList.remove('edit-mode');
        
        // 恢复 contenteditable
        layout.querySelectorAll('[data-editable="true"]').forEach(el => {
            el.setAttribute('contenteditable', 'true');
            el.removeAttribute('data-editable');
        });

        // 隐藏删除按钮
        layout.querySelectorAll('.delete-widget-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    });

    // 恢复长按时长为 450ms
    homeSortables.forEach(sortable => {
        sortable.option('delay', 450);
    });

    // 切换 Dock
    const dockNormal = document.querySelector('.dock-normal');
    const dockEdit = document.querySelector('.dock-edit');
    if (dockNormal && dockEdit) {
        dockNormal.style.display = 'flex';
        dockEdit.style.display = 'none';
    }
}


function updateClock() {
    const now = new Date();
    const timeString = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateString = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日`;

    const homeTimeDisplay = document.getElementById('time-display');
    const homeDateDisplay = document.getElementById('date-display');
    if (homeTimeDisplay) homeTimeDisplay.textContent = timeString;
    if (homeDateDisplay) homeDateDisplay.textContent = dateString;

    const peekTimeDisplay = document.getElementById('peek-time-display');
    const peekDateDisplay = document.getElementById('peek-date-display');
    if (peekTimeDisplay) peekTimeDisplay.textContent = timeString;
    if (peekDateDisplay) peekDateDisplay.textContent = dateString;
}

function updatePageIndicator(index) {
    currentPageIndex=index;
    const dots = document.querySelectorAll('.page-indicator .dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function applyWallpaper(url) {
    if (homeScreen) homeScreen.style.backgroundImage = `url(${url})`;
}

async function applyHomeScreenMode(mode) {
    if (mode === 'day') {
        homeScreen.classList.add('day-mode');
    } else {
        homeScreen.classList.remove('day-mode');
    }
    db.homeScreenMode = mode;
    await saveData();
}

async function injectCustomFont(preset) {
    if (!preset || !preset.isCustom || !preset.fontFamily || !preset.id) return;
    try {
        const fontData = await dexieDB.customFonts.get(preset.id);
        if (fontData && fontData.file) {
            const arrayBuffer = await fontData.file.arrayBuffer();
            const fontFace = new FontFace(preset.fontFamily, arrayBuffer);
            const loadedFace = await fontFace.load();
            document.fonts.add(loadedFace);
            console.log(`Custom font ${preset.fontFamily} injected successfully.`);
        }
    } catch (error) {
        console.error(`Failed to inject custom font ${preset.fontFamily}:`, error);
    }
}

async function loadAllCustomFonts() {
    if (!db.fontPresets) return;
    const customPresets = db.fontPresets.filter(p => p.isCustom);
    for (const preset of customPresets) {
        await injectCustomFont(preset);
    }
}

function applyGlobalFont(fontValue, isCustom = false) {
    const styleId = 'global-font-style';
    let styleElement = document.getElementById(styleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    if (fontValue) {
        if (isCustom) {
            styleElement.innerHTML = `:root { --font-family: '${fontValue}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
        } else {
            const fontName = 'CustomGlobalFont';
            styleElement.innerHTML = `@font-face { font-family: '${fontName}'; src: url('${fontValue}'); } :root { --font-family: '${fontName}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
        }
    } else {
        styleElement.innerHTML = `:root { --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }`;
    }
}

function applyGlobalCss(css) {
    const styleId = 'global-css-style';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = db.uwuNightMode ? '' : (css || '');
}

function applyFontSize(scale) {
    document.documentElement.style.setProperty('--app-font-scale', scale);
}

// 统一面板控制函数
function showPanel(type) {
    window.VectorMemoryUI?.updateBadge();
    triggerHapticFeedback('light');
    const toggleExpansionBtn = document.getElementById('toggle-expansion-btn');
    const panel = document.getElementById('chat-expansion-panel');

    if (type !== 'function') UwUFunctionPanelOrder115.cancel();
    if (type === 'none') {
        chatExpansionPanel.classList.remove('visible');
        if (toggleExpansionBtn) toggleExpansionBtn.classList.remove('rotate-45');
        return;
    }

    chatExpansionPanel.classList.add('visible');

    if (type === 'function') {
        panelFunctionArea.style.display = 'flex';
        panelStickerArea.style.display = 'none';
        
        // 初始化功能面板的分页滑动
        setupFunctionPanelSwiper();

        if (toggleExpansionBtn) toggleExpansionBtn.classList.add('rotate-45');

        // 触发功能面板引导
        if (window.GuideSystem) {
            if (currentChatType === 'private') {
                window.GuideSystem.check('guide_char_gallery');
            } else if (currentChatType === 'group') {
                window.GuideSystem.check('guide_group_summary');
            }
        }
    } else if (type === 'sticker') {
        panelFunctionArea.style.display = 'none';
        panelStickerArea.style.display = 'flex';
        if (toggleExpansionBtn) toggleExpansionBtn.classList.remove('rotate-45');
        renderStickerCategories();
        renderStickerGrid();
    }

    setTimeout(() => {
        messageArea.scrollTop = messageArea.scrollHeight;
    }, 50);
}

function initKeyboardDetection() {
    if (!window.visualViewport) return;

    let maxViewportHeight = window.visualViewport.height;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // 初始化应用保存的高度
    if (db.savedKeyboardHeight) {
        document.documentElement.style.setProperty('--panel-height', `${db.savedKeyboardHeight}px`);
    }

    window.visualViewport.addEventListener('resize', () => {
        const currentHeight = window.visualViewport.height;
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
        
        // 如果高度变小了，且输入框聚焦，说明键盘弹出了
        if (currentHeight < maxViewportHeight && isInputFocused) {
            const diff = maxViewportHeight - currentHeight;
            // 简单的阈值判断，防止误判
            if (diff > 150) { 
                const keyboardHeight = diff;
                
                // iOS 下，键盘弹出时我们不应该增加 --panel-height，因为浏览器会自动调整视口
                // 增加高度会导致输入框被顶得过高，遮挡消息
                if (!isIOS) {
                    document.documentElement.style.setProperty('--panel-height', `${keyboardHeight}px`);
                }
                
                // 保存到 DB (防抖)
                if (db.savedKeyboardHeight !== keyboardHeight) {
                    db.savedKeyboardHeight = keyboardHeight;
                    // Transient keyboard resize is persisted with the next normal save, never on every resize.
                }

                // 键盘弹出后，确保消息区域滚动到底部
                if (targetScreen && targetScreen.id === 'chat-room-screen') {
                    setTimeout(() => {
                        if (messageArea) messageArea.scrollTop = messageArea.scrollHeight;
                    }, 100);
                }
            }
        } else if (currentHeight > maxViewportHeight) {
            // 可能是地址栏收起导致的高度增加，更新最大高度
            maxViewportHeight = currentHeight;
        }
    });

    // 修复 iOS 键盘弹出导致的页面偏移（光标错位、点击错位）
    if (isIOS) {
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // 键盘弹出时，强制重置滚动位置，防止 iOS 自动滚动导致的错位
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                }, 50);
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // 键盘收起时，再次重置滚动位置
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                    // 额外触发一次 resize 检查，确保布局恢复
                    window.dispatchEvent(new Event('resize'));
                }, 50);
            }
        });
    }
}

// 底部导航栏逻辑
function setupBottomNavigation() {
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                // 切换屏幕
                switchScreen(targetId);
                
                // 更新所有底部导航栏的选中状态
                document.querySelectorAll('.bottom-nav .nav-item').forEach(nav => {
                    if (nav.getAttribute('data-target') === targetId) {
                        nav.classList.add('active');
                    } else {
                        nav.classList.remove('active');
                    }
                });
            }
        });
    });
}

function setupPhoneScreen() {
    const bubble = document.getElementById('burnout-bubble');
    if (bubble) {
        bubble.addEventListener('click', () => {
            document.getElementById('burnout-update-modal').classList.add('visible');
        });
    }
}

function setupFunctionPanelSwiper() {
    const panelArea = document.getElementById('panel-function-area');
    if (!panelArea || panelArea.querySelector('[data-function-sorting]')) return;
    const originalGrid = panelArea.querySelector('.expansion-grid')||panelArea.querySelector('.function-swiper-container');
    if (!originalGrid) return; 

    // Keep urgent send immediately after the last visible function; no filler slots.
    let urgent=panelArea.querySelector('#uwu-urgent-send');
    if(!urgent){urgent=document.createElement('div');urgent.id='uwu-urgent-send';urgent.className='expansion-item';urgent.tabIndex=0;urgent.setAttribute('role','button');urgent.setAttribute('aria-label','紧急发送');urgent.dataset.functionOrder='9999';urgent.innerHTML='<div class="expansion-item-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 6.5v7M12 16v1"/></svg></div><span class="expansion-item-name">紧急发送</span>';urgent.onclick=()=>{const input=document.getElementById('message-input');if(currentChatType!=='private'||!input.value.trim()){showToast('请先输入要紧急发送的消息');return;}window.uwuUrgentNext85=true;try{document.getElementById('send-message-btn').click();}finally{window.uwuUrgentNext85=false;}};urgent.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();urgent.click();}};originalGrid.append(urgent);}
    urgent.style.display=currentChatType==='group'?'none':'';
    for(const id97 of ['assets96-entry','keepsakes97-entry','notes97-entry']){const n97=panelArea.querySelector('#'+id97);if(n97)n97.style.display=currentChatType==='group'?'none':'';}
    // 获取所有 expansion-item
    const pool=Array.from(originalGrid.querySelectorAll('.expansion-item'));
    pool.forEach((item,i)=>{if(item.dataset.functionOrder===undefined)item.dataset.functionOrder=String(i);});
    pool.sort((a,b)=>Number(a.dataset.functionOrder)-Number(b.dataset.functionOrder));
    const hidden=pool.filter(item=>item.style.display==='none');
    let items=pool.filter(item=>item.style.display!=='none');
    if(typeof currentChatType!=='undefined'&&currentChatType==='group'){const vector=items.find(item=>item.id==='vector-memory-btn');items=items.filter(item=>item!==vector);if(vector)items.push(vector);}
    if(items.includes(urgent)){items=items.filter(item=>item!==urgent);items.push(urgent);}urgent.style.gridColumn='';
    const oldWrapper=originalGrid.querySelector('.function-swiper-wrapper');
    const oldPage=oldWrapper&&oldWrapper.offsetWidth?Math.round(oldWrapper.scrollLeft/oldWrapper.offsetWidth):0;
    if (items.length === 0) return;

    // 创建新结构
    const swiperContainer = document.createElement('div');
    swiperContainer.className = 'function-swiper-container';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'function-swiper-wrapper';

    const pagination = document.createElement('div');
    pagination.className = 'function-pagination';

    const itemsPerPage = 8;
    const isPrivate97=currentChatType!=='group';
    const note97=items.find(x=>x.id==='notes97-entry');
    const base97=items.filter(x=>x!==urgent&&x!==note97);
    const pages97=[];for(let j=0;j<base97.length;j+=itemsPerPage)pages97.push(base97.slice(j,j+itemsPerPage));
    if(isPrivate97){while(pages97.length<4)pages97.push([]);if(note97){if(pages97[2].length>=8){const overflow97=pages97[2].pop();pages97[3].unshift(overflow97);}pages97[2].push(note97);}pages97[3].push(urgent);}else if(items.includes(urgent)){(pages97.at(-1)||[]).push(urgent);}
    const kind = UwUFunctionPanelOrder115.kind(currentChatType);
    const layout = UwUFunctionPanelOrder115.layout(items, pages97, kind);
    const pageCount = layout.pages.length;

    for (let i = 0; i < pageCount; i++) {
        const slide = document.createElement('div');
        slide.className = 'function-slide';
        
        layout.pages[i].forEach((id, slot) => {
            const item = layout.byId.get(id);
            if (!item) return;
            item.style.gridColumn = layout.custom ? String(slot % 4 + 1) : '';
            item.style.gridRow = layout.custom ? String(Math.floor(slot / 4) + 1) : '';
            slide.append(item);
        });
        
        wrapper.appendChild(slide);

        const dot = document.createElement('span');
        dot.className = `dot ${i === 0 ? 'active' : ''}`;
        pagination.appendChild(dot);
    }

    // 移除旧 grid
    originalGrid.remove();

    swiperContainer.appendChild(wrapper);
    hidden.forEach(item=>swiperContainer.appendChild(item));
    // 只有多页时才显示 pagination
    if (pageCount > 1) {
        swiperContainer.appendChild(pagination);
    }
    
    UwUFunctionPanelOrder115.mount(swiperContainer, wrapper, pagination, layout, kind);
    panelArea.appendChild(swiperContainer);
    wrapper.scrollLeft=Math.min(oldPage,pageCount-1)*wrapper.offsetWidth;

    // 绑定滚动事件更新 pagination
    wrapper.addEventListener('scroll', () => {
        const width = wrapper.offsetWidth;
        if (width > 0) {
            const index = Math.round(wrapper.scrollLeft / width);
            const dots = pagination.querySelectorAll('.dot');
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }
    });
}
