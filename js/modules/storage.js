// --- 存储分析与数据管理 (js/modules/storage.js) ---

const STORAGE_CATEGORIES = [
    { key: 'chats', name: '聊天记录', desc: '所有对话历史' },
    { key: 'contacts', name: '角色设定', desc: '联系人及角色卡片' },
    { key: 'worldbooks', name: '世界书', desc: '世界书条目数据' },
    { key: 'personas', name: '用户设定', desc: '用户人设数据' },
    { key: 'wallpapers', name: '壁纸与外观', desc: '自定义壁纸、主题、表情包' },
    { key: 'fonts', name: '字体', desc: '自定义字体文件' },
    { key: 'settings', name: '基础设置', desc: 'API配置、UI偏好、阅读器书架及段评' },
    { key: 'other', name: '阅读与生图数据', desc: '书籍正文、段评、相册及工坊生图等' }
];

let currentStorageSizes = {};
let selectedModules = {
    chats: true,
    contacts: true,
    worldbooks: true,
    personas: true,
    wallpapers: true,
    fonts: true,
    settings: true
};

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function calculateStorageSize(options = {}) {
    let sizes = {
        chats: 0,
        contacts: 0,
        worldbooks: 0,
        personas: 0,
        wallpapers: 0,
        fonts: 0,
        settings: 0,
        other: 0,
        total: 0
    };

    if (!db || !db.characters) await loadData();

    const compact=window.UwUStorageSize.counter();
    const measure=(value,category)=>compact.measureAsync(value,category,options);
    // 1. chats & contacts & other(gallery)
    for (const char of db.characters || []) {
        sizes.chats += await measure(char.history, 'chats');
        sizes.chats += await measure(char.callHistory, 'chats');
        sizes.other += await measure(char.gallery, 'other');for(const key of ['memoryJournals','journalAutomation','uwuVectorMemory','vectorMemory'])sizes.chats += await measure(char[key], 'chats');
        
        const charBase = { ...char, history: undefined, callHistory: undefined, archives: undefined, gallery: undefined, memoryJournals:undefined,journalAutomation:undefined,uwuVectorMemory:undefined,vectorMemory:undefined,_uwuBackupBridge:undefined };
        sizes.contacts += await measure(charBase, 'contacts');
    }
    for (const group of db.groups || []) {
        sizes.chats += await measure(group.history, 'chats');
        sizes.chats += await measure(group.callHistory, 'chats');
        for(const key of ['memoryJournals','journalAutomation','uwuVectorMemory','vectorMemory'])sizes.chats += await measure(group[key], 'chats');
        
        const groupBase = { ...group, history: undefined, callHistory: undefined, archives: undefined,memoryJournals:undefined,journalAutomation:undefined,uwuVectorMemory:undefined,vectorMemory:undefined,_uwuBackupBridge:undefined };
        sizes.contacts += await measure(groupBase, 'contacts');
    }

    // 2. worldbooks
    sizes.worldbooks += await measure(db.worldBooks, 'worldbooks');

    // 3. personas
    sizes.personas += await measure(db.myPersonaPresets, 'personas');
    sizes.personas += await measure(db.homeSignature, 'personas');
    sizes.personas += await measure(db.activePersonaId, 'personas');

    // 4. wallpapers
    sizes.wallpapers += await measure(db.wallpaper, 'wallpapers');
    sizes.wallpapers += await measure(db.bubbleCssPresets, 'wallpapers');
    sizes.wallpapers += await measure(db.globalCss, 'wallpapers');
    sizes.wallpapers += await measure(db.globalCssPresets, 'wallpapers');
    sizes.wallpapers += await measure(db.myStickers, 'wallpapers');
    sizes.wallpapers += await measure(db.moreProfileCardBg, 'wallpapers');
    sizes.wallpapers += await measure(db.themeSettings, 'wallpapers');
    sizes.wallpapers += await measure(db.themePresets, 'wallpapers');

    // 5. fonts
    sizes.fonts += await measure(db.fontUrl, 'fonts');
    sizes.fonts += await measure(db.fontPresets, 'fonts');

    // 6. settings
    const settingsKeys = [
        'uwuCalendar', 'uwuShortStories', 'uwuWritingStyles', 'uwuReaderRules', 'uwuReaderShelf', 'uwuBackupExtras', 'apiSettings', 'apiPresets', 'uwuEmbeddingPresets', 'cotSettings', 'cotPresets', 'homeScreenMode', 
        'customIcons', 'insWidgetSettings', 'homeWidgetSettings', 'chatFolders', 
        'fontSizeScale', 'savedKeyboardHeight', 'statusBarPresets', 'globalSendSound', 
        'globalReceiveSound', 'multiMsgSoundEnabled', 'soundPresets', 'galleryPresets', 
        'hasSeenVideoCallDisclaimer', 'hasSeenVideoCallAvatarHint', 'workshopSettings', 
        'uwuAssets96', 'workshopLlmPresets', 'workshopPromptPresets', 'homeLayoutOrder', 'homeLayoutPages', 'homeLayoutGrid', 
        'widgetTemplates', 'addedWidgets', 'backupReminderSettings', 'stUnlocked'
    ];
    for (const key of settingsKeys) {
        sizes.settings += await measure(db[key], 'settings');
    }

    // Current fields have already been counted above. The active archive
    // shares those fields; count its metadata and any distinct fields only.
    // Every inactive archive is still counted, including real branch histories.
    for (const chat of [...(db.characters || []), ...(db.groups || [])]) {
        const archives = Array.isArray(chat.archives) ? chat.archives.map(archive => {
            if (archive.id !== chat.activeArchiveId || !archive.data) return archive;
            const data = {};
            for (const key of Object.keys(archive.data)) {
                if (Object.prototype.hasOwnProperty.call(chat, key) && archive.data[key] === chat[key]) continue;
                Object.defineProperty(data, key, {value:archive.data[key], enumerable:true});
            }
            return {...archive, data};
        }) : chat.archives;
        sizes.chats += await measure(archives, 'chats');
        sizes.settings += await measure(chat._uwuBackupBridge, 'settings');
    }

    // 7. other (Dexie)
    try {
        if (dexieDB) {
            const workshopItems = await dexieDB.workshopHistory.toArray();
            for(const item of workshopItems)sizes.other += await measure(item, 'other');
            
            const vibeItems = await dexieDB.workshopVibeGroups.toArray();
            for(const item of vibeItems)sizes.other += await measure(item, 'other');
            
            const photoItems = await dexieDB.characterPhotos.toArray();
            for(const item of photoItems)sizes.other += await measure(item, 'other');
            
            if(window.UwUDataGuard90)for(const row of await window.UwUDataGuard90.readRecoveries())sizes.other+=await measure(row,'other');
            for(const table of [dexieDB.reader_books,dexieDB.reader_chapters,dexieDB.reader_comments])if(table){for(const item of await table.toArray())sizes.other+=await measure(item,'other');}
            
            if (dexieDB.customFonts) {
                const fonts = await dexieDB.customFonts.toArray();
                fonts.forEach(font => {
                    if (font.file && font.file.size) {
                        sizes.fonts += font.file.size;
                    }
                });
            }
        }
    } catch (e) {
        if(e.name==='AbortError')throw e;console.warn("Could not calculate dexie data size:", e);
    }

    sizes.total = Object.keys(sizes).reduce((sum, key) => key !== 'total' ? sum + sizes[key] : sum, 0);
    return sizes;
}

