// --- 隔空投送 (AirDrop) 生图逻辑 ---
async function receiveAirDropPhoto(messageId, isAuto = false) {
    const chat = (currentChatType === 'private') ? db.characters.find(c => c.id === currentChatId) : db.groups.find(g => g.id === currentChatId);
    if (!chat) return;

    // --- 冷却时间校验 ---
    const settings = db.workshopSettings || {};
    const rateLimit = settings.rateLimit !== undefined ? Number(settings.rateLimit) : 45;
    const lastGenTime = settings.lastGenerationTime || 0;
    const now = Date.now();
    
    if (now - lastGenTime < rateLimit * 1000) {
        const remaining = Math.ceil((rateLimit * 1000 - (now - lastGenTime)) / 1000);
        showToast(`生图冷却中，请等待 ${remaining} 秒`);
        return;
    }
    // -------------------

    const message = chat.history.find(m => m.id === messageId);
    if (!message || message.isWithdrawn) return;
    const source = airDropMessageKey115(chat, message.id);

    const charName = chat.remarkName || chat.name;

    // 1. 显示 AirDrop 弹窗
    const modal = document.getElementById('airdrop-modal');
    const subtitle = document.getElementById('airdrop-subtitle');
    const actions = document.getElementById('airdrop-actions');
    const loading = document.getElementById('airdrop-loading');
    const loadingText = document.getElementById('airdrop-loading-text');
    const errorDiv = document.getElementById('airdrop-error');
    const errorText = document.getElementById('airdrop-error-text');

    subtitle.textContent = `${charName} 想要共享1张照片`;
    document.getElementById('airdrop-result-area').style.display = 'none';
    actions.style.display = 'flex';
    loading.style.display = 'none';
    errorDiv.style.display = 'none';
    modal.classList.add('visible');

    // 绑定拒绝按钮
    const rejectBtn = document.getElementById('airdrop-reject-btn');
    rejectBtn.onclick = () => {
        modal.classList.remove('visible');
    };

    // 绑定关闭按钮 (错误时显示)
    const closeBtn = document.getElementById('airdrop-close-btn');
    closeBtn.onclick = () => {
        modal.classList.remove('visible');
    };

    // 绑定头部点击折叠/展开
    const header = document.getElementById('airdrop-header');
    const windowEl = document.getElementById('airdrop-window');
    header.onclick = () => {
        // 只有在接收中状态才允许折叠
        if (loading.style.display === 'block') {
            windowEl.classList.toggle('collapsed');
        }
    };

    // 绑定接受按钮
    const acceptBtn = document.getElementById('airdrop-accept-btn');
    acceptBtn.onclick = async () => {
        document.getElementById('airdrop-skip-expand97')?.remove();
        actions.style.display = 'none';
        loading.style.display = 'flex';
        errorDiv.style.display = 'none';
        
        // 自动折叠
        windowEl.classList.add('collapsed');

        try {
            // 阶段 1: LLM 扩写
            loadingText.textContent = '正在建立连接';
            const tags = await generateTagsFromDescription(chat, messageId);
            
            if (!tags || tags.trim() === '') {
                throw new Error("LLM 未返回有效的提示词，已取消生图");
            }
            
            // 阶段 2: NovelAI 生图
            loadingText.textContent = '正在接收中';
            const result = await generateImageFromTags(tags, chat, {source});
            const photo = await saveAirDropPhoto(chat.id, result.image, tags, {source});
            
            // 更新最后生图时间
            if (!db.workshopSettings) db.workshopSettings = {};
            db.workshopSettings.lastGenerationTime = Date.now();
            await saveData();
            
            // 检查是否还在当前聊天室
            if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                // 自动展开并显示结果
                windowEl.classList.remove('collapsed');
                loading.style.display = 'none';
                
                showAirDropPreview(photo, chat);
            } else {
                // 不在当前聊天室，隐藏 modal 并显示 Toast
                modal.classList.remove('visible');
                windowEl.classList.remove('collapsed');
                loading.style.display = 'none';
                showToast(`已收到 ${charName} 的隔空投送照片，已存入TA相册`);
            }

        } catch (error) {
            console.error("AirDrop Error:", error);
            windowEl.classList.remove('collapsed');
            loading.style.display = 'none';
            
            // 检查是否还在当前聊天室
            if (currentChatId === chat.id && document.getElementById('chat-room-screen').classList.contains('active')) {
                errorDiv.style.display = 'block';
                errorText.textContent = `接收失败: ${error.message}`;
                if (/扩写|未配置聊天 API/.test(error.message || '')) {
                    const skip = document.createElement('button');
                    skip.id = 'airdrop-skip-expand97';
                    skip.className = 'btn';
                    skip.textContent = '关闭扩写，直接接收';
                    skip.onclick = async () => {
                        skip.disabled = true;
                        try {
                            db.workshopSettings ??= {};
                            db.workshopSettings.expandEnabled97 = false;
                            await saveData();
                            for (const id of ['expand-enabled97', 'expand-gpt-enabled97']) {
                                const input = document.getElementById(id);
                                if (input) input.checked = false;
                            }
                            await acceptBtn.onclick();
                        } catch (e) { showToast(e.message); }
                        finally { skip.disabled = false; }
                    };
                    errorDiv.append(skip);
                }
            } else {
                // 不在当前聊天室，隐藏 modal 并显示 Toast 报错
                modal.classList.remove('visible');
                showToast(`隔空投送失败: ${error.message}`);
            }
        }
    };

    // 如果是自动触发，直接调用接受按钮的点击事件
    if (isAuto) {
        acceptBtn.onclick();
    }
}

