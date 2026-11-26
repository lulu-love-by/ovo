// --- 生图核心逻辑 ---
let currentGeneratedImage = null;
let currentGeneratedPayload = null;

function initWorkshopGeneration() {
    const generateBtn = document.getElementById('workshop-generate-btn');
    const saveCacheBtn = document.getElementById('workshop-save-cache-btn');
    const downloadBtn = document.getElementById('workshop-download-btn');
    const previewActions = document.getElementById('workshop-preview-actions');

    if (!generateBtn) return;
    
    // 保存到缓存按钮
    if (saveCacheBtn) {
        saveCacheBtn.addEventListener('click', async () => {
            if (!currentGeneratedImage || !currentGeneratedPayload) {
                showToast('没有可保存的图片');
                return;
            }
            await saveToHistory(currentGeneratedImage, currentGeneratedPayload);
            showToast('已保存到缓存');
            // 保存后隐藏保存按钮，避免重复保存
            saveCacheBtn.style.display = 'none';
        });
    }

    // 下载按钮
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!currentGeneratedImage) {
                showToast('没有可下载的图片');
                return;
            }
            const a = document.createElement('a');
            // 判断是 URL 还是 Base64
            if (currentGeneratedImage.startsWith('http')) {
                a.href = currentGeneratedImage;
                a.target = '_blank'; // URL 可能跨域，最好在新窗口打开
            } else {
                a.href = `data:image/png;base64,${currentGeneratedImage}`;
                a.download = `workshop_${Date.now()}.png`;
            }
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });
    }
    
    generateBtn.addEventListener('click', async () => {
        if (isGenerating) {
            showToast('正在生成中，请稍候...');
            return;
        }
        
        if (hasWorkshopApiDraft115()) return showToast('请先保存 API 预设的修改');
        const settings = db.workshopSettings;
        const provider = settings.provider || 'novelai';
        
        const {url: apiUrl, key: apiKey, model} = workshopImageApi115(settings);

        if (!apiUrl || !apiKey) {
            showToast('请先配置 API 地址和密钥');
            return;
        }
        
        if (!model) {
            showToast('请先选择模型');
            return;
        }
        
        // 强制从输入框获取最新值
        if (provider === 'novelai') {
            const positiveInput = document.getElementById('workshop-positive-prompt');
            const characterInput = document.getElementById('workshop-character-prompt');
            const negativeInput = document.getElementById('workshop-negative-prompt');
            const ratioRadios = document.querySelectorAll('input[name="workshop-aspect-ratio"]');
            let selectedRatio = '3:4';
            ratioRadios.forEach(r => { if (r.checked) selectedRatio = r.value; });
            
            if (positiveInput) settings.positivePrompt = positiveInput.value;
            if (characterInput) settings.characterPrompt = characterInput.value;
            if (negativeInput) settings.negativePrompt = negativeInput.value;
            settings.aspectRatio = selectedRatio;
            
            if (!settings.positivePrompt) {
                showToast('请输入正面提示词');
                return;
            }
        } else if (provider === 'gpt') {
            const testPromptInput = document.getElementById('workshop-gpt-test-prompt');
            if (testPromptInput) settings.gptTestPrompt = testPromptInput.value;
            
            if (!settings.gptTestPrompt) {
                showToast('请输入测试画面描述');
                return;
            }
            
            const ratioRadios = document.querySelectorAll('input[name="workshop-gpt-aspect-ratio"]');
            let selectedRatio = '1024x1024';
            ratioRadios.forEach(r => { if (r.checked) selectedRatio = r.value; });
            settings.gptAspectRatio = selectedRatio;
            
            const qualitySelect = document.getElementById('workshop-gpt-quality');
            if (qualitySelect) settings.gptQuality = qualitySelect.value;
            
            const styleSelect = document.getElementById('workshop-gpt-style');
            if (styleSelect) settings.gptStyle = styleSelect.value;
        }
        
        await saveData();
        
        isGenerating = true;
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '⏳ 生成中...';
        generateBtn.disabled = true;
        
        try {
            const { imageData, payload } = await window.executeImageGeneration(settings);
            
            // 暂存数据并渲染图片
            currentGeneratedImage = imageData;
            currentGeneratedPayload = payload;
            renderPreviewImage(imageData);
            
            // 显示操作按钮
            if (previewActions) {
                previewActions.style.display = 'flex';
                if (saveCacheBtn) saveCacheBtn.style.display = 'block'; // 恢复保存按钮显示
            }
            
            showToast('生成成功！请选择是否保存。');
            
        } catch (error) {
            console.error('Generation error:', error);
            showToast('生成失败: ' + error.message);
        } finally {
            isGenerating = false;
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });
}