function renderStorageUI() {
    const totalEl = document.getElementById('storage-total-size');
    const barChart = document.getElementById('storage-bar-chart');
    const legendContainer = document.getElementById('storage-legend-container');
    const backupOptions = document.getElementById('storage-backup-options');

    if (!totalEl || !barChart || !legendContainer || !backupOptions) return;

    totalEl.textContent = Number.isFinite(currentStorageSizes.total)?formatBytes(currentStorageSizes.total):'分析中…';
    let explanation=document.getElementById('storage-size-explanation');if(!explanation){explanation=document.createElement('p');explanation.id='storage-size-explanation';explanation.style.cssText='font-size:12px;color:#999;line-height:1.6;margin:8px 0';totalEl.parentNode.appendChild(explanation);}explanation.textContent='数据量估算（当前聊天与当前存档的共享内容只计一次；独立存档和恢复记录保留计入）。不是设备内存占用或压缩备份大小。';

    // Render Bar Chart
    barChart.innerHTML = '';
    STORAGE_CATEGORIES.forEach(cat => {
        const size = currentStorageSizes[cat.key] || 0;
        if (size > 0 && currentStorageSizes.total > 0) {
            const percentage = (size / currentStorageSizes.total) * 100;
            const segment = document.createElement('div');
            segment.className = `storage-segment ${cat.key}`;
            segment.style.width = `${percentage}%`;
            barChart.appendChild(segment);
        }
    });

    // Render Legend
    legendContainer.innerHTML = '';
    STORAGE_CATEGORIES.forEach(cat => {
        const size = currentStorageSizes[cat.key] || 0;
        legendContainer.innerHTML += `
            <div class="storage-legend-item">
                <div class="storage-legend-color ${cat.key}"></div>
                <div class="storage-legend-info">
                    <span class="storage-legend-name">${cat.name}</span>
                    <span class="storage-legend-size">${formatBytes(size)}</span>
                </div>
            </div>
        `;
    });

    // Selections are based on the chosen file, independent of export choices.
    backupOptions.textContent='导出时选择需要保存的板块；导入时先识别文件内容，再选择要替换的板块。未选中的本机数据会保留。';
    const selectAll=document.getElementById('storage-select-all-btn');if(selectAll)selectAll.hidden=true;
}

