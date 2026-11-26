// Model transport compatibility: decode the actual response, once; never retry a paid request.
function parseModelResponse110(raw) {
    const textValue = v => typeof v === 'string' ? v : Array.isArray(v) ? v.map(p => typeof p === 'string' ? p : typeof p?.text === 'string' ? p.text : '').join('') : '';
    const rawText=String(raw).replace(/^\uFEFF/,'').trim();
    let frames;
    try { const parsed=JSON.parse(rawText); frames=Array.isArray(parsed)?parsed:[parsed]; }
    catch {
        if(!/^(?:data:|event:|:)/m.test(rawText)) throw Error('接口返回的不是有效 JSON 或 SSE 数据');
        frames=[];let data=[];
        const flush=()=>{if(!data.length)return;const value=data.join('\n').trim();data=[];if(!value||value==='[DONE]')return;try{frames.push(JSON.parse(value));}catch{throw Error('接口返回的流式数据不完整或格式错误');}};
        for(const line of rawText.split(/\r?\n/)) {
            if(!line.trim()){flush();continue;}
            if(line.startsWith('data:')){
                // Some relays omit the blank separator between complete JSON events.
                if(data.length){let complete=false;try{JSON.parse(data.join('\n'));complete=true;}catch{}if(complete)flush();}
                data.push(line.slice(5).replace(/^ /,''));
            }
        }
        flush();
    }
    let content='',reasoning='',usage,gemini=false,recognized=false,finish;
    for(const frame of frames){
        if(!frame||typeof frame!=='object')throw Error('模型返回了无效响应对象');
        if(frame.error){const detail=frame.error.message||frame.error;throw Error('模型接口错误：'+(typeof detail==='string'?detail:JSON.stringify(detail)));}
        if(frame.usage)usage=frame.usage;
        if(frame.usageMetadata)usage=frame.usageMetadata;
        if(Array.isArray(frame.candidates)){
            recognized=true;gemini=true;const candidate=frame.candidates.find(c=>c.index===0)||frame.candidates[0];
            for(const part of candidate?.content?.parts||[])if(part.thought)reasoning+=textValue(part.text);else content+=textValue(part.text);
            finish=candidate?.finishReason||finish;
        }else if(Array.isArray(frame.choices)){
            recognized=true;const choice=frame.choices.find(c=>c.index===0)||frame.choices.find(c=>c.index==null);if(!choice)continue;
            if(choice.message){if(choice.message.content!=null)content=textValue(choice.message.content);if(choice.message.reasoning_content!=null||choice.message.reasoning!=null)reasoning=textValue(choice.message.reasoning_content||choice.message.reasoning);}
            else {const delta=choice.delta||{};content+=textValue(delta.content??choice.text);reasoning+=textValue(delta.reasoning_content||delta.reasoning);}
            finish=choice.finish_reason||finish;
        }
    }
    if(!recognized)throw Error('模型响应中没有可识别的回复内容');
    if(!content.trim()&&!reasoning.trim())throw Error('模型返回空正文，请检查输出额度及模型设置');
    if(gemini)return {candidates:[{content:{parts:[{text:content}]},finishReason:finish}],usageMetadata:usage};
    return {choices:[{index:0,message:{content,reasoning_content:reasoning},finish_reason:finish}],usage};
}
window.UwUModelResponse110={parse:parseModelResponse110};
