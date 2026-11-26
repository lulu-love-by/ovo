// --- 设置绑定与持久化 ---
async function initWorkshopSettings() {
    if (!db.workshopSettings) return;

    const settings = db.workshopSettings;
    
    const officialUrls = {
        novelai: 'https://image.novelai.net/ai/generate-image-stream',
        gpt: 'https://api.openai.com/v1/images/generations'
    };
    settings.apiPresets ??= {};
    settings.activeApiPresetId ??= {};
    for (const [provider, url] of Object.entries(officialUrls)) {
        const protocol = provider === 'novelai' ? 'novelai' : 'openai';
        const presets = settings.apiPresets[provider] ??= [];
        let official = presets.find(preset => preset.id === 'official');
        if (!official) {
            official = {id: 'official', name: '官方默认', url, key: '', protocol, responseFormat: 'auto'};
            presets.unshift(official);
        }
        if (!settings.apiPresetsMigrated115) {
            const legacyUrl = settings[provider + 'ApiUrl'];
            const legacyKey = settings[provider + 'ApiKey'];
            let active = presets.find(preset => preset.id === settings.activeApiPresetId[provider]);
            if (!active && legacyUrl && legacyUrl !== url) {
                active = presets.find(preset => preset.url === legacyUrl);
                if (!active) {
                    active = {id: 'preset_' + crypto.randomUUID(), name: '自定义节点', url: legacyUrl, key: legacyKey || ''};
                    presets.push(active);
                }
            }
            active ??= official;
            if (!active.key && legacyKey && (legacyUrl ? legacyUrl === active.url : active === official)) active.key = legacyKey;
            settings.activeApiPresetId[provider] = active.id;
        }
        if (!presets.some(preset => preset.id === settings.activeApiPresetId[provider])) settings.activeApiPresetId[provider] = official.id;
        for (const preset of presets) {
            preset.protocol ||= protocol;
            preset.responseFormat ||= 'auto';
            preset.model ??= settings[provider + 'Model'] || '';
        }
    }
    settings.apiPresetsMigrated115 = true;

    // 辅助函数：绑定输入框
    const bindInput = (id, key, isNumber = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (settings[key] !== undefined) {
            el.value = settings[key];
        }
        // 使用 input 事件实现实时保存，避免失去焦点才保存的问题
        el.addEventListener('input', async (e) => {
            if (!e.isTrusted) return; // 防止程序触发的事件导致死循环
            settings[key] = isNumber ? Number(e.target.value) : e.target.value;
            await saveData();
        });
        // 保留 change 事件以兼容某些特殊情况或程序触发的更新
        el.addEventListener('change', async (e) => {
            settings[key] = isNumber ? Number(e.target.value) : e.target.value;
            await saveData();
        });
    };

    // 辅助函数：绑定开关
    const bindSwitch = (id, key) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (settings[key] !== undefined) {
            el.checked = settings[key];
        }
        el.addEventListener('change', async (e) => {
            if (!e.isTrusted) return; // 防止程序触发的 change 事件导致死循环
            settings[key] = e.target.checked;
            await saveData();
        });
    };

    // 辅助函数：绑定单选框组
    const bindRadioGroup = (name, key, onChangeCallback = null) => {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        radios.forEach(radio => {
            if (radio.value === settings[key]) {
                radio.checked = true;
            }
            radio.addEventListener('change', async (e) => {
                if (!e.isTrusted) return; // 防止程序触发的 change 事件导致死循环
                if (e.target.checked) {
                    settings[key] = e.target.value;
                    await saveData();
                    if (onChangeCallback) {
                        onChangeCallback(e.target.value);
                    }
                }
            });
        });
    };

    // 绑定基础设置
    const savedProvider = document.querySelector(`input[name="workshop-provider"][value="${settings.provider === 'gpt' ? 'gpt' : 'novelai'}"]`);
    if (savedProvider) savedProvider.checked = true;
    
    // 初始化 API 预设逻辑
    initApiPresets();
    
    // 绑定尺寸与基础
    bindRadioGroup('workshop-aspect-ratio', 'aspectRatio');
    bindInput('workshop-rate-limit', 'rateLimit', true);
    
    // GPT 专属绑定
    bindRadioGroup('workshop-gpt-aspect-ratio', 'gptAspectRatio');
    bindInput('workshop-gpt-quality', 'gptQuality');
    bindInput('workshop-gpt-style', 'gptStyle');
    bindInput('workshop-gpt-test-prompt', 'gptTestPrompt');
    
    // 初始化 GPT 标签系统
    initGPTTagsSystem();
    
    // 绑定提示词
    bindInput('workshop-positive-prompt', 'positivePrompt');
    bindInput('workshop-character-prompt', 'characterPrompt');
    bindInput('workshop-negative-prompt', 'negativePrompt');
    
    // 绑定提示词预设逻辑
    initPromptPresets();
    
    // 绑定 LLM 设置 (NovelAI)
    bindSwitch('workshop-llm-independent-api', 'llmIndependentApi');
    bindInput('workshop-llm-api-preset', 'llmApiPresetId');
    
    // 绑定 LLM 设置 (GPT)
    bindSwitch('workshop-gpt-llm-independent-api', 'gptLlmIndependentApi');
    bindInput('workshop-gpt-llm-api-preset', 'gptLlmApiPresetId');

    // 两套 LLM 可以分别选择聊天 API 预设。
    populateWorkshopLlmApiPresets();
    if (!window.__workshopLlmApiPresetListenerBound) {
        window.addEventListener('api-presets-updated', populateWorkshopLlmApiPresets);
        window.__workshopLlmApiPresetListenerBound = true;
    }
    
    // 初始化 LLM 预设条目
    initWorkshopLLMPrompts();
    initWorkshopGPTLLMPrompts();
    
    // 触发一次 provider 的 change 事件以更新 UI
    const activeProviderRadio = document.querySelector('input[name="workshop-provider"]:checked');
    if (activeProviderRadio) {
        activeProviderRadio.dispatchEvent(new Event('change'));
    } else {
        const firstRadio = document.querySelector('input[name="workshop-provider"]');
        if (firstRadio) {
            firstRadio.checked = true;
            firstRadio.dispatchEvent(new Event('change'));
        }
    }
    
    // 触发一次 LLM 开关的 change 事件以更新 UI
    const llmToggle = document.getElementById('workshop-llm-independent-api');
    if (llmToggle) {
        llmToggle.dispatchEvent(new Event('change'));
    }
    const gptLlmToggle = document.getElementById('workshop-gpt-llm-independent-api');
    if (gptLlmToggle) {
        gptLlmToggle.dispatchEvent(new Event('change'));
    }
}