function updateSelectAllBtn() {
    const btn = document.getElementById('storage-select-all-btn');
    if (!btn) return;
    const allSelected = Object.values(selectedModules).every(v => v);
    btn.textContent = allSelected ? '全不选' : '全选';
}

function setupStorageAnalysisScreen() {
    const screen = document.getElementById('storage-analysis-screen');
    if (!screen) return;

    // A screen can receive several class mutations during one navigation.
    // Run one analysis, cancel immediately on exit, and ignore late results.
    if(screen._uwuStorageObserver)return;
    let active=screen.classList.contains('active'),generation=0;
    const observer = new MutationObserver(() => {
        const entered=screen.classList.contains('active');
        if(entered===active)return;
        active=entered;const token=++generation;
        if(!entered)return;
        const total=document.getElementById('storage-total-size');if(total)total.textContent='读取中…';
        void (async()=>{
            try{
                const result=await calculateStorageSize({shouldContinue:()=>generation===token&&screen.classList.contains('active')});
                if(generation!==token||!screen.classList.contains('active'))return;
                currentStorageSizes=result;renderStorageUI();await updatePersistenceStatus();
            }catch(e){if(e.name!=='AbortError'){console.error('容量分析失败',e);if(generation===token&&total)total.textContent='无法读取';}}
        })();
    });
    screen._uwuStorageObserver=observer;
    observer.observe(screen, { attributes: true, attributeFilter: ['class'] });

    // Select All Button
    const selectAllBtn = document.getElementById('storage-select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const allSelected = Object.values(selectedModules).every(v => v);
            const newValue = !allSelected;
            Object.keys(selectedModules).forEach(k => selectedModules[k] = newValue);
            renderStorageUI();
        });
    }


    // Export Button
    const exportBtn = document.getElementById('storage-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    // Import Input
    const importInput = document.getElementById('storage-import-file');
    if (importInput) {
        importInput.addEventListener('change', handleImport);
    }

    async function updatePersistenceStatus() {
        if (navigator.storage && navigator.storage.persisted) {
            const isPersisted = await navigator.storage.persisted();
            let statusContainer = document.getElementById('storage-persistence-container');
            if (!statusContainer) return;
            
            statusContainer.innerHTML = `
                <div style="padding: 12px; background: #ffffff; border-radius: 10px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #abafb5; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: bold; font-size: 0.9rem; color: #495057;">持久化存储保护</div>
                        <div style="font-size: 0.8rem; color: ${isPersisted ? '#51cf66' : '#ff922b'}; display: flex; align-items: center; gap: 4px;">
                            ${isPersisted ? '已开启 (数据受保护)' : '未开启 (容易被清理)'}
                        </div>
                    </div>
                    ${!isPersisted ? '<button id="manual-persist-btn" class="storage-action-btn" style="width: auto; padding: 6px 12px; font-size: 0.85rem; background: #f8f9fa; border: 1px solid #ced4da; color: #495057;">立即开启</button>' : ''}
                </div>
            `;

            const btn = document.getElementById('manual-persist-btn');
            if (btn) {
                btn.onclick = async () => {
                    const persisted = await navigator.storage.persist();
                    if (persisted) {
                        showToast("已成功开启持久化存储！");
                        updatePersistenceStatus();
                    } else {
                        showToast("开启失败，可能是浏览器策略限制。");
                    }
                };
            }
        }
    }
}

