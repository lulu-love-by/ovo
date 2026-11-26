// --- 阅读器视图逻辑 (js/modules/reader_view.js) ---

document.addEventListener('DOMContentLoaded', () => {
    const readerScreen = document.getElementById('reader-view-screen');
    const header = document.getElementById('reader-header');
    const footer = document.getElementById('reader-footer');
    const contentArea = document.getElementById('reader-content-area');
    const textContainer = document.getElementById('reader-text-container');
    const chapterTitleEl = document.getElementById('reader-chapter-title');
    const bookTitleEl = document.getElementById('reader-book-title');
    const progressInfo = document.getElementById('reader-progress-info');
    
    const tocBtn = document.getElementById('reader-toc-btn');
    const tocOverlay = document.getElementById('reader-toc-overlay');
    const tocList = document.getElementById('reader-toc-list');
    const tocCount = document.getElementById('reader-toc-count');
    
    const settingsBtn = document.getElementById('reader-settings-btn');
    const settingsOverlay = document.getElementById('reader-settings-overlay');
    const settingsCloseBtn = document.getElementById('reader-settings-close');
    const fontIncreaseBtn = document.getElementById('reader-font-increase');
    const fontDecreaseBtn = document.getElementById('reader-font-decrease');
    const fontSizeDisplay = document.getElementById('reader-font-size-display');
    const fontColorPicker = document.getElementById('reader-font-color-picker');
    const fontColorResetBtn = document.getElementById('reader-font-color-reset');
    const themeCircles = document.querySelectorAll('.reader-theme-circle');
    const bgUploadBtn = document.getElementById('reader-bg-upload-btn');
    const bgUploadInput = document.getElementById('reader-bg-upload');
    const bgClearBtn = document.getElementById('reader-bg-clear-btn');
    
    const marginInputs = {
        top: document.getElementById('reader-margin-top'),
        bottom: document.getElementById('reader-margin-bottom'),
        left: document.getElementById('reader-margin-left'),
        right: document.getElementById('reader-margin-right')
    };

    let currentBook = null;
    let currentChapters = [];
    let currentChapterIndex = 0;
    let fontSize = 18;
    let isMenuVisible = false;
    let scrollSaveTimer = null;
    let currentPage = 0;
    let totalPages = 0;
    let pageMode=localStorage.getItem('reader_page_mode')||'tap';
    if(!['tap','swipe','scroll'].includes(pageMode))pageMode='tap';
    let currentChunk=0,loadSerial=0,bookSerial=0,pageStride=0,scrollBusy=false,scrollFrame=0,suppressClickUntil=0;
    const chunksCache=new Map();let commentsCache=null;
    function chunksFor(index){if(!chunksCache.has(index)){if(chunksCache.size>=6)chunksCache.delete(chunksCache.keys().next().value);chunksCache.set(index,window.UwUReader88.chunks(currentChapters[index]?.content));}return chunksCache.get(index);}
    function applyMode(){readerScreen.dataset.pageMode=pageMode;textContainer.style.transform='';if(pageMode==='scroll'){textContainer.style.columnWidth='';textContainer.style.columnGap='';}}
    applyMode();
    const modeSelect=document.getElementById('reader-page-mode');
    if(modeSelect){modeSelect.value=pageMode;modeSelect.addEventListener('change',async()=>{const ratio=pageMode==='scroll'?scrollRatio():totalPages?currentPage/totalPages:0;pageMode=modeSelect.value;localStorage.setItem('reader_page_mode',pageMode);if(currentBook){currentBook.pageMode=pageMode;void dexieDB.reader_books.update(currentBook.id,{pageMode}).catch(console.error);}applyMode();await loadChapter(currentChapterIndex,ratio,currentChunk);});}


    // 绑定返回键
    const backBtn = document.getElementById('reader-back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', async () => {
            await saveProgress(true);await window.ReaderAppearance89?.flush();
            if (typeof switchScreen === 'function') {
                switchScreen('reader-bookshelf-screen');
            }
        });
    }

    // 加载书籍
    async function loadBook(bookId) {
        const ticket=++bookSerial;++loadSerial;scrollBusy=true;
        try {
            await saveProgress(true);await window.ReaderAppearance89?.flush();
            const book=await dexieDB.reader_books.get(bookId);
            if(!book)throw Error('书籍不存在');
            const chapters=await dexieDB.reader_chapters.where('bookId').equals(bookId).sortBy('index');
            if(ticket!==bookSerial)return;
            if(!chapters.length)throw Error('书籍没有可读章节');
            toggleMenu(true);settingsOverlay.classList.remove('active');tocOverlay.classList.remove('active');document.getElementById('reader-comment-overlay')?.classList.remove('active');
            currentBook=book;currentChapters=chapters;commentsCache=null;chunksCache.clear();
            pageMode=book.pageMode||pageMode;if(!['tap','swipe','scroll'].includes(pageMode))pageMode='tap';if(modeSelect)modeSelect.value=pageMode;applyMode();
            window.ReaderAppearance89?.attach(book,reflow);
            bookTitleEl.textContent=book.title;
            tocCount.textContent = `共${currentChapters.length}${currentBook.format==='pdf'?'页':'章'}`;
            
            // 渲染目录
            renderToc();

            // 加载上次阅读的章节
            currentChapterIndex = Math.max(0,Math.min(currentChapters.length-1,currentBook.currentChapterIndex||0));
            await loadChapter(currentChapterIndex, currentBook.scrollProgress || 0,currentBook.readingChunk||0);

            // 更新最后阅读时间
            if(ticket===bookSerial)await dexieDB.reader_books.update(bookId, { lastReadTime: Date.now() });

        } catch (error) {
            if(ticket!==bookSerial)return;
            scrollBusy=false;
            console.error("加载书籍失败:", error);
            if (typeof showToast === 'function') showToast("加载书籍失败");
        }
    }

    function reflow(captureOnly=false){if(!currentBook||scrollBusy)return;const ratio=pageMode==='scroll'?scrollRatio():totalPages?currentPage/totalPages:0,ticket=loadSerial,book=currentBook,mode=pageMode;const restore=()=>requestAnimationFrame(()=>{if(ticket!==loadSerial||book!==currentBook||mode!==pageMode)return;if(mode==='scroll'){const section=[...textContentEl.children].find(n=>Number(n.dataset.readerChapter)===currentChapterIndex&&Number(n.dataset.readerChunk)===currentChunk);if(section)contentArea.scrollTop=contentY(section)+ratio*section.offsetHeight;}else{calculatePages();goToPage(Math.min(totalPages-1,Math.floor(ratio*totalPages)),true);}});if(captureOnly)return restore;restore();}
    // 计算总页数
    function calculatePages() {
        if(pageMode==='scroll'){totalPages=1;return;}
        const css=typeof getComputedStyle==='function'?getComputedStyle(contentArea):null;
        const gap=css?(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0):0;
        const width=textContainer.clientWidth||Math.max(1,contentArea.clientWidth-gap);
        textContainer.style.columnWidth=width+'px';textContainer.style.columnGap=gap+'px';
        pageStride=width+gap;
        totalPages=Math.max(1,Math.ceil((textContainer.scrollWidth+gap)/Math.max(1,pageStride)));

    }

    // 跳转到指定页
    function goToPage(pageIndex, instant = false) {
        if(scrollBusy&&!instant)return;
        if(pageMode==='scroll')return;

        if (pageIndex < 0) {
            if(currentChunk>0){void loadChapter(currentChapterIndex,.999,currentChunk-1);return;}
            // 上一章
            if (currentChapterIndex > 0) {
                loadChapter(currentChapterIndex - 1, 0.999,chunksFor(currentChapterIndex-1).length-1); // 0.999 表示跳到最后一页
            } else {
                if (typeof showToast === 'function') showToast("已经是第一章了");
            }
            return;
        }
        
        if (pageIndex >= totalPages) {
            if(currentChunk+1<chunksFor(currentChapterIndex).length){void loadChapter(currentChapterIndex,0,currentChunk+1);return;}
            // 下一章
            if (currentChapterIndex < currentChapters.length - 1) {
                loadChapter(currentChapterIndex + 1, 0);
            } else {
                if (typeof showToast === 'function') showToast("已经是最后一章了");
            }
            return;
        }

        currentPage = pageIndex;
        const containerWidth = pageStride||contentArea.clientWidth;
        
        if (instant) {
            textContainer.style.transition = 'none';
            textContainer.style.transform = `translateX(-${currentPage * containerWidth}px)`;
            // 强制重绘
            textContainer.offsetHeight;
            // 恢复过渡动画
            textContainer.style.transition = '';
        } else {
            textContainer.style.transform = `translateX(-${currentPage * containerWidth}px)`;
        }
        
        updateProgress();
        saveProgress();
    }

    // 加载指定章节
    function escapeText(t){return String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
    async function makeChunk(index,chunk){
        const book=currentBook,chapter=currentChapters[index],rows=chunksFor(index)[chunk]||[];
        const comments=commentsCache||await dexieDB.reader_comments.where('bookId').equals(book.id).toArray();if(currentBook===book)commentsCache=comments;
        const counts=new Map();for(const c of comments)if(c.chapterIndex===index)counts.set(c.paragraphIndex,(counts.get(c.paragraphIndex)||0)+1);
        const section=document.createElement('section');section.dataset.readerChapter=String(index);section.dataset.readerChunk=String(chunk);section.className='reader-chunk';
        if(chunk===0){const title=document.createElement('h3');title.className='reader-scroll-chapter-title';title.textContent=chapter.title;section.append(title);}
        for(const row of rows){const p=document.createElement('p');p.dataset.index=String(row.index);p.dataset.textOffset=String(row.offset);p.dataset.readerChapter=String(index);p.classList.toggle?.('reader-paragraph-continuation',row.offset>0);p.classList.toggle?.('reader-paragraph-continued',!!row.continues);p.textContent=row.text;
            if(!row.offset&&counts.has(row.index)){const icon=document.createElement('span');icon.className='reader-inline-comment-icon';icon.innerHTML='<span aria-label="段评">▤</span><span class="reader-inline-comment-count">'+counts.get(row.index)+'</span>';icon.onclick=e=>{e.stopPropagation();openCommentPanel(p);};p.append(icon);}section.append(p);}
        if(chapter.image&&chunk===0&&/^data:image\/(?:jpeg|png|webp);base64,/.test(chapter.image)){const img=document.createElement('img');img.src=chapter.image;img.alt=chapter.title;img.className='reader-pdf-page';img.onclick=e=>{e.stopPropagation();window.readerView.openFullscreenImage(img.src);};section.append(img);}
        window.ReaderAnnotations?.paint(book,index,section);return section;
    }
    async function loadChapter(index, scrollProgress = 0, chunkIndex=0) {
        if(index<0||index>=currentChapters.length)return;
        const serial=++loadSerial;scrollBusy=true;
        hideParagraphMenu();window.ReaderAnnotations?.clearSelectionCache();window.getSelection()?.removeAllRanges();
        try{
            const chunk=Math.max(0,Math.min(chunkIndex,chunksFor(index).length-1)),section=await makeChunk(index,chunk);
            if(serial!==loadSerial)return;
            currentChapterIndex=index;currentChunk=chunk;chapterTitleEl.textContent=currentChapters[index].title;
            textContentEl.replaceChildren(section);
            if(pageMode==='scroll'&&scrollProgress>0){const next=neighbor(index,chunk,1);if(next){const tail=await makeChunk(next.index,next.chunk);if(serial!==loadSerial)return;textContentEl.append(tail);}}
            textContainer.style.transition='none';textContainer.style.transform='translateX(0)';contentArea.scrollTop=0;contentArea.scrollLeft=0;currentPage=0;
            updateTocHighlight();
            await new Promise(resolve=>requestAnimationFrame(resolve));if(serial!==loadSerial)return;
            if(pageMode==='scroll'){contentArea.scrollTop=contentY(section)+scrollProgress*section.offsetHeight;updateProgress();}
            else{calculatePages();goToPage(Math.min(totalPages-1,Math.floor(scrollProgress*totalPages)),true);textContainer.style.transition='';}
            saveProgress();
        }catch(error){console.error('加载章节失败',error);}finally{if(serial===loadSerial){scrollBusy=false;if(pageMode==='scroll')void extendScroll();}}
    }
    function contentY(section){return section.getBoundingClientRect().top-contentArea.getBoundingClientRect().top+contentArea.scrollTop;}
    function scrollRatio(){const section=[...textContentEl.children].find(n=>Number(n.dataset.readerChapter)===currentChapterIndex&&Number(n.dataset.readerChunk)===currentChunk);return section?Math.max(0,Math.min(.999,(contentArea.scrollTop-contentY(section))/Math.max(1,section.offsetHeight))):0;}
    function neighbor(index,chunk,delta){chunk+=delta;if(chunk<0){if(index===0)return null;index--;chunk=chunksFor(index).length-1;}if(chunk>=chunksFor(index).length){if(index+1>=currentChapters.length)return null;index++;chunk=0;}return {index,chunk};}
    async function extendScroll(){
        if(pageMode!=='scroll'||scrollBusy||!currentBook||window.getSelection()?.toString()||paragraphMenu.style.display==='flex')return;
        const sections=[...textContentEl.children];if(!sections.length)return;
        let edge,where;
        if(contentArea.scrollHeight-contentArea.scrollTop-contentArea.clientHeight<contentArea.clientHeight*1.5){edge=sections.at(-1);where='after';}
        else if(contentArea.scrollTop<contentArea.clientHeight*.5){edge=sections[0];where='before';}else return;
        let next=neighbor(Number(edge.dataset.readerChapter),Number(edge.dataset.readerChunk),where==='after'?1:-1);if(!next&&where==='after'&&contentArea.scrollTop<contentArea.clientHeight*.5){edge=sections[0];where='before';next=neighbor(Number(edge.dataset.readerChapter),Number(edge.dataset.readerChunk),-1);}if(!next)return;
        const serial=loadSerial;scrollBusy=true;
        try{const section=await makeChunk(next.index,next.chunk);if(serial!==loadSerial||pageMode!=='scroll')return;
            if(where==='after')textContentEl.append(section);else{const height=contentArea.scrollHeight;textContentEl.prepend(section);contentArea.scrollTop+=contentArea.scrollHeight-height;}
            // Keep a bounded window. Selection and active paragraph menus freeze pruning.
            while(textContentEl.children.length>4&&!window.getSelection()?.toString()){
                if(where==='after'){const old=textContentEl.firstElementChild;if(old.getBoundingClientRect().bottom>=contentArea.getBoundingClientRect().top)break;const height=old.offsetHeight;old.remove();contentArea.scrollTop=Math.max(0,contentArea.scrollTop-height);}else{const old=textContentEl.lastElementChild;if(old.getBoundingClientRect().top<=contentArea.getBoundingClientRect().bottom)break;old.remove();}
            }
        }finally{if(serial===loadSerial){scrollBusy=false;if(pageMode==='scroll'&&contentArea.scrollHeight<=contentArea.clientHeight+1&&neighbor(Number(textContentEl.lastElementChild?.dataset.readerChapter),Number(textContentEl.lastElementChild?.dataset.readerChunk),1)){requestAnimationFrame(()=>{if(serial===loadSerial)void extendScroll();});}}}
    }
    function scrollEndSection(){if(pageMode!=='scroll'||!currentBook||contentArea.scrollTop+contentArea.clientHeight<contentArea.scrollHeight-2)return null;const last=textContentEl.lastElementChild;if(!last||neighbor(Number(last.dataset.readerChapter),Number(last.dataset.readerChunk),1))return null;return last;}
    contentArea.addEventListener('scroll',()=>{
        if(pageMode!=='scroll'||scrollFrame||scrollBusy)return;
        const serial=loadSerial;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;if(serial!==loadSerial||pageMode!=='scroll')return;const y=contentArea.getBoundingClientRect().top+contentArea.clientHeight*.25,sections=[...textContentEl.children],visible=scrollEndSection()||sections.find(n=>n.getBoundingClientRect().bottom>y)||sections.at(-1);if(visible){currentChapterIndex=Number(visible.dataset.readerChapter);currentChunk=Number(visible.dataset.readerChunk);chapterTitleEl.textContent=currentChapters[currentChapterIndex].title;updateProgress();saveProgress();}void extendScroll();});
    },{passive:true});

    // 保存进度
    const progressJobs=new Map();let pendingProgress=null,progressGeneration=0;
    function position(){if(!currentBook)return null;const end=scrollEndSection();if(end){currentChapterIndex=Number(end.dataset.readerChapter);currentChunk=Number(end.dataset.readerChunk);}const chunkProgress=end?0.999:pageMode==='scroll'?scrollRatio():totalPages>1?currentPage/totalPages:0;return {book:currentBook,id:currentBook.id,patch:{currentChapterIndex,scrollProgress:chunkProgress,readingChunk:currentChunk,pageMode,readingProgress:end?100:((currentChapterIndex+(currentChunk+chunkProgress)/chunksFor(currentChapterIndex).length)/Math.max(1,currentChapters.length))*100}};}
    function writeProgress(snapshot){if(!snapshot)return Promise.resolve();Object.assign(snapshot.book,snapshot.patch);const epoch=progressGeneration,job=(progressJobs.get(snapshot.id)||Promise.resolve()).catch(()=>{}).then(()=>epoch===progressGeneration?dexieDB.reader_books.update(snapshot.id,snapshot.patch):undefined);progressJobs.set(snapshot.id,job);return job.finally(()=>{if(progressJobs.get(snapshot.id)===job)progressJobs.delete(snapshot.id);});}
    function saveProgress(immediate=false){clearTimeout(scrollSaveTimer);const snapshot=position();if(snapshot)pendingProgress=snapshot;if(immediate){const next=pendingProgress;pendingProgress=null;return writeProgress(next).catch(e=>console.error('阅读进度保存失败',e));}scrollSaveTimer=setTimeout(()=>{const next=pendingProgress;pendingProgress=null;void writeProgress(next).catch(e=>console.error('阅读进度保存失败',e));},500);return Promise.resolve();}
    window.addEventListener('pagehide',()=>{void saveProgress(true);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void saveProgress(true);});

    // 渲染目录
    function renderToc() {
        tocList.innerHTML = '';
        currentChapters.forEach((ch, index) => {
            const li = document.createElement('li');
            li.className = 'reader-toc-item';
            li.textContent = ch.title;
            li.dataset.index = index;
            
            li.addEventListener('click', () => {
                loadChapter(index);
                toggleToc(false);
                toggleMenu(false);
            });
            
            tocList.appendChild(li);
        });
    }

    // 更新目录高亮
    function updateTocHighlight() {
        const items = tocList.querySelectorAll('.reader-toc-item');
        items.forEach(item => item.classList.remove('active'));
        if (items[currentChapterIndex]) {
            items[currentChapterIndex].classList.add('active');
            // 滚动目录到可视区域
            items[currentChapterIndex].scrollIntoView({ block: 'center' });
        }
    }

    // 更新进度显示
    function updateProgress() {
        if (!currentBook || currentChapters.length === 0) return;
        
        const chunkProgress=pageMode==='scroll'?scrollRatio():totalPages>1?currentPage/totalPages:0;
        const chapterProgress=(currentChunk+chunkProgress)/chunksFor(currentChapterIndex).length;
        const totalProgress = scrollEndSection()?100:((currentChapterIndex + chapterProgress) / currentChapters.length) * 100;
        
        progressInfo.textContent = `${totalProgress.toFixed(1)}%`;
    }

    // 监听窗口大小变化，重新计算页数
    window.addEventListener('resize', () => {
        if (readerScreen.classList.contains('active') && currentBook) {
            // 记录当前进度比例
            const currentRatio = totalPages > 0 ? currentPage / totalPages : 0;
            
            calculatePages();
            
            // 恢复到大致相同的进度
            let newPage = Math.floor(currentRatio * totalPages);
            if (newPage >= totalPages) newPage = totalPages - 1;
            
            goToPage(newPage, true);
        }
    });

    // 菜单切换
    function toggleMenu(show) {
        isMenuVisible = show !== undefined ? show : !isMenuVisible;
        if (isMenuVisible) {
            header.classList.remove('hidden');
            footer.classList.remove('hidden');
        } else {
            header.classList.add('hidden');
            footer.classList.add('hidden');
            settingsOverlay.classList.remove('active');
        }
    }

    // --- 翻页与菜单呼出逻辑重构 ---
    // 移除原有的触控区域事件，改为在整个内容区域监听点击，
    // 这样可以避免触控区域遮挡文字导致长按/右键失效。
    contentArea.addEventListener('click', (e) => {
        // Selecting text and dragging selection handles must not turn pages.
        if(isLongPressing||scrollBusy||Date.now()<suppressClickUntil||window.getSelection()?.toString()||window.ReaderAnnotations?.suppressFlip())return;
        // 如果点击的是段评图标或悬浮菜单，不处理翻页
        if (e.target.closest('.reader-inline-comment-icon') || 
            e.target.closest('.reader-paragraph-menu') ||
            e.target.closest('.reader-comment-overlay')) {
            return;
        }

        const rect=contentArea.getBoundingClientRect(),x=e.clientX-rect.left,width=contentArea.clientWidth;
        if(x>=width*.3&&x<=width*.7){toggleMenu();return;}
        if(pageMode!=='tap')return;
        if (x < width * 0.3) {
            // 左侧 30%：上一页
            goToPage(currentPage - 1);
        } else if (x > width * 0.7) {
            // 右侧 30%：下一页
            goToPage(currentPage + 1);
        } else {
            // 中间 40%：呼出菜单
            toggleMenu();
        }
    });

    let pointer96=null;
    contentArea.addEventListener('pointerdown',e=>{if(pageMode!=='swipe'||e.button!==0||e.target.closest('.reader-paragraph-menu,.reader-inline-comment-icon'))return;pointer96={id:e.pointerId,x:e.clientX,y:e.clientY,at:Date.now()};});
    contentArea.addEventListener('pointermove',e=>{if(!pointer96||e.pointerId!==pointer96.id)return;if(Math.abs(e.clientX-pointer96.x)>10){clearTimeout(longPressTimer);suppressClickUntil=Date.now()+500;if(e.cancelable)e.preventDefault();}});
    contentArea.addEventListener('pointerup',e=>{const g=pointer96;pointer96=null;if(!g||e.pointerId!==g.id||pageMode!=='swipe'||isLongPressing||window.getSelection()?.toString()||window.ReaderAnnotations?.suppressFlip())return;const step=UwUReader88.swipe(e.clientX-g.x,e.clientY-g.y,Date.now()-g.at);if(step){gesture=null;suppressClickUntil=Date.now()+500;toggleMenu(false);goToPage(currentPage+step);}});
    contentArea.addEventListener('pointercancel',()=>pointer96=null);
    let gesture=null;
    contentArea.addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('.reader-paragraph-menu,.reader-inline-comment-icon')){gesture=null;return;}const t=e.touches[0];gesture={x:t.clientX,y:t.clientY,at:Date.now(),selected:!!window.getSelection()?.toString()};},{passive:true});
    contentArea.addEventListener('touchmove',e=>{if(gesture&&e.touches.length===1&&Math.hypot(e.touches[0].clientX-gesture.x,e.touches[0].clientY-gesture.y)>10)suppressClickUntil=Date.now()+500;},{passive:true});
    contentArea.addEventListener('touchend',e=>{const g=gesture;gesture=null;if(window.PointerEvent)return;if(!g||pageMode!=='swipe'||g.selected||window.getSelection()?.toString()||window.ReaderAnnotations?.suppressFlip()||isLongPressing)return;const t=e.changedTouches[0],step=UwUReader88.swipe(t.clientX-g.x,t.clientY-g.y,Date.now()-g.at);if(step){suppressClickUntil=Date.now()+500;toggleMenu(false);if(!scrollBusy)goToPage(currentPage+step);}},{passive:true});
    contentArea.addEventListener('touchcancel',()=>gesture=null,{passive:true});

    // --- 段评功能逻辑 ---
    const paragraphMenu = document.getElementById('reader-paragraph-menu');
    const menuCommentBtn = document.getElementById('reader-menu-comment');
    const menuCopyBtn = document.getElementById('reader-menu-copy');
    
    const commentOverlay = document.getElementById('reader-comment-overlay');
    const commentCloseBtn = document.getElementById('reader-comment-close');
    const commentQuoteEl = document.getElementById('reader-comment-quote');
    const commentListEl = document.getElementById('reader-comment-list');
    const commentInput = document.getElementById('reader-comment-input');
    const commentSendBtn = document.getElementById('reader-comment-send');

    let selectedParagraph = null;
    let currentCommentParagraph = null; // 专门用于段评面板的段落引用
    let longPressTimer = null;
    let isLongPressing = false;

    // 隐藏悬浮菜单
    function hideParagraphMenu() {
        paragraphMenu.style.display = 'none';
        if (selectedParagraph) {
            selectedParagraph.classList.remove('selected');
            selectedParagraph = null;
        }
    }

    // 显示悬浮菜单
    function showParagraphMenu(pElement, x, y) {
        if(!window.getSelection()?.toString())window.ReaderAnnotations?.clearSelectionCache();
        hideParagraphMenu(); // 先隐藏之前的
        selectedParagraph = pElement;
        selectedParagraph.classList.add('selected');
        
        paragraphMenu.style.display = 'flex';
        
        window.ReaderAnnotations?.positionMenu(pElement.getBoundingClientRect());
    }

    // 绑定长按事件到文本容器
    const textContentEl = document.getElementById('reader-text-content');
    if (textContentEl) {
        textContentEl.addEventListener('touchstart', (e) => {
            if (e.target.closest('p[data-index]')) {
                isLongPressing = false;
                longPressTimer = setTimeout(() => {
                    isLongPressing = true;
                    const touch = e.touches[0];
                    showParagraphMenu(e.target.closest('p[data-index]'), touch.clientX, touch.clientY);
                }, 500); // 500ms 触发长按
            }
        }, { passive: true });

        textContentEl.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        }, { passive: true });

        textContentEl.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);if(isLongPressing){suppressClickUntil=Date.now()+500;setTimeout(()=>{isLongPressing=false;},0);}
            // 如果不是长按，且点击的不是段评图标，则隐藏菜单
            if (!isLongPressing && !e.target.closest('.reader-inline-comment-icon')) {
                hideParagraphMenu();
            }
        });
        
        // 鼠标事件支持 (用于测试)
        textContentEl.addEventListener('mousedown', (e) => {
            // 忽略右键点击，右键由 contextmenu 事件处理
            if (e.button === 2) return;
            
            if (e.target.closest('p[data-index]')) {
                isLongPressing = false;
                longPressTimer = setTimeout(() => {
                    isLongPressing = true;
                    showParagraphMenu(e.target.closest('p[data-index]'), e.clientX, e.clientY);
                }, 500);
            }
        });
        textContentEl.addEventListener('mousemove', () => clearTimeout(longPressTimer));
        textContentEl.addEventListener('mouseup', (e) => {
            if (e.button === 2) return;
            clearTimeout(longPressTimer);
            if (!isLongPressing && !e.target.closest('.reader-inline-comment-icon')) {
                hideParagraphMenu();
            }
        });

        // PC 端右键支持
        textContentEl.addEventListener('contextmenu', (e) => {
            if(window.getSelection()?.toString())return;
            if (e.target.closest('p[data-index]')) {
                e.preventDefault(); // 阻止浏览器默认右键菜单
                showParagraphMenu(e.target.closest('p[data-index]'), e.clientX, e.clientY);
            }
        });
    }

    // 复制功能
    menuCopyBtn.addEventListener('click', () => {
        const snapshot=window.ReaderAnnotations?.snapshot();if(snapshot?.text){navigator.clipboard.writeText(snapshot.text).then(()=>showToast('已复制')).catch(()=>showToast('复制失败'));hideParagraphMenu();return;}
        if (selectedParagraph) {
            // 移除可能包含的段评图标文本
            const clone = selectedParagraph.cloneNode(true);
            const icons = clone.querySelectorAll('.reader-inline-comment-icon');
            icons.forEach(icon => icon.remove());
            
            navigator.clipboard.writeText(clone.textContent).then(() => {
                if (typeof showToast === 'function') showToast("已复制");
                hideParagraphMenu();
            }).catch(err => {
                console.error('复制失败:', err);
                if (typeof showToast === 'function') showToast("复制失败");
            });
        }
    });

    // 写段评功能
    // The unified selection/paragraph action is bound by ReaderAnnotations.

    // 打开段评面板
    async function openCommentPanel(pElement){currentCommentParagraph=pElement;await window.ReaderAnnotations?.fromParagraph(currentBook,pElement);}

    // 全屏图片查看器逻辑
    const fullscreenViewer = document.getElementById('reader-fullscreen-viewer');
    const fullscreenImg = document.getElementById('reader-fullscreen-img');
    let saveImageTimer = null;

    window.readerView = window.readerView || {};
    window.readerView.openFullscreenImage = function(src) {
        fullscreenImg.src = src;
        fullscreenViewer.classList.add('active');
    };

    if (fullscreenViewer) {
        fullscreenViewer.addEventListener('click', () => {
            fullscreenViewer.classList.remove('active');
        });

        // 长按保存图片
        fullscreenImg.addEventListener('touchstart', (e) => {
            saveImageTimer = setTimeout(() => {
                const a = document.createElement('a');
                a.href = fullscreenImg.src;
                a.download = `illustration_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                if (typeof showToast === 'function') showToast("图片已保存");
            }, 800); // 800ms 长按
        });

        fullscreenImg.addEventListener('touchend', () => {
            clearTimeout(saveImageTimer);
        });
        fullscreenImg.addEventListener('touchmove', () => {
            clearTimeout(saveImageTimer);
        });
    }

    // 关闭段评面板
    commentCloseBtn.addEventListener('click', () => {
        commentOverlay.classList.remove('active');
    });
    commentOverlay.addEventListener('click', (e) => {
        if (e.target === commentOverlay) {
            commentOverlay.classList.remove('active');
        }
    });

    // 发送段评
    window.ReaderComments89?.bind(()=>currentBook);
    window.addEventListener('reader-comments-changed',e=>{if(currentBook&&(!e.detail?.bookId||e.detail.bookId===currentBook.id)){commentsCache=null;void window.ReaderComments89?.markers(currentBook,textContentEl,openCommentPanel);}});

    // 目录切换
    function toggleToc(show) {
        if (show) {
            tocOverlay.classList.add('active');
            updateTocHighlight();
        } else {
            tocOverlay.classList.remove('active');
        }
    }

    tocBtn.addEventListener('click', () => toggleToc(true));
    tocOverlay.addEventListener('click', (e) => {
        if (e.target === tocOverlay) toggleToc(false);
    });

    settingsBtn.addEventListener('click',()=>{window.ReaderAppearance89?.open();settingsOverlay.classList.add('active');});
    const closeSettings=()=>{settingsOverlay.classList.remove('active');void window.ReaderAppearance89?.flush();};
    settingsCloseBtn.addEventListener('click',closeSettings);
    settingsOverlay.addEventListener('click',e=>{if(e.target===settingsOverlay)closeSettings();});

    // --- 智能插图生成逻辑 ---
    const generateIllustrationBtn = document.getElementById('reader-generate-illustration-btn');
    const illustrationCountSelect = document.getElementById('reader-illustration-count');
    const illustrationProgress = document.getElementById('reader-illustration-progress');

    // 创建悬浮进度提示框
    const floatingProgress = document.createElement('div');
    floatingProgress.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 1000;
        display: none;
        pointer-events: none;
        backdrop-filter: blur(4px);
        transition: opacity 0.3s;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    readerScreen.appendChild(floatingProgress);

    function showFloatingProgress(text) {
        floatingProgress.textContent = text;
        floatingProgress.style.display = 'block';
        floatingProgress.style.opacity = '1';
    }

    function hideFloatingProgress() {
        floatingProgress.style.opacity = '0';
        setTimeout(() => {
            floatingProgress.style.display = 'none';
        }, 300);
    }

    if (generateIllustrationBtn) {
        generateIllustrationBtn.addEventListener('click', async () => {
            if (!currentBook || currentChapters.length === 0) {
                if (typeof showToast === 'function') showToast("请先加载书籍");
                return;
            }

            const count = parseInt(illustrationCountSelect.value);
            const illustrationBook=currentBook,illustrationChapter=currentChapterIndex;
            const chapter=currentChapters[illustrationChapter];
            if (!chapter || !chapter.content) return;

            // 检查 API 配置
            const settings = db.workshopSettings;
            const {url: apiUrl, key: apiKey, model} = workshopImageApi115(settings || {});

            if (!apiUrl || !apiKey || !model) {
                if (typeof showToast === 'function') showToast("请先在工坊配置生图 API");
                return;
            }

            // 工坊独立 LLM 优先；未配置或预设失效时回退主 API。
            const illustrationLlmConfig = resolveWorkshopLlmApiConfig();
            if (!illustrationLlmConfig.url || !illustrationLlmConfig.key || !illustrationLlmConfig.model) {
                if (typeof showToast === 'function') showToast("请先配置工坊独立 LLM API 或主 API");
                return;
            }

            generateIllustrationBtn.disabled = true;
            generateIllustrationBtn.style.opacity = '0.5';
            
            // 关闭设置面板，进入后台运行
            settingsOverlay.classList.remove('active');
            toggleMenu(false);
            
            showFloatingProgress('正在构思分镜...');

            try {
                // 1. 组装 LLM Prompt
                let messages = [];
                let systemPromptAcc = '';
                const activeLlmGroupId = db.workshopSettings.activeLlmPresetGroupId;
                const activeGroup = (db.workshopSettings.llmPresetGroups || []).find(g => g.id === activeLlmGroupId);
                
                const userPrompt = `请为提供的<章节内容>提取 ${count} 个最具画面感的瞬间，并严格按照要求的 XML 格式输出。`;
                const formatInstruction = `\n\n[小说插图专属格式]\n请严格按照以下 XML 格式输出（不要返回任何多余的解释）：\n<image001>\n<原文段落>这里原封不动地摘录原文中的一段话或一句话，作为插入图片定位的锚点。</原文段落>\n<image>纯英文提示词tag，逗号分隔...</image>\n</image001>\n<image002>\n...\n</image002>`;

                let userPromptInserted = false;

                if (activeGroup && activeGroup.prompts) {
                    activeGroup.prompts.forEach((p) => {
                        if (!p.enabled) return;
                        
                        // 过滤掉聊天专属设定
                        if (p.title && (p.title.includes('角色设定') || p.title.includes('当前主要角色') || p.title.includes('角色专属tag'))) {
                            return;
                        }
                        
                        let contentToAdd = p.content;
                        
                        // 替换聊天上下文为章节内容
                        if (p.title && p.title.includes('聊天上下文')) {
                            contentToAdd = `<章节内容>\n${chapter.content}\n</章节内容>`;
                        }

                        // 在 cot开始 之前插入 userPrompt
                        if (p.title && p.title.includes('cot开始') && !userPromptInserted) {
                            if (systemPromptAcc) {
                                messages.push({ role: "system", content: systemPromptAcc.trim() });
                                systemPromptAcc = '';
                            }
                            messages.push({ role: "user", content: userPrompt });
                            userPromptInserted = true;
                        }

                        // 替换 cot尾部 的格式示范
                        if (p.title && p.title.includes('cot尾部')) {
                            contentToAdd = contentToAdd.replace(/<回复>[\s\S]*?<\/回复>/g, '');
                            contentToAdd += formatInstruction;
                        }
                        
                        systemPromptAcc += contentToAdd + '\n\n';
                    });
                    
                    if (systemPromptAcc) {
                        messages.push({ role: "system", content: systemPromptAcc.trim() });
                    }

                    // 如果没找到 cot开始，把 userPrompt 加在最后
                    if (!userPromptInserted) {
                        messages.push({ role: "user", content: userPrompt });
                    }
                } else {
                    throw new Error("未找到工坊 LLM 预设");
                }

                // 兼容性处理：确保最后一条是 user 消息（如果需要的话，或者直接加 prefill）
                if (messages[messages.length - 1].role === 'system') {
                    messages.push({ role: "user", content: "请开始生成插图指令：" });
                }
                
                // 预填 thinking
                messages.push({ role: "assistant", content: "<thinking>" });

                console.log("=== 发送给 AI 的 Messages ===\n", JSON.stringify(messages, null, 2));

                // 2. 请求 LLM
                const {
                    requestBody: llmPayload,
                    endpoint: llmEndpoint,
                    headers: llmHeaders
                } = buildChatApiRequest(illustrationLlmConfig, messages, { temperature: 0.7 });

                const llmResponse = await fetch(llmEndpoint, {
                    method: 'POST',
                    headers: llmHeaders,
                    body: JSON.stringify(llmPayload)
                });

                if (!llmResponse.ok) {
                    throw await UwUApiErrors96.failure(llmResponse,"阅读器插图扩写",illustrationLlmConfig);
                }
                
                const llmData = await llmResponse.json();
                let llmText = "";
                
                if (illustrationLlmConfig.provider === 'gemini') {
                    llmText = llmData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                } else {
                    llmText = llmData.choices?.[0]?.message?.content || "";
                }

                console.log("=== AI 返回的原始文本 ===\n" + llmText);

                // 3. 解析 XML
                const imageBlocks = [];
                const regex = /<image\d{3}>([\s\S]*?)<\/image\d{3}>/g;
                let match;
                while ((match = regex.exec(llmText)) !== null) {
                    const blockContent = match[1];
                    const quoteMatch = blockContent.match(/<原文段落>([\s\S]*?)<\/原文段落>/);
                    const promptMatch = blockContent.match(/<image>([\s\S]*?)<\/image>/);
                    
                    if (quoteMatch && promptMatch) {
                        imageBlocks.push({
                            quote: quoteMatch[1].trim(),
                            prompt: promptMatch[1].trim()
                        });
                    }
                }

                if (imageBlocks.length === 0) {
                    throw new Error("未能解析出有效的插图指令");
                }

                // 4. 匹配段落并生图
                const paragraphs = chapter.content.split('\n').filter(p => p !== '');
                
                for (let i = 0; i < imageBlocks.length; i++) {
                    const block = imageBlocks[i];
                    showFloatingProgress(`正在绘制第 ${i + 1}/${imageBlocks.length} 张插图...`);

                    // 模糊匹配寻找最佳段落
                    let bestMatchIndex = -1;
                    let maxSimilarity = 0;

                    for (let j = 0; j < paragraphs.length; j++) {
                        const pText = paragraphs[j];
                        if (pText.includes(block.quote)) {
                            bestMatchIndex = j;
                            break;
                        }
                        // 简单的相似度计算：重合字符数
                        let matchCount = 0;
                        for (let char of block.quote) {
                            if (pText.includes(char)) matchCount++;
                        }
                        const similarity = matchCount / block.quote.length;
                        if (similarity > maxSimilarity && similarity > 0.5) { // 至少 50% 相似
                            maxSimilarity = similarity;
                            bestMatchIndex = j;
                        }
                    }

                    if (bestMatchIndex === -1) {
                        console.warn("未找到匹配的段落:", block.quote);
                        continue; // 跳过这张图
                    }

                    // 构建生图 Payload (复用 workshop 逻辑)
                    const tempSettings = JSON.parse(JSON.stringify(settings));
                    // 将 LLM 生成的 prompt 追加到工坊原有的 positivePrompt 后面
                    tempSettings.positivePrompt = (tempSettings.positivePrompt ? tempSettings.positivePrompt + ', ' : '') + block.prompt;
                    // 清空角色专属 tag，因为小说插图不需要特定角色的固定 tag
                    tempSettings.characterPrompt = '';
                    
                    if (typeof window.executeImageGeneration !== 'function') {
                        throw new Error("未找到统一生图函数 window.executeImageGeneration");
                    }

                    let base64Image = '';
                    try {
                        const result = await window.executeImageGeneration(tempSettings, block.prompt);
                        base64Image = result.imageData;
                    } catch (genErr) {
                        console.error(`第 ${i+1} 张图生成或解析失败:`, genErr);
                        continue;
                    }

                    if (base64Image) {
                        // 存入数据库
                        if(!await dexieDB.reader_books.get(illustrationBook.id))throw Error('原书籍已删除，插图未保存');
                        await dexieDB.reader_comments.add({
                            bookId: illustrationBook.id,
                            chapterIndex: illustrationChapter,
                            paragraphIndex: bestMatchIndex,
                            content: `[ILLUSTRATION]${base64Image}`,
                            timestamp: Date.now()
                        });

                        window.dispatchEvent(new CustomEvent('reader-comments-changed',{detail:{bookId:illustrationBook.id}}));
                    }
                }

                showFloatingProgress('插图生成完毕！');
                setTimeout(() => {
                    hideFloatingProgress();
                }, 2000);

            } catch (error) {
                console.error("智能插图生成失败:", error);
                showFloatingProgress('生成失败: ' + error.message);
                setTimeout(() => { hideFloatingProgress(); }, 3000);
            } finally {
                generateIllustrationBtn.disabled = false;
                generateIllustrationBtn.style.opacity = '1';
            }
        });
    }

    // 暴露给全局
    window.readerView.loadBook = loadBook;
    window.readerView.context=()=>{const anchor=window.getSelection()?.anchorNode,element=anchor?.nodeType===1?anchor:anchor?.parentElement,section=element?.closest?.('[data-reader-chapter]'),index=section?Number(section.dataset.readerChapter):selectedParagraph?.dataset.readerChapter!==undefined?Number(selectedParagraph.dataset.readerChapter):currentChapterIndex;return {book:currentBook,chapters:currentChapters,chapterIndex:index,paragraph:selectedParagraph};};
    window.readerView.jump=async(index,paragraphIndex)=>{const chunks=chunksFor(index),chunk=Math.max(0,chunks.findIndex(rows=>rows.some(row=>row.index===paragraphIndex)));await loadChapter(index,0,chunk);const p=document.querySelector('#reader-text-content p[data-index="'+paragraphIndex+'"]');if(p){if(pageMode==='scroll')contentArea.scrollTop=contentY(p);else{const rect=p.getBoundingClientRect(),w=pageStride||contentArea.clientWidth;goToPage(Math.max(0,Math.floor((rect.left-contentArea.getBoundingClientRect().left+currentPage*w)/w)),true);}p.classList.add('reader-highlight-focus');setTimeout(()=>p.classList.remove('reader-highlight-focus'),1500);}};
    window.readerView.hideParagraphMenu=hideParagraphMenu;
    window.readerView.flushProgress=()=>saveProgress(true);
    window.readerView.suspendPersistence=()=>{clearTimeout(scrollSaveTimer);pendingProgress=null;currentBook=null;++progressGeneration;++bookSerial;++loadSerial;scrollBusy=false;return Promise.allSettled([...progressJobs.values()]);};
});