function populateWorkshopLlmApiPresets() {
    if (!db.workshopSettings) return;

    const presets = Array.isArray(db.apiPresets) ? db.apiPresets : [];
    const selectConfigs = [
        { id: 'workshop-llm-api-preset', settingKey: 'llmApiPresetId' },
        { id: 'workshop-gpt-llm-api-preset', settingKey: 'gptLlmApiPresetId' }
    ];
    let settingsChanged = false;

    selectConfigs.forEach(({ id, settingKey }) => {
        const select = document.getElementById(id);
        if (!select) return;

        let selectedId = db.workshopSettings[settingKey] || '';
        // 兼容曾经手动写入预设名称的旧数据。
        const legacyPreset = presets.find(p => p && p.name === selectedId);
        if (legacyPreset && typeof _createApiPresetId === 'function') {
            if (!legacyPreset.id) legacyPreset.id = _createApiPresetId();
            selectedId = legacyPreset.id;
            db.workshopSettings[settingKey] = selectedId;
            settingsChanged = true;
        }

        select.innerHTML = '<option value="">请选择</option>';
        presets.forEach(preset => {
            if (!preset || !preset.id || !preset.name || !preset.data) return;
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            select.appendChild(option);
        });

        if (selectedId && presets.some(p => p.id === selectedId)) {
            select.value = selectedId;
        } else if (selectedId) {
            db.workshopSettings[settingKey] = '';
            select.value = '';
            settingsChanged = true;
        }
    });

    if (settingsChanged) saveData();
}