function airdropDescription115(message) {
    return String(message?.content || '').replace(/^\[.*?[：:]/, '').replace(/\]$/, '').slice(0, 8000);
}

function airdropImageSettings115(chat, description) {
    const settings = {...db.workshopSettings, _faceChat97: chat.id, _airdrop115: true, _airdropDescription115: description};
    if ((settings.provider || 'novelai') === 'novelai' && chat.exclusiveWorkshopPromptPreset) {
        const preset = (db.workshopPromptPresets || []).find(item => item.id === chat.exclusiveWorkshopPromptPreset);
        if (preset) Object.assign(settings, {
            positivePrompt: preset.positive || '', characterPrompt: preset.character || '', negativePrompt: preset.negative || ''
        });
    }
    return settings;
}

function airdropShotInstruction115(settings, message) {
    const lines = [
        '本次实际要扩写的画面描述：' + JSON.stringify(airdropDescription115(message)),
        '从这条描述与上下文确认拍摄者和镜头位置。若是拍摄者眼前所见，镜头在拍摄者的眼睛或手持设备位置，画面可以只出现物品或环境。若是本人自拍，镜头在本人手持的相机或手机前摄位置，可见本人的脸或手臂。不得将这两种镜头改写成旁人替拍的外部机位。第一人称对白本身不表示镜头使用第一视角。'
    ];
    const provider = settings.provider || 'novelai';
    const tags = activeImageTags115(settings, provider);
    if (tags.length) {
        lines.push('先确定成像方式及镜头归属：'+JSON.stringify(imageScenes115));
        lines.push('聊天里角色自发分享的照片，留意第三人称可能只是文案写法。若路上没有其他人、地上只有拍照者自己的影子，且画面边缘仅露出其手、衣角或所提的包，应按角色手持后摄的第一视角扩写。把人物局部写成从镜头近处画面边缘伸入，影子从镜头本人脚下向前方延伸，不要写成有人站在镜头左侧。若明确有人代拍、自拍或直接截屏，按对应成像方式处理。');
        const inferred = sceneFromDescription115(airdropDescription115(message));
        if (inferred) lines.push('原描述中的构图线索指向 '+inferred+'。没有明确指定的其他机位时，沿用它。');
        lines.push('可选标签：'+JSON.stringify(tags.map(tag => ({
            id:tag.id, name:tag.name, scene:imageTagScene115(tag), useWhen:tag.useWhen115||''
        }))));
        const fixed = tags.find(tag => tag.id === (provider==='gpt' ? settings.airdropDefaultGptTag115 : settings.airdropDefaultNovelTag115));
        if (fixed) lines.push('本次固定应用标签 '+JSON.stringify(fixed.name)+'，按它的适用画面与选用条件构图。');
        lines.push('明确指定的标签优先；否则按拍摄方式挑一个机位标签。手部、人像属于画面内容，可同时选适用的内容标签。只有手、衣角、影子时不选人像。仅有“我”或“发张照片”不能推出镜头类型。软件直接截屏与相机拍屏幕是两种画面。用途不明可不选。');
        lines.push('画面描述仍放在 <image> 内。另在 </image> 后输出 <image_style>机位ID,内容ID</image_style>，使用列表里的原样ID，可只输出一个；无匹配时省略。');
    } else {
        lines.push('只交付与上方输出格式相符的最终画面描述。');
    }
    return lines.join('\n');
}