// --- 统一生图调用函数 ---
window.executeImageGeneration = async function(settings, customPrompt = null) {
    const provider = settings.provider || 'novelai';
    
    const {url: apiUrl, key: apiKey, model, preset: activePreset} = workshopImageApi115(settings);

    if (!apiUrl || !apiKey || !model) {
        throw new Error(`未配置 ${provider.toUpperCase()} API，请先在工坊中完成设置`);
    }

    const ratio = workshopImageRatio115(settings, model, customPrompt);
    settings = {...settings, [provider + 'Model']: model};
    let payload;
    let response;
    let finalApiUrl = apiUrl;
    const imageFetch96=(url,options)=>fetch(url,options).catch(error=>{throw UwUApiErrors96.network(error,'图片生成',{source96:'工坊生图 API',key:apiKey,model});});
    let responseFormat = activePreset?.responseFormat || 'auto';

    if (provider === 'gpt') {
        finalApiUrl=normalizeOpenAIImageUrl(finalApiUrl);
        
        payload = await buildGPTPayload(settings, customPrompt || settings.gptTestPrompt, ratio);
        const faceRefs97=window.UwU97?.refs(settings)||[];if(faceRefs97.length){finalApiUrl=finalApiUrl.replace(/\/images\/generations$/,'/images/edits');payload.images=faceRefs97.map(image_url=>({image_url}));payload.prompt+='\n参考图仅用于同一人物的面部身份与五官特征，不参考或复制图中的服装、配饰、姿势、身体动作、构图、背景、光线或画风。除面部身份外，其余均严格以本次画面描述为准，允许更换服装和场景。';}
        
        response = await imageFetch96(finalApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });
    } else if (provider === 'novelai') {
        const protocol = activePreset?.protocol || 'novelai';
        const novelaiPayload = await buildNovelAIPayload(settings, customPrompt, ratio.size);
        payload = protocol === 'openai'
            ? buildNovelAIOpenAICompatiblePayload(novelaiPayload)
            : novelaiPayload;
        console.log('【统一生图】发送给 NovelAI 的最终提示词:', novelaiPayload.input);
        console.log('【统一生图】接口协议:',protocol,'模型:',model);

        if (protocol === 'novelai') {
            const baseUrl = apiUrl.trim().replace(/\/+$/, '').replace(/\/ai\/generate-image(?:-stream)?$/, '');
            const useNonStream = responseFormat === 'binary'
                || (responseFormat === 'auto' && /\/ai\/generate-image\/?$/.test(apiUrl));
            if (useNonStream) {
                finalApiUrl = `${baseUrl}/ai/generate-image`;
                responseFormat = 'binary';
            } else {
                finalApiUrl = `${baseUrl}/ai/generate-image-stream`;
                responseFormat = 'sse';
            }
        } else if (protocol === 'openai') {
            finalApiUrl = normalizeOpenAIImageUrl(apiUrl);
            responseFormat = 'json';
        } else {
            // 自定义直连：完整 URL 原样使用。
            finalApiUrl = apiUrl;
        }

        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };

        if (responseFormat === 'sse') {
            headers['Accept'] = 'text/event-stream';
        } else if (responseFormat === 'binary') {
            headers['Accept'] = 'application/x-zip-compressed';
        } else if (responseFormat === 'json') {
            headers['Accept'] = 'application/json';
        }

        response = await imageFetch96(finalApiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        // Auto mode may meet a native proxy without the optional SSE route.
        // Retry only an explicit route-not-found response; no retries on model,
        // credential, billing, network or server errors, nor explicit SSE mode.
        if (protocol === 'novelai' && (activePreset?.responseFormat || 'auto') === 'auto'
            && responseFormat === 'sse' && response.status === 404) {
            let missingRoute = false;
            try {
                const text = (await response.clone().text()).trim();
                missingRoute = !text || JSON.parse(text)?.detail === 'Not Found';
            } catch {}
            if (missingRoute) {
                finalApiUrl = finalApiUrl.replace(/\/ai\/generate-image-stream$/, '/ai/generate-image');
                responseFormat = 'binary';
                response = await imageFetch96(finalApiUrl, {
                    method:'POST', headers:{...headers, Accept:'application/x-zip-compressed'},
                    body:JSON.stringify(payload)
                });
            }
        }

    }

    if (!response.ok) {
            throw await UwUApiErrors96.failure(response,"图片生成",{url:finalApiUrl,key:apiKey,model,source96:"工坊生图 API"});

    }

    let imageData = '';
    if (typeof window.parseImageResponse === 'function') {
        imageData = await window.parseImageResponse(response, responseFormat);
    } else {
        throw new Error("未找到图片解析函数");
    }

    return { imageData: await cropWorkshopImage115(imageData, ratio.crop), payload };
};