// --- API 预设逻辑 ---
const workshopForms115 = new WeakMap();
const workshopPresetFields115 = ['url', 'key', 'model', 'protocol', 'responseFormat'];

function workshopApiForm115() {
    const settings = db.workshopSettings;
    let form = workshopForms115.get(settings);
    if (!form) {
        form = {drafts: new WeakMap(), newPresets: new Map(), creating: new Set()};
        workshopForms115.set(settings, form);
    }
    return form;
}

function getActiveWorkshopApiPreset() {
    const settings = db.workshopSettings;
    const provider = settings.provider || 'novelai';
    const form = workshopApiForm115();
    if (form.creating.has(provider)) return form.newPresets.get(provider);
    const saved = settings.apiPresets?.[provider]?.find(preset => preset.id === settings.activeApiPresetId?.[provider]);
    if (!saved) return null;
    if (!form.drafts.has(saved)) form.drafts.set(saved, {...saved});
    return form.drafts.get(saved);
}

function hasWorkshopApiDraft115() {
    const settings = db.workshopSettings;
    const provider = settings.provider || 'novelai';
    const draft = getActiveWorkshopApiPreset();
    const saved = settings.apiPresets?.[provider]?.find(preset => preset.id === draft?.id);
    return Boolean(workshopApiForm115().saving || (draft && (!saved || workshopPresetFields115.some(key => draft[key] !== saved[key]))));
}

function updateWorkshopDraftControls115() {
    const form = workshopApiForm115();
    const provider = db.workshopSettings.provider || 'novelai';
    const creating = form.creating.has(provider);
    const dirty = hasWorkshopApiDraft115();
    document.getElementById('workshop-api-draft-status').textContent = dirty ? '有未保存的修改' : '';
    document.getElementById('workshop-update-api-preset-btn').disabled = Boolean(form.saving || creating || !dirty);
    const save = document.getElementById('workshop-save-api-preset-btn');
    const label = creating ? '保存新预设' : '另存为新预设';
    save.textContent = label;
}

function updateApiPresetList() {
    const settings = db.workshopSettings;
    const provider = settings.provider || 'novelai';
    const select = document.getElementById('workshop-api-preset-select');
    if (!select || !settings.apiPresets) return;
    const form = workshopApiForm115();
    const presets = [...(settings.apiPresets[provider] || [])];
    const pending = form.newPresets.get(provider);
    if (pending) presets.push({...pending, name: pending.name + '（未保存）'});
    select.replaceChildren(...presets.map(preset => new Option(preset.name, preset.id)));

    const draft = getActiveWorkshopApiPreset();
    if (!draft) return;
    select.value = draft.id;
    document.getElementById('workshop-api-url').value = draft.url;
    document.getElementById('workshop-api-key').value = draft.key;
    document.getElementById('workshop-api-protocol-row').style.display = provider === 'novelai' ? 'flex' : 'none';
    document.getElementById('workshop-api-protocol').value = draft.protocol;
    document.getElementById('workshop-response-format').value = draft.responseFormat;
    document.getElementById('workshop-delete-api-preset-btn').style.display = draft.id === 'official' ? 'none' : 'flex';
    updateApiProtocolUI();
    updateWorkshopDraftControls115();
}

