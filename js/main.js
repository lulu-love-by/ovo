// --- 主程序入口 (js/main.js) ---

// 注册 Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

const init = async () => {
    await loadData();
    if (typeof ensureAllChatArchives === 'function') {
        const archivesMigrated = ensureAllChatArchives();
        if (archivesMigrated) await saveData();
    }
    if (!db.homeWidgetSettings || !db.homeWidgetSettings.topLeft) {
        db.homeWidgetSettings = JSON.parse(JSON.stringify(defaultWidgetSettings));
    }

    // 全局点击事件委托
    document.body.addEventListener('click', (e) => {
        // 全局点击触感反馈
        // if (e.target.closest('button, .btn, .action-btn, .nav-item, .icon-btn, .list-item, input[type="checkbox"], input[type="radio"], .back-btn')) {
        //     triggerHapticFeedback('light');
        // }

        if (e.target.closest('.context-menu')) {
            e.stopPropagation();
            return;
        }
        removeContextMenu();

        const backBtn = e.target.closest('.back-btn');
        if (backBtn) {
            const target = backBtn.getAttribute('data-target');
            if (target) {
                e.preventDefault();
                switchScreen(target);
            }
        }

        const openOverlay = document.querySelector('.modal-overlay.visible, .action-sheet-overlay.visible');
        if (openOverlay && e.target === openOverlay) {
            openOverlay.classList.remove('visible');
        }
    });

    // 导航栏跳转
    document.body.addEventListener('click', e => {
        const navLink = e.target.closest('.app-icon[data-target]');
        if (navLink) {
            e.preventDefault();
            const target = navLink.getAttribute('data-target');
            if (target === 'diary-screen' || target === 'piggy-bank-screen') {
                showToast('该应用正在开发中，敬请期待！');
                return;
            }
            switchScreen(target);
        }
    });

    // 定时任务
    updateClock();
    setInterval(updateClock, 30000);
    setInterval(checkAutoReply, 60000);
    
    // 检查备份提醒
    setTimeout(checkBackupReminder, 5000); // 启动后延迟5秒检查
    setInterval(checkBackupReminder, 3600000); // 每小时检查一次

    // 应用全局设置
    // Fonts must not hold up home initialization. Keep database loading and guards awaited.
    void loadAllCustomFonts().catch(error => console.error('字体后台加载失败', error));
    
    if (db.fontUrl && db.fontUrl.startsWith('CustomFont_')) {
        applyGlobalFont(db.fontUrl, true);
    } else {
        applyGlobalFont(db.fontUrl, false);
    }
    
    applyGlobalCss(db.globalCss);
    applyFontSize(db.fontSizeScale || 1.0);
    if (typeof applyThemeSettings === 'function') applyThemeSettings();

    // 初始化各个模块
    setupHomeScreen();
    if (typeof renderConsoleLogs === 'function') renderConsoleLogs();
    setupChatListScreen();
    setupContactsScreen();
    setupBottomNavigation();
    setupAddCharModal();
    if (typeof setupStUnlock === 'function') setupStUnlock();
    if (typeof injectChatRoomHtml === 'function') injectChatRoomHtml();
    setupChatRoom();
    if (typeof setupAirDropPanelBtn === 'function') setupAirDropPanelBtn();
    if (typeof injectChatSettingsHtml === 'function') injectChatSettingsHtml();
    if (typeof injectGroupSettingsHtml === 'function') injectGroupSettingsHtml();
    setupChatSettings();
    if (typeof setupChatArchiveSystem === 'function') setupChatArchiveSystem();
    setupApiSettingsApp();
    setupWallpaperApp();
    await setupStickerSystem();
    setupPresetFeatures();
    setupVoiceMessageSystem();
    setupPhotoVideoSystem();
    setupImageRecognition();
    setupWalletSystem();
    setupGiftSystem();
    setupTimeSkipSystem();
    setupGalleryManagement();
    try { setupCommunityModule(); } catch(e) { console.error("setupCommunityModule failed:", e); }
    
    // 错误处理包裹的模块初始化
    try { await setupWorldBookApp(); } catch(e) { console.error("setupWorldBookApp failed:", e); }
    try { setupGroupChatSystem(); } catch(e) { console.error("setupGroupChatSystem failed:", e); }
    try { setupCustomizeApp(); } catch(e) { console.error("setupCustomizeApp failed:", e); }
    try { setupTutorialApp(); } catch(e) { console.error("setupTutorialApp failed:", e); }
    
    try { checkForUpdates(); } catch(e) { console.error("checkForUpdates failed:", e); }
    try { setupPeekFeature(); } catch(e) { console.error("setupPeekFeature failed:", e); }
    try { setupMemoryJournalScreen(); } catch(e) { console.error("setupMemoryJournalScreen failed:", e); }
    try { setupDeleteHistoryChunk(); } catch(e) { console.error("setupDeleteHistoryChunk failed:", e); }
    try { setupStorageAnalysisScreen(); } catch(e) { console.error("setupStorageAnalysisScreen failed:", e); }
    try { setupCleanImageCache(); } catch(e) { console.error("setupCleanImageCache failed:", e); }
    try { setupInsWidgetAvatarModal(); } catch(e) { console.error("setupInsWidgetAvatarModal failed:", e); }
    try { setupHeartPhotoModal(); } catch(e) { console.error("setupHeartPhotoModal failed:", e); }
    try { setupMoreCardBgModal(); } catch(e) { console.error("setupMoreCardBgModal failed:", e); }
    if (typeof setupShopSystem === 'function') { try { setupShopSystem(); } catch(e) { console.error("setupShopSystem failed:", e); } }
    if (window.BatteryInteraction) { try { window.BatteryInteraction.init(); } catch(e) { console.error("BatteryInteraction failed:", e); } }
    if (typeof initMoreMenu === 'function') { try { initMoreMenu(); } catch(e) { console.error("initMoreMenu failed:", e); } }
    if (typeof setupPhoneScreen === 'function') { try { setupPhoneScreen(); } catch(e) { console.error("setupPhoneScreen failed:", e); } }
    if (typeof initCotSettings === 'function') { try { initCotSettings(); } catch(e) { console.error("initCotSettings failed:", e); } }
    if (window.VideoCallModule) { try { window.VideoCallModule.init(); } catch(e) { console.error("VideoCallModule failed:", e); } }
    if (typeof initDrawingWorkshop === 'function') { try { initDrawingWorkshop(); } catch(e) { console.error("initDrawingWorkshop failed:", e); } }

    // 全局事件绑定
    const delWBBtn = document.getElementById('delete-selected-world-books-btn');
    if(delWBBtn) delWBBtn.addEventListener('click', deleteSelectedWorldBooks);
    
    const cancelWBBtn = document.getElementById('cancel-wb-multi-select-btn');
    if(cancelWBBtn) cancelWBBtn.addEventListener('click', exitWorldBookMultiSelectMode);
    
    if(window.GitHubMgr) {
        window.GitHubMgr.init();
    }

    // 自动尝试拉取模型列表
    if (window.fetchAndPopulateModels && db.apiSettings && db.apiSettings.url && db.apiSettings.key) {
        // 稍微延迟一点，确保 API 设置 DOM 已加载
        setTimeout(() => {
            window.fetchAndPopulateModels(true);
        }, 1000);
    }

    // 检查并请求持久化存储 (抗系统清理)
    if (typeof checkAndRequestPersistence === 'function') {
        setTimeout(checkAndRequestPersistence, 2000); // 延迟一点，避免与初始化逻辑冲突
    }
};

