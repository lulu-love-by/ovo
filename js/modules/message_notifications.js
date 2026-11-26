// 系统消息通知：只处理新消息，不在历史渲染时发送。
(() => {
    const preferenceKey = 'uwu-message-notifications-enabled';
    const promptedKey = 'uwu-message-notifications-prompted';
    const seen = new Set();
    const queued=new Map();
    let routeBound=false, pendingRoute=null;
    let enabled = true;
    let requesting = false, permissionRequest=null, requestHint='',syncPoll,syncTimeout;
    let testTimer;
    try { enabled = localStorage.getItem(preferenceKey) !== 'false'; } catch (_) {}
    const inWebView = () => window.__webtoapp_notification_polyfill__ || /(?:\bwv\b|WebToApp)/i.test(navigator.userAgent || '') || typeof NativeBridge!=='undefined'&&(typeof NativeBridge.getNotificationPermissionState==='function'||typeof NativeBridge.areNotificationsEnabled==='function');
    const bridge = () => inWebView()&&typeof NativeBridge!=='undefined'?NativeBridge:null;
    const hasNativeState = () => typeof bridge()?.getNotificationPermissionState==='function'||typeof bridge()?.areNotificationsEnabled==='function';
    const supported = () => typeof Notification!=='undefined'&&typeof Notification.requestPermission==='function'||hasNativeState()&&typeof bridge()?.showWebNotification==='function';
    const webSupported = () => window.isSecureContext && 'serviceWorker' in navigator;
    let callbackPermission = 'default';
    function permission(){
        if(hasNativeState()){try{const value=bridge().getNotificationPermissionState?.();if(['granted','denied','default'].includes(value)){callbackPermission=value;return value;}}catch(_){}try{const enabled=bridge().areNotificationsEnabled?.();if(typeof enabled==='boolean'){callbackPermission=enabled?'granted':'denied';return callbackPermission;}}catch(_){}return 'default';}
        const value=typeof Notification!=='undefined'?Notification.permission:'default';
        return inWebView()&&value==='default'&&callbackPermission==='granted'?'granted':['granted','denied','default'].includes(value)?value:callbackPermission;
    }
    const status = text => {const el=document.getElementById('message-notification-status');if(el)el.textContent=text;};
    function refresh(){
        const toggle=document.getElementById('message-notification-switch');if(toggle)toggle.checked=enabled;
        if(!supported())return status('通知接口尚未就绪或不可用；套壳 APK 请确认已开启通知兼容层');
        const p=permission();
        if(p==='granted')return status(enabled?'系统通知权限已允许；可发送测试确认手机实际显示':'页面消息通知已关闭');
        if(requesting)return status(requestHint||'正在等待系统通知授权；返回此页面后会自动核对');
        if(p==='denied')return status(inWebView()?'系统通知尚未允许；点击「授权通知」前往应用通知设置，允许后返回即可':'通知权限未允许，请在浏览器网站设置和手机通知设置中开启');
        status('尚未确认通知权限，点击「授权通知」；重新打开应用会核对系统状态');
    }
    // On cold start/resume, native injection and Android permission callbacks can lag behind pageshow.
    // Poll briefly without requesting permission; never persist a grant as a substitute for OS state.
    function resync(){
        clearInterval(syncPoll);clearTimeout(syncTimeout);refresh();
        if(!inWebView())return;
        syncPoll=setInterval(refresh,250);
        syncTimeout=setTimeout(()=>{clearInterval(syncPoll);syncPoll=null;refresh();},5000);
    }
    function request(){
        if(requesting)return permissionRequest;
        if(!supported()){resync();return Promise.resolve(false);}
        const initial=permission();if(initial==='granted'){refresh();return Promise.resolve(true);}
        if(initial==='denied'&&!inWebView()){refresh();return Promise.resolve(false);}
        requesting=true;requestHint='正在等待系统通知授权；不需要退出应用';
        let resolveTask;permissionRequest=new Promise(resolve=>resolveTask=resolve);const result=permissionRequest;
        let settled=false,poll,timeout,settingsOpened=false;
        const finish=(value,error='')=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(timeout);requesting=false;permissionRequest=null;requestHint='';if(value==='granted'){callbackPermission=value;try{localStorage.setItem(promptedKey,'true');}catch(_){}}refresh();if(error)status(error);resolveTask(value==='granted');};
        const openSettings=()=>{if(settingsOpened||typeof bridge()?.openNotificationSettings!=='function')return false;const ok=bridge().openNotificationSettings();if(ok===false)return false;settingsOpened=true;requestHint='请在系统应用通知设置中允许通知，然后返回；此页会自动核对';refresh();return true;};
        const done=value=>{
            if(settled)return;
            if(!inWebView()){if(['granted','denied','default'].includes(value))finish(value);return;}
            if(hasNativeState()){
                if(permission()==='granted')return finish('granted');
                if(value==='denied')try{openSettings();}catch(_){}
                return; // An immediate default/denied bridge return is not the async Android decision.
            }
            if(value==='granted')finish(value);
        };
        poll=setInterval(()=>{const p=permission();if(p==='granted')finish(p);else if(!inWebView()&&p==='denied')finish(p);else refresh();},250);
        timeout=setTimeout(()=>{if(permission()==='granted')finish('granted');else finish('default',settingsOpened?'尚未确认系统通知已开启；允许后返回此页会重新核对，也可再次点击授权':'授权未完成或系统未返回结果；可直接再次点击，不需要大退应用');},12000);
        refresh();
        try{
            // NativeBridge may classify a first install as denied; its own request then exits early.
            // The explicit authorize button can open Android's app notification settings instead.
            if(initial==='denied'&&openSettings())return result;
            let returned;
            if(typeof Notification!=='undefined'&&typeof Notification.requestPermission==='function')returned=Notification.requestPermission(done);
            else if(typeof bridge()?.requestNotificationPermission==='function')returned=bridge().requestNotificationPermission();
            else if(openSettings())return result;
            else throw Error('notification request unavailable');
            if(returned&&typeof returned.then==='function')returned.then(done,()=>finish('default','系统未能完成授权申请；可直接重试或在手机设置中开启本应用通知'));
            else if(typeof returned==='string')done(returned);
        }catch(_){finish('default','系统未能启动授权；请检查套壳通知兼容层或手机应用通知设置，可直接重试');}
        return result;
    }
    async function registration() {
        await navigator.serviceWorker.register('sw.js');
        let timeout;
        try {
            return await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('通知服务启动超时，请刷新重试')), 10000); })
            ]);
        } finally { clearTimeout(timeout); }
    }
    function visibleChatRoom() {
        const screen=document.getElementById('chat-room-screen');
        return document.hidden!==true&&screen?.classList.contains('active')===true
            &&typeof currentChatId!=='undefined'&&currentChatId!==null&&currentChatId!==''
            &&typeof currentChatType!=='undefined'&&['private','group'].includes(currentChatType);
    }
    function visibleChat(chatId,chatType) {
        const screen=document.getElementById('chat-room-screen');
        return !document.hidden && (typeof document.hasFocus!=='function'||document.hasFocus())
            && screen?.classList.contains('active') && typeof currentChatId!=='undefined'
            && String(currentChatId)===String(chatId) && currentChatType===chatType;
    }
    function chatUrl(data) {
        if(data.test||typeof location==='undefined')return '';
        const url=new URL(location.href);
        url.searchParams.delete('notificationChat');url.searchParams.delete('notificationType');
        url.hash=new URLSearchParams({notificationChat:String(data.chatId),notificationType:data.chatType}).toString();
        return url.href;
    }
    function route(data){
        if(data.test||!data.chatId||!['private','group'].includes(data.chatType))return false;
        // Loading the database is not the end of startup: chat DOM and handlers must be ready too.
        if(window.uwuAppReady95!==true){pendingRoute={chatId:data.chatId,chatType:data.chatType};return false;}
        const list=data.chatType==='private'?db.characters:db.groups;
        const chat=list?.find(c=>String(c.id)===String(data.chatId));
        if(!chat||typeof openChatRoom!=='function')return false;
        const same=typeof currentChatId!=='undefined'&&typeof currentChatType!=='undefined'&&String(currentChatId)===String(chat.id)&&currentChatType===data.chatType&&document.getElementById('chat-room-screen')?.classList.contains('active');
        if(!same)openChatRoom(chat.id,data.chatType);
        // Repair an empty view left by an interrupted/older notification route, without reopening it.
        else if(chat.history?.length&&!document.querySelector('#message-area .message-wrapper[data-id]')&&typeof renderMessages==='function')renderMessages(false,true);
        // A warm native click may not emit pageshow or visibilitychange.
        return true;
    }
    function routeFromUrl(){
        if(typeof location==='undefined')return;
        const url=new URL(location.href),fragment=new URLSearchParams(url.hash.slice(1));
        const fromHash=fragment.has('notificationChat'),params=fromHash?fragment:url.searchParams;
        const chatId=params.get('notificationChat'),chatType=params.get('notificationType');
        if(!chatId||!['private','group'].includes(chatType)||!route({chatId,chatType}))return;
        params.delete('notificationChat');params.delete('notificationType');
        // Accept old query links as well, but emit hash links to keep a running WebView alive.
        url.searchParams.delete('notificationChat');url.searchParams.delete('notificationType');
        if(fromHash)url.hash=params.toString();
        history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
    async function send(title, body, data, tag) {
        if(!data.test&&visibleChatRoom())return;
        if (!supported() || permission() !== 'granted') throw new Error('系统通知尚未授权');
        const options = { body, tag, data:{...data,uwuUrl:chatUrl(data)} };
        // WebToApp基础polyfill不传onclick；增强接口必须由套壳提供，不能猜点击目标。
        if(inWebView()&&options.data.uwuUrl&&typeof NativeBridge!=='undefined'&&typeof NativeBridge.showWebNotificationWithUrl==='function') {
            if(NativeBridge.showWebNotificationWithUrl(title,body,tag,options.data.uwuUrl))return;
        }
        if(typeof bridge()?.showWebNotification==='function'){
            if(bridge().showWebNotification(String(title),String(body),String(tag)))return;
            resync();throw new Error('套壳未能发送通知，请检查本应用的系统通知权限');
        }
        if(inWebView()&&window.__webtoapp_notification_polyfill__)status('当前套壳基础通知不支持点击定位；需使用随包说明中的WebToApp原生接口增强');
        let webError;
        if (!inWebView() && webSupported()) {
            try {
                const reg = await registration();
                if(!data.test&&visibleChatRoom())return;
                await reg.showNotification(title, options);
                return;
            } catch (error) { webError = error; }
        }
        if(!data.test&&visibleChatRoom())return;
        try {
            const notification = new Notification(title, options);
            notification.onclick = () => {
                notification.close?.();
                window.focus?.();
                route(data);
            };
        } catch (error) {
            throw webError || new Error('套壳通知未能发送，请开启 WebToApp 通知兼容层并重新打包，然后在手机设置允许本应用通知');
        }
    }
    function onApiOpen(){resync();}
    function notify(message, chatId, chatType, options={}) {
        if (!enabled || !supported() || permission() !== 'granted'
            || !message || message.role !== 'assistant' || message.isThinking || message.isStatusUpdate
            || message.isWithdrawn || !message.id || seen.has(message.id)) return;
        // Another character already gets UwU's in-app popup while chatting.
        if(visibleChatRoom()){queued.delete(message.id);seen.add(message.id);if(seen.size>1000)seen.delete(seen.values().next().value);return;}
        if(options.defer){queued.set(message.id,{message,chatId,chatType});return;}
        let body = window.SmartMessaging ? window.SmartMessaging.stripNote(String(message.content || '')).clean : String(message.content || '');
        if (/^\s*(?:<thinking>|\[system:)/i.test(body)) return;
        const chat = chatType === 'private' ? db.characters.find(c => c.id === chatId) : db.groups.find(g => g.id === chatId);
        if (!chat) return;
        const member = chatType === 'group' && (chat.members || []).find(m => m.id === message.senderId);
        const sender = member || chat;
        const title = sender.remarkName || sender.groupNickname || sender.realName || sender.name || '角色新消息';
        const match = body.match(/^\[[\s\S]*?的消息[：:]([\s\S]*)\]$/);
        if (match) body = match[1];
        if ((message.parts || []).some(p => p.type === 'html')) body = '[卡片消息]';
        body = body.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').replace(/<[^>]*>/g, '').trim();
        if (!body) return;
        seen.add(message.id);
        if (seen.size > 1000) seen.delete(seen.values().next().value);
        void send(String(title), body.slice(0, 240), { chatId, chatType }, `uwu-message-${message.id}`)
            .catch(() => status('消息通知发送失败，请检查系统权限或发送测试通知'));
    }
    function flush(chatId,chatType){
        for(const [id,item] of queued){if(item.chatId===chatId&&item.chatType===chatType){queued.delete(id);notify(item.message,chatId,chatType);}}
    }
    function setup() {
        if(routeBound){resync();return;}
        const toggle = document.getElementById('message-notification-switch');
        toggle?.addEventListener('change', () => {
            enabled = toggle.checked;
            try { localStorage.setItem(preferenceKey, String(enabled)); } catch (_) {}
            if (!enabled) { clearTimeout(testTimer); refresh(); }
            else void request();
        });
        document.getElementById('message-notification-authorize')?.addEventListener('click', () => void request());
        document.getElementById('message-notification-test')?.addEventListener('click', async () => {
            clearTimeout(testTimer);
            if (!enabled) return status('请先打开消息通知开关');
            if (!await request()) return;
            status('5 秒后发送临时测试通知，可切换到桌面查看；网页需保持运行');
            testTimer = setTimeout(async () => {
                try {
                    await send('UwU 通知测试', '看到这条消息说明系统通知可以显示。角色回复也会在这里出现。', { test: true }, 'uwu-notification-test');
                    status('测试已交给系统，请查看通知栏；未显示时检查手机通知、横幅和勿扰设置');
                } catch (error) { status(`测试失败：${error.message}`); }
            }, 5000);
        });
        if(!routeBound){
            routeBound=true;
            navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='uwu-open-chat')route(event.data);});
            window.addEventListener('load',()=>void routeFromUrl());
            window.addEventListener('pageshow',()=>{resync();void routeFromUrl();});
            window.addEventListener('uwu-db-ready',()=>{routeFromUrl();const queued=pendingRoute;pendingRoute=null;if(queued)route(queued);});
            window.addEventListener('hashchange',routeFromUrl);
            window.addEventListener('popstate',routeFromUrl);
            window.addEventListener('uwu-notification-click',event=>route(event.detail||{}));
            if(document.readyState==='complete')void routeFromUrl();
        }
        window.addEventListener('focus', resync);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) resync();else{clearInterval(syncPoll);clearTimeout(syncTimeout);} });
        resync();
    }
    window.MessageNotifications = { setup, onApiOpen, notify, flush, route, visibleChat };
})();