function updateApiProtocolUI() {
    const provider = db.workshopSettings?.provider || 'novelai';
    const preset = getActiveWorkshopApiPreset();
    const protocol = provider === 'novelai' ? (preset?.protocol || 'novelai') : 'openai';
    const hint = document.getElementById('workshop-api-protocol-hint');
    const responseRow = document.getElementById('workshop-response-format-row');
    const responseLabel = document.getElementById('workshop-response-format-label');
    const responseFormatSelect = document.getElementById('workshop-response-format');
    const modelListRow = document.getElementById('workshop-model-list-row');
    const modelSelectRow = document.getElementById('workshop-model-select-row');
    const customModelRow = document.getElementById('workshop-custom-model-row');
    const customModelInput = document.getElementById('workshop-custom-model');

    if (responseRow) responseRow.style.display = provider === 'novelai' && (protocol === 'novelai' || protocol === 'custom') ? 'flex' : 'none';
    if (responseLabel) responseLabel.textContent = protocol === 'novelai' ? '传输模式' : '响应格式';
    if (responseFormatSelect) {
        const jsonOption = responseFormatSelect.querySelector('option[value="json"]');
        if (jsonOption) jsonOption.hidden = protocol === 'novelai';
        if (protocol === 'novelai' && responseFormatSelect.value === 'json') {
            responseFormatSelect.value = 'auto';
            if (preset) preset.responseFormat = 'auto';
        }
    }
    if (modelListRow) modelListRow.style.display = protocol === 'custom' ? 'none' : 'flex';
    if (modelSelectRow) modelSelectRow.style.display = protocol === 'custom' ? 'none' : 'flex';
    if (customModelRow) customModelRow.style.display = provider === 'novelai' && protocol === 'custom' ? 'flex' : 'none';
    if (customModelInput && provider === 'novelai') customModelInput.value = preset?.model || '';

    if (hint) {
        const messages = {
            openai: 'OpenAI 图片兼容模式只发送通用生图字段，Vibe、负面提示词等 NovelAI 专属参数不会生效。',
            custom: '自定义直连会原样请求填写的完整 URL，并发送 NovelAI 原生请求体。'
        };
        hint.textContent = messages[protocol] || '';
        hint.style.display = provider === 'novelai' && messages[protocol] ? 'block' : 'none';
    }

    document.dispatchEvent(new CustomEvent('workshop-api-protocol-change', { detail: { provider, protocol } }));
}

function persistWorkshopApi115() {
    return window.UwUDataGuard90.settingCurrent('workshopSettings');
}

