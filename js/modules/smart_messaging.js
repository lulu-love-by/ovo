// 真人回复：API 在正常回复末尾写纸条；等待、取消和概率判断均在本地完成。
(() => {
    const MINUTE = 60000;
    const DAY = 24 * 60 * MINUTE;
    const flights = new Set();
    const requests = new Map();
    let ticking = false;
    const stripCache=new Map();
    const clamp = (value, min, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
    const text = value => typeof value === 'string' ? value.slice(0, 180) : '';
    function state(chat) {
        if (!chat.smartReply || typeof chat.smartReply !== 'object') chat.smartReply = {};
        const s = chat.smartReply;
        s.enabled = s.enabled === true;
        // 档位属于角色本身，不随存档变化；兼容旧版角色内的level。
        if (!['less', 'normal', 'more'].includes(chat.smartReplyLevel)) {
            chat.smartReplyLevel = ['less', 'normal', 'more'].includes(s.level) ? s.level : 'normal';
        }
        s.level = chat.smartReplyLevel;
        if (!Number.isFinite(s.epoch)) s.epoch = 0;
        if (!Number.isFinite(s.followupRounds)) s.followupRounds = s.unansweredRounds || 0;
        if (!Array.isArray(s.events)) s.events = [];
        if (!Array.isArray(s.usedNodes)) s.usedNodes = [];
        if (!Array.isArray(s.nodes)) {
            // 仅迁移仍然存在的旧安排，不复活已落空或已取消的机会。
            s.nodes = s.plan ? [{ ...s.plan, id: s.plan.id || 'legacy-' + (s.noteAt || 0), eventId: '', respectActivity: s.plan.kind === 'routine' }] : [];
        }
        if (!Number.isFinite(s.noteSerial)) s.noteSerial = 0;
        return s;
    }
    const visible = m => m && !m.isThinking && !m.isContextDisabled && !m.isWithdrawn;
    function latestMessage(chat, role) {
        const history = chat.history || [];
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === role && visible(history[i])) return history[i];
        }
    }
    function latestUser(chat) { return latestMessage(chat, 'user'); }
    function signature(chat, history = chat.history) {
        const value = JSON.stringify([chat.activeArchiveId || '', chat.persona, chat.myPersona,
            (chat.worldBookIds || []).map(id => (db.worldBooks || []).find(w => w.id === id)),
            (history || []).map(m => [m.id, m.role, m.content, m.isWithdrawn, m.isContextDisabled])]);
        let a = 2166136261, b = 5381;
        for (let i = 0; i < value.length; i++) {
            a = Math.imul(a ^ value.charCodeAt(i), 16777619);
            b = Math.imul(b, 33) ^ value.charCodeAt(i);
        }
        return `${value.length}:${a >>> 0}:${b >>> 0}`;
    }
    function capture(chat) {
        return { signature: signature(chat), epoch: state(chat).epoch, enabled: state(chat).enabled, historyLength:chat.history.length, userId:latestUser(chat)?.id || null };
    }
    function current(chat, snapshot, interleaved=false) {
        if(!snapshot || state(chat).epoch!==snapshot.epoch || state(chat).enabled!==snapshot.enabled)return false;
        if(signature(chat)===snapshot.signature)return true;
        if(!interleaved || !chat.smartInterleaved || !Number.isInteger(snapshot.historyLength))return false;
        const appended=chat.history.slice(snapshot.historyLength);
        return appended.length>0 && appended.every(m=>m.role==='user'&&visible(m))
            && signature(chat,chat.history.slice(0,snapshot.historyLength))===snapshot.signature;
    }
    function finishCrossedReply(){return false;}
    function cancelAutomatic(chat) {
        const request = requests.get(chat.id);
        if (request?.automatic) {
            state(chat).epoch++;
            request.controller.abort(); requests.delete(chat.id); flights.delete(chat.id);
        }
    }
    function stop(chat) {
        const request = requests.get(chat.id);
        if (!request || request.controller.signal.aborted) return false;
        request.userStopped = true;
        state(chat).epoch++;
        request.controller.abort();
        // Keep ownership until the request's finally block finishes cleanup.
        return true;
    }
    function begin(chat, request) {
        if (flights.has(chat.id)) return false;
        flights.add(chat.id);
        if (request) requests.set(chat.id,request);
        return true;
    }
    function end(chat, controller) {
        if (controller && requests.get(chat.id)?.controller !== controller) return;
        requests.delete(chat.id); flights.delete(chat.id);
    }
    function busy(chat) { return flights.has(chat.id)||!!window.UwURegeneration109?.has(chat); }
    function settings(chat, enabled, level, options) {
        const s = state(chat);
        if (s.enabled !== enabled) {
            s.epoch++;
            clearNodes(s); s.note = null; s.pendingReply = null; s.dailyWindow=null; s.wakeWindow=null; s.backgroundTask=null;
            s.unansweredRounds = 0; s.followupRounds = 0; s.lastDecision = ''; s.failures = 0; s.lastError = '';
        }
        s.enabled = enabled;
        if(options){chat.smartMergeMinutes109=Math.round(clamp(options.mergeMinutes109,1,1440,20));chat.smartInterleaved=options.interleaved===true;chat.smartAutoLimit=Math.round(clamp(options.limit,0,10000,0));}
        chat.smartReplyLevel = ['less', 'normal', 'more'].includes(level) ? level : 'normal';
        s.level = chat.smartReplyLevel;
        // 两个模式仍各自保留，开启真人模式时停用旧定时模式。
        if (enabled && chat.autoReply) chat.autoReply.enabled = false;
    }
    function stripNote(raw) {
        const cacheKey=typeof raw==='string'?raw:'';
        if(stripCache.has(cacheKey))return stripCache.get(cacheKey);
        let source = cacheKey;
        let note = null;
        const mergeRecovered = (first, later) => {
            if(!first) return later;
            if(!later) return first;
            const result={...first};
            for(const key of later.recoveredParts || []) result[key]=later[key];
            result.recoveredParts=[...new Set([...(first.recoveredParts||[]),...(later.recoveredParts||[])])];
            return result;
        };
        const repair = value => value.replace(/^\s*```(?:json)?|```\s*$/gi,'')
            .replace(/&quot;/gi,'"').replace(/&#39;/g,"'")
            .replace(/[“”]/g,'"')
            .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, token => token[0] === "'" ? JSON.stringify(token.slice(1,-1).replace(/\\'/g,"'")) : token)
            .replace(/([{,]\s*)([A-Za-z_][\w]*)(\s*:)/g,'$1"$2"$3')
            .replace(/,\s*([}\]])/g,'$1');
        const parse = value => {
            const decoded = repair(value.trim());
            for (const candidate of [decoded, decoded.replace(/,\s*$/,'')]) {
                try { const parsed = JSON.parse(candidate); const result = recoverNote(parsed.life_note || parsed.lifeNote || parsed); if (result) note = mergeRecovered(note,result); } catch (_) {}
            }
            if (note) return;
            // 截断时只提取完整闭合的顶层分块，不补造未返回的字段和联系机会。
            const recovered = {};
            const fields = /"(baseline|situation|reply|sleep|events|opportunities|next|daily|dialogue)"\s*:\s*([\[{])/g;
            let hit;
            while ((hit = fields.exec(decoded))) {
                const start = fields.lastIndex-1; let depth=0, quoted=false, escaped=false;
                for(let i=start;i<decoded.length;i++) {
                    const ch=decoded[i];
                    if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}
                    else if(ch==='"')quoted=true;
                    else if(ch==='{'||ch==='[')depth++;
                    else if(ch==='}'||ch===']'){if(--depth===0){try{recovered[hit[1]]=JSON.parse(repair(decoded.slice(start,i+1)));}catch(_){}fields.lastIndex=i+1;break;}}
                }
            }
            note = mergeRecovered(note,recoverNote(recovered));
        };
        // 容忍大小写、空格、连字符、属性及转义标签。闭合缺失则隐藏后面的内部内容。
        source = source.replace(/&lt;\s*(\/?)\s*life[\s_-]*note(?:\s[^&]*?)?\s*&gt;/gi, '<$1life_note>');
        source = source.replace(/<\s*life[\s_-]*note\b[^>]*>([\s\S]*?)<\s*\/\s*life[\s_-]*note\s*>/gi, (_, data) => { parse(data.trim()); return ''; });
        source = source.replace(/<\s*life[\s_-]*note\b[^>]*(?:>|$)([\s\S]*)$/gi, (_, data) => { parse(data); return ''; });
        // 标签全丢了也能识别纸条结构。只移除具有多个内部字段的对象，不吞普通JSON消息。
        const startPattern = /\{\s*["“']?[A-Za-z_][\w]*["”']?\s*:/g;
        const ranges = [];
        let hit;
        while ((hit = startPattern.exec(source))) {
            const start = hit.index;
            let depth = 0, quoted = false, escaped = false, end = source.length, complete = false;
            for (let i = start; i < source.length; i++) {
                const ch = source[i];
                if (quoted) {
                    if (escaped) escaped = false;
                    else if (ch === '\\') escaped = true;
                    else if (ch === '"') quoted = false;
                } else if (ch === '"') quoted = true;
                else if (ch === '{') depth++;
                else if (ch === '}' && --depth === 0) { end = i + 1; complete = true; break; }
            }
            const candidate = source.slice(start, end);
            const fields = ['baseline', 'situation', 'reply', 'next', 'events', 'opportunities', 'sleep','daily','dialogue'].filter(key => new RegExp('["“]?' + key + '["”]?\\s*:').test(candidate));
            const scheduling = /["“]?(?:probability|max_unanswered_rounds|busy_until_minutes)["”]?\s*:/.test(candidate);
            let isolated = null;
            try {
                const value = JSON.parse(repair(candidate));
                const root = ['baseline','situation','reply','sleep','next','daily','dialogue'].some(k => value[k] && typeof value[k] === 'object');
                const families = {
                    daily:['enabled','busy_probability','pause_minutes','wake_probability','wake_min_minutes','wake_max_minutes'],
                    dialogue:['mode','awaiting','reply_min_seconds','reply_max_seconds','can_interrupt_activity','wait_minutes'],
                    baseline:['initiative','silence','expression','rhythm','sensitive_topics','relationship'],
                    situation:['topic','activity','mood','facts','unknowns','urgency','importance','waiting_for','unfinished','desire','restraint','previous_followups'],
                    sleep:['state','onset_minutes','wake_min_minutes','wake_max_minutes'],
                    reply:['min_seconds','max_seconds','busy_until_minutes'],
                    next:['kind','motive','direction','probability','max_unanswered_rounds','min_minutes']
                };
                if(root) isolated=value;
                else for(const [family,keys] of Object.entries(families)) {
                    if(keys.filter(k=>Object.prototype.hasOwnProperty.call(value,k)).length>=2){isolated={[family]:value};break;}
                }
            } catch(_) {}
            if (isolated || fields.length >= 3 || (fields.length >= 2 && scheduling) || (!complete && fields.includes('baseline'))) {
                if(isolated) { const restored=recoverNote(isolated); if(restored)note=mergeRecovered(note,restored); } else parse(candidate); ranges.push([start, end]); startPattern.lastIndex = end;
            }
        }
        for (let i = ranges.length - 1; i >= 0; i--) source = source.slice(0, ranges[i][0]) + source.slice(ranges[i][1]);
        // 外层纸条丢失并被拆成气泡：识别事件/机会数组，而非任意JSON数组。
        const fragments = {}, arrayRanges = [];
        const arrayStart = /\[\s*\{\s*["“'](?:id|title|kind)["”']\s*:/g;
        while ((hit = arrayStart.exec(source))) {
            const start=hit.index; let depth=0, quoted=false, escaped=false, end=-1;
            for(let i=start;i<source.length;i++) {
                const ch=source[i];
                if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}
                else if(ch==='"')quoted=true;
                else if(ch==='[')depth++;
                else if(ch===']' && --depth===0){end=i+1;break;}
            }
            if(end<0) continue;
            try {
                const rows=JSON.parse(repair(source.slice(start,end)));
                const eventRows=rows.every(e=>e && e.id && e.title && e.phase && e.availability && ('basis' in e || 'start_minutes' in e || 'start_at' in e));
                const nodeRows=rows.every(e=>e && e.kind && e.motive && 'probability' in e && ('min_minutes' in e || 'event_id' in e));
                if(eventRows || nodeRows){fragments[eventRows?'events':'opportunities']=rows;arrayRanges.push([start,end]);arrayStart.lastIndex=end;}
            } catch(_) {}
        }
        for(let i=arrayRanges.length-1;i>=0;i--) source=source.slice(0,arrayRanges[i][0])+source.slice(arrayRanges[i][1]);
        // 各核心区块可能独立成气泡，不依赖完整纸条及字段排列顺序。
        const blockStart = /,?\s*["“](baseline|situation|reply|sleep|next|daily|dialogue)["”]\s*:\s*\{/g;
        const blockRanges=[];
        while((hit=blockStart.exec(source))) {
            const start=blockStart.lastIndex-1;let depth=0,quoted=false,escaped=false,end=-1;
            for(let i=start;i<source.length;i++){
                const ch=source[i];
                if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}
                else if(ch==='"')quoted=true;
                else if(ch==='{')depth++;
                else if(ch==='}'&&--depth===0){end=i+1;break;}
            }
            if(end>=0){try{fragments[hit[1]]=JSON.parse(repair(source.slice(start,end)));}catch(_){}blockRanges.push([hit.index,end]);blockStart.lastIndex=end;}
        }
        for(let i=blockRanges.length-1;i>=0;i--)source=source.slice(0,blockRanges[i][0])+source.slice(blockRanges[i][1]);
        // 标签名本身变成独立气泡时不显示。明确的空数组保留其“停止安排”含义。
        source=source.replace(/,?\s*["“](events|opportunities)["”]\s*:\s*(\[\s*\])?/g,(_,key,empty)=>{if(empty)fragments[key]=[];return '';});
        source=source.replace(/,?\s*["“](?:baseline|situation|reply|sleep|next|daily|dialogue)["”]\s*:\s*(?=\]|$|\n|,)/g,'');
        source=source.replace(/,?\s*["“]summary["”]\s*:\s*"(?:\\.|[^"\\])*"\s*}?/g,'');
        if(Object.keys(fragments).length) {
            const restored=recoverNote(fragments);
            if(!note) note=restored;
            else if(restored){const keys=[...new Set([...(note.recoveredParts||[]),...restored.recoveredParts])];for(const key of restored.recoveredParts)note[key]=restored[key];note.recoveredParts=keys;}
        }
        // 明确内部标题、闭合残片、移除对象后留下的空代码块/空消息不显示。
        source = source.replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:【|\[)?(?:life[\s_-]*note|小纸条|真人回复纸条|内部纸条)(?:】|\])?\s*[:：]?\s*(?=\n|\{|$)[\s\S]*$/gi, '');
        source = source.replace(/<\s*\/\s*life[\s_-]*note\s*>/gi, '')
            .replace(/```(?:json|life_note)?\s*```/gi, '')
            .replace(/\[[^\]\n]{0,100}的消息[：:]\s*\]/g, '')
            .replace(/\[[^\]\n]{0,100}的消息[：:]\s*$/g, '');
        const loose = [...source.matchAll(/(?:^|\n)\s*(?:[-*]\s*)?["“]?(baseline|situation|reply|next|events|opportunities|sleep|daily|dialogue)["”]?\s*:/g)];
        if (new Set(loose.map(m => m[1])).size >= 3) source = source.slice(0, loose[0].index);
        const result={clean:source.trim(),note};
        stripCache.set(cacheKey,result);if(stripCache.size>128)stripCache.delete(stripCache.keys().next().value);
        return result;
    }
    function checkpoint(chat) {
        const userId=latestUser(chat)?.id||null;
        if(chat.smartPaperCheckpoint?.userId===userId)return;
        chat.smartPaperCheckpoint={userId,archiveId:chat.activeArchiveId||null,state:JSON.parse(JSON.stringify(state(chat)))};
    }
    function rollback(chat) {
        cancelAutomatic(chat);
        const previous=chat.smartPaperCheckpoint;
        const epoch=state(chat).epoch+1,enabled=state(chat).enabled;
        if(previous&&previous.userId===(latestUser(chat)?.id||null)&&previous.archiveId===(chat.activeArchiveId||null))chat.smartReply=JSON.parse(JSON.stringify(previous.state));
        else chat.smartReply={enabled,events:state(chat).events.filter(e=>e.endAt>Date.now())};
        state(chat).epoch=epoch;
        delete chat.smartPaperCheckpoint;
    }
    const eventPhases = ['planned', 'ongoing', 'paused', 'completed', 'cancelled', 'unknown'];
    function timeValue(value) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 100000000000) return value;
        // 必须带时区，避免APK与网页对无时区字符串的解释不同。
        if (typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
            const timestamp = Date.parse(value); return Number.isFinite(timestamp) ? timestamp : null;
        }
        return null;
    }
    function normalizeEvent(e) {
        if (!e || typeof e !== 'object' || !text(e.id) || !text(e.title)) return null;
        return {
            id: text(e.id).slice(0, 64), title: text(e.title),
            phase: eventPhases.includes(e.phase) ? e.phase : 'planned',
            subject: e.subject === 'user' ? 'user' : 'char',
            phoneMode: e.phone_mode, busyLevel:e.busy_level,
            startAt: timeValue(e.start_at ?? e.startAt), endAt: timeValue(e.end_at ?? e.endAt),
            startMinutes: clamp(e.start_minutes, 0, 10080, 0),
            endMinutes: clamp(e.end_minutes, 0, 10080, 120),
            availability: ['free', 'limited', 'unavailable', 'sleep'].includes(e.availability) ? e.availability : 'limited',
            priority: ['promise', 'important', 'ordinary'].includes(e.priority) ? e.priority : 'ordinary',
            basis: text(e.basis), certainty: e.certainty === 'explicit' ? 'explicit' : 'inferred',
            changeReason: text(e.change_reason ?? e.changeReason), result: text(e.result),
            toldToUser: e.told_to_user === true || e.toldToUser === true, toldEvidence: text(e.told_evidence ?? e.toldEvidence),
            unfinishedEvidence: text(e.unfinished_evidence ?? e.unfinishedEvidence),
            contactMotive: text(e.contact_motive ?? e.contactMotive)
        };
    }
    function normalizeOpportunity(n) {
        if (!n || typeof n !== 'object' || !['routine', 'followup', 'urgent', 'promise'].includes(n.kind)) return null;
        const min = clamp(n.min_minutes, 0.5, 2880, 30), max = clamp(n.max_minutes, min, 2880, Math.max(min, 90));
        return {
            id: text(n.id).slice(0, 64), eventId: text(n.event_id).slice(0, 64),
            kind: n.kind, motive: text(n.motive), direction: text(n.direction),
            min_minutes: min, max_minutes: n.kind==='promise'?min:max,
            dueAt:timeValue(n.due_at ?? n.dueAt),
            expires_minutes: clamp(n.expires_minutes, max, 4320, Math.max(max, 180)),
            probability: n.kind==='promise'?1:clamp(n.probability, 0, 1, 0),
            max_unanswered_rounds: Math.round(clamp(n.max_unanswered_rounds, 0, 4, 3)),
            respectActivity: n.respect_activity !== false,
            trigger: text(n.trigger), cancel: text(n.cancel), stop: text(n.stop)
        };
    }
    function recoverNote(n) {
        if (!n || typeof n !== 'object' || Array.isArray(n)) return null;
        const object = v => v && typeof v === 'object' && !Array.isArray(v);
        const parts = ['baseline','situation','reply','sleep','next','daily','dialogue'].filter(k=>object(n[k]));
        if (!parts.length && !Array.isArray(n.events) && !Array.isArray(n.opportunities)) return null;
        const normalized = normalize({...n,baseline:object(n.baseline)?n.baseline:{},situation:object(n.situation)?n.situation:{},reply:object(n.reply)?n.reply:{},next:object(n.next)?n.next:{}});
        if (!normalized) return null;
        normalized.recoveredParts = [...parts, ...(Array.isArray(n.events)?['events']:[]), ...(Array.isArray(n.opportunities)?['opportunities']:[])];
        return normalized;
    }
    function normalize(n) {
        if (!n || typeof n !== 'object' || Array.isArray(n)
            || !n.situation || typeof n.situation !== 'object') return null;
        if (!Array.isArray(n.opportunities) && !n.next) n={...n,opportunities:[]};
        n = { baseline:{},reply:{}, ...n, next: n.next || {} };
        const kind = ['none', 'routine', 'followup', 'urgent', 'promise'].includes(n.next.kind) ? n.next.kind : 'none';
        const sleep = n.sleep && typeof n.sleep === 'object' ? n.sleep : {};
        const wakeMin = clamp(sleep.wake_min_minutes, 1, 1440, 480);
        const min = clamp(n.next.min_minutes, 0.5, 720, 30);
        const max = clamp(n.next.max_minutes, min, 720, Math.max(min, 90));
        return {
            version: 11,
            fulfilled_promises:Array.isArray(n.fulfilled_promises)?n.fulfilled_promises.filter(x=>typeof x==='string').slice(0,12):[],
            cancelled_promises:Array.isArray(n.cancelled_promises)?n.cancelled_promises.filter(x=>typeof x==='string').slice(0,12):[],
            daily: n.daily && typeof n.daily==='object' ? (window.SmartReplyControl?.normalizeDaily(n.daily)||n.daily) : null,
            dialogue: n.dialogue && typeof n.dialogue==='object' ? (window.SmartReplyControl?.normalizeDialogue(n.dialogue)||n.dialogue) : null,
            events: Array.isArray(n.events) ? n.events.slice(0, 4).map(normalizeEvent).filter(Boolean) : [],
            opportunities: Array.isArray(n.opportunities) ? n.opportunities.slice(0, 3).map(normalizeOpportunity).filter(Boolean) : null,
            summary: text(n.summary),
            baseline: {
                initiative: text(n.baseline.initiative), silence: text(n.baseline.silence),
                expression: text(n.baseline.expression), rhythm: text(n.baseline.rhythm),
                sensitive_topics: text(n.baseline.sensitive_topics), relationship: text(n.baseline.relationship)
            },
            situation: {
                availability:n.situation.availability,busy_until:n.situation.busy_until,contact_state:n.situation.contact_state,topic: text(n.situation.topic), phase: text(n.situation.phase), activity: text(n.situation.activity),
                mood: text(n.situation.mood), facts: text(n.situation.facts), unknowns: text(n.situation.unknowns),
                change_reason: text(n.situation.change_reason), phone_mode: text(n.situation.phone_mode), activity_state: text(n.situation.activity_state), busy_level: text(n.situation.busy_level), busy_minutes: clamp(n.situation.busy_minutes,0,720,0),
                urgency: clamp(n.situation.urgency, 0, 1, 0), importance: clamp(n.situation.importance, 0, 1, 0),
                waiting_for: text(n.situation.waiting_for), unfinished: text(n.situation.unfinished),
                desire: text(n.situation.desire), restraint: text(n.situation.restraint),
                previous_followups: text(n.situation.previous_followups)
            },
            sleep: n.sleep ? {
                depth: sleep.depth === 'light' ? 'light' : 'deep', starts_at:sleep.starts_at, wake_at:sleep.wake_at,
                state: ['awake', 'winding_down', 'asleep', 'briefly_awake'].includes(sleep.state) ? sleep.state : 'awake',
                onset_minutes: clamp(sleep.onset_minutes, 0, 120, 5),
                wake_min_minutes: wakeMin,
                wake_max_minutes: clamp(sleep.wake_max_minutes, wakeMin, 1440, Math.max(wakeMin, 540)),
                change_reason: text(sleep.change_reason), basis: text(sleep.basis), certainty: ['explicit', 'inferred'].includes(sleep.certainty) ? sleep.certainty : 'inferred'
            } : null,
            reply: {
                min_seconds: clamp(n.reply.min_seconds, 3, 21600, 30),
                max_seconds: clamp(n.reply.max_seconds, 3, 21600, 120),
                busy_until_minutes: clamp(n.reply.busy_until_minutes, 0, 720, 0)
            },
            next: {
                kind, motive: text(n.next.motive), direction: text(n.next.direction),
                min_minutes: min, max_minutes: max,
                probability: clamp(n.next.probability, 0, 1, 0),
                expires_minutes: clamp(n.next.expires_minutes, max, 2880, Math.max(max, 180)),
                max_unanswered_rounds: Math.round(clamp(n.next.max_unanswered_rounds, 0, 4, 3)),
                trigger: text(n.next.trigger), cancel: text(n.next.cancel), stop: text(n.next.stop)
            }
        };
    }
    function instructions(chat) {
        advanceEvents(chat);
        const s = state(chat);
        const memo = s.note ? {
            baseline:s.note.baseline, situation:s.note.situation, reply:s.note.reply,
            events:s.events.map(e => ({id:e.id,title:e.title,phase:e.phase,start_at:e.startAt,end_at:e.endAt,
                subject:e.subject,availability:e.availability,priority:e.priority,basis:e.basis,certainty:e.certainty,
                told_to_user:e.toldToUser,told_evidence:e.toldEvidence,unfinished_evidence:e.unfinishedEvidence||'',contact_motive:e.contactMotive})),
            opportunities:s.nodes.map(n => ({id:n.id,event_id:n.eventId,kind:n.kind,motive:n.motive,
                direction:n.direction,due_at:n.dueAt,expires_at:n.expiresAt,probability:n.probability,
                max_unanswered_rounds:n.maxRounds,respect_activity:n.respectActivity,decided:n.decided,accepted:n.accepted})),
            daily:s.dailyPolicy,dialogue:s.dialogue,summary:s.eventSummary || s.note.summary
        } : {events:s.events,opportunities:[]};
        const shape = {
            version:11,
            baseline:{initiative:'依角色填写',silence:'',expression:'',rhythm:'',sensitive_topics:'',relationship:''},
            situation:{topic:'',activity:'',change_reason:'',mood:'',facts:'',unknowns:'',phone_mode:'ring',activity_state:'free',busy_level:'light',busy_minutes:0},
            sleep:{state:'awake',depth:'light',onset_minutes:5,wake_min_minutes:480,wake_max_minutes:540,basis:'依当天安排',certainty:'inferred',change_reason:''},
            reply:{},events:[],opportunities:[],cancelled_promises:[],fulfilled_promises:[],daily:{enabled:true},dialogue:{mode:'casual',awaiting:''},summary:''
        };
        return `\n\n<真人回复须知>
【真实生活】
你拥有自己的生活、社交圈和日常安排，不能整天围着{{user}}转。维持符合角色设定的真实生活运转，正在做的事、接下来的计划和之前聊过的内容应当自然衔接。对方忙碌或没有回复，不代表你也在忙。
【主动分享】
鼓励主动分享生活。可以是碎碎念、见闻、趣事、吐槽、突然想到的事、生活中的小确幸、想念，或看到什么想告诉对方……不必每次都有重要理由，也不必总与上一句话有关。
- 根据你的性格、喜好和当前生活选择内容，不固定套路，不反复催回复。
- 对方暂时没回，也可以分享新的事情；不必每次提问或要求回应。
- 可以使用已开放的照片、表情包、转发聊天记录、投票、待办清单等功能，自然分享生活、表达想法或与对方互动。
- 粘人程度也会影响分享方式：粘人档更愿意分享小事、接着聊双方的共同话题；不粘人档可以更简短、随意。始终符合角色设定，不把粘人写成反复说“想你了”，也不把不粘人写成冷淡敷衍。
- 保持生活连续性，不把计划说成已经发生，不把预计忙完当作事情已经完成。
【忙闲与联系】
根据自己的活动判断是否空闲、能抽空或暂时无法联系，并记录手机的响铃、振动或静音状态。抽空聊天不代表忙碌结束；睡眠只根据你自己的情况判断。
已定好的时间需要继承，不反复往后推。确实需要延长时，先在聊天中说明还需要多久，再更新安排。
【约定与报备】
✨重要✨ 答应稍后联系、忙完报备或在某个时间发消息时，必须在本轮生活纸条中同步记录对应的联系安排，不能只在台词中答应。
- 约定联系不参与日常分享的概率选择，不因新消息或准备睡觉而自动取消。
- “洗完澡来找你，然后睡觉”应依次安排，不能直接进入睡眠而漏掉报备。
- 已兑现、明确取消或改期后，再更新原安排。
【生活纸条】
每次回复后按指定格式更新生活纸条，记录当前状态、生活事件和后续联系。以本轮实际说出口的决定更新安排：改做别的事、提前结束、推迟入睡或决定继续聊，都要同步当前状态与相关事件，并写change_reason；没有变化才继承原时间，不能每轮重新计时。区分内部计划与已经告诉对方的安排，保留尚未兑现的约定。
具体抽签和计时由本地程序处理，不在聊天中提及纸条、概率或调度。
</真人回复须知>
<生活纸条格式>
每次普通、延时、主动回复后，在所有角色台词与原有thinking之后追加一份<life_note>合法JSON</life_note>。ASCII双引号，不用代码块、不放进气泡。示例中的值按角色与事实填写，events最多4项，opportunities最多3项。
状态：phone_mode=ring/vibrate/silent；activity_state=free/busy/unavailable；busy_level=light/medium/heavy；busy_minutes为当前活动预计剩余分钟，不是普通回复延迟。sleep.state=awake/winding_down/asleep，depth=light/deep；睡眠时间由本地抽取并继承，不因普通新消息重置。被提醒唤醒由本地判断，不自行假装收到提醒。明确决定再聊或晚点睡时，sleep与原睡眠事件一起改期；awake表示本轮决定保持清醒，winding_down需填新的onset_minutes。单纯收到一条消息或手动接收，不等于决定起床。sleep只记录char；user作息只能放入subject=user的事件。
事件：events每项包含id、subject(char/user)、title、phase(planned/ongoing/paused/completed/cancelled/unknown)、start_minutes/end_minutes、availability(free/limited/unavailable/sleep)、priority(promise/important/ordinary)、basis、certainty。继承时沿用id与start_at/end_at绝对时间；已到预计结束点只解除限制，未确认结果标unknown，不宣称完成。每轮逐项检查旧记录中phase=unknown的事件：结合角色经历和本轮内容确认结束、仍进行或取消，填写result与change_reason；仍无法确认就写明未知依据，不得仅抄旧记录或凭时段结束宣称完成。确认完成或取消写result与change_reason。subject必须明确char/user，不能把user睡觉记成char睡眠。已告知才填told_to_user=true及聊天原文told_evidence。
联系：opportunities只安排明确约定promise或必要followup；普通日常由本地独立安排，不重复创建routine。每项含id、event_id(可空)、kind、motive、direction(不预写台词)、min_minutes/max_minutes、probability、respect_activity。约定promise的min_minutes=max_minutes、probability=1，继承时传原due_at；睡前报备先联系再睡，wake/busy时间不替代报备时间。明确取消或改期时，在cancelled_promises填写原节点ID，并给situation.facts写可见聊天依据；改期另建节点。不能用空数组取消已有约定。提前在可见消息中兑现旧约定时，用fulfilled_promises列出已兑现的原节点ID，不能把未来承诺记成已经完成。
等待某个回复不关闭日常线；daily.enabled=false只用于对方明确要求勿扰，并写pause_reason/pause_minutes。不要填写日常间隔和概率、普通回复秒数；时间、档位、提醒与重试由本地决定。dialogue只记录mode(immediate/waiting/casual/finished)和awaiting；必要追问使用followup，避免重复催促。
结构示例：${JSON.stringify(shape)}
上一张记录（绝对毫秒时间，本地已推进）：${JSON.stringify(memo)}
本地睡眠：${JSON.stringify(s.sleep||null)}；已失效ID：${JSON.stringify(s.usedNodes.slice(-12))}
待复核事件（本轮随聊天更新，不额外调用）：${JSON.stringify(s.events.filter(e=>e.phase==='unknown').map(e=>({id:e.id,subject:e.subject,title:e.title,end_at:e.endAt})))}
当前日常档位：${s.level}；${window.UwULocation?.prompt(chat)||''}
当前时间：${window.UwULocation?.current(chat)||new Date().toLocaleString()}；时间戳${Date.now()}。
</生活纸条格式>\n`.replaceAll('{{user}}',chat.myName||'对方');
    }
    function backgroundPrompt(chat, options) {
        if (options?.kind === 'reply') return '[系统任务：用户发来新消息，现在到了角色方便回复的时机。自然回应最新消息，不把等待时间或内部调度当作话题。]';
        const plan = state(chat).plan;
        return `[系统任务：现在到了你自己先前安排的联系时机。联系方向：${plan?.direction || '自然地承接上下文'}；动机：${plan?.motive || '依人设自然联系'}。这次主动消息同样必须在末尾追加新的完整life_note，重新判断下一次安排或沉默，不要因为用户未发新消息而省略纸条。读取最新聊天，不因用户沉默就编造其情绪，不重复已经说过的话，不提纸条、概率、调度。]`;
    }
    function randomBetween(min, max) { return min + Math.random() * Math.max(0, max - min); }
    function rememberUsed(s, id) {
        if (id && !s.usedNodes.includes(id)) s.usedNodes.push(id);
        // 本地失效ID台账不进入整张纸条，仅给模型最近12项；避免很久以前的ID被重用。
    }
    function retire(chat, node, reason) {
        const s = state(chat);
        rememberUsed(s, node.id);
        s.nodes = s.nodes.filter(n => n.id !== node.id);
        if (s.plan?.id === node.id) s.plan = null;
        s.lastDecision = reason;
    }
    function clearNodes(s, reason) {
        const keep=window.UwURealReply85&&reason?s.nodes.filter(n=>n.kind==='promise'):[];
        for (const n of s.nodes) if(!keep.includes(n))rememberUsed(s,n.id);
        s.nodes=keep;s.plan=keep[0]||null;
        if (reason) s.lastDecision = reason;
    }
    // 预计时段结束按完成移出待办；只有聊天内明确未完成的事项继续保留。
    function unfinishedConfirmed(chat,e) {
        const proof=e.unfinishedEvidence;
        return e.unfinishedVerified===true || !!proof && (chat.history||[]).some(m=>m.role==='assistant'&&!m.isThinking&&stripNote(m.content).clean.includes(proof));
    }
    function advanceEvents(chat, now = Date.now()) {
        const s=state(chat);let changed=false;
        s.events=s.events.filter(e=>{
            if(e.endAt>now)return !['completed','cancelled'].includes(e.phase);
            if(unfinishedConfirmed(chat,e)||window.UwURealReply85){
                if(e.phase!=='unknown'||!e.timeElapsed){e.phase='unknown';e.timeElapsed=true;changed=true;}
                return true;
            }
            changed=true;return false;
        });
        if(s.note)s.note.events=s.events.map(e=>({...e}));
        return changed;
    }
    function activityRemaining(chat, now = Date.now()) {
        const s = state(chat);
        return Math.max(0, ...s.events.filter(e => e.startAt <= now && e.endAt > now
            && e.phase !== 'paused' && !['completed', 'cancelled', 'unknown'].includes(e.phase)
            && ['unavailable', 'sleep'].includes(e.availability)).map(e => e.endAt - now));
    }
    function sleepRemaining(chat, now = Date.now()) {
        const s = state(chat), sleep = s.sleep;
        if (!sleep) return 0;
        if (now >= sleep.wakeAt) { s.sleep = null; s.eventSleeping=false; clearNodes(s, '预计睡眠时段结束，不补发旧节点'); window.SmartReplyControl?.onWake(chat,sleep.wakeAt,now); return 0; }
        return now >= sleep.startsAt ? sleep.wakeAt - now : 0;
    }
    function mergeEvents(chat, incoming, now) {
        const s = state(chat);
        advanceEvents(chat, now);
        const records = new Map(s.events.map(e => [e.id, { ...e }]));
        const endings = [];
        const needed=new Set(incoming.filter(e=>e.toldToUser&&e.toldEvidence&&!records.get(e.id)?.toldToUser).map(e=>e.toldEvidence));
        const heard=new Set();
        for(let i=(chat.history||[]).length-1;i>=0&&heard.size<needed.size;i--){const m=chat.history[i];if(m.role!=='assistant'||m.isThinking)continue;const body=stripNote(m.content).clean;for(const proof of needed)if(body.includes(proof))heard.add(proof);}
        for (const e of incoming) {
            const old = records.get(e.id);
            let updated = { ...e,
                startAt: e.startAt ?? now + e.startMinutes * MINUTE,
                endAt: e.endAt ?? now + e.endMinutes * MINUTE,
                toldToUser: !!(e.toldToUser && e.toldEvidence && heard.has(e.toldEvidence))
            };
            if (old) {
                // 漏掉事实依据不能把仍有效的事件改成完成、取消、空闲或重新计时。
                if (!e.changeReason) updated = { ...old, contactMotive: e.contactMotive || old.contactMotive };
                else {updated.toldToUser = old.toldToUser || updated.toldToUser;updated.unfinishedEvidence=e.unfinishedEvidence||(updated.endAt===old.endAt?old.unfinishedEvidence:'');}
                if (e.toldToUser && e.toldEvidence && heard.has(e.toldEvidence)) {
                    updated.toldToUser = true; updated.toldEvidence = e.toldEvidence;
                }
            }
            updated.unfinishedVerified=!!updated.unfinishedEvidence&&((old?.unfinishedVerified&&updated.endAt===old.endAt&&updated.unfinishedEvidence===old.unfinishedEvidence)||(chat.history||[]).some(m=>m.role==='assistant'&&!m.isThinking&&stripNote(m.content).clean.includes(updated.unfinishedEvidence)));
            if (updated.endAt < updated.startAt) updated.endAt = updated.startAt;
            if (['completed', 'cancelled'].includes(updated.phase)) {
                if (!updated.changeReason || !updated.result) {
                    if (old) updated = { ...old }; else updated.phase = 'unknown';
                } else { records.delete(e.id); endings.push(updated.title + '：' + updated.result); continue; }
            }
            records.set(e.id, updated);
        }
        // 保留漏写的旧事件；容量满时不让新远期安排挤掉正在进行的事件和约定。
        const rank = e => (e.priority === 'promise' ? 0 : e.priority === 'important' ? 10 : 20)
            + (s.events.some(old => old.id === e.id) ? 0 : 4);
        s.events = [...records.values()].sort((a,b) => rank(a)-rank(b) || a.startAt-b.startAt).slice(0,4);
        advanceEvents(chat, now);
        if (endings.length) s.eventSummary = ((s.eventSummary || '') + '；' + endings.join('；')).slice(-360);
    }
    function commit(chat, note, kind) {
        const s = state(chat);
        if (!s.enabled) return;
        const now = Date.now(), user = latestUser(chat), used = ['proactive','metadata_proactive'].includes(kind) ? s.plan : null;
        if (s.lastUserId !== user?.id) { s.unansweredRounds = 0; s.followupRounds = 0; }
        s.lastUserId = user?.id || null;
        if (kind === 'proactive') {
            s.unansweredRounds = (s.unansweredRounds || 0) + 1;
            if (used?.kind !== 'routine') s.followupRounds = (s.followupRounds || 0) + 1;
            s.lastProactiveAt = now;
        }
        const previousNodes = s.nodes.slice();
        if (used) {rememberUsed(s, used.id);window.SmartReplyControl?.consumedBackground(chat,used,now);s.backgroundTask=null;}
        s.pendingReply = null; s.autoErrorPause=false; s.lastError = ''; s.retryAt = 0; s.failures = 0;
        s.noteSerial++; s.noteSignature = signature(chat); s.lastDecision = '';
        if (!note) {
            if(kind==='proactive'||kind==='reply'||kind===undefined)window.SmartReplyControl?.contacted(chat,now);
            // 不丢失生活状态，但无效纸条不能让旧联系节点重复执行。
            s.nodes = previousNodes.filter(n => n.id !== used?.id && !s.usedNodes.includes(n.id)
                && n.expiresAt > now && n.archiveId === (chat.activeArchiveId || null)
                && n.userId === (user?.id || null)).map(n=>({...n,signature:signature(chat)}));
            s.plan = s.nodes[0] || null;
            advanceEvents(chat,now);
            s.paperWarning = '本轮纸条未能解析，已保留上一张记录和剩余有效机会';
            s.lastDecision = s.paperWarning; return;
        }
        s.paperWarning = '';
        if (note.recoveredParts) {
            const present = new Set(note.recoveredParts);
            const previous = s.note;
            note = {...note};
            for(const key of ['baseline','situation','reply','sleep']) if(!present.has(key)) note[key]=previous?.[key] || (key==='sleep'?null:note[key]);
            if(!present.has('events')) note.events=[];
            if(!present.has('opportunities') && !present.has('next')) {
                note.keepRemainingNodes = true;
            }
            if(note.recoveredParts.length < 6) s.paperWarning = '纸条部分恢复，缺失字段继承上次记录';
        }
        window.SmartReplyControl?.updatePaper(chat,note,note.recoveredParts?new Set(note.recoveredParts):null,now);
        if(kind==='proactive'||kind==='reply'||kind===undefined)window.SmartReplyControl?.contacted(chat,now);
        const rest = note.sleep;
        const oldSleep = s.sleep;
        s.sleep = rest && rest.state !== 'awake' ? (oldSleep && oldSleep.wakeAt > now && !rest.change_reason ? oldSleep : {
            state: rest.state, startsAt: now + (rest.state === 'asleep' ? 0 : rest.onset_minutes * MINUTE),
            wakeAt: now + Math.max(rest.state === 'asleep' ? 1 : rest.onset_minutes + 1,
                randomBetween(rest.wake_min_minutes, rest.wake_max_minutes)) * MINUTE,
            basis: rest.basis, certainty: rest.certainty
        }) : (oldSleep && oldSleep.wakeAt > now && !rest?.change_reason ? oldSleep : null);
        mergeEvents(chat, note.events || [], now);
        s.note = { ...note, events: s.events.map(e => ({...e})), summary: (note.summary || s.eventSummary || '').slice(0,360) };
        s.noteAt = now;
        if(!s.dailyWindow && s.dailyPolicy?.enabled)window.SmartReplyControl?.scheduleDaily(chat,now);
        const candidates = note.keepRemainingNodes ? [] : note.opportunities !== null && Array.isArray(note.opportunities)
            ? note.opportunities : (note.next?.kind !== 'none' ? [note.next] : []);
        const nodes = [];
        for (const n of candidates.slice(0,3)) {
            const id = n.id || 'note-' + s.noteSerial + '-' + nodes.length;
            if (s.usedNodes.includes(id) || nodes.some(p => p.id === id) || !n.motive || (n.probability <= 0 && !(n.kind!=='routine'&&window.SmartReplyControl?.immediate(chat,now)))) continue;
            if (!['routine','promise'].includes(n.kind) && s.followupRounds >= n.max_unanswered_rounds) {
                rememberUsed(s,id); s.lastDecision = '已达到追发上限'; continue;
            }
            const completedEvent = (note.events || []).some(e => e.id === n.eventId && e.phase === 'completed' && e.changeReason && e.result);
            if (n.eventId && !s.events.some(e => e.id === n.eventId) && !completedEvent) continue;
            const old = previousNodes.find(p => p.id === id);
            let delay = randomBetween(n.min_minutes, n.max_minutes) * MINUTE;
            if (n.kind === 'routine') delay = Math.max(delay, note.reply.busy_until_minutes * MINUTE);
            const dueAt = old?.dueAt ?? n.dueAt ?? now + delay;
            nodes.push(old ? { ...old, signature: signature(chat) } : {
                ...n, id, dueAt, expiresAt: now + n.expires_minutes * MINUTE,
                maxRounds:n.max_unanswered_rounds, eventId:completedEvent ? '' : (n.eventId || ''),
                respectActivity:n.respectActivity !== false,
                userId:user?.id || null, archiveId:chat.activeArchiveId || null,
                signature:signature(chat), decided:false, accepted:false, ...window.SmartReplyControl?.chanceSeed()
            });
        }
        if (note.keepRemainingNodes) for(const old of previousNodes) if(old.id!==used?.id && !s.usedNodes.includes(old.id) && old.expiresAt>now) nodes.push({...old,signature:signature(chat)});
        for (const old of previousNodes) if (!nodes.some(n => n.id === old.id)) rememberUsed(s,old.id);
        s.nodes = nodes.sort((a,b) => a.dueAt-b.dueAt); s.plan = s.nodes[0] || null;
        if (sleepRemaining(chat, now)) clearNodes(s, '睡眠暂停');
        else if (s.sleep) {
            for (const n of s.nodes.slice()) if (n.kind !== 'promise' && (n.kind !== 'followup' || n.dueAt >= s.sleep.startsAt)) retire(chat,n,'准备睡觉，只保留入睡前收尾');
            s.plan = s.nodes[0] || null;
        }
        if (!s.nodes.length && !s.lastDecision) s.lastDecision = '纸条未安排后续联系，暂时沉默';
    }
    function onUser(chat, message, willSave=false) {
        if(window.UwURealReply85)return window.UwURealReply85.onUser(chat,message,Date.now(),willSave);
        const s = state(chat);
        if (!s.enabled || message.role !== 'user' || !visible(message)) return;
        if (s.pendingReply?.userId === message.id) return;
        clearNodes(s); s.lastUserId = message.id; s.unansweredRounds = 0; s.followupRounds = 0; s.lastDecision = '';
        s.retryAt = 0; s.failures = 0; s.autoErrorPause=false; s.lastError = '';
        const now = Date.now();
        window.SmartReplyControl?.sent(chat,message,now);
        if(busy(chat)&&!requests.get(chat.id)?.interleaved)cancelAutomatic(chat);
        const urgent = /(?:快回我|紧急|很急|急事|救命|马上回复)/.test(String(message.content || ''));
        const note = s.note;
        let delay;
        if(window.SmartReplyControl?.immediate(chat,now)) { const d=s.dialogue;delay=randomBetween(d.reply_min_seconds,Math.max(d.reply_min_seconds,d.reply_max_seconds))*1000; }
        else if (urgent || note?.situation.urgency >= 0.8) delay = randomBetween(3, 12) * 1000;
        else {
            const r = note?.reply || { min_seconds: 15, max_seconds: 90, busy_until_minutes: 0 };
            delay = randomBetween(r.min_seconds, Math.max(r.min_seconds, r.max_seconds)) * 1000;
            const busyRemaining = Math.max(0, (s.noteAt || now) + r.busy_until_minutes * MINUTE - now);
            delay = Math.max(delay, busyRemaining, activityRemaining(chat, now));
        }
        if(window.SmartReplyControl?.immediate(chat,now)&&!s.dialogue.can_interrupt_activity)delay=Math.max(delay,activityRemaining(chat,now));
        if(window.SmartReplyControl?.immediate(chat,now)&&s.dialogue.can_interrupt_activity)delay=Math.min(delay,Math.max(s.dialogue.reply_min_seconds,s.dialogue.reply_max_seconds)*1000);
        const restRemaining = Math.max(sleepRemaining(chat, now), ...s.events.filter(e => e.availability === 'sleep' && e.startAt <= now && e.endAt > now && !['paused','completed','cancelled','unknown'].includes(e.phase)).map(e => e.endAt-now));
        delay = Math.max(delay, restRemaining);
        // 连续输入并入同一轮，不因每条新消息都把普通等待重新推满。
        const old = s.pendingReply;
        s.pendingReply = {
            userId: message.id, archiveId: chat.activeArchiveId || null,
            interleaveAt:now+randomBetween(8,12)*1000,
            dueAt: Math.max(now + restRemaining, old ? Math.min(old.dueAt, now + delay) : now + delay),
            expiresAt: now + DAY
        };
    }
    function activeStatus(chat) {
        const s = state(chat);
        if (!s.enabled) return '未开启';
        advanceEvents(chat);
        const events = s.events.map(e => e.title + '（' + ({planned:'计划中',ongoing:'进行中',paused:'暂停',unknown:'时段已过，未完成'}[e.phase] || e.phase) + '）').join('、');
        let status;
        if (sleepRemaining(chat)) status = '角色正在睡觉，预计 ' + new Date(s.sleep.wakeAt).toLocaleString() + ' 醒来；期间不调用 API';
        else if(window.SmartReplyControl?.allowed(chat,true)==='outside_hours') status='真人回复暂停：当前不在生效时段，手动仍可回复';
        else if(window.SmartReplyControl?.allowed(chat,true)==='budget')status='今日自动调用已达到上限，手动仍可回复';
        else if(s.autoErrorPause)status='连续调用失败，自动功能暂停；检查 API 后手动回复可恢复';
        else if (s.lastError) status = s.lastError;
        else if(window.SmartReplyControl?.proactivePaused(chat))status='按明确约定暂停主动联系：'+s.dailyPolicy.pause_reason;
        else if (s.pendingReply) status = '等待合适时机回复你的消息';
        else if (!s.note) status = '下一次正常回复会记录纸条；等待时不调用 API';
        else if (busy(chat)) status='正在生成回复';
        else if (s.nodes.length) status = '剩余 ' + s.nodes.length + ' 个联系机会；下一次尝试联系预计 ' + new Date(s.nodes[0].dueAt).toLocaleString();
        else status = s.dailyWindow ? '独立日常线运行中，下一次尝试联系预计 '+new Date(s.dailyWindow.dueAt).toLocaleString()+(s.lastDecision?'；'+s.lastDecision:'') : (s.lastDecision || '暂时没有主动安排');
        return status + (window.SmartReplyControl?'；'+window.SmartReplyControl.status(chat):'') + (s.paperWarning ? '；'+s.paperWarning : '') + (s.noteAt ? '；纸条更新于 ' + new Date(s.noteAt).toLocaleString() : '') + (events ? '；事件：' + events : '');
    }
    async function run(chat, kind) {
        const s = state(chat), node = kind === 'proactive' ? s.plan : null;
        const outcome = await getAiReply(chat.id, 'private', true, { kind, automatic: true, ...(window.SmartReplyControl?.replyOptions(chat,kind)||{}) });
        // 成功会由commit替换队列，不能在这里再清空刚生成的新安排。
        if (outcome?.status === 'ok' || outcome?.status === 'metadata' || outcome?.status === 'busy' || outcome?.status === 'sleeping') return;
        if(['outside_hours','budget','api_error'].includes(outcome?.status))return;
        if (outcome?.status === 'cancelled') {
            if (node && s.nodes.some(n => n.id === node.id)) retire(chat,node,'用户停止本次生成');
            else if (kind === 'reply') s.pendingReply = null;
            return;
        }
        if (outcome?.status === 'stale') {
            if (node && s.nodes.some(n => n.id === node.id)) retire(chat,node,'上下文已变化，旧机会取消');
            return;
        }
        const task = node || s.pendingReply;
        if (!task) return;
        task.failures = (task.failures || 0) + 1;
        s.failures = task.failures;
        task.retryAt = Date.now() + Math.min(60, 5 * 2 ** Math.min(4, task.failures-1)) * MINUTE;
        s.retryAt = task.retryAt;
        s.lastError = '自动回复暂未成功，请检查 API；稍后重试';
        if (task.failures >= 3) {
            s.autoErrorPause=true;
            if(node?.source){window.SmartReplyControl?.consumedBackground(chat,node);s.backgroundTask=null;s.plan=null;}
            else if (node) retire(chat,node,'该联系机会连续失败，等待其他机会'); else s.pendingReply = null;
            s.retryAt = 0; s.lastError = '本次自动回复连续失败，已暂停该任务';
        }
    }
    function refreshStatus(chat) {
        if (typeof document === 'undefined' || typeof currentChatId === 'undefined' || currentChatId !== chat.id) return;
        const el = document.getElementById('smart-reply-status');
        if (el) el.textContent = activeStatus(chat);
    }
    async function tick() {
        if(window.UwURealReply85)return window.UwURealReply85.tick();
        if (ticking || typeof db === 'undefined' || isGenerating) return;
        ticking = true; let changed = false;
        try {
            for (const chat of db.characters || []) {
                const s = state(chat);
                if (!s.enabled || busy(chat)) continue;
                if (isGenerating) break;
                changed = advanceEvents(chat) || changed;
                const user = latestUser(chat), assistant = latestMessage(chat,'assistant');
                const ui = user ? chat.history.lastIndexOf(user) : -1, ai = assistant ? chat.history.lastIndexOf(assistant) : -1;
                if (user && !user.isManualInsertion && ui > ai && s.lastUserId !== user.id) { onUser(chat,user); changed = true; }
                const now = Date.now(), hadSleep = !!s.sleep;
                window.SmartReplyControl?.advanceSilence(chat,now);
                const wasEventSleeping=s.eventSleeping===true;
                const rest = Math.max(sleepRemaining(chat,now), ...s.events.filter(e => e.availability === 'sleep' && e.startAt <= now && e.endAt > now && !['paused','completed','cancelled','unknown'].includes(e.phase)).map(e => e.endAt-now));
                if (hadSleep && !s.sleep) changed = true;
                if(wasEventSleeping&&!rest&&!hadSleep){window.SmartReplyControl?.onWake(chat,now,now);changed=true;}
                s.eventSleeping=rest>0;
                if (rest) {
                    if (s.nodes.length) { clearNodes(s,'睡眠暂停'); changed = true; }
                    if (s.pendingReply && s.pendingReply.dueAt < now+rest) { s.pendingReply.dueAt = now+rest; changed = true; }
                    refreshStatus(chat); continue;
                }
                const control=window.SmartReplyControl;
                const reason=control?.allowed(chat,true);
                if(reason){s.wasAllowed=false;refreshStatus(chat);continue;}
                if(s.wasAllowed===false){for(const old of s.nodes.slice())if(old.dueAt<now)retire(chat,old,'时段或额度恢复，不补发已错过的主动机会');control?.scheduleDaily(chat,now);if(s.wakeWindow&&s.wakeWindow.expiresAt<=now)s.wakeWindow=null;s.backgroundTask=null;s.wasAllowed=true;changed=true;}
                if (s.pendingReply) {
                    const pending = s.pendingReply;
                    if (pending.archiveId !== (chat.activeArchiveId || null) || pending.userId !== user?.id || (ai > ui && !pending.allowAssistantAfterUser) || now > pending.expiresAt) {
                        s.pendingReply = null; changed = true;
                    } else if ((now >= pending.dueAt || (control?.earlyReply(chat,now) && now >= pending.interleaveAt)) && now >= (pending.retryAt || 0) && (!control||control.ready(chat,'reply',now))) { await run(chat,'reply'); changed = true; }
                    refreshStatus(chat); continue;
                }
                const turnSignature=s.nodes.length?signature(chat):null;
                let dispatched=false;
                s.plan = null;
                for (const node of s.nodes.slice().sort((a,b)=>a.dueAt-b.dueAt)) {
                    if (node.archiveId !== (chat.activeArchiveId || null) || node.signature !== turnSignature
                        || node.userId !== (user?.id || null) || now > node.expiresAt
                        || (node.kind !== 'routine' && s.followupRounds >= node.maxRounds)
                        || (node.eventId && !s.events.some(e => e.id === node.eventId && e.phase !== 'cancelled'))) {
                        retire(chat,node,now > node.expiresAt ? '一个联系机会已过期，继续等待其他节点' : '旧机会失效或达到追发上限'); changed = true; continue;
                    }
                    if (s.sleep && (node.kind !== 'followup' || node.dueAt >= s.sleep.startsAt)) { retire(chat,node,'即将入睡，取消该机会'); changed = true; continue; }
                    // 尊重活动和纸条时间，不施加固定五分钟间隔。
                    const canInterrupt=control?.immediate(chat,now)&&s.dialogue.can_interrupt_activity&&node.kind!=='routine';
                    const availableAt = node.respectActivity !== false && !canInterrupt ? now + activityRemaining(chat,now) : now;
                    const spacingAt = 0;
                    if (Math.max(availableAt,spacingAt) > node.dueAt) { node.dueAt = Math.max(availableAt,spacingAt); changed = true; }
                    if (now < node.dueAt || now < (node.retryAt || 0) || (control&&!control.ready(chat,'proactive',now,node))) continue;
                    if(control?.proactivePaused(chat,now))continue;
                    if(node.kind==='routine'&&control?.immediate(chat,now))continue;
                    s.plan = node;
                    if (!node.decided) {
                        node.accepted = (node.kind!=='routine'&&control?.immediate(chat,now)) || Math.random() < (control&&node.kind==='routine'?control.contactChance(chat,node,now):node.probability);
                        node.decided = true; changed = true;
                        await saveData();
                    }
                    if (!node.accepted) { retire(chat,node,'一个联系机会未触发，继续等待其他节点'); changed = true; continue; }
                    if(s.pendingReply||!s.nodes.some(n=>n.id===node.id)||node.signature!==signature(chat))break;
                    await run(chat,'proactive'); changed = true; dispatched=true;
                    break; // 新纸条的队列留给下一次tick，不在旧队列循环中覆盖它。
                }
                // 若具体节点未执行，独立日常线仍可在自己的窗口联系。
                if(control && !dispatched && !s.pendingReply && !busy(chat) && s.note && control.ready(chat,'proactive',now)
                    && (s.lastContactAt||0)!==now) {
                    const opportunity=await control.backgroundOpportunity(chat,now);
                    if(opportunity && now>=(opportunity.retryAt||0)) {s.plan=opportunity;await run(chat,'proactive');changed=true;}
                }
                s.nodes.sort((a,b)=>a.dueAt-b.dueAt);
                if (!s.plan || !s.nodes.some(n=>n.id===s.plan.id)) s.plan = s.nodes[0] || null;
                refreshStatus(chat);
            }
            if (changed) await saveData();
        } finally { ticking = false; }
    }
    function thinkingElement(message) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper received thinking-toggle-wrapper';
        wrapper.dataset.id = message.id;
        const details = document.createElement('details');
        details.className = 'thinking-glass';
        const summary = document.createElement('summary');
        summary.textContent = '展开思维链';
        const body = document.createElement('pre');
        body.className = 'thinking-glass-content';
        // 只展示项目原本存储的 thinking 文本，不获取接口未返回的内部推理。
        body.textContent = stripNote(String(message.content || '')).clean.replace(/^\s*<thinking>/, '').replace(/<\/thinking>\s*$/, '').trim();
        details.addEventListener('toggle', () => { summary.textContent = details.open ? '收起思维链' : '展开思维链'; });
        details.append(summary, body); wrapper.appendChild(details);
        return wrapper;
    }
    window.SmartMessaging = {
        state, settings, instructions, backgroundPrompt, stripNote, normalize, commit, onUser,
        checkpoint, rollback, tick, activeStatus, thinkingElement, begin, end, busy, stop, capture, current, finishCrossedReply, sleepRemaining, advanceEvents, mergeEvents, activityRemaining, cancelAutomatic
    };
})();