// --- 全局图片响应解析函数 ---
window.parseImageResponse = async function(response, expectedFormat = 'auto') {
    const contentType = response.headers.get('content-type') || '';
    console.log('Response Content-Type:', contentType);
    let imageData = '';
    
    // 处理 Server-Sent Events (SSE) 流式响应
    if (expectedFormat === 'sse' || contentType.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let buffer = '';

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                buffer += decoder.decode(value, { stream: true });
                // 尝试解析 SSE 格式
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留最后一行可能不完整的

                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const dataStr = line.substring(5).trim();
                        if (dataStr) {
                            try {
                                const dataObj = JSON.parse(dataStr);
                                
                                // 如果返回了错误信息
                                if (dataObj.event_type === 'error' || dataObj.code) {
                                    throw new Error(`NovelAI 错误: ${dataObj.message || JSON.stringify(dataObj)}`);
                                }

                                // 忽略中间过程图
                                if (dataObj.event_type === 'intermediate') {
                                    continue;
                                }

                                // NovelAI stream 接口通常在 dataObj.b64 中返回图片
                                if (dataObj.b64) {
                                    imageData = dataObj.b64;
                                    done = true; // 拿到图片就结束
                                    break;
                                } else if (dataObj.image) {
                                    imageData = dataObj.image;
                                    done = true;
                                    break;
                                } else if (dataObj.images && dataObj.images.length > 0) {
                                    imageData = dataObj.images[0];
                                    done = true;
                                    break;
                                }
                            } catch (e) {
                                // 如果是我们主动抛出的 NovelAI 错误，继续向上抛出
                                if (e.message.startsWith('NovelAI 错误')) {
                                    throw e;
                                }
                                // 否则忽略 JSON 解析错误
                            }
                        }
                    }
                }
            }
        }
    } else {
        // 非流式响应：读取为 ArrayBuffer 进行智能嗅探
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        
        if (bytes.length === 0) {
            throw new Error('API 返回了空数据');
        }
        
        // 嗅探魔数 (Magic Numbers)
        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
        const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
        const isJson = bytes[0] === 0x7B || bytes[0] === 0x5B; // '{' or '['
        
        if (isZip) {
            console.log('Detected ZIP file, attempting standard parsing...');
            try {
                const view = new DataView(arrayBuffer);
                let eocdOffset = -1;
                
                // 从末尾向前搜索 EOCD (0x06054b50)
                for (let i = bytes.length - 22; i >= 0; i--) {
                    if (view.getUint32(i, true) === 0x06054b50) {
                        eocdOffset = i;
                        break;
                    }
                }
                
                if (eocdOffset === -1) throw new Error("未找到 ZIP EOCD 标记");
                
                // 读取 Central Directory 信息
                const entryCount = view.getUint16(eocdOffset + 10, true);
                const cdOffset = view.getUint32(eocdOffset + 16, true);
                const unzipEntry = async (compressedData, compMethod) => {
                    if (compMethod === 0) return compressedData;
                    if (compMethod !== 8) return null;

                    const ds = new DecompressionStream('deflate-raw');
                    const stream = new Blob([compressedData]).stream().pipeThrough(ds);
                    return new Uint8Array(await new Response(stream).arrayBuffer());
                };
                const detectImageMime = (data) => {
                    if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) return 'image/png';
                    if (data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF) return 'image/jpeg';
                    if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
                        && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'image/webp';
                    return null;
                };

                let cursor = cdOffset;
                let imageBytes = null;
                let mimeType = null;
                for (let entryIndex = 0; entryIndex < entryCount; entryIndex++) {
                    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) {
                        throw new Error(`无效的 Central Directory 条目: ${entryIndex}`);
                    }

                    const compMethod = view.getUint16(cursor + 10, true);
                    const compSize = view.getUint32(cursor + 20, true);
                    const nameLen = view.getUint16(cursor + 28, true);
                    const extraLen = view.getUint16(cursor + 30, true);
                    const commentLen = view.getUint16(cursor + 32, true);
                    const lfhOffset = view.getUint32(cursor + 42, true);
                    const fileName = new TextDecoder('utf-8').decode(bytes.slice(cursor + 46, cursor + 46 + nameLen));
                    cursor += 46 + nameLen + extraLen + commentLen;

                    if (fileName.endsWith('/')) continue;
                    if (lfhOffset + 30 > bytes.length || view.getUint32(lfhOffset, true) !== 0x04034b50) continue;

                    const localNameLen = view.getUint16(lfhOffset + 26, true);
                    const localExtraLen = view.getUint16(lfhOffset + 28, true);
                    const dataOffset = lfhOffset + 30 + localNameLen + localExtraLen;
                    if (dataOffset + compSize > bytes.length) continue;

                    const candidate = await unzipEntry(bytes.slice(dataOffset, dataOffset + compSize), compMethod);
                    const candidateMime = candidate && detectImageMime(candidate);
                    if (candidateMime) {
                        imageBytes = candidate;
                        mimeType = candidateMime;
                        break;
                    }
                }

                if (!imageBytes || !mimeType) throw new Error('ZIP 中未找到 PNG、JPEG 或 WebP 图片');
                const blob = new Blob([imageBytes], { type: mimeType });
                imageData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error('ZIP parsing failed:', e);
                throw new Error('从 ZIP 提取图片失败: ' + e.message);
            }
        } else if (isPng || isJpg || isWebp) {
            console.log('Detected raw image stream');
            let mimeType = isPng ? 'image/png' : (isJpg ? 'image/jpeg' : 'image/webp');
            const blob = new Blob([bytes], { type: mimeType });
            imageData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else if (isJson || contentType.includes('application/json')) {
            console.log('Detected JSON response');
            const text = new TextDecoder('utf-8').decode(bytes);
            const data = JSON.parse(text);
            
            // 递归查找图片
            const findImageInJson = (obj) => {
                if (typeof obj === 'string') {
                    if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(obj)) return obj.slice(obj.indexOf(',') + 1);
                    if (obj.startsWith('iVBORw0KGgo') || obj.startsWith('/9j/') || obj.startsWith('UklGR')) return obj;
                    if (obj.startsWith('http://') || obj.startsWith('https://')) return obj;
                }
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const res = findImageInJson(item);
                        if (res) return res;
                    }
                } else if (typeof obj === 'object' && obj !== null) {
                    // 优先匹配常见字段名
                    const keys = ['b64_json', 'image', 'url', 'image_url', 'b64', 'base64', 'images', 'data'];
                    for (const k of keys) {
                        if (obj[k]) {
                            const res = findImageInJson(obj[k]);
                            if (res) return res;
                        }
                    }
                    // 兜底遍历所有字段
                    for (const key in obj) {
                        const res = findImageInJson(obj[key]);
                        if (res) return res;
                    }
                }
                return null;
            };
            
            imageData = findImageInJson(data);
            if (!imageData) {
                throw new Error('未在 JSON 响应中找到图片数据');
            }
        } else {
            // 兜底：尝试作为文本读取，看是否是错误信息
            const text = new TextDecoder('utf-8').decode(bytes);
            if (text.length < 1000) {
                throw new Error('未知的响应格式: ' + text);
            } else {
                throw new Error('未知的响应格式，且无法解析为图片');
            }
        }
    }
    
    if (!imageData) {
        throw new Error('获取图片数据失败');
    }
    
    return imageData;
};

