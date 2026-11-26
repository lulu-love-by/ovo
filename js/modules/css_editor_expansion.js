// 放大时移动同一个编辑框与查找工具，保留原有内容、监听器及查找/替换状态。
(() => {
    let active=null;
    const expandIcon='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7M21 3l-7 7M10 21H3v-7M3 21l7-7"/></svg>';
    const shrinkIcon='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3l-7 7V3M14 10h7M3 21l7-7v7M10 14H3"/></svg>';
    function close() {
        if(!active)return;
        const {toolbar,textarea,toolbarPlace,textareaPlace,overlay,button,disabled,readOnly,onKey,observer,bodyOverflow}=active;
        active=null;observer.disconnect();document.removeEventListener('keydown',onKey,true);
        toolbarPlace.replaceWith(toolbar);textareaPlace.replaceWith(textarea);
        textarea.disabled=disabled;textarea.readOnly=readOnly;
        toolbar.classList.remove('css-editor-toolbar');textarea.classList.remove('css-editor-textarea');
        button.innerHTML=expandIcon;button.title='放大 CSS 编辑框';button.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded','false');
        overlay.remove();document.body.style.overflow=bodyOverflow;refreshSearch(textarea);button.focus({preventScroll:true});
    }
    function open(toolbar,textarea,button) {
        if(active){if(active.textarea===textarea){close();return;}close();}
        const toolbarPlace=document.createComment('CSS toolbar position'),textareaPlace=document.createComment('CSS textarea position');
        toolbar.replaceWith(toolbarPlace);textarea.replaceWith(textareaPlace);
        const overlay=document.createElement('div'),dialog=document.createElement('div');
        overlay.className='modal-overlay visible css-editor-overlay';dialog.className='css-editor-dialog';
        dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','放大 CSS 编辑框');
        toolbar.classList.add('css-editor-toolbar');textarea.classList.add('css-editor-textarea');
        dialog.append(toolbar,textarea);overlay.append(dialog);document.body.append(overlay);
        button.innerHTML=shrinkIcon;button.title='缩小 CSS 编辑框';button.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded','true');
        const bodyOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
        const chatId=typeof currentChatId==='undefined'?null:currentChatId,chatType=typeof currentChatType==='undefined'?null:currentChatType;
        const disabled=textarea.disabled,readOnly=textarea.readOnly;
        if(disabled){textarea.disabled=false;textarea.readOnly=true;}
        const onKey=e=>{
            if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
            if(e.key!=='Tab')return;
            const nodes=[...dialog.querySelectorAll('button,input,textarea')].filter(n=>!n.disabled&&n.getClientRects().length);
            if(!nodes.length)return;
            if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}
            else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}
        };
        const observer=new MutationObserver(()=>{if(!toolbarPlace.isConnected||!textareaPlace.isConnected||(typeof currentChatId!=='undefined'&&currentChatId!==chatId)||(typeof currentChatType!=='undefined'&&currentChatType!==chatType))close();});
        active={toolbar,textarea,toolbarPlace,textareaPlace,overlay,button,disabled,readOnly,onKey,observer,bodyOverflow};
        document.addEventListener('keydown',onKey,true);observer.observe(document.body,{childList:true,subtree:true});
        overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
        refreshSearch(textarea);
        button.focus({preventScroll:true});
    }
    function attach(toolbar,textarea) {
        if(toolbar.querySelector('.css-editor-expand-btn'))return;
        const search=toolbar.querySelector('.toolbar-toggle-btn');if(!search)return;
        const actions=document.createElement('div');actions.className='css-editor-actions';
        search.replaceWith(actions);actions.append(search);
        const button=document.createElement('button');button.type='button';button.className='toolbar-toggle-btn css-editor-expand-btn';button.innerHTML=expandIcon;
        button.title='放大 CSS 编辑框';button.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded','false');actions.append(button);
        button.addEventListener('click',()=>open(toolbar,textarea,button));
    }
    // 搜索时用同一排版层显示文字和高亮。进入编辑时立即恢复原生文字与光标。
    const searchLayers = new WeakMap();
    function searchLayer(textarea) {
        if (searchLayers.has(textarea)) return searchLayers.get(textarea);

        const layer = document.createElement('div');
        layer.className = 'css-search-highlight-layer';
        layer.setAttribute('aria-hidden', 'true');

        const mirror = document.createElement('div');
        mirror.className = 'css-search-highlight-mirror';
        const text = document.createTextNode('');
        mirror.append(text);
        layer.append(mirror);

        const textStyles = [
            'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariant',
            'fontFeatureSettings', 'fontVariationSettings', 'fontKerning', 'lineHeight',
            'letterSpacing', 'wordSpacing', 'textIndent', 'textAlign', 'textTransform',
            'tabSize', 'direction', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
            'wordBreak', 'overflowWrap', 'whiteSpace', 'hyphens'
        ];
        let start = -1;
        let end = -1;
        let value = '';

        function syncScroll() {
            const nativeMax = textarea.scrollHeight - textarea.clientHeight;
            const previewMax = Math.max(0, mirror.offsetHeight - textarea.clientHeight);
            const previewTop = nativeMax > 0
                ? textarea.scrollTop * previewMax / nativeMax : 0;
            mirror.style.transform = `translate(${-textarea.scrollLeft}px,${-previewTop}px)`;
        }

        function setPreview(visible) {
            layer.hidden = !visible;
            textarea.classList.toggle('css-search-preview-active', visible);
        }

        function layout(jump = false) {
            if (!textarea.isConnected || start < 0 || textarea.value !== value ||
                document.activeElement === textarea || !textarea.clientWidth || !textarea.clientHeight) {
                setPreview(false);
                return;
            }

            const parent = textarea.parentElement;
            if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
            if (layer.parentElement !== parent) parent.append(layer);

            const style = getComputedStyle(textarea);
            const borderWidth = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
            const hasVerticalGutter = textarea.offsetWidth - textarea.clientWidth - borderWidth > 1;
            const styledWidth = parseFloat(style.width);
            const paddingWidth = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const innerWidth = style.boxSizing === 'border-box' ? styledWidth - borderWidth : styledWidth + paddingWidth;
            const width = hasVerticalGutter ? textarea.clientWidth : innerWidth;

            Object.assign(layer.style, {
                width: `${width}px`,
                height: `${textarea.clientHeight}px`,
                left: `${textarea.offsetLeft + textarea.clientLeft}px`,
                top: `${textarea.offsetTop + textarea.clientTop}px`,
                borderRadius: style.borderRadius
            });
            for (const name of textStyles) mirror.style[name] = style[name];
            if (textarea.wrap === 'off') {
                mirror.style.whiteSpace = 'pre';
                mirror.style.overflowWrap = 'normal';
            }
            mirror.style.color = style.color;
            setPreview(true);
            syncScroll();

            while (text.nextSibling) text.nextSibling.remove();
            const range = document.createRange();
            range.setStart(text, start);
            range.setEnd(text, end);
            const bounds = mirror.getBoundingClientRect();
            const scaleX = bounds.width / width || 1;
            const scaleY = bounds.height / parseFloat(getComputedStyle(mirror).height) || 1;
            const rects = [...range.getClientRects()];
            const highlights = document.createDocumentFragment();
            for (const rect of rects) {
                if (!rect.width || !rect.height) continue;
                const mark = document.createElement('span');
                mark.className = 'css-search-highlight-mark';
                Object.assign(mark.style, {
                    left: `${(rect.left - bounds.left) / scaleX}px`,
                    top: `${(rect.top - bounds.top) / scaleY}px`,
                    width: `${rect.width / scaleX}px`,
                    height: `${rect.height / scaleY}px`
                });
                highlights.append(mark);
            }
            mirror.append(highlights);

            const first = rects[0];
            if (jump && first) {
                const y = (first.top - bounds.top) / scaleY;
                const target = Math.max(0, y - textarea.clientHeight * .4);
                const nativeMax = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
                const previewMax = mirror.offsetHeight - textarea.clientHeight;
                textarea.scrollTop = previewMax > 0 ? target * nativeMax / previewMax : 0;
                if (textarea.wrap === 'off' && style.direction === 'ltr') {
                    textarea.scrollLeft = Math.max(0, (first.left - bounds.left) / scaleX - textarea.clientWidth * .3);
                }
                syncScroll();
            }
        }

        function show(nextStart, nextEnd) {
            value = textarea.value;
            start = nextStart >= 0 && nextEnd > nextStart && nextEnd <= value.length ? nextStart : -1;
            end = nextEnd;
            const displayText = value.endsWith('\n') ? value + '\u200b' : value;
            if (start >= 0 && text.data !== displayText) text.data = displayText;
            layout(true);
        }

        // Android's native selection is editable. Keep the mirror for finding the match.
        if (/Android/i.test(navigator.userAgentData?.platform || '') || /Android/i.test(navigator.userAgent)) {
            let editMatch = null;
            textarea.addEventListener('pointerdown', event => {
                editMatch = null;
                if (event.button !== 0 || layer.hidden || textarea.readOnly || textarea.disabled) return;
                const {clientX: x, clientY: y} = event;
                const hit = [...mirror.querySelectorAll('.css-search-highlight-mark')].some(mark => {
                    const rect = mark.getBoundingClientRect();
                    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
                });
                if (!hit) return;
                event.preventDefault();
                editMatch = {start, end, value};
            });
            textarea.addEventListener('pointercancel', () => { editMatch = null; });
            textarea.addEventListener('click', event => {
                const match = editMatch;
                editMatch = null;
                if (!match || !event.isTrusted || match.value !== textarea.value) return;
                event.preventDefault();
                const top = textarea.scrollTop;
                const left = textarea.scrollLeft;
                const ancestors = [];
                for (let parent = textarea.parentElement; parent; parent = parent.parentElement) {
                    ancestors.push([parent, parent.scrollTop, parent.scrollLeft]);
                }
                textarea.focus({preventScroll: true});
                textarea.setSelectionRange(match.start, match.end);
                const restore = () => {
                    textarea.scrollTop = top;
                    textarea.scrollLeft = left;
                    for (const [parent, y, x] of ancestors) {
                        if (parent.scrollTop !== y) parent.scrollTop = y;
                        if (parent.scrollLeft !== x) parent.scrollLeft = x;
                    }
                };
                restore();
                requestAnimationFrame(() => {
                    if (document.activeElement === textarea && textarea.selectionStart === match.start && textarea.selectionEnd === match.end) restore();
                });
            });
        }

        textarea.addEventListener('focus', () => setPreview(false));
        textarea.addEventListener('blur', () => layout());
        textarea.addEventListener('scroll', syncScroll, { passive: true });
        textarea.addEventListener('input', () => {
            if (textarea.value !== value) show(-1, -1);
        });
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => layout()).observe(textarea);
        window.addEventListener('resize', () => layout(), { passive: true });
        const state = { show, layout };
        searchLayers.set(textarea, state);
        return state;
    }
    function showSearch(textarea,start,end){searchLayer(textarea).show(start,end);}
    function refreshSearch(textarea){searchLayers.get(textarea)?.layout(true);}
    window.CssEditorExpansion={attach,close,showSearch,refreshSearch};
})();