async function generateTagsFromDescription(chat, messageId) {
    if (db.workshopSettings?.expandEnabled97 === false) {
        const message = chat.history.find(item => item.id === messageId);
        if (!message) throw Error('找不到图片描述');
        const description = airdropDescription115(message);
        return resolveImageTags115(description,imagePromptRules115(airdropImageSettings115(chat,description))).saved;
    }
    const apiConfig = resolveWorkshopLlmApiConfig();

    let {url, key, model, provider} = apiConfig;
    if(/^(gpt-image|dall-e|nai-diffusion)/i.test(model||''))throw Error('扩写当前选中了图片模型，请关闭「启用提示词扩写」，或为扩写选择文字模型');
    if (!url || !key || !model) {
        throw new Error("未配置聊天 API，无法进行提示词扩写");
    }
    if (url.endsWith('/')) url = url.slice(0, -1);

    // 1. 截取上下文 (当前消息及之前的 29 条)
    const targetIndex = chat.history.findIndex(m => m.id === messageId);
    if (targetIndex === -1) throw new Error("未找到触发消息");
    
    const startIndex = Math.max(0, targetIndex - 29);
    let historySlice = chat.history.slice(startIndex, targetIndex + 1);
    
    // 过滤掉不应进入上下文的消息
    historySlice = historySlice.filter(m => !m.isContextDisabled && !m.isThinking);

    // 2. 格式化上下文文本
    let contextText = "";
    let lastMsgTimeForAI = 0;
    
    historySlice.forEach(msg => {
        const currentMsgTime = msg.timestamp;
        const timeDiff = currentMsgTime - lastMsgTimeForAI;
        const isSameDay = new Date(currentMsgTime).toDateString() === new Date(lastMsgTimeForAI).toDateString();
        
        if (lastMsgTimeForAI === 0 || timeDiff > 20 * 60 * 1000 || !isSameDay) {
            const dateObj = new Date(currentMsgTime);
            const timeStr = `${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
            contextText += `[${timeStr}]\n`;
        }
        lastMsgTimeForAI = currentMsgTime;

        let senderName = msg.role === 'user' ? chat.myName : chat.realName;
        if (chat.type === 'group' && msg.senderId) {
            if (msg.senderId === 'user_me') {
                senderName = chat.me.nickname;
            } else {
                const sender = chat.members.find(m => m.id === msg.senderId);
                if (sender) senderName = sender.realName || sender.groupNickname;
            }
        }

        let content = msg.content;
        if (msg.parts && msg.parts.length > 0) {
            content = msg.parts.map(p => p.text || '[图片]').join('');
        }
        
        // 简单清理系统标签
        content = content.replace(/^\[system:.*?\]\s*/, '').replace(/^\(时间:.*?\)\s*/, '');
        
        contextText += `${senderName}: ${content}\n`;
    });

    // 3. 确定当前主要角色
    let currentMainCharacter = chat.realName; // 默认
    const targetMessage = chat.history.find(m => m.id === messageId);
    if (targetMessage) {
        if (targetMessage.role === 'user') {
            currentMainCharacter = chat.myName;
            if (chat.type === 'group' && targetMessage.senderId === 'user_me') {
                currentMainCharacter = chat.me.nickname;
            }
        } else {
            if (chat.type === 'group' && targetMessage.senderId) {
                const sender = chat.members.find(m => m.id === targetMessage.senderId);
                if (sender) currentMainCharacter = sender.realName || sender.groupNickname;
            }
        }
    }

    // 4. 构建 Messages
    let messages = [];
    
    // 根据生图 provider 选择预设组
    let presetGroups = [];
    let activeGroupId = null;
    const imageProvider = db.workshopSettings?.provider || 'novelai';
    
    if (imageProvider === 'gpt') {
        presetGroups = db.workshopSettings?.gptLlmPresetGroups || [];
        activeGroupId = db.workshopSettings?.activeGptLlmPresetGroupId;
    } else {
        presetGroups = db.workshopSettings?.llmPresetGroups || [];
        activeGroupId = db.workshopSettings?.activeLlmPresetGroupId;
    }
    
    if (presetGroups.length > 0 && activeGroupId) {
        const activeGroup = presetGroups.find(g => g.id === activeGroupId);
        if (activeGroup && activeGroup.prompts) {
            // 准备标签列表字符串 (仅 GPT 模式可能用到)
            let tagsListStr = '';
            tagsListStr = activeImageTags115(db.workshopSettings,imageProvider).map(t => t.name).join(', ');

            activeGroup.prompts.filter(p => p.enabled).forEach(p => {
                let content = p.content;
                content = content.replace(/\{\{context\}\}/g, contextText);
                content = content.replace(/\{\{角色设定\}\}/g, chat.persona || '无');
                content = content.replace(/\{\{当前主要角色\}\}/g, currentMainCharacter);
                content = content.replace(/\{\{角色真名\}\}/g, chat.realName);
                
                // 替换标签列表
                if (content.includes('{{标签列表}}')) {
                    content = content.replace(/\{\{标签列表\}\}/g, tagsListStr || '无可用标签');
                }
                
                // 合并相邻的同 role 条目
                if (messages.length > 0 && messages[messages.length - 1].role === p.role) {
                    messages[messages.length - 1].content += '\n\n' + content;
                } else {
                    messages.push({ role: p.role, content: content });
                }
            });
        }
    }
    
    // 兜底：如果没有配置预设，使用默认的
    if (messages.length === 0) {
        messages = [
            {role: 'system', content: '你是一个专业的AI绘画提示词（Prompt）生成专家，精通 Danbooru 标签语法。\n你的任务是将用户输入的【画面描述】翻译并扩写为高质量的英文提示词标签，用于 NovelAI 图像生成。\n\n【扩写与输出规则】\n1. 格式限制：仅输出英文标签，全部小写，用英文逗号和空格分隔。绝对不要输出任何中文、解释性文字、前言后语或多余的标点。\n2. 结构顺序：按照“主体特征, 服装, 动作/姿势, 表情, 背景环境, 光影/视角”的顺序排列。\n3. 细节脑补：如果用户的描述较简略，请根据语境合理脑补细节（例如：补充 cinematic lighting, detailed background, depth of field 等增强画质的词汇）。\n4. 视角与构图：根据描述自动推断合适的构图词（如 selfie, cowboy shot, looking at viewer, from above 等）。\n5. 风格词：自动在末尾加上 masterpiece, best quality, highly detailed, ultra-detailed。'},
            {role: 'user', content: `<参考资料>\n${contextText}\n</参考资料>\n请根据参考资料中最后一条消息的画面描述，结合前文语境，生成英文提示词标签。直接输出转换后的英文标签。`}
        ];
    }

    const instruction = airdropShotInstruction115(db.workshopSettings || {}, targetMessage);
    const description = airdropDescription115(targetMessage);
    if (messages.at(-1)?.role === 'user') messages.at(-1).content += '\n\n' + instruction;
    else messages.push({role: 'user', content: instruction});
    const {endpoint, headers, requestBody} = buildChatApiRequest(apiConfig, messages, {
        temperature: apiConfig.temperatureEnabled !== false && Number.isFinite(Number(apiConfig.temperature))
            ? Number(apiConfig.temperature) : 0.7
    });
    if (provider !== 'gemini') requestBody.stream = false;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    }).catch(error=>{throw UwUApiErrors96.network(error,'提示词扩写',apiConfig);});

    if (!response.ok) {
        throw await UwUApiErrors96.failure(response,"提示词扩写",apiConfig);
    }

    const data = await response.json();
    let text = "";
    if (provider === 'gemini') {
        text = (data.candidates?.[0]?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join("");
    } else {
        text = data.choices[0].message.content;
    }
    
    const rules = imagePromptRules115(airdropImageSettings115(chat,description), imageProvider);
    text = resolveImageTags115(text, rules).saved;
    return text;
}

async function generateImageFromTags(tags, chat, {source} = {}) {
    if (!db.workshopSettings || !window.executeImageGeneration) throw Error('请先配置绘图工坊 API');
    const message = source && chat.history?.find(item => airDropMessageKey115(chat, item.id) === source);
    const settings = airdropImageSettings115(chat, airdropDescription115(message));
    const {imageData} = await window.executeImageGeneration(settings, tags);
    return {image:imageData};
}

const airDropSourceIndex115 = '[charId+airdropMessage115+airdropShown115]';
function airDropMessageKey115(chat, messageId) {
    return JSON.stringify([(db.groups || []).includes(chat) ? 'group' : 'private', String(messageId)]);
}
function airDropVariants115(charId, source) {
    return dexieDB.characterPhotos.where(airDropSourceIndex115).between([charId, source, 0], [charId, source, 1], true, true);
}
function airDropImageSource115(photo) {
    const image = photo?.image;
    if (typeof image !== 'string' || !image) return '';
    if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i.test(image) || /^https?:\/\//i.test(image)) return image;
    if (/^[a-z0-9+/]/i.test(image) && !image.includes(':')) return 'data:image/png;base64,' + image;
    return '';
}

async function saveAirDropPhoto(charId, image, prompt = '', {source} = {}) {
    if (!dexieDB) throw Error('相册数据库未就绪');
    const photos = dexieDB.characterPhotos;
    const photo = await dexieDB.transaction('rw', photos, async () => {
        const entry = {charId, timestamp:Date.now(), image, prompt};
        if (source) {
            entry.airdropMessage115 = source;
            entry.airdropShown115 = await airDropVariants115(charId, source).count() ? 0 : 1;
        }
        entry.id = await photos.add(entry);
        return entry;
    });
    refreshAirDropCard115(charId, photo.airdropMessage115);
    return photo;
}

async function chooseAirDropPhoto115(photo) {
    const table = dexieDB.characterPhotos;
    await dexieDB.transaction('rw', table, async () => {
        const current = await table.get(photo.id);
        if (!current || current.charId !== photo.charId || current.airdropMessage115 !== photo.airdropMessage115) {
            throw Error('这张照片已不在隔空投送记录里');
        }
        await table.where(airDropSourceIndex115).equals([photo.charId, photo.airdropMessage115, 1]).modify({airdropShown115:0});
        await table.update(photo.id, {airdropShown115:1});
    });
    photo.airdropShown115 = 1;
    refreshAirDropCard115(photo.charId, photo.airdropMessage115);
}

const airDropCardLoads115 = new WeakMap();
async function bindAirDropCard115(card, charId, source) {
    if (!dexieDB) return;
    const load = {};
    airDropCardLoads115.set(card, load);
    card.dataset.airdropSource = source;
    const photo = await dexieDB.characterPhotos.where(airDropSourceIndex115).equals([charId, source, 1]).first();
    if (airDropCardLoads115.get(card) !== load) return;
    const src = airDropImageSource115(photo);
    const hasVariants = Boolean(photo || await airDropVariants115(charId, source).count());
    if (airDropCardLoads115.get(card) !== load) return;
    card.dataset.airdropHasVariants = String(hasVariants);
    card.dataset.airdropHasSelection = String(Boolean(src));

    const showPhoto = Boolean(src && !isDebugMode);
    card.classList.toggle('pv-card', !showPhoto);
    card.classList.toggle('image-bubble', showPhoto);
    card.classList.toggle('airdrop-chat-photo115', showPhoto);
    let image = card.querySelector(':scope > .airdrop-chat-image115');
    if (!showPhoto) {
        image?.remove();
        return;
    }
    if (!image) {
        image = document.createElement('img');
        image.className = 'airdrop-chat-image115';
        image.alt = '隔空投送照片';
        image.draggable = false;
        card.insertBefore(image, card.querySelector(':scope > .message-time'));
    }
    if (image.getAttribute('src') !== src) image.src = src;
}

function refreshAirDropCard115(charId, source) {
    if (!source || currentChatId !== charId || !source.startsWith(JSON.stringify([currentChatType]).slice(0, -1) + ',')) return;
    for (const card of document.querySelectorAll('#message-area [data-airdrop-source]')) {
        if (card.dataset.airdropSource === source) void bindAirDropCard115(card, charId, source).catch(console.error);
    }
}

// 统一的 AirDrop 预览窗口逻辑
let activeAirDropPreview115;
function showAirDropPreview(photoItem, chat) {
    activeAirDropPreview115 = photoItem;
    const modal = document.getElementById('airdrop-modal');
    const subtitle = document.getElementById('airdrop-subtitle');
    const actions = document.getElementById('airdrop-actions');
    const loading = document.getElementById('airdrop-loading');
    const errorDiv = document.getElementById('airdrop-error');
    const resultArea = document.getElementById('airdrop-result-area');
    const previewImg = document.getElementById('airdrop-preview-img');
    const windowEl = document.getElementById('airdrop-window');

    const charName = chat.remarkName || chat.name;
    subtitle.textContent = `${charName} 的隔空投送记录`;
    
    actions.style.display = 'none';
    loading.style.display = 'none';
    errorDiv.style.display = 'none';
    windowEl.classList.remove('collapsed');
    
    const src = airDropImageSource115(photoItem);
    previewImg.src = src;
    resultArea.style.display = 'flex';
    modal.classList.add('visible');

    const choose = document.getElementById('airdrop-use-in-chat115');
    choose.hidden = !photoItem.airdropMessage115;
    choose.disabled = photoItem.airdropShown115 === 1;
    choose.textContent = choose.disabled ? '聊天中正在显示' : '显示在聊天中';
    choose.onclick = async () => {
        choose.disabled = true;
        try {
            await chooseAirDropPhoto115(photoItem);
            if (activeAirDropPreview115 === photoItem) choose.textContent = '聊天中正在显示';
        } catch (error) {
            if (activeAirDropPreview115 === photoItem) choose.disabled = false;
            showToast(error.message);
        }
    };

    // 绑定预览图点击事件，打开全屏查看器
    const previewContainer = document.getElementById('airdrop-preview-container');
    previewContainer.onclick = () => {
        const fullModal = document.getElementById('full-image-modal');
        const fullImg = document.getElementById('full-image-view');
        fullImg.src = src;
        fullModal.classList.add('visible');
        
        const fullModalCloseBtn = document.getElementById('close-full-image-btn');
        if (fullModalCloseBtn) {
            fullModalCloseBtn.onclick = () => {
                fullModal.classList.remove('visible');
            };
        }
    };

    // 绑定保存按钮
    const saveBtn = document.getElementById('airdrop-save-btn');
    saveBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = src;
        a.download = `airdrop_${photoItem.timestamp}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('已保存到本地');
    };

    // 绑定重新生成按钮
    const regenerateBtn = document.getElementById('airdrop-regenerate-btn');
    regenerateBtn.onclick = async () => {
        resultArea.style.display = 'none';
        loading.style.display = 'flex';
        windowEl.classList.add('collapsed');
        const loadingText = document.getElementById('airdrop-loading-text');
        
        try {
            loadingText.textContent = '正在重新生成';
            const currentPrompt = photoItem.prompt || '';
            if (!currentPrompt) throw new Error("缺少提示词，无法重新生成");
            
            const source = photoItem.airdropMessage115;
            const result = await generateImageFromTags(currentPrompt, chat, {source});
            const photo = await saveAirDropPhoto(chat.id, result.image, currentPrompt, {source});
            if (activeAirDropPreview115 === photoItem && modal.classList.contains('visible')) showAirDropPreview(photo, chat);
        } catch (error) {
            console.error("Regenerate Error:", error);
            windowEl.classList.remove('collapsed');
            loading.style.display = 'none';
            errorDiv.style.display = 'block';
            document.getElementById('airdrop-error-text').textContent = `生成失败: ${error.message}`;
        }
    };

    // 绑定详情按钮
    const detailsBtn = document.getElementById('airdrop-details-btn');
    detailsBtn.onclick = () => {
        const detailsModal = document.getElementById('airdrop-details-modal');
        const textarea = document.getElementById('airdrop-prompt-textarea');
        textarea.value = photoItem.prompt || '';
        detailsModal.classList.add('visible');

        document.getElementById('airdrop-prompt-close-btn').onclick = () => {
            detailsModal.classList.remove('visible');
        };

        document.getElementById('airdrop-prompt-save-btn').onclick = async () => {
            const newPrompt = textarea.value.trim();
            photoItem.prompt = newPrompt;
            await dexieDB.characterPhotos.update(photoItem.id, {prompt:newPrompt});
            detailsModal.classList.remove('visible');
            showToast('提示词已保存');
        };
    };

    // 绑定相册按钮
    const galleryBtn = document.getElementById('airdrop-gallery-btn');
    galleryBtn.onclick = () => {
        modal.classList.remove('visible');
        resultArea.style.display = 'none';
        openAirDropHistory(chat.id);
    };

    // 绑定结果关闭按钮
    const resultCloseBtn = document.getElementById('airdrop-result-close-btn');
    resultCloseBtn.onclick = () => {
        modal.classList.remove('visible');
        resultArea.style.display = 'none';
    };
}

async function openAirDropHistory(charId, source) {
    const modal = document.getElementById('airdrop-history-modal');
    const grid = document.getElementById('airdrop-history-grid');
    const closeBtn = document.getElementById('airdrop-history-close-btn');
    const title = modal.querySelector('h3');
    if (title) title.textContent = source ? '这条消息的照片' : 'TA的私密相册';

    closeBtn.onclick = () => modal.classList.remove('visible');

    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #999;">加载中...</div>';
    modal.classList.add('visible');

    if (!dexieDB) return;

    try {
        const photos = await (source ? airDropVariants115(charId, source) : dexieDB.characterPhotos.where('charId').equals(charId)).reverse().sortBy('timestamp');
        
        grid.innerHTML = '';
        if (photos.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #999;">相册空空如也</div>';
            return;
        }

        photos.forEach(photo => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.aspectRatio = '1';
            wrapper.style.borderRadius = '8px';
            wrapper.style.overflow = 'hidden';
            wrapper.style.backgroundColor = '#eee';

            const src = airDropImageSource115(photo);
            
            const img = document.createElement('div');
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.backgroundImage = `url(${src})`;
            img.style.backgroundSize = 'cover';
            img.style.backgroundPosition = 'center';
            img.style.cursor = 'pointer';
            img.onclick = () => {
                modal.classList.remove('visible');
                const isGroup = photo.airdropMessage115?.startsWith('["group",') ?? (currentChatType === 'group');
                const chat = (isGroup ? db.groups : db.characters).find(c => c.id === charId);
                if (chat) {
                    showAirDropPreview(photo, chat);
                }
            };

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '4px';
            delBtn.style.right = '4px';
            delBtn.style.background = 'rgba(0,0,0,0.5)';
            delBtn.style.border = 'none';
            delBtn.style.borderRadius = '50%';
            delBtn.style.width = '24px';
            delBtn.style.height = '24px';
            delBtn.style.display = 'flex';
            delBtn.style.alignItems = 'center';
            delBtn.style.justifyContent = 'center';
            delBtn.style.cursor = 'pointer';
            
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这张照片吗？')) {
                    await dexieDB.characterPhotos.delete(photo.id);
                    refreshAirDropCard115(charId, photo.airdropMessage115);
                    wrapper.remove();
                    if (grid.children.length === 0) {
                        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #999;">相册空空如也</div>';
                    }
                }
            };

            wrapper.appendChild(img);
            wrapper.appendChild(delBtn);
            grid.appendChild(wrapper);
        });

    } catch (error) {
        console.error("Load AirDrop History Error:", error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px; color: #ff4d4f;">加载失败</div>';
    }
}