function normalizeOpenAIImageUrl(apiUrl) {
    let url = apiUrl.replace(/\/$/, '').replace(/\/images\/edits$/,'/images/generations');
    if (url.endsWith('/v1/images/generations')) return url;
    if (url.endsWith('/images/generations')) return url;
    if (url.endsWith('/v1')) return `${url}/images/generations`;
    return `${url}/v1/images/generations`;
}

function buildNovelAIOpenAICompatiblePayload(novelaiPayload) {
    if(novelaiPayload.parameters?.director_reference_images?.length)throw Error('NAI的OpenAI兼容文生图协议无法传角色参考，请切换原生协议');
    const width = novelaiPayload.parameters?.width || 1024;
    const height = novelaiPayload.parameters?.height || 1024;
    return {
        model: novelaiPayload.model,
        prompt: novelaiPayload.input + (avoidImageContent115(novelaiPayload.tagNegative115)),
        n: 1,
        size: `${width}x${height}`,
        response_format: 'b64_json'
    };
}

function workshopImageApi115(settings) {
    const provider = settings.provider || 'novelai';
    const preset = settings.apiPresets?.[provider]?.find(item => item.id === settings.activeApiPresetId?.[provider]);
    return {
        preset,
        url: preset ? preset.url : settings[provider + 'ApiUrl'],
        key: preset ? preset.key : settings[provider + 'ApiKey'],
        model: preset?.model ?? settings[provider + 'Model']
    };
}