function initApiPresets() {
    const field = id => document.getElementById('workshop-' + id);
    const select = field('api-preset-select');
    if (!select) return;
    const saveBtn = field('save-api-preset-btn');
    const updateBtn = field('update-api-preset-btn');
    const newBtn = field('new-api-preset-btn');
    const deleteBtn = field('delete-api-preset-btn');
    const url = field('api-url');
    const key = field('api-key');
    const model = field('custom-model');
    const protocol = field('api-protocol');
    const response = field('response-format');
    const controls = [select, saveBtn, updateBtn, newBtn, deleteBtn, url, key, model, protocol, response,
        field('api-model'), ...document.querySelectorAll('input[name="workshop-provider"]')];
    const reportError = () => showToast('预设保存失败，请重试');

    // Disable the preset form during a save so an edit can never cross into another preset.
    async function commit(presets, activeId, message, afterSave) {
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        const form = workshopApiForm115();
        if (form.saving) return;
        const originalPresets = settings.apiPresets[provider];
        const originalActiveId = settings.activeApiPresetId[provider];
        form.saving = true;
        controls.forEach(control => { control.disabled = true; });
        settings.apiPresets[provider] = presets;
        settings.activeApiPresetId[provider] = activeId;
        try {
            await persistWorkshopApi115();
            afterSave?.(form);
            showToast(message);
        } catch {
            settings.apiPresets[provider] = originalPresets;
            settings.activeApiPresetId[provider] = originalActiveId;
            reportError();
        } finally {
            form.saving = false;
            controls.forEach(control => { control.disabled = false; });
            if (db.workshopSettings === settings) updateApiPresetList();
        }
    }

    select.addEventListener('change', () => {
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        const form = workshopApiForm115();
        if (select.value === form.newPresets.get(provider)?.id) {
            form.creating.add(provider);
        } else {
            form.creating.delete(provider);
            settings.activeApiPresetId[provider] = select.value;
            void persistWorkshopApi115().catch(reportError);
        }
        updateApiPresetList();
    });

    for (const [input, name] of [[url, 'url'], [key, 'key'], [model, 'model']]) {
        input.addEventListener('input', () => {
            const draft = getActiveWorkshopApiPreset();
            if (!draft) return;
            draft[name] = input.value.trim();
            updateWorkshopDraftControls115();
        });
    }

    protocol.addEventListener('change', () => {
        const draft = getActiveWorkshopApiPreset();
        if (!draft) return;
        draft.protocol = protocol.value;
        updateApiProtocolUI();
        updateWorkshopDraftControls115();
    });
    response.addEventListener('change', () => {
        const draft = getActiveWorkshopApiPreset();
        if (!draft) return;
        draft.responseFormat = response.value;
        updateWorkshopDraftControls115();
    });

    newBtn.addEventListener('click', () => {
        const provider = db.workshopSettings.provider || 'novelai';
        const form = workshopApiForm115();
        if (!form.newPresets.has(provider)) {
            const name = prompt('请输入新预设名称：')?.trim();
            if (!name) return;
            form.newPresets.set(provider, {id: 'preset_' + crypto.randomUUID(), name,
                url: '', key: '', model: '', protocol: provider === 'novelai' ? 'novelai' : 'openai', responseFormat: 'auto'});
        }
        form.creating.add(provider);
        updateApiPresetList();
    });

    saveBtn.addEventListener('click', () => {
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        const saved = settings.apiPresets[provider];
        const draft = getActiveWorkshopApiPreset();
        if (!draft) return;
        const source = saved.find(preset => preset.id === draft.id);
        const name = source ? prompt('请输入新预设名称：')?.trim() : draft.name;
        if (!name) return;
        const copy = {...draft, name, id: source ? 'preset_' + crypto.randomUUID() : draft.id};
        void commit([...saved, copy], copy.id, '预设已保存', form => {
            if (source) form.drafts.delete(source);
            else form.newPresets.delete(provider);
            form.creating.delete(provider);
        });
    });

    updateBtn.addEventListener('click', () => {
        if (!hasWorkshopApiDraft115()) return;
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        const saved = settings.apiPresets[provider];
        const draft = getActiveWorkshopApiPreset();
        if (!saved.some(preset => preset.id === draft?.id)) return;
        void commit(saved.map(preset => preset.id === draft.id ? {...draft} : preset), draft.id, '当前预设已更新');
    });

    deleteBtn.addEventListener('click', () => {
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        const form = workshopApiForm115();
        if (form.creating.has(provider)) {
            form.newPresets.delete(provider);
            form.creating.delete(provider);
            updateApiPresetList();
            return;
        }
        const activeId = settings.activeApiPresetId[provider];
        if (activeId === 'official' || !confirm('确定要删除当前预设吗？')) return;
        void commit(settings.apiPresets[provider].filter(preset => preset.id !== activeId), 'official', '预设已删除');
    });

    updateApiPresetList();
}