// File-driven selections never reuse the export toggles for an import.
async function handleExport() {
    if(window.UwUSelectiveBackup91)return window.UwUSelectiveBackup91.exportFile();
    showToast('板块备份组件未加载，请重新打开后再试');
}
async function handleImport(event) {
    if(window.UwUSelectiveBackup91)return window.UwUSelectiveBackup91.importFile(event);
    showToast('板块备份组件未加载，未修改数据');event.target.value='';
}

// --- 持久化存储逻辑 ---
async function checkAndRequestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
            console.log("Storage is already persisted.");
            return;
        }

        const hasPrompted = localStorage.getItem('storage_persist_prompted');
        if (hasPrompted) return;

        showPersistencePrompt();
    }
}

function showPersistencePrompt() {
    if (document.getElementById('persistence-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'persistence-modal';
    modal.className = 'modal-overlay visible';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
        <div class="modal-window" style="max-width: 320px;">
            <h3 style="margin-bottom: 10px;">🛡️ 防止数据丢失</h3>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">
                为了避免聊天记录被浏览器自动清理，建议开启<strong>持久化存储</strong>保护。<br>
                <span style="font-size: 12px; color: #999; display: block; margin-top: 8px;">(开启后，浏览器将不会在空间不足时自动删除你的数据)</span>
            </p>
            <div style="display: flex; gap: 10px;">
                <button id="persist-allow-btn" class="btn btn-primary" style="flex: 1;">开启保护</button>
                <button id="persist-later-btn" class="btn btn-neutral" style="flex: 1;">稍后</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('persist-allow-btn').onclick = async () => {
        const persisted = await navigator.storage.persist();
        if (persisted) {
            showToast("已成功开启持久化存储！");
        } else {
            showToast("开启失败，可能是浏览器策略限制。");
        }
        localStorage.setItem('storage_persist_prompted', 'true');
        modal.remove();
    };

    document.getElementById('persist-later-btn').onclick = () => {
        localStorage.setItem('storage_persist_prompted', 'true');
        modal.remove();
    };
}

// --- 清理图片缓存逻辑 ---
function setupCleanImageCache() {
    const openBtn = document.getElementById('open-clean-cache-btn');
    const modal = document.getElementById('clean-image-cache-modal');
    const form = document.getElementById('clean-image-cache-form');
    const cancelBtn = document.getElementById('cancel-clean-btn');
    const confirmBtn = document.getElementById('confirm-clean-btn');
    const loadingDiv = document.getElementById('clean-cache-loading');
    
    // The modal might not be in DOM immediately if it's injected, but it's in index.html currently.
    if (!modal || !form) return;
    
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');

    let cacheSizes = {
        generated: 0,
        chat: 0,
        gallery: 0,
        stickers: 0
    };

    function isBase64Image(str) {
        if (typeof str !== 'string') return false;
        if (str.startsWith('data:image/')) return true;
        if (str.length > 1000 && !str.startsWith('http') && !str.includes(' ')) return true;
        return false;
    }

    function getStringSize(str) {
        return typeof str === 'string' ? str.length : 0;
    }

    async function calculateCacheSizes() {
        cacheSizes = { generated: 0, chat: 0, gallery: 0, stickers: 0 };

        if (dexieDB) {
            try {
                const workshopItems = await dexieDB.workshopHistory.toArray();
                workshopItems.forEach(item => {
                    if (isBase64Image(item.image)) cacheSizes.generated += getStringSize(item.image);
                });
                const photoItems = await dexieDB.characterPhotos.toArray();
                photoItems.forEach(item => {
                    if (isBase64Image(item.image)) cacheSizes.generated += getStringSize(item.image);
                });
                if (dexieDB.reader_comments) {
                    const comments = await dexieDB.reader_comments.toArray();
                    comments.forEach(item => {
                        if (item.content && item.content.startsWith('[ILLUSTRATION]')) {
                            cacheSizes.generated += getStringSize(item.content);
                        }
                    });
                }
            } catch (e) {
                console.error("Error calculating generated images size:", e);
            }
        }

        const processHistory = (history) => {
            if (!history) return;
            history.forEach(msg => {
                if (msg.media97 && !msg.media97.cleared) {
                    for (const item of msg.media97.items || []) {
                        cacheSizes.chat += getStringSize(item.src) + getStringSize(item.cover);
                        for (const frame of item.analysisFrames97 || []) cacheSizes.chat += getStringSize(frame.data);
                    }
                }
                if (msg.content) {
                    if (isBase64Image(msg.content)) {
                        cacheSizes.chat += getStringSize(msg.content);
                    } else {
                        const imgRegex = /!\[.*?\]\((data:image\/[^)]+)\)/g;
                        let match;
                        while ((match = imgRegex.exec(msg.content)) !== null) {
                            cacheSizes.chat += getStringSize(match[1]);
                        }
                        const htmlImgRegex = /<img[^>]+src=["'](data:image\/[^"']+)["']/g;
                        while ((match = htmlImgRegex.exec(msg.content)) !== null) {
                            cacheSizes.chat += getStringSize(match[1]);
                        }
                    }
                }
                if (msg.parts) {
                    msg.parts.forEach(part => {
                        if (part.type === 'image' && isBase64Image(part.data)) {
                            cacheSizes.chat += getStringSize(part.data);
                        }
                    });
                }
            });
        };
        (db.characters || []).forEach(char => processHistory(char.history));
        (db.groups || []).forEach(group => processHistory(group.history));

        (db.characters || []).forEach(char => {
            if (char.gallery) {
                char.gallery.forEach(item => {
                    if (isBase64Image(item.url)) cacheSizes.gallery += getStringSize(item.url);
                });
            }
        });

        (db.myStickers || []).forEach(sticker => {
            if (isBase64Image(sticker.url)) cacheSizes.stickers += getStringSize(sticker.url);
        });

        document.getElementById('size-generated-images').textContent = `(${formatBytes(cacheSizes.generated)})`;
        document.getElementById('size-chat-images').textContent = `(${formatBytes(cacheSizes.chat)})`;
        document.getElementById('size-gallery-images').textContent = `(${formatBytes(cacheSizes.gallery)})`;
        document.getElementById('size-sticker-images').textContent = `(${formatBytes(cacheSizes.stickers)})`;
    }

    // Use event delegation for the open button since it's injected dynamically
    document.addEventListener('click', async (e) => {
        if (e.target && (e.target.id === 'open-clean-cache-btn' || e.target.closest('#open-clean-cache-btn'))) {
            modal.classList.add('visible');
            form.style.display = 'none';
            loadingDiv.style.display = 'block';
            confirmBtn.disabled = true;
            checkboxes.forEach(cb => cb.checked = false);

            await calculateCacheSizes();

            loadingDiv.style.display = 'none';
            form.style.display = 'block';
        }
    });

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            modal.classList.remove('visible');
        };
    }

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const anyChecked = Array.from(checkboxes).some(c => c.checked);
            confirmBtn.disabled = !anyChecked;
        });
    });

    form.onsubmit = async (e) => {
        e.preventDefault();
        const selectedCategories = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        
        if (selectedCategories.length === 0) return;

        confirmBtn.disabled = true;
        confirmBtn.textContent = '清理中...';

        try {
            let dataChanged = false;

            if (selectedCategories.includes('generated') && dexieDB) {
                const workshopItems = await dexieDB.workshopHistory.toArray();
                const workshopIdsToDelete = workshopItems.filter(item => isBase64Image(item.image)).map(item => item.id);
                if (workshopIdsToDelete.length > 0) {
                    await dexieDB.workshopHistory.bulkDelete(workshopIdsToDelete);
                }

                const photoItems = await dexieDB.characterPhotos.toArray();
                const photoIdsToDelete = photoItems.filter(item => isBase64Image(item.image)).map(item => item.id);
                if (photoIdsToDelete.length > 0) {
                    await dexieDB.characterPhotos.bulkDelete(photoIdsToDelete);
                }

                if (dexieDB.reader_comments) {
                    const comments = await dexieDB.reader_comments.toArray();
                    const commentIdsToDelete = comments.filter(item => item.content && item.content.startsWith('[ILLUSTRATION]')).map(item => item.id);
                    if (commentIdsToDelete.length > 0) {
                        await dexieDB.reader_comments.bulkDelete(commentIdsToDelete);
                    }
                }
            }

            if (selectedCategories.includes('chat')) {
                const cleanHistory = (history) => {
                    if (!history) return;
                    history.forEach(msg => {
                        if (msg.media97 && !msg.media97.cleared) {
                            UwUMedia97.clearPayload97(msg);
                            dataChanged = true;
                            return;
                        }
                        if (msg.content) {
                            if (isBase64Image(msg.content)) {
                                msg.content = '[图片已清理]';
                                dataChanged = true;
                            } else {
                                let originalContent = msg.content;
                                msg.content = msg.content.replace(/!\[.*?\]\((data:image\/[^)]+)\)/g, '[图片已清理]');
                                msg.content = msg.content.replace(/<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/g, '[图片已清理]');
                                if (originalContent !== msg.content) dataChanged = true;
                            }
                        }
                        if (msg.parts) {
                            msg.parts.forEach(part => {
                                if (part.type === 'image' && isBase64Image(part.data)) {
                                    part.data = '';
                                    part.type = 'text';
                                    part.text = '[图片已清理]';
                                    dataChanged = true;
                                }
                            });
                        }
                    });
                };
                (db.characters || []).forEach(char => cleanHistory(char.history));
                (db.groups || []).forEach(group => cleanHistory(group.history));
            }

            if (selectedCategories.includes('gallery')) {
                (db.characters || []).forEach(char => {
                    if (char.gallery) {
                        const originalLength = char.gallery.length;
                        char.gallery = char.gallery.filter(item => !isBase64Image(item.url));
                        if (originalLength !== char.gallery.length) dataChanged = true;
                    }
                });
            }

            if (selectedCategories.includes('stickers')) {
                const originalLength = db.myStickers.length;
                db.myStickers = db.myStickers.filter(sticker => !isBase64Image(sticker.url));
                if (originalLength !== db.myStickers.length) dataChanged = true;
            }

            if (dataChanged) {
                await saveData();
            }

            showToast('清理完成！');
            modal.classList.remove('visible');
            
            const screen = document.getElementById('storage-analysis-screen');
            if (screen && screen.classList.contains('active')) {
                currentStorageSizes = await calculateStorageSize();
                renderStorageUI();
            }

        } catch (error) {
            console.error("Error cleaning cache:", error);
            showToast('清理过程中发生错误');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = '确认清理';
        }
    };
}

window.checkAndRequestPersistence = checkAndRequestPersistence;
window.setupStorageAnalysisScreen = setupStorageAnalysisScreen;
window.setupCleanImageCache = setupCleanImageCache;