function inferWorkshopAspect115(description) {
    const text = stripImagePlanning115(description);
    const explicit = /(?:^|[^\d])(3|4|1|9|16)\s*[:：/]\s*(3|4|1|9|16)(?!\d)/.exec(text);
    if (explicit) {
        const width = Number(explicit[1]);
        const height = Number(explicit[2]);
        return width > height ? '4:3' : width < height ? '3:4' : '1:1';
    }
    if (/横(?:屏|版|幅|构图|向)|宽(?:画幅|幅)|\b(?:landscape orientation|horizontal|panoram\w*|wide[- ]angle)\b/i.test(text)) return '4:3';
    if (/竖(?:屏|版|幅|构图|向)|纵向构图|\b(?:portrait orientation|vertical)\b/i.test(text)) return '3:4';
    if (/方形|正方形|\bsquare (?:image|format|crop|composition)\b/i.test(text)) return '1:1';
    if (/全景|地平线|风景|街景|桌面布局|电脑截图|校园小路|\b(?:landscape|skyline|cityscape|establishing shot|desktop screenshot)\b/i.test(text)) return '4:3';
    if (/自拍|全身|半身|人像|手机截图|聊天截图|\b(?:selfie|full[- ]body|waist[- ]up|portrait|mobile screenshot)\b/i.test(text)) return '3:4';
    return '1:1';
}

function workshopImageRatio115(settings, model, prompt) {
    const gpt = settings.provider === 'gpt';
    const requested = (gpt ? settings.gptAspectRatio : settings.aspectRatio) || (gpt ? '1024x1024' : '3:4');
    const name = String(model || '').toLowerCase();
    const arbitrary = /^gpt-image-2(?:$|[.\-])/.test(name);
    const gptImage = /^gpt-image-|^chatgpt-image-/.test(name);
    const dall2 = name === 'dall-e-2';
    const dall3 = name === 'dall-e-3';
    if (requested === 'auto' && gpt && gptImage) return {size: 'auto'};

    const description = settings._airdropDescription115 || prompt || (gpt ? settings.gptTestPrompt : settings.characterPrompt || settings.positivePrompt);
    const aspect = requested === 'auto' ? inferWorkshopAspect115(description) : requested;
    if (aspect === '3:4' || aspect === '4:3') {
        const landscape = aspect === '4:3';
        const exact = landscape ? '1280x960' : '960x1280';
        if (!gpt || arbitrary || !(gptImage || dall2 || dall3)) return {size: exact};
        const size = dall2 ? '1024x1024' : dall3 ? (landscape ? '1792x1024' : '1024x1792') : (landscape ? '1536x1024' : '1024x1536');
        return {size, crop: aspect};
    }
    if (gpt && (aspect === '1024x1792' || aspect === '1792x1024')) {
        if (dall2) return {size:'1024x1024'};
        if (gptImage && !arbitrary) return {size:aspect === '1024x1792' ? '1024x1536' : '1536x1024'};
        return {size:aspect};
    }
    return {size:'1024x1024'};
}

async function cropWorkshopImage115(data, aspect) {
    if (aspect !== '3:4' && aspect !== '4:3') return data;
    const [w, h] = aspect.split(':').map(Number);
    const image = new Image();
    if (/^https?:/i.test(data)) image.crossOrigin = 'anonymous';
    image.src = /^(https?:|data:)/i.test(data) ? data : 'data:image/png;base64,' + data;
    try {
        await image.decode();
    } catch {
        throw Error('无法读取生成图片以调整比例，请使用返回图片数据或允许跨域读取的接口');
    }
    const {naturalWidth: width, naturalHeight: height} = image;
    if (width * h === height * w) return data;
    const scale = Math.floor(Math.min(width / w, height / h));
    if (!scale) throw Error('生成的图片尺寸太小，无法调整比例');
    const canvas = document.createElement('canvas');
    canvas.width = w * scale;
    canvas.height = h * scale;
    canvas.getContext('2d').drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2);
    return canvas.toDataURL('image/png').split(',')[1];
}