async function checkBackupReminder() {
    if (!db.backupReminderSettings || !db.backupReminderSettings.enabled) return;

    const now = Date.now();
    const lastTime = db.backupReminderSettings.lastReminderTime || 0;
    const intervalDays = db.backupReminderSettings.interval || 3;
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    if (now - lastTime > intervalMs) {
        // 延迟一点弹出，避免刚进应用太突兀
        if (confirm(`【备份提醒】\n检测到您已有 ${intervalDays} 天未进行手动备份，是否立即下载备份文件以防数据丢失？`)) {
            if (window.triggerManualBackup) {
                await window.triggerManualBackup();
            }
        } else {
            // 用户点否，也更新时间，进入下一个周期
            db.backupReminderSettings.lastReminderTime = now;
            await saveData();
        }
    }
}

let autoReplyChecking = false;
async function checkAutoReply() {
 if(autoReplyChecking||isGenerating)return;autoReplyChecking=true;
 try{for(const char of db.characters){if(isGenerating)break;;if(SmartMessaging.state(char).enabled||SmartMessaging.busy(char)||!char.autoReply?.enabled)continue;const ar=char.autoReply,now=Date.now();
 const schedule=()=>{const min=Math.max(1,Number(ar.minInterval||ar.interval)||60),max=Math.max(min,Number(ar.maxInterval)||min);ar.nextAt=Date.now()+(min+Math.random()*(max-min))*60000;ar.retryAt=0;};
 if(!ar.nextAt){schedule();await saveData();continue;}if(now<Math.max(ar.nextAt,ar.retryAt||0))continue;
 const outcome=await getAiReply(char.id,'private',true,{timerOnly:true});if(['ok','metadata'].includes(outcome?.status)){ar.lastTriggerTime=Date.now();schedule();}else ar.retryAt=Date.now()+5*60000;await saveData();
 }}finally{autoReplyChecking=false;}
}

// === 主入口 ===
document.addEventListener('DOMContentLoaded', () => {
    Promise.resolve().then(()=>{initDatabase();return init();}).then(() => {
        window.uwuAppReady95 = true;
        window.dispatchEvent(new Event('uwu-db-ready'));
        setInterval(() => { void window.SmartMessaging.tick().catch(console.error); }, 5000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) void window.SmartMessaging.tick().catch(console.error);
        });
        if (window.KeepAliveManager) {
            window.KeepAliveManager.init(Boolean(db.apiSettings && db.apiSettings.keepAliveEnabled));
        }
    }).catch(error=>{
        console.error('初始化失败，未清空数据库',error);
        const panel=document.createElement('div');panel.style.cssText='position:fixed;inset:0;z-index:999999;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:28px;box-sizing:border-box;color:#465365';
        const box=document.createElement('div'),title=document.createElement('h3'),text=document.createElement('p'),retry=document.createElement('button'),rescue=document.createElement('button');title.textContent=window.UwUDataGuard90?.status().ready?'页面初始化未完成':'数据读取未完成';text.textContent='已保留数据库，没有用默认值覆盖。'+error.message;retry.textContent='重新打开重试';retry.onclick=()=>location.reload();rescue.textContent='导出已保存数据';rescue.onclick=async()=>{try{rescue.disabled=true;await window.UwUDataGuard90.exportPersisted();}catch(e){showToast('救援备份导出失败：'+e.message);}finally{rescue.disabled=false;}};box.append(title,text,retry,rescue);panel.append(box);document.body.append(panel);
    });
});