// --- 提示词预设逻辑 ---
function initPromptPresets() {
    const presetSelect = document.getElementById('workshop-prompt-preset-select');
    const saveBtn = document.getElementById('workshop-save-prompt-preset-btn');
    const updateBtn = document.getElementById('workshop-update-prompt-preset-btn');
    const deleteBtn = document.getElementById('workshop-delete-prompt-preset-btn');
    const positiveInput = document.getElementById('workshop-positive-prompt');
    const characterInput = document.getElementById('workshop-character-prompt');
    const negativeInput = document.getElementById('workshop-negative-prompt');

    if (!presetSelect || !saveBtn || !positiveInput || !negativeInput) return;

    // 渲染预设列表
    const renderPresets = () => {
        presetSelect.innerHTML = '<option value="">选择预设</option>';
        if (db.workshopPromptPresets && db.workshopPromptPresets.length > 0) {
            db.workshopPromptPresets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset.id;
                option.textContent = preset.name;
                presetSelect.appendChild(option);
            });
        }
    };

    renderPresets();

    // 选择预设时填充
    presetSelect.addEventListener('change', async (e) => {
        const presetId = e.target.value;
        
        if (!presetId) {
            if (updateBtn) updateBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
            return;
        }

        if (updateBtn) updateBtn.style.display = 'block';
        if (deleteBtn) deleteBtn.style.display = 'block';

        const preset = db.workshopPromptPresets.find(p => p.id === presetId);
        if (preset) {
            positiveInput.value = preset.positive;
            if (characterInput) characterInput.value = preset.character || '';
            negativeInput.value = preset.negative;
            
            // 手动触发 input 和 change 事件以保存到 settings
            positiveInput.dispatchEvent(new Event('input'));
            if (characterInput) characterInput.dispatchEvent(new Event('input'));
            negativeInput.dispatchEvent(new Event('input'));
            positiveInput.dispatchEvent(new Event('change'));
            if (characterInput) characterInput.dispatchEvent(new Event('change'));
            negativeInput.dispatchEvent(new Event('change'));
            
            showToast('已应用预设: ' + preset.name);
        }
    });

    // 保存当前为新预设
    saveBtn.addEventListener('click', async () => {
        const positive = positiveInput.value.trim();
        const character = characterInput ? characterInput.value.trim() : '';
        const negative = negativeInput.value.trim();

        if (!positive && !negative && !character) {
            showToast('提示词为空，无法保存');
            return;
        }

        const name = prompt('请输入预设名称：');
        if (!name) return;

        if (!db.workshopPromptPresets) {
            db.workshopPromptPresets = [];
        }

        const newPreset = {
            id: 'prompt_preset_' + Date.now(),
            name: name,
            positive: positive,
            character: character,
            negative: negative
        };

        db.workshopPromptPresets.push(newPreset);
        await saveData();
        
        renderPresets();
        presetSelect.value = newPreset.id;
        presetSelect.dispatchEvent(new Event('change'));
        showToast('预设保存成功');
    });

    // 更新当前预设
    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            const presetId = presetSelect.value;
            if (!presetId) return;

            const presetIndex = db.workshopPromptPresets.findIndex(p => p.id === presetId);
            if (presetIndex !== -1) {
                db.workshopPromptPresets[presetIndex].positive = positiveInput.value.trim();
                db.workshopPromptPresets[presetIndex].character = characterInput ? characterInput.value.trim() : '';
                db.workshopPromptPresets[presetIndex].negative = negativeInput.value.trim();
                
                await saveData();
                showToast('预设已更新');
            }
        });
    }

    // 删除当前预设
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const presetId = presetSelect.value;
            if (!presetId) return;

            if (confirm('确定要删除这个预设吗？')) {
                db.workshopPromptPresets = db.workshopPromptPresets.filter(p => p.id !== presetId);
                await saveData();
                
                renderPresets();
                presetSelect.value = '';
                presetSelect.dispatchEvent(new Event('change'));
                showToast('预设已删除');
            }
        });
    }
}