// --- GPT Payload 构建与标签替换 ---
const imageScenes115 = {
    pov: '后置第一视角：拍摄者用手持后摄拍眼前所见。自己的手、衣角或影子可入镜；这些局部属于镜头后同一人。',
    selfie: '本人自拍：拍摄者用自己的前摄、手持相机或镜子自拍，拍摄者本人是主体',
    camera: '外部机位照片：相机在拍摄者眼睛之外，旁拍、他人代拍、定时器或明确要求外部机位',
    screenshot: '软件截图：设备直接截取的聊天、网页、应用或软件界面，不是从外部拍摄手机屏幕',
    hands: '手部内容：手清楚入镜，可以与任一拍照机位搭配，不能用手判断机位',
    portrait: '人像内容：脸或人物是画面主体，可以与自拍或其他摄影机位搭配，单独一只手、衣角、影子不算人像',
    custom: '按标签名称和选用条件判断'
};
function activeImageTags115(settings, provider = settings?.provider || 'novelai') {
    const list = provider === 'gpt' ? settings?.gptTags : settings?.novelaiTags115;
    return (list || []).filter(tag => tag.enabled !== false && tag.name && (tag.prompt || tag.negative115));
}
function sceneFromDescription115(text) {
    if (/拍(?:了|下)?(?:一张)?(?:手机|电脑)屏幕|photo of (?:a |the )?screen/i.test(text)) return 'camera';
    if (/截屏|截图|screenshot|screen capture/i.test(text)) return 'screenshot';
    if (/自拍|前摄|selfie|front-facing camera/i.test(text)) return 'selfie';
    if (/第三视角|第三人称机位|旁拍|旁人拍|他人代拍|别人拍|外部机位|定时器拍|third-person|someone else (?:takes|took)/i.test(text)) return 'camera';
    if (/第一视角|第一人称镜头|拍摄者眼前|后置(?:镜头|摄像头|相机|拍)|用后摄|first-person (?:view|perspective)|point-of-view|\bpov\b/i.test(text)) return 'pov';
    const surroundings = /空无一人|没有(?:其他)?人|不见人影|无人|只有[^。！？\n]{0,24}(?:影子|倒影)/.test(text);
    const framing = /画面(?:角落|边缘|一角|底部)|镜头(?:边缘|一角)|从画面[^。！？\n]{0,12}伸/.test(text);
    const partial = /的手(?:[和与、，。]|$)|衣角|衣袖|袖口|衣摆/.test(text);
    return surroundings && framing && partial ? 'pov' : '';
}
function imageTagScene115(tag) {
    if (tag.scene115 && tag.scene115 !== 'custom') return tag.scene115;
    const name = String(tag.name || '').replace(/[#＃]/g,'').trim();
    if (/自拍|selfie/i.test(name)) return 'selfie';
    if (/第一视角|第一人称|\bpov\b/i.test(name)) return 'pov';
    if (/^(?:手|手部(?:特写)?|手部入镜|hand(?:s)?)$/i.test(name)) return 'hands';
    if (/^(?:人像(?:摄影)?|portrait)$/i.test(name)) return 'portrait';
    return 'custom';
}
function imagePromptRules115(settings, provider = settings.provider || 'novelai') {
    const description = settings._airdrop115 ? (settings._airdropDescription115 || '') : '';
    const defaultId = provider === 'gpt' ? settings.airdropDefaultGptTag115 : settings.airdropDefaultNovelTag115;
    const tags = activeImageTags115(settings, provider);
    const scene = sceneFromDescription115(description);
    const matches = tags.filter(tag => scene && imageTagScene115(tag) === scene);
    const hands = /(?:画面|镜头|入镜|露出|只见)[^。！？\n]{0,30}(?:的手|手指|手部|一只手)|(?:手指|手部)特写/.test(description);
    const handTags = tags.filter(tag => imageTagScene115(tag) === 'hands');
    const hasExplicit = tags.some(tag => description.includes(tag.name));
    return {
        scene,
        onlyOwnDetails: scene === 'pov' && /空无一人|没有(?:其他)?人|不见人影|无人|只有[^。！？\n]{0,24}(?:影子|倒影)/.test(description),
        tags: tags.map(tag => {
            const explicit = Boolean(description && description.includes(tag.name));
            return {
                id: String(tag.id), name: String(tag.name), prompt: String(tag.prompt || ''), negative: String(tag.negative115 || ''), scene: imageTagScene115(tag),
                always: explicit || Boolean(settings._airdrop115 && !hasExplicit && tag.id === defaultId), explicit,
                inferred: (matches.length === 1 && matches[0] === tag) || (hands && handTags.length === 1 && handTags[0] === tag)
            };
        }),
        bindings: (settings.boundCharacters || []).flatMap(binding => {
            const character = db.characters.find(item => item.id === binding.charId);
            return character && binding.prompt ? [{name: '{{' + character.realName + '}}', prompt: String(binding.prompt)}] : [];
        })
    };
}
function gptPromptRules97(settings) {
    return imagePromptRules115(settings, 'gpt');
}

function stripImagePlanning115(raw) {
    return String(raw || '').replace(/<(thinking|preplan)\b[^>]*>[\s\S]*?(?:<\/\1>|$)/gi, '');
}
function resolveImageTags115(raw, rules = {}) {
    const outside = stripImagePlanning115(raw);
    const choice = outside.match(/<image_style>\s*([^<]+?)\s*<\/image_style>/i)?.[1] || '';
    const ids = new Set(choice.split(/[,，\s]+/).filter(Boolean));
    let text = outside.replace(/<image_style\b[^>]*>[\s\S]*?<\/image_style>/gi, '');
    text = (text.match(/<image>([\s\S]*?)<\/image>/i)?.[1] ?? text)
        .replace(/^\s*```(?:\w+)?\s*/, '').replace(/```\s*$/, '').trim();
    const tags = rules.tags || [];
    const explicit = tags.filter(tag => tag.explicit);
    const fixed = tags.filter(tag => tag.always);
    const named = tags.filter(tag => tag.name && text.includes(tag.name));
    const model = tags.filter(tag => tag.id && ids.has(tag.id));
    const inferred = tags.filter(tag => tag.inferred);
    const content = tag => tag.scene === 'hands' || tag.scene === 'portrait';
    const camera = tag => ['pov','selfie','camera','screenshot'].includes(tag.scene);
    const manual = explicit.length ? explicit : fixed;
    const selected = manual.length ? manual : named.length ? named : model;
    const knownView = inferred.find(camera);
    const view = selected.find(camera);
    const chosenView = manual.find(camera) || knownView || view;
    const main = selected.filter(tag => !camera(tag));
    if (chosenView) main.unshift(chosenView);
    if (rules.onlyOwnDetails && !manual.some(camera) && !explicit.some(tag => tag.scene === 'portrait')) {
        // Locally established photographer-only framing cannot be replaced by a model's portrait guess.
        for (let i = main.length - 1; i >= 0; i--) if (main[i].scene === 'portrait') main.splice(i, 1);
    }
    const applied = [...new Set([...main,...inferred.filter(content)])];
    for (const tag of tags) if (tag.name) text = text.split(tag.name).join('');
    text = text.replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '');
    const saved = [...applied.map(tag => tag.name), text].filter(Boolean).join(' ');
    const pov = (chosenView?.scene || rules.scene) === 'pov';
    const framing = pov ? "Rear-camera view from the photographer's eye or hand position. If the photographer's own hand or clothing is visible, it enters from the near bottom or side edge. Their shadow extends out from the camera position along the ground. The photographer's face and body remain behind the camera." : '';
    const positive = [...applied.map(tag => tag.prompt), framing, text].filter(Boolean).join(', ');
    const negative = [...new Set(applied.map(tag => tag.negative).filter(Boolean))].join(', ');
    return {positive, negative, saved};
}
function bindImageCharacters115(text, rules) {
    for (const binding of rules.bindings || []) {
        if (binding.name) text = text.split(binding.name).join(binding.prompt);
    }
    return text;
}
function avoidImageContent115(negative) {
    return negative ? '\n\nAvoid these elements: ' + negative : '';
}
function applyGptPrompt97(raw, rules = {}) {
    const tags = resolveImageTags115(raw, rules);
    return bindImageCharacters115(tags.positive, rules) + avoidImageContent115(tags.negative);
}
async function buildGPTPayload(settings, rawPrompt, {size, crop}) {
    const composition = crop
        ? '\nCompose the main subject and all important details inside the centered ' + crop + ' area, with extra room outside that area for cropping.'
        : '';
    const finalPrompt = applyGptPrompt97(rawPrompt, gptPromptRules97(settings)) + composition;
    const payload = {
        model: settings.gptModel || "dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size
    };
    if (!/^(gpt-image-|chatgpt-image-)/i.test(payload.model)) payload.response_format = 'b64_json';
    
    // DALL-E 3 专属参数
    if (payload.model === "dall-e-3") {
        if (settings.gptQuality) payload.quality = settings.gptQuality;
        if (settings.gptStyle) payload.style = settings.gptStyle;
    }
    
    return payload;
}

// 注意：函数前面加上了 async 关键字
async function buildNovelAIPayload(settings, customCharacterPrompt, size) {
    const builtinParams = {
        steps: 28,
        scale: 5.0, 
        sampler: "k_euler",
        seed: Math.floor(Math.random() * 4294967296) 
    };
    
    const qualityTags = "best quality, very aesthetic, absurdres";
    const negativeQualityTags = "lowres, (bad), text, error, missing, extra, fewer, cropped, jpeg artifacts, worst quality, bad quality, watermark, displeasing, unfinished, chromatic aberration, scan, scan artifacts";
    
    let finalPositive = '';
    if (settings.positivePrompt) finalPositive += `${settings.positivePrompt}, `;
    
    const charPrompt = customCharacterPrompt ?? settings.characterPrompt;
    const rules = imagePromptRules115(settings, 'novelai');
    const resolved = resolveImageTags115(charPrompt, rules);
    if (resolved.positive) finalPositive += resolved.positive + ', ';
    finalPositive = bindImageCharacters115(finalPositive + qualityTags, rules);
    const tagNegative = resolved.negative;
    const finalNegative = [settings.negativePrompt, tagNegative, negativeQualityTags].filter(Boolean).join(', ');

    const [width, height] = size.split('x').map(Number);

    const payload = {
        input: finalPositive, 
        model: settings.novelaiModel,
        action: "generate",
        parameters: {
            width: width,
            height: height,
            negative_prompt: finalNegative, 
            ...builtinParams
        }
    };

    Object.defineProperty(payload, 'tagNegative115', {value: resolved.negative});

    if (settings.novelaiModel && settings.novelaiModel.includes('diffusion-4')) {
        payload.parameters.params_version = 3;
        payload.parameters.v4_prompt = {
            caption: {
                base_caption: finalPositive,
                char_captions: []
            },
            use_coords: false,
            use_order: true
        };
        payload.parameters.v4_negative_prompt = {
            caption: {
                base_caption: finalNegative,
                char_captions: []
            }
        };
    }
    
    const faces97=window.UwU97?.refs(settings)||[];if(faces97.length){if(!/diffusion-(4-5|5)/.test(settings.novelaiModel||''))throw Error('此NAI模型未接入角色参考，请选择支持角色参考的4.5或更新模型');payload.parameters.director_reference_images=faces97.map(x=>x.split(',')[1]);payload.parameters.director_reference_descriptions=faces97.map(()=>({caption:{base_caption:'facial identity and facial features only; ignore reference clothing, accessories, pose, composition and background',char_captions:[]}}));payload.parameters.director_reference_information_extracted=faces97.map(()=>1);payload.parameters.director_reference_strengths=faces97.map(()=>.8);payload.parameters.director_reference_secondary_strengths=faces97.map(()=>1);}
    // --- 核心修复：处理 Vibe 数据 (多图支持) ---
    if (settings.vibe && settings.vibe.enabled && settings.vibe.activeImageId) {
        const activeLibItem = (settings.vibeLibrary || []).find(l => l.id === settings.vibe.activeImageId);
        if (activeLibItem) {
            const refImages = [];
            const refInfoExtracted = [];
            const refStrength = [];

            if (activeLibItem.type === 'group' && activeLibItem.images && activeLibItem.images.length > 0) {
                // 处理预设组
                for (const img of activeLibItem.images) {
                    if (img.encoding) {
                        refImages.push(img.encoding);
                        refInfoExtracted.push(img.infoExtracted !== undefined ? img.infoExtracted : 1.0);
                        refStrength.push(img.refStrength !== undefined ? img.refStrength : 0.6);
                    }
                }
            } else {
                // 处理单图
                if (activeLibItem.encoding) {
                    refImages.push(activeLibItem.encoding);
                    refInfoExtracted.push(settings.vibe.infoExtracted !== undefined ? settings.vibe.infoExtracted : 1.0);
                    refStrength.push(settings.vibe.refStrength !== undefined ? settings.vibe.refStrength : 0.6);
                } else if (activeLibItem.base64) {
                    let b64 = activeLibItem.base64;
                    if (b64.includes(',')) {
                        b64 = b64.split(',')[1];
                    }
                    
                    if (b64.startsWith('/9j/')) {
                        b64 = await new Promise((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                resolve(canvas.toDataURL('image/png').split(',')[1]);
                            };
                            img.src = 'data:image/jpeg;base64,' + b64;
                        });
                    }
                    
                    b64 = b64.replace(/\r?\n|\r|\s/g, '');
                    
                    refImages.push(b64);
                    refInfoExtracted.push(settings.vibe.infoExtracted !== undefined ? settings.vibe.infoExtracted : 1.0);
                    refStrength.push(settings.vibe.refStrength !== undefined ? settings.vibe.refStrength : 0.6);
                }
            }

            if (refImages.length > 0) {
                payload.parameters.reference_image_multiple = refImages;
                payload.parameters.reference_information_extracted_multiple = refInfoExtracted;
                payload.parameters.reference_strength_multiple = refStrength;
            }
        }
    }
    
    return payload;
}

// 将二进制转为 base64 的辅助函数
function arrayBufferToB64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function renderPreviewImage(imageData) {
    const previewArea = document.getElementById('workshop-preview-area');
    if (!previewArea) return;
    
    let src = '';
    if (imageData.startsWith('http') || imageData.startsWith('data:')) {
        src = imageData;
    } else {
        src = `data:image/png;base64,${imageData}`;
    }
    
    previewArea.innerHTML = `<img src="${src}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px;">`;
}