// --- 模型拉取 ---
function populateNovelAIModels(modelSelect) {
    const models = [
        { id: 'nai-diffusion-4-curated', name: 'NovelAI Diffusion V4 Curated' },
        { id: 'nai-diffusion-4-full', name: 'NovelAI Diffusion V4 Full' },
        { id: 'nai-diffusion-4-5-curated', name: 'NovelAI Diffusion V4.5 Curated' },
        { id: 'nai-diffusion-4-5-full', name: 'NovelAI Diffusion V4.5 Full' },
        { id: 'nai-diffusion-3', name: 'NovelAI Diffusion V3' },
        { id: 'nai-diffusion-2', name: 'NovelAI Diffusion V2' },
        { id: 'nai-diffusion-furry', name: 'NovelAI Diffusion Furry' },
        { id: 'safe-diffusion', name: 'Safe Diffusion' }
    ];
    
    fillWorkshopModelSelect115(modelSelect, models);
}

function fillWorkshopModelSelect115(select, models) {
    const selected = getActiveWorkshopApiPreset()?.model || '';
    select.replaceChildren(new Option('请选择模型', ''));
    for (const {id, name} of models) select.add(new Option(name || id, id));
    if (selected && !models.some(model => model.id === selected)) select.add(new Option(selected, selected));
    select.value = selected;
}

function initWorkshopModels() {
    const fetchBtn = document.getElementById('workshop-fetch-models-btn');
    const modelSelect = document.getElementById('workshop-api-model');
    if (!fetchBtn || !modelSelect) return;
    const loaded = new Map();
    const updateModels = () => {
        const provider = db.workshopSettings?.provider || 'novelai';
        const preset = getActiveWorkshopApiPreset();
        const cached = loaded.get(preset?.id);
        if (cached && cached.url === preset.url && cached.key === preset.key && cached.protocol === preset.protocol) {
            fillWorkshopModelSelect115(modelSelect, cached.models);
        } else if (provider === 'novelai' && preset?.protocol !== 'openai') {
            populateNovelAIModels(modelSelect);
        } else {
            fillWorkshopModelSelect115(modelSelect, provider === 'gpt' ? [
                {id: 'gpt-image-2.5-sunburst'}, {id: 'gpt-image-2.5-flare'}, {id: 'gpt-image-2'}, {id: 'gpt-image-1.5'},
                {id: 'dall-e-3', name: 'DALL·E 3'}, {id: 'dall-e-2', name: 'DALL·E 2'}
            ] : []);
        }
    };
    updateModels();
    document.addEventListener('workshop-api-protocol-change', updateModels);
    modelSelect.addEventListener('change', () => {
        const preset = getActiveWorkshopApiPreset();
        if (!preset) return;
        preset.model = modelSelect.value;
        updateWorkshopDraftControls115();
    });

    fetchBtn.addEventListener('click', async () => {
        const preset = getActiveWorkshopApiPreset();
        if (!preset?.url || !preset.key) return showToast('请先填写 API 地址和密钥');
        const {url, key, protocol} = preset;
        if (protocol === 'novelai') {
            updateModels();
            return showToast('模型列表已更新');
        }

        const label = fetchBtn.textContent;
        fetchBtn.textContent = '拉取中...';
        fetchBtn.disabled = true;
        try {
            const endpoint = normalizeOpenAIImageUrl(url).replace(/\/images\/generations$/, '/models');
            const response = await fetch(endpoint, {headers: {Authorization: 'Bearer ' + key}});
            if (!response.ok) throw Error('HTTP ' + response.status);
            const {data} = await response.json();
            if (!Array.isArray(data)) throw Error('接口未返回模型列表');
            const models = data.filter(model => typeof model?.id === 'string' && model.id);
            if (preset.url !== url || preset.key !== key || preset.protocol !== protocol) return;
            loaded.set(preset.id, {url, key, protocol, models});
            if (getActiveWorkshopApiPreset() === preset) {
                updateModels();
                showToast('模型列表已更新');
            }
        } catch (error) {
            if (getActiveWorkshopApiPreset() === preset) showToast('拉取模型失败: ' + error.message);
        } finally {
            fetchBtn.textContent = label;
            fetchBtn.disabled = false;
        }
    });
}
