// v18：持久化总结任务、独立聊天段落及大小总结来源。
(() => {
    const MINUTE=60000;
    const clone=v=>JSON.parse(JSON.stringify(v));
    const uid=()=> 'journal_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const chats=()=>[...(db.characters||[]),...(db.groups||[])];
    const typeOf=c=>(db.groups||[]).includes(c)?'group':'private';
    const currentChat=()=>currentChatType==='group'?db.groups.find(c=>c.id===currentChatId):db.characters.find(c=>c.id===currentChatId);
    const fingerprint=m=>{const value=JSON.stringify([m.content,m.parts,m.timestamp]);let a=2166136261,b=5381;for(let i=0;i<value.length;i++){a=Math.imul(a^value.charCodeAt(i),16777619);b=Math.imul(b,33)^value.charCodeAt(i);}return `${value.length}:${a>>>0}:${b>>>0}`;};
    // 隐藏的附加输出不是总结来源；按消息身份核对，不以可变楼层定位。
    const isAuxiliary=m=>!!(m&&(m.isThinking||m.isStatusUpdate||typeof m.content==='string'&&/^\s*<(?:thinking|preplan)(?:\s|>)/i.test(m.content)));
    const summaryMessages=list=>(list||[]).filter(m=>!isAuxiliary(m));
    function trackingIds(j,map) {
        if(j.sourceTrackingVersion!==2){
            // 旧数据没有保存来源类型。已经消失的条目无法分辨是聊天还是自动清理的附加输出，
            // 仅在此次迁移建立可核对名单；保留原覆盖账本和仍在的聊天指纹，不重写总结。
            j.sourceTrackingIds=(j.sourceIds||[]).filter(id=>map.has(id)&&!isAuxiliary(map.get(id)));
            j.sourceTrackingVersion=2;j.changeNotified=false;
        }
        return j.sourceTrackingIds||[];
    }
    const key=(segment,id)=>segment+':'+id;
    const notices=new Map();
    let running=false,ready=false,prompting=false;
    function state(chat) {
        if(!chat.journalAutomation)chat.journalAutomation={segment:1,jobs:[],small:{enabled:false,mode:'count',count:1000,days:1},big:{enabled:false,mode:'count',count:4000,amount:1,unit:'month'},mergeWorldBookIds:[]};
        const s=chat.journalAutomation;
        s.jobs=s.jobs||[];s.segment=s.segment||1;s.processedCoverage=s.processedCoverage||[];s.big.pieces=s.big.pieces||7;
        if(!Array.isArray(s.mergeStages95)){
            s.mergeStages95=[{...s.big,id:'legacy-big95'}];
            if(s.higher?.enabled)s.mergeStages95.push({id:'legacy-higher95',enabled:true,mode:'count',count:Number(s.higher.count)||4000,pieces:4,amount:1,unit:'month'});
        }
        for(const stage of s.mergeStages95){if(!stage.id)stage.id=uid();stage.mode=stage.mode||'count';stage.pieces=Number(stage.pieces)||4;stage.amount=Number(stage.amount)||1;stage.unit=stage.unit||'month';}
        s.big=s.mergeStages95[0]||{enabled:false,mode:'count',count:4000,pieces:7,amount:1,unit:'month'};
        ensureMergeScope96(chat,s);
        return s;
    }
    function ensureMergeScope96(chat,s){
        if(s.mergeScope96){
            if(s.mergeScope96.version<2){const scope=s.mergeScope96;scope.excludedCoverage=[...new Set([...(scope.excludedCoverage||[]),...summaryMessages(chat.history).filter(m=>validTime(m.timestamp)===null||validTime(m.timestamp)<=scope.startedAt).map(m=>key(s.segment,m.id))])];scope.version=2;}
            return;
        }
        if(!s.mergeStages95[0]?.enabled)return;
        const existing=chat.memoryJournals||[];
        s.mergeScope96={version:2,startedAt:Date.now(),excludedIds:[...new Set([...existing.map(j=>j.id),...s.jobs.filter(j=>!j.targetId).map(j=>j.resultId).filter(Boolean)])],excludedCoverage:[...new Set([...collectCoverage(existing),...summaryMessages(chat.history).map(m=>key(s.segment,m.id))])]};
        // Old automatic merge jobs must not pull historical summaries into this run.
        // Manual requests, regeneration and the small-summary schedule are retained.
        s.jobs=s.jobs.filter(job=>job.kind!=='merge'||job.targetId||job.useSavedContent);
    }
    function validTime(value) {
        if(value===null||value===undefined||value===''||typeof value==='boolean')return null;
        const t=typeof value==='number'?value:typeof value==='string'?(value.trim()!==''&&Number.isFinite(Number(value))?Number(value):Date.parse(value)):NaN;
        return Number.isFinite(t)&&Number.isFinite(new Date(t).getTime())?t:null;
    }
    function applyMessageTimes(j,list) {
        const times=list.map(m=>validTime(m.timestamp)).filter(t=>t!==null);
        j.sourceTimeStart=times[0]??null;j.sourceTimeEnd=times.at(-1)??null;
        j.periodStart=j.sourceTimeStart;j.periodEnd=j.sourceTimeEnd;
        j.messageTimeRangeVersion=1;j.timeRangeUnknown=!times.length;
    }
    function refreshMessageTimes(chat) {
        const map=new Map((chat.history||[]).map((m,i)=>[String(m.id),{m,i}]));
        const journals=chat.memoryJournals||[];
        for(const j of journals.filter(j=>!j.isMerged)){
            const found=(j.sourceIds||[]).map(id=>map.get(String(id))).filter(Boolean).sort((a,b)=>a.i-b.i);
            if(found.length&&!j.sourceCleared)applyMessageTimes(j,found.map(x=>x.m));
            else if(!j.messageTimeRangeVersion){const start=validTime(j.sourceTimeStart),end=validTime(j.sourceTimeEnd);if(j.sourceCleared&&!j.dateEstimated&&start!==null&&end!==null&&!(start===j.createdAt&&end===j.createdAt)){j.periodStart=start;j.periodEnd=end;j.timeRangeUnknown=false;}else{j.sourceTimeStart=null;j.sourceTimeEnd=null;j.periodStart=null;j.periodEnd=null;j.timeRangeUnknown=true;}j.messageTimeRangeVersion=1;}
        }
        const visited=new Set(),visiting=new Set();
        const update=j=>{if(visited.has(j.id)||visiting.has(j.id))return;visiting.add(j.id);const children=journals.filter(c=>(j.childIds||[]).includes(c.id));for(const c of children)if(c.isMerged)update(c);const starts=children.map(c=>validTime(c.periodStart)).filter(t=>t!==null),ends=children.map(c=>validTime(c.periodEnd)).filter(t=>t!==null);if(starts.length&&ends.length){j.periodStart=Math.min(...starts);j.periodEnd=Math.max(...ends);j.sourceTimeStart=j.periodStart;j.sourceTimeEnd=j.periodEnd;j.messageTimeRangeVersion=1;j.timeRangeUnknown=false;}else if(!j.messageTimeRangeVersion){j.periodStart=null;j.periodEnd=null;j.sourceTimeStart=null;j.sourceTimeEnd=null;j.messageTimeRangeVersion=1;j.timeRangeUnknown=true;}visiting.delete(j.id);visited.add(j.id);};
        for(const j of journals.filter(j=>j.isMerged))update(j);
    }
    function attach(chat,j,messages,options={}) {
        const s=state(chat),list=summaryMessages(messages);
        j.segment=options.segment||s.segment;
        j.sourceIds=list.map(m=>m.id);
        j.coverage=j.sourceIds.map(id=>key(j.segment,id));
        j.sourcePrints=Object.fromEntries(list.map(m=>[m.id,fingerprint(m)]));
        j.sourceTrackingIds=[...j.sourceIds];j.sourceTrackingVersion=2;
        j.coveredCount=j.coverage.length;
        j.summaryMode=options.mode||'manual';
        applyMessageTimes(j,list);
        j.originalRange={...j.range};
        j.isMerged=false;
    }
    function migrate(chat) {
        const s=state(chat);
        // Repair v18's inferred 'cleared' tag without asserting that source records exist.
        for(const j of chat.memoryJournals||[])if(j.sourceCleared&&j.dateEstimated&&j.segment===0&&!(j.sourceIds||[]).length&&!j.clearConfirmed){
            delete j.sourceCleared;j.sourceUnverified=true;
        }
        const legacyJournals=(chat.memoryJournals||[]).filter(j=>!j.coverage||j.dateEstimated&&!j.clearConfirmed);
        for(const j of chat.memoryJournals||[])if(!j.coverage){
            const list=(chat.history||[]).slice(Math.max(0,j.range?.start-1),j.range?.end||0);
            // Endpoint identities must match; never attach old floors to new messages.
            const matches=(!j.startMessageId||j.startMessageId===list[0]?.id)&&(!j.endMessageId||j.endMessageId===list.at(-1)?.id);
            if(matches&&list.length)attach(chat,j,list);
            else {
                j.segment=0;j.originalRange={...j.range};j.sourceIds=[];j.sourcePrints={};
                j.coverage=Array.from({length:Math.max(0,(j.range?.end||0)-(j.range?.start||1)+1)},(_,i)=>key(0,'legacy-floor-'+((j.range?.start||1)+i)));
                j.coveredCount=j.coverage.length;j.periodStart=j.createdAt;j.periodEnd=j.createdAt;j.sourceUnverified=true;j.dateEstimated=true;
            }
        }
        const history=chat.history||[];
        for(const j of chat.memoryJournals||[])if(j.sourceUnverified&&!j.clearConfirmed&&j.startMessageId&&j.endMessageId){
            const start=history.findIndex(m=>m.id===j.startMessageId),end=history.findIndex(m=>m.id===j.endMessageId);
            if(start>=0&&end>=start){
                const retained={title:j.title,content:j.content,isFavorited:j.isFavorited,createdAt:j.createdAt};
                attach(chat,j,history.slice(start,end+1));Object.assign(j,retained);
                delete j.sourceUnverified;delete j.dateEstimated;
            }
        }
        s.processedCoverage=[...new Set([...s.processedCoverage,...collectCoverage(chat.memoryJournals||[])])];
        const savedBoundaries=(chat.memoryJournals||[]).filter(j=>!j.clearConfirmed&&!j.isMerged&&j.endMessageId);
        if((legacyJournals.length||savedBoundaries.length)&&!s.legacyBoundary&&s.segment===1){
            const latest=[...(savedBoundaries.length?savedBoundaries:legacyJournals)].sort((a,b)=>(b.range?.end||0)-(a.range?.end||0)||(b.createdAt||0)-(a.createdAt||0))[0];
            let at=history.findIndex(m=>m.id===latest.endMessageId);
            if(at<0||isAuxiliary(history[at])){
                const ids=new Set(latest.sourceIds||[]);
                at=history.findLastIndex(m=>ids.has(m.id)&&!isAuxiliary(m));
            }
            s.legacyBoundary={segment:s.segment,endMessageId:at>=0?history[at].id:null,oldRangeEnd:latest.range?.end||0,confirmed:at>=0};
        }
        refreshMessageTimes(chat);
        reconcileCompletedJobs(chat);
        return s;
    }
    function clearHistory(chat) {
        window.VectorMemory?.onHistoryCleared(chat);
        const s=migrate(chat);
        for(const j of chat.memoryJournals||[])if(!j.isMerged&&!j.sourceIndependent&&j.segment===s.segment){j.sourceCleared=true;j.clearConfirmed=true;}
        for(const job of s.jobs)if(job.kind==='small'&&job.segment===s.segment){job.sourceCleared=true;}
        s.segment++;delete s.dayCursor;delete s.rollReplacement;delete s.legacyBoundary;
    }
    // Completed summaries can supersede a failed automatic batch, including across reloads.
    // Match stable message IDs, segment and content; a written standalone memory is not coverage.
    function reconcileCompletedJobs(chat) {
        const s=state(chat),papers=(chat.memoryJournals||[]).filter(j=>!j.isMerged&&!j.sourceIndependent&&!j.sourceUnverified&&!j.needsUpdate&&String(j.content||'').trim());
        let changed=false;
        s.jobs=s.jobs.filter(job=>{
            if(job.kind!=='small'||job.targetId||(job.archiveId||null)!==(chat.activeArchiveId||null))return true;
            const messages=job.messages||[],remaining=messages.filter(m=>!papers.some(j=>j.segment===job.segment&&(j.sourceIds||[]).includes(m.id)&&j.sourcePrints?.[m.id]===fingerprint(m)));
            if(remaining.length===messages.length)return true;
            changed=true;
            if(!remaining.length)return false;
            job.messages=clone(remaining);job.sourceIds=remaining.map(m=>m.id);job.revision=(job.revision||0)+1;
            const start=(chat.history||[]).findIndex(m=>m.id===remaining[0].id),end=(chat.history||[]).findIndex(m=>m.id===remaining.at(-1).id);
            if(start>=0&&end>=start)job.range={start:start+1,end:end+1};
            return true;
        });
        return changed;
    }
    function collectCoverage(list) {return [...new Set(list.flatMap(j=>j.coverage||[]))];}
    function unmergedCoverage(chat,list) {const used=new Set((chat.memoryJournals||[]).filter(j=>j.isMerged).flatMap(j=>j.coverage||[]));return collectCoverage(list).filter(id=>!used.has(id));}
    function availableSmall(chat) {
        const childIds=new Set((chat.memoryJournals||[]).filter(j=>j.isMerged).flatMap(j=>j.childIds||[]));
        return (chat.memoryJournals||[]).filter(j=>!j.isMerged&&!childIds.has(j.id)&&unmergedCoverage(chat,[j]).length>0).sort((a,b)=>(a.periodStart||a.createdAt)-(b.periodStart||b.createdAt)||a.createdAt-b.createdAt);
    }
    function unassigned(chat) {
        const s=migrate(chat),done=new Set((chat.memoryJournals||[]).filter(j=>!j.isMerged&&j.segment===s.segment).flatMap(j=>j.sourceIds||[]));
        for(const job of s.jobs)if(job.kind==='small'&&job.segment===s.segment)for(const id of job.sourceIds)done.add(id);
        const processed=new Set(s.processedCoverage);
        const h=chat.history||[],boundary=s.legacyBoundary;
        if(boundary&&boundary.segment===s.segment){
            if(!boundary.confirmed)return [];
            const at=h.findIndex(m=>m.id===boundary.endMessageId);
            // A removed anchor cannot make earlier messages suddenly unsummarized.
            if(at<0){boundary.confirmed=false;return [];}
            return summaryMessages(h.slice(at+1)).filter(m=>!done.has(m.id)&&!processed.has(key(s.segment,m.id)));
        }
        return summaryMessages(h).filter(m=>!done.has(m.id)&&!processed.has(key(s.segment,m.id)));
    }
    function makeJob(chat,kind,fields) {
        const s=state(chat),job={id:uid(),resultId:uid(),kind,status:'pending',attempts:0,retryAt:0,revision:0,archiveId:chat.activeArchiveId||null,...fields};
        s.jobs.push(job);return job;
    }
    function smallJob(chat,list,fields={}) {
        if(!list.length)return null;
        list=summaryMessages(list);if(!list.length)return null;
        const s=state(chat),start=chat.history.findIndex(m=>m.id===list[0].id)+1,end=chat.history.findIndex(m=>m.id===list.at(-1).id)+1;
        return makeJob(chat,'small',{segment:s.segment,sourceIds:list.map(m=>m.id),messages:clone(list),range:{start,end},periodStart:list[0].timestamp,periodEnd:list.at(-1).timestamp,mode:'count',...fields});
    }
    function dayStart(at) {const d=new Date(at);d.setHours(4,0,0,0);if(d.getTime()>at)d.setDate(d.getDate()-1);return d.getTime();}
    function addDays(at,days){const d=new Date(at);d.setDate(d.getDate()+days);return d.getTime();}
    function addPeriod(at,n,unit) {
        if(unit==='day'||unit==='week')return addDays(at,n*(unit==='week'?7:1));
        const d=new Date(at),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n*(unit==='year'?12:1));
        const max=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,max));return d.getTime();
    }
    function settlement(history,boundary,now) {
        const users=history.filter(m=>m.role==='user'&&!m.isWithdrawn&&!m.isContextDisabled).map(m=>Number(m.timestamp)).filter(Number.isFinite).sort((a,b)=>a-b);
        let cutoff=boundary,last=users.filter(t=>t<=boundary).at(-1);
        if(last!==undefined&&boundary-last<30*MINUTE)cutoff=last+30*MINUTE;
        for(const t of users)if(t>boundary&&t<=cutoff)cutoff=t+30*MINUTE;
        return cutoff<=now?cutoff:null;
    }
    function queueAutomatic(chat,now=Date.now()) {
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat))return;
        const s=migrate(chat),a=s.small,list=unassigned(chat);
        if(a.enabled&&list.length){
            if(a.mode==='count'){
                if(list.length>=a.count)smallJob(chat,list.slice(0,a.count));
            } else {
                const begin=s.dayCursor??dayStart(list[0].timestamp||now),boundary=addDays(dayStart(begin),a.days),cutoff=settlement(chat.history,boundary,now);
                if(cutoff!==null){const batch=list.filter(m=>m.timestamp<cutoff);
                    if(batch.length)smallJob(chat,batch,{periodStart:begin,periodEnd:cutoff,mode:'time'});
                    s.dayCursor=cutoff;
                }
            }
        }
        reconcileMergeJobs95(chat,now);
        queueMergeStages95(chat,now);
    }
    // Each layer counts original message identities, never the length of the
    // generated summary text. Previously consumed coverage stays consumed.
    function summaryLevels(chat) {
        const list=chat.memoryJournals||[],byId=new Map(list.map(j=>[j.id,j])),levels=new Map();
        function level(j,path=new Set()){
            if(levels.has(j.id))return levels.get(j.id);
            if(path.has(j.id))return Infinity;
            if(!j.isMerged){levels.set(j.id,0);return 0;}
            const next=new Set(path);next.add(j.id);
            const children=(j.childIds||[]).map(id=>byId.get(id)).filter(Boolean);
            const value=1+Math.max(0,...children.map(child=>level(child,next)));levels.set(j.id,value);return value;
        }
        for(const j of list)level(j);return levels;
    }
    function enabledStages95(chat){const stages=state(chat).mergeStages95;const stop=stages.findIndex(stage=>!stage.enabled);return stop<0?stages:stages.slice(0,stop);}
    function summaryFacts95(chat) {
        const list=chat.memoryJournals||[],byId=new Map(list.map(j=>[j.id,j])),stages=enabledStages95(chat),allStages=state(chat).mergeStages95,memo=new Map(),scope=state(chat).mergeScope96,excluded=new Set(scope?.excludedIds||[]),excludedCoverage=new Set(scope?.excludedCoverage||[]),segment=state(chat).segment,messageTimes=new Map((chat.history||[]).map(m=>[key(segment,m.id),validTime(m.timestamp)]));
        const union=sets=>new Set(sets.flatMap(set=>[...set]));
        function facts(j,path=new Set()){
            if(memo.has(j.id))return memo.get(j.id);
            if(excluded.has(j.id)){const info={level:-1,coverage:new Set(),units:[]};memo.set(j.id,info);return info;}
            if(path.has(j.id))return {level:Infinity,coverage:new Set(),units:[]};
            const next=new Set(path);next.add(j.id);
            const children=j.isMerged?(j.childIds||[]).map(id=>byId.get(id)).filter(Boolean).map(child=>facts(child,next)):[];
            if(children.length&&children.every(child=>child.level<0)){const info={level:-1,coverage:new Set(),units:[]};memo.set(j.id,info);return info;}
            if(children.some(child=>!Number.isFinite(child.level))){const bad={level:Infinity,coverage:new Set(),units:[]};memo.set(j.id,bad);return bad;}
            const coverage=new Set((j.coverage||[]).filter(id=>!excludedCoverage.has(id)));
            if(!j.isMerged&&(!coverage.size||j.sourceIndependent||j.sourceUnverified)){const info={level:-1,coverage:new Set(),units:[]};memo.set(j.id,info);return info;}
            const eligible=children.filter(child=>child.level>=0&&Number.isFinite(child.level));
            const sourceTimes=j.isMerged?[]:[...coverage].map(id=>messageTimes.get(id)).filter(t=>t!==null&&t!==undefined);
            const starts=j.isMerged?eligible.map(child=>child.periodStart).filter(t=>t!==null&&t!==undefined):sourceTimes;
            const ends=j.isMerged?eligible.map(child=>child.periodEnd).filter(t=>t!==null&&t!==undefined):sourceTimes;
            const periodStart=starts.length?Math.min(...starts):validTime(j.periodStart),periodEnd=ends.length?Math.max(...ends):validTime(j.periodEnd);
            const savedIndex=j.autoMergeStageId95?allStages.findIndex(stage=>stage.id===j.autoMergeStageId95):-1;
            const savedLevel=savedIndex>=0?savedIndex+1:!j.autoMergeStageId95?Math.min(allStages.length,Number(j.autoMergeLevel95)||0):0;
            let level=0;
            if(j.isMerged)for(let i=0;i<stages.length;i++){
                const cfg=stages[i],units=union(children.map(child=>child.units[i]||new Set()));
                if(!units.size&&level>=i)units.add(j.id);
                const start=periodStart,end=periodEnd;
                const reached=cfg.mode==='pieces'?units.size>=Number(cfg.pieces):cfg.mode==='time'?start!==null&&end!==null&&end>=addPeriod(start,Number(cfg.amount),cfg.unit):coverage.size>=Number(cfg.count);
                if(savedLevel>=i+1||reached)level=i+1;else break;
            }
            level=Math.max(level,savedLevel);
            const units=[];for(let i=0;i<=Math.max(level,allStages.length);i++){
                if(i>level){units[i]=new Set();continue;}
                const inherited=union(children.map(child=>child.units[i]||new Set()));
                units[i]=savedLevel===i&&i>0?new Set([j.id]):inherited.size?inherited:new Set([j.id]);
            }
            const result={level,coverage,units,periodStart,periodEnd};memo.set(j.id,result);return result;
        }
        for(const j of list)facts(j);return memo;
    }
    function stageInputs95(chat,index,facts=summaryFacts95(chat)){
        const list=state(chat).mergeScope96?chat.memoryJournals||[]:[],nested=new Set(list.filter(j=>j.isMerged).flatMap(j=>j.childIds||[])),used=new Set(),usedUnits=new Set();
        const retired=state(chat).retiredMergeCredits100?.[state(chat).mergeStages95[index]?.id];for(const id of retired?.coverage||[])used.add(id);for(const id of retired?.units||[])usedUnits.add(id);
        for(const j of list){const info=facts.get(j.id);if(Number.isFinite(info.level)&&info.level>index){for(const id of info.coverage)used.add(id);for(const id of info.units[index]||[])usedUnits.add(id);}}
        const parts=list.filter(j=>facts.get(j.id).level===index&&!nested.has(j.id)).sort((a,b)=>(facts.get(a.id).periodStart??a.createdAt??0)-(facts.get(b.id).periodStart??b.createdAt??0));
        const count=selected=>new Set(selected.flatMap(j=>[...facts.get(j.id).coverage].filter(id=>!used.has(id)))).size;
        const pieces=selected=>new Set(selected.flatMap(j=>[...(facts.get(j.id).units[index]||[])].filter(id=>!usedUnits.has(id)))).size;
        return {parts:parts.filter(j=>count([j])||pieces([j])),count,pieces,used,usedUnits,facts,start:j=>facts.get(j.id).periodStart??j.createdAt,end:j=>facts.get(j.id).periodEnd??j.createdAt};
    }
    function stageBatch95(chat,index,now=Date.now()){
        const cfg=enabledStages95(chat)[index];if(!cfg)return null;
        const input=stageInputs95(chat,index),parts=input.parts;if(!parts.length||mergeMaterials96(chat,parts).some(j=>!j.isMerged&&j.needsUpdate))return null;
        let chosen=[];
        if(cfg.mode==='time'){
            const begin=input.start(parts[0]),cutoff=addPeriod(begin,Number(cfg.amount),cfg.unit);
            if(!Number.isFinite(cutoff)||now<cutoff)return null;
            chosen=parts.filter(j=>input.start(j)<cutoff);
        }else{
            const limit=Number(cfg.mode==='pieces'?cfg.pieces:cfg.count);if(!Number.isFinite(limit)||limit<1)return null;
            const measure=cfg.mode==='pieces'?input.pieces:input.count;
            for(const part of parts){chosen.push(part);if(measure(chosen)>=limit)break;}
            if(measure(chosen)<limit)return null;
        }
        return chosen.length?{parts:chosen,cfg,input}:null;
    }
    function autoStageIndex95(chat,job){
        if(job.kind!=='merge'||job.targetId||job.useSavedContent)return -1;
        const stages=state(chat).mergeStages95;
        return job.autoMergeStageId95?stages.findIndex(stage=>stage.id===job.autoMergeStageId95):Math.max(0,(Number(job.autoMergeLevel95)||1)-1);
    }
    function reconcileMergeJobs95(chat,now=Date.now()){
        const s=state(chat),enabled=enabledStages95(chat),before=JSON.stringify(s.jobs);
        s.jobs=s.jobs.filter(job=>{
            if(job.kind!=='merge'||job.targetId||job.useSavedContent||job.status==='running')return true;
            const index=autoStageIndex95(chat,job);if(index<0||index>=enabled.length)return false;
            const input=stageInputs95(chat,index),old=(chat.memoryJournals||[]).filter(j=>(job.childIds||[]).includes(j.id));
            if(old.length&&(collectCoverage(old).length?collectCoverage(old).every(id=>input.used.has(id)):old.every(j=>[...(input.facts.get(j.id).units[index]||[])].every(id=>input.usedUnits.has(id)))))return false;
            const batch=stageBatch95(chat,index,now);if(!batch){job.waitingSources95=true;return true;}
            const ids=batch.parts.map(j=>j.id),stamp=JSON.stringify(batch.cfg);
            if(JSON.stringify(ids)!==JSON.stringify(job.childIds)||job.stageStamp95&&job.stageStamp95!==stamp){job.childIds=ids;job.revision=(job.revision||0)+1;job.attempts=0;job.retryAt=0;job.status='pending';delete job.lastError;}
            job.autoMergeStageId95=batch.cfg.id;job.autoMergeLevel95=index+1;job.stageStamp95=stamp;delete job.waitingSources95;
            job.periodStart=Math.min(...batch.parts.map(j=>j.periodStart||j.createdAt));job.periodEnd=Math.max(...batch.parts.map(j=>j.periodEnd||j.createdAt));return true;
        });
        return before!==JSON.stringify(s.jobs);
    }
    function queueMergeStages95(chat,now=Date.now()){
        const s=state(chat);if(s.jobs.some(job=>job.kind==='merge'&&!job.targetId&&!job.waitingSources95))return;
        const stages=enabledStages95(chat);
        for(let i=0;i<stages.length;i++){
            if(i===0&&s.jobs.some(job=>job.kind==='small'))continue;
            const batch=stageBatch95(chat,i,now);if(!batch)continue;
            if(s.jobs.some(job=>autoStageIndex95(chat,job)===i&&!job.targetId))continue;
            mergeJob(chat,batch.parts,null,{autoMergeLevel95:i+1,autoMergeStageId95:batch.cfg.id,stageStamp95:JSON.stringify(batch.cfg)});return;
        }
    }
    // Keep selected summaries as nodes. A selected ancestor already contains
    // its descendants, so do not add the same source a second time at the root.
    function mergeRoots(chat,parts) {
        const byId=new Map((chat.memoryJournals||[]).map(j=>[j.id,j]));
        const contains=(parent,id,seen=new Set())=>{
            if(seen.has(parent.id))return false;seen.add(parent.id);
            return (parent.childIds||[]).some(childId=>childId===id||byId.has(childId)&&contains(byId.get(childId),id,seen));
        };
        return parts.filter(j=>!parts.some(parent=>parent!==j&&contains(parent,j.id)))
            .sort((a,b)=>(validTime(a.periodStart)??a.createdAt??0)-(validTime(b.periodStart)??b.createdAt??0));
    }
    function mergeJob(chat,parts,targetId,options={}) {
        return makeJob(chat,'merge',{childIds:parts.map(j=>j.id),targetId:targetId||null,periodStart:Math.min(...parts.map(j=>j.periodStart||j.createdAt)),periodEnd:Math.max(...parts.map(j=>j.periodEnd||j.createdAt)),...options});
    }
    function requestUpdate(chat,j,syncParents=true) {
        if(!(chat.memoryJournals||[]).includes(j)||j.sourceIndependent)return;
        const s=state(chat);j.needsUpdate=true;
        if(s.jobs.some(job=>job.targetId===j.id))return;
        if(j.isMerged){const parts=(chat.memoryJournals||[]).filter(x=>j.childIds.includes(x.id));if(parts.length)mergeJob(chat,parts,j.id,{useSavedContent:j.mergeUsesSavedContent===true,syncParents});return;}
        if(j.sourceCleared)return;
        const ids=new Set(j.sourceIds),list=summaryMessages(chat.history).filter(m=>ids.has(m.id));
        smallJob(chat,list,{targetId:j.id,segment:j.segment,range:j.originalRange||j.range,periodStart:j.periodStart,periodEnd:j.periodEnd,mode:j.summaryMode,syncParents});
        if(!list.length){j.needsUpdate=true;j.updateError='原范围内已没有消息，可手动编辑或删除此总结';}
    }
    function beginRoll(chat,removed,userId) {
        const s=migrate(chat),ids=new Set(removed.map(m=>m.id));
        s.rollReplacement={userId,summaryIds:(chat.memoryJournals||[]).filter(j=>!j.isMerged&&!j.sourceCleared&&j.sourceIds?.some(id=>ids.has(id))).map(j=>j.id),removedIds:[...ids]};
    }
    function finishRoll(chat) {
        const s=state(chat),roll=s.rollReplacement;if(!roll)return;
        const at=chat.history.findIndex(m=>m.id===roll.userId),messages=summaryMessages(chat.history.slice(at+1)).filter(m=>m.role==='assistant');
        if(!messages.length)return;
        for(const id of roll.summaryIds){const j=(chat.memoryJournals||[]).find(x=>x.id===id);if(!j)continue;
            j.sourceIds=[...j.sourceIds.filter(x=>!roll.removedIds.includes(x)),...messages.map(m=>m.id)];
            j.coverage=j.sourceIds.map(x=>key(j.segment,x));j.coveredCount=j.coverage.length;
            j.sourceTrackingIds=[...j.sourceIds];j.sourceTrackingVersion=2;
            j.changeNotified=false;
        }
        delete s.rollReplacement;
    }
    function deletionIds100(chat,ids){
        const list=chat.memoryJournals||[],byId=new Map(list.map(j=>[j.id,j])),requested=new Set(ids),protectedIds=new Set();
        const protect=(j,path=new Set())=>{if(path.has(j.id))return;const next=new Set(path);next.add(j.id);for(const id of j.childIds||[]){protectedIds.add(id);const child=byId.get(id);if(child)protect(child,next);}};
        for(const j of list)if(requested.has(j.id)&&j.isMerged)protect(j);
        return new Set([...requested].filter(id=>!protectedIds.has(id)));
    }
    function removeJournals(chat,ids,updateParents=false) {
        migrate(chat);const gone=deletionIds100(chat,ids),list=chat.memoryJournals||[],s=state(chat),facts=summaryFacts95(chat);
        // Keep completed automatic work consumed when its visible summary is deleted.
        // Otherwise the released sources would immediately merge into the deleted card again.
        for(const j of list)if(gone.has(j.id)&&j.isMerged){
            const info=facts.get(j.id);
            if(info&&Number.isFinite(info.level)&&info.level>0){
                s.retiredMergeCredits100=s.retiredMergeCredits100||{};
                for(let i=0;i<Math.min(info.level,s.mergeStages95.length);i++){
                    const id=s.mergeStages95[i].id,prior=s.retiredMergeCredits100[id]||{};
                    s.retiredMergeCredits100[id]={coverage:[...new Set([...(prior.coverage||[]),...info.coverage])],units:[...new Set([...(prior.units||[]),...(info.units[i]||[])])]};
                }
            }
        }
        const released=new Set(list.filter(j=>gone.has(j.id)&&j.isMerged).flatMap(j=>j.childIds||[]));
        for(const child of list)if(released.has(child.id)&&!gone.has(child.id)){
            const other=list.find(parent=>parent.isMerged&&!gone.has(parent.id)&&(parent.childIds||[]).includes(child.id));
            if(other){child.parentId=other.id;child.isFavorited=false;}
            else{delete child.parentId;child.isFavorited=true;}
        }
        chat.memoryJournals=list.filter(j=>!gone.has(j.id));
        s.jobs=s.jobs.filter(job=>!gone.has(job.targetId)&&!(job.kind==='merge'&&job.childIds.some(id=>gone.has(id))));
        for(const parent of chat.memoryJournals.filter(j=>j.childIds?.some(id=>gone.has(id)))){
            parent.deletedChildIds=[...new Set([...(parent.deletedChildIds||[]),...parent.childIds.filter(id=>gone.has(id))])];
            if(updateParents){parent.childIds=parent.childIds.filter(id=>!gone.has(id));parent.needsUpdate=true;
                if(parent.childIds.length)requestUpdate(chat,parent);
                else parent.updateError='小总结已全部删除，无法重新生成；请手动编辑或删除此大总结';
            }
        }
    }
    async function deleteWithChoice(chat,ids) {
        const gone=deletionIds100(chat,ids),affected=(chat.memoryJournals||[]).filter(j=>!gone.has(j.id)&&j.childIds?.some(id=>gone.has(id)));
        let update=false;
        if(affected.length){
            const choice=await deletionChoice();if(choice===null)return false;update=choice;
        }else if(!await glassConfirm('删除总结？',(chat.memoryJournals||[]).some(j=>gone.has(j.id)&&j.isMerged)?'只删除选中的大总结；它的下一层总结会保留、回到列表并自动点亮收藏，更底层来源保持原有层级。已完成进度保留，不会立即重新合并。':'删除总结内容不会清零已总结进度或重新计算旧消息。','删除总结'))return false;
        const old=clone(chat.memoryJournals||[]),s=state(chat),before=clone(s);
        removeJournals(chat,[...gone],update);
        try{await saveData();}catch(error){chat.memoryJournals=old;chat.journalAutomation=before;throw error;}
        return true;
    }
    function deletionChoice() {
        return new Promise(resolve=>{
            const overlay=document.createElement('div'),box=document.createElement('div');overlay.className='v18-glass-overlay';box.className='v18-glass-dialog';
            box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
            overlay.onkeydown=e=>{if(e.key==='Escape'){overlay.remove();resolve(null);}};
            const h=document.createElement('h3');h.textContent='删除小总结';const p=document.createElement('p');p.textContent='清理小总结可以保留大总结；只有希望删除相应记忆内容时才更新大总结。已总结计数始终保留。';box.append(h,p);
            for(const [label,value]of [['仅删除小总结，保留大总结',false],['删除小总结，并更新大总结',true],['取消',null]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{overlay.remove();resolve(value);};box.append(button);}
            overlay.append(box);document.body.append(overlay);
        });
    }
    async function syncEdited(chat,j) {
        const parents=(chat.memoryJournals||[]).filter(p=>p.childIds?.includes(j.id));
        if(parents.length&&await glassConfirm('同步更新大总结？','小总结已修改。是否使用修改后的内容重新生成对应大总结？','同步更新','只保存小总结'))for(const p of parents)requestUpdate(chat,p);
    }
    async function regenerate(chat,j) {
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat)){showToast('请先切换到日记记忆模式');return;}
        const parts=(chat.memoryJournals||[]).filter(x=>j.childIds?.includes(x.id));
        if(!parts.length){showToast('没有保留的小总结，只能手动编辑大总结');return;}
        const missing=(j.deletedChildIds||[]).length||parts.length<(j.childIds||[]).length;
        if(!await glassConfirm('重新生成大总结？',missing?'部分小总结已删除，只能用剩余小总结重新生成，可能丢失已删部分的细节。成功后替换，失败保留旧内容。':'使用对应小总结和大总结世界书重新生成，成功后替换，失败保留旧内容。','重新生成'))return;
        if(state(chat).jobs.some(job=>job.targetId===j.id)){showToast('这份大总结已有更新任务');return;}
        mergeJob(chat,parts,j.id);await saveData();void tick();
    }
    async function addWritten(chat,title,content,isFavorited=false){
        title=String(title||'').trim();content=String(content||'');if(!title||!content.trim())throw Error('请填写标题和总结内容');
        if(!chats().includes(chat))throw Error('聊天已不存在');
        const j={id:'written_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),title,content,isFavorited:!!isFavorited,createdAt:Date.now(),sourceIndependent:true,summaryMode:'written',isMerged:false,range:{start:0,end:0},originalRange:{start:0,end:0},sourceIds:[],sourcePrints:{},sourceTrackingIds:[],sourceTrackingVersion:2,coverage:[],coveredCount:0,segment:state(chat).segment,messageTimeRangeVersion:1,timeRangeUnknown:true,periodStart:null,periodEnd:null};
        const list=chat.memoryJournals??=[];list.push(j);try{await saveData();}catch(error){list.splice(list.indexOf(j),1);throw error;}return j;
    }
    function detailTools(chat,j) {
        document.getElementById('journal-detail-tools')?.remove();if(!j.isMerged)return;
        const bar=document.createElement('div');bar.id='journal-detail-tools';const button=document.createElement('button');button.type='button';button.className='journal-drawer-button';button.textContent='重新生成大总结';button.onclick=()=>regenerate(chat,j);bar.append(button);
        const body=document.getElementById('journal-detail-content');body.parentNode.insertBefore(bar,body);
    }
    function favorites(chat) {
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat))return [];
        const list=chat.memoryJournals||[],litParents=new Set(list.filter(j=>j.isMerged&&j.isFavorited&&!j.needsUpdate).map(j=>j.id));
        return list.filter(j=>j.isFavorited&&!j.needsUpdate&&!litParents.has(j.parentId));
    }
    function onMessageInserted(chat,message,afterId) {
        const s=migrate(chat),map=new Map((chat.history||[]).map(m=>[m.id,m])),undo=[];
        for(const j of chat.memoryJournals||[])if(!j.isMerged&&!j.sourceCleared&&j.segment===s.segment&&(j.sourceIds||[]).includes(afterId)){
            const keys=['sourceIds','sourceTrackingIds','sourceTrackingVersion','coverage','coveredCount','changeNotified'];
            const before=Object.fromEntries(keys.map(k=>[k,j[k]===undefined?undefined:clone(j[k])]));
            trackingIds(j,map);const at=j.sourceIds.indexOf(afterId);j.sourceIds.splice(at+1,0,message.id);
            j.sourceTrackingIds.push(message.id);j.coverage=[...new Set([...(j.coverage||[]),key(j.segment,message.id)])];j.coveredCount=j.coverage.length;j.changeNotified=false;
            undo.push(()=>{for(const k of keys)if(before[k]===undefined)delete j[k];else j[k]=before[k];});
        }
        return ()=>undo.forEach(fn=>fn());
    }
    function reconcileAll(owner) {
        if(!ready)return;
        for(const chat of owner ? [owner] : chats()) {
            const s=migrate(chat),map=new Map((chat.history||[]).map(m=>[m.id,m]));
            const boundary=s.legacyBoundary;
            if(boundary?.confirmed&&boundary.segment===s.segment){
                const at=(chat.history||[]).findIndex(m=>m.id===boundary.endMessageId);
                if(at>=0)boundary.previousIds=(chat.history||[]).slice(Math.max(0,at-99),at+1).map(m=>m.id);
                else {const covered=new Set((chat.memoryJournals||[]).filter(j=>!j.isMerged&&j.segment===s.segment).flatMap(j=>j.sourceIds||[]));const replacement=(boundary.previousIds||[]).filter(id=>map.has(id)&&!isAuxiliary(map.get(id))).at(-1)||(chat.history||[]).findLast(m=>covered.has(m.id)&&!isAuxiliary(m))?.id;if(replacement)boundary.endMessageId=replacement;else boundary.confirmed=false;}
            }
            for(const job of s.jobs)if(job.kind==='small'&&!job.sourceCleared&&job.segment===s.segment){
                const fresh=summaryMessages(job.sourceIds.map(id=>map.get(id)).filter(Boolean));
                if(JSON.stringify(fresh)!==JSON.stringify(job.messages)){job.messages=clone(fresh);job.sourceIds=fresh.map(m=>m.id);job.revision++;}
            }
            for(const j of chat.memoryJournals||[])if(!j.isMerged&&!j.sourceCleared&&j.segment===s.segment&&j.sourcePrints){
                if(s.rollReplacement?.summaryIds.includes(j.id))continue;
                const changed=trackingIds(j,map).some(id=>!map.has(id)||!isAuxiliary(map.get(id))&&fingerprint(map.get(id))!==j.sourcePrints[id]);
                if(changed&&!j.changeNotified){j.changeNotified=true;notices.set(chat.id+':'+j.id,{chat,j,archiveId:chat.activeArchiveId||null,owner:s});}
                if(j.needsUpdate&&s.jobs.some(job=>job.targetId===j.id)){
                    const job=s.jobs.find(job=>job.targetId===j.id);if(job.status==='paused')continue;
                }
            }
        }
        if(notices.size&&!prompting)setTimeout(()=>void showChanges(),0);
    }
    async function showChanges() {
        if(prompting)return;prompting=true;
        try {while(notices.size){const [id,{chat,j,archiveId,owner}]=notices.entries().next().value;notices.delete(id);
            if(j.sourceCleared||(chat.activeArchiveId||null)!==archiveId||state(chat)!==owner||!(chat.memoryJournals||[]).includes(j))continue;
            const sourceMap=new Map((chat.history||[]).map(m=>[m.id,m]));
            if(!trackingIds(j,sourceMap).some(id=>!sourceMap.has(id)||!isAuxiliary(sourceMap.get(id))&&fingerprint(sourceMap.get(id))!==j.sourcePrints[id])){j.changeNotified=false;continue;}
            const update=await glassConfirm('更新相关总结？','你调整的消息已包含在“'+j.title+'”中。是否按修改后的记录更新这份总结？清空聊天记录不会触发此操作。','更新总结','保留原总结');
            if((chat.activeArchiveId||null)!==archiveId||state(chat)!==owner||!(chat.memoryJournals||[]).includes(j))continue;
            if(update){const parents=(chat.memoryJournals||[]).filter(p=>p.childIds?.includes(j.id));const sync=!parents.length||await glassConfirm('同步更新大总结？','是否将这次小总结更新同步到对应大总结？','同步更新','仅更新小总结');requestUpdate(chat,j,sync);if(sync)for(const parent of parents)requestUpdate(chat,parent);}
            // Store the new baseline even when retaining the original summary.
            j.sourcePrints=Object.fromEntries((chat.history||[]).filter(m=>j.sourceIds.includes(m.id)).map(m=>[m.id,fingerprint(m)]));
            j.sourceIds=j.sourceIds.filter(id=>(chat.history||[]).some(m=>m.id===id));
            j.sourceTrackingIds=(j.sourceTrackingIds||[]).filter(id=>j.sourceIds.includes(id));
            j.changeNotified=false;
            await saveData();refresh(chat);
        }} finally {prompting=false;}
    }
    function mergeMaterials96(chat,parts){
        const byId=new Map((chat.memoryJournals||[]).map(j=>[j.id,j])),seen=new Set(),materials=[];
        const walk=j=>{if(seen.has(j.id))return;seen.add(j.id);materials.push(j);if(j.isMerged)for(const id of j.childIds||[]){const child=byId.get(id);if(child)walk(child);}};
        for(const part of parts)walk(part);return materials;
    }
    function mergeBaseSources97(chat,parts){
        const byId=new Map((chat.memoryJournals||[]).map(j=>[j.id,j])),seen=new Set(),path=new Set(),base=[];
        const walk=j=>{
            if(path.has(j.id))throw new Error('总结来源存在循环，原总结已保留，请先修复来源关系');
            if(seen.has(j.id))return;
            seen.add(j.id);path.add(j.id);
            if(!j.isMerged){if(!String(j.content||'').trim())throw new Error('底层小总结缺少正文，原总结已保留，请补齐后重试');base.push(j);}
            else{
                const ids=j.childIds||[];
                if(!ids.length||(j.deletedChildIds||[]).length||ids.some(id=>!byId.has(id)))throw new Error('底层小总结来源不完整，原总结已保留；请恢复缺失底稿后重试');
                for(const id of ids)walk(byId.get(id));
            }
            path.delete(j.id);
        };
        for(const part of parts)walk(part);
        return base.sort((a,b)=>(validTime(a.periodStart)??a.createdAt??0)-(validTime(b.periodStart)??b.createdAt??0));
    }
    function mergeStamp96(chat,parts){return JSON.stringify(mergeMaterials96(chat,parts).map(j=>j.isMerged?[j.id,j.childIds||[],j.deletedChildIds||[]]:[j.id,j.content,j.title,j.needsUpdate,j.periodStart,j.periodEnd]));}
    function bookText95(ids){return (ids||[]).map(id=>(db.worldBooks||[]).find(w=>w.id===id)).filter(Boolean).sort((a,b)=>(a.depth||100)-(b.depth||100)).map(w=>w.content).join('\n\n');}
    function mergePrompt(chat,parts,job={}) {
        const stages=state(chat).mergeStages95,old=(chat.memoryJournals||[]).find(j=>j.id===job.targetId);
        const stageId=job.autoMergeStageId95||old?.autoMergeStageId95;
        const cfg=stages.find(stage=>stage.id===stageId);
        const books=(Array.isArray(cfg?.worldBookIds)?cfg.worldBookIds:state(chat).mergeWorldBookIds||[]).map(id=>(db.worldBooks||[]).find(w=>w.id===id)).filter(Boolean).sort((a,b)=>(a.depth||100)-(b.depth||100)).map(w=>w.content).join('\n\n');
        const base=mergeBaseSources97(chat,parts);
        if(!base.length)throw new Error('没有可用的底层小总结，原总结已保留');
        const materials=base.map(j=>`【${j.title}】\n时间：${fullDate(j.periodStart)}至${fullDate(j.periodEnd)}\n${j.content}`).join('\n\n---\n\n');
        return `请根据以下底层小总结，按时间顺序梳理事件脉络、细节与因果，整合成一份完整、精简的合并总结。每份底稿只提供一次；底稿中可能同时包含开启前的旧内容和开启后的新内容，必须完整承接两者，不能因为旧内容不计自动进度就遗漏旧事实。不同底稿可能提及同一事实，重叠事实只保留一次，不能当成发生多次。保留关键事实、关系变化、重要约定、未完成事项和必要原话，不编造，不升华。输出<title>标题</title><content>正文</content>。\n${books?'请遵守本层合并总结专用世界书要求：\n'+books:''}\n【底层小总结底稿】\n${materials}`;
    }
    const diaryControllers=new Map();
    function suspend(chat){diaryControllers.get(chat)?.abort();}
    async function runJob(chat,job) {
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat))return;
        if(running||isGenerating||window.SmartMessaging?.busy(chat)||prompting)return;
        const mergeJobsChanged=reconcileMergeJobs95(chat),smallJobsChanged=reconcileCompletedJobs(chat);
        if(mergeJobsChanged||smallJobsChanged)await saveData();
        if(!state(chat).jobs.includes(job)||job.waitingSources95)return;
        if(job.append98&&job.appendTargetStamp98!==JSON.stringify((chat.memoryJournals||[]).find(j=>j.id===job.targetId))){state(chat).jobs=state(chat).jobs.filter(j=>j.id!==job.id);await saveData();showToast('追加目标已变化，旧内容已保留，请重新选择追加');return;}
        if(job.kind==='merge'){
            const parts=(chat.memoryJournals||[]).filter(j=>job.childIds.includes(j.id));
            if(!job.useSavedContent&&mergeMaterials96(chat,parts).some(j=>!j.isMerged&&j.needsUpdate)||parts.length!==job.childIds.length)return;
        }
        running=true;const diaryController=new AbortController();diaryControllers.set(chat,diaryController);
        const s=state(chat),archive=chat.activeArchiveId||null,revision=job.revision;
        job.status='running';job.attempts++;
        try {
            await saveData();
            const snapshot=clone(job),parts=snapshot.kind==='merge'?(chat.memoryJournals||[]).filter(j=>snapshot.childIds.includes(j.id)):null;
            const partStamp=parts?mergeStamp96(chat,parts):null;
            let prompt=parts?mergePrompt(chat,parts,snapshot):buildJournalSummaryPrompt(chat,clone(snapshot.messages),typeOf(chat));
            if(!parts&&Array.isArray(s.small.worldBookIds)){const format=bookText95(s.small.worldBookIds);if(format)prompt+='\n\n本层小总结的格式要求（格式冲突时优先遵守，仍须输出<title>和<content>标签）：\n'+format;}
            if(!parts&&!snapshot.messages.length)throw new Error('这批消息已全部删除，无法生成总结');
            const config=window.SummaryApi.resolve(chat);
            if(!config.url||!config.key||!config.model)throw new Error('总结 API 设置不完整');
            const {requestBody,endpoint,headers}=buildChatApiRequest(config,[{role:'user',content:prompt}],window.SummaryApi.options(config));
            ;
            const raw=await fetchAiResponse(config,requestBody,headers,endpoint,false,diaryController.signal);
            const title=raw.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim(),content=raw.match(/<content>([\s\S]*?)<\/content>/i)?.[1]?.trim();
            if(!title||!content)throw new Error('总结未返回完整标题和正文');
            if((chat.activeArchiveId||null)!==archive||state(chat)!==s||(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat))){job.status='pending';return;}
            if(!s.jobs.some(j=>j.id===job.id))return;
            if(snapshot.append98&&snapshot.appendTargetStamp98!==JSON.stringify((chat.memoryJournals||[]).find(j=>j.id===job.targetId))){s.jobs=s.jobs.filter(j=>j.id!==job.id);await saveData();showToast('追加目标已变化，旧内容已保留，请重新追加');return;}
            if(job.revision!==revision||parts&&partStamp!==mergeStamp96(chat,(chat.memoryJournals||[]).filter(j=>job.childIds.includes(j.id)))){;job.status='pending';job.retryAt=Date.now();job.attempts--;await saveData();return;}
            if(snapshot.autoMergeStageId95){const cfg=enabledStages95(chat).find(stage=>stage.id===snapshot.autoMergeStageId95);if(!cfg||snapshot.stageStamp95!==JSON.stringify(cfg)){job.status='pending';job.attempts=Math.max(0,job.attempts-1);job.retryAt=Date.now();await saveData();return;}}
            const oldList=clone(chat.memoryJournals||[]),oldJobs=clone(s.jobs),oldProcessed=[...s.processedCoverage];
            try {
                let result={id:job.targetId||job.resultId,title,content,createdAt:Date.now(),chatId:chat.id,chatType:typeOf(chat),isFavorited:false,range:{...job.range},periodStart:job.periodStart,periodEnd:job.periodEnd};
                const old=(chat.memoryJournals||[]).find(j=>j.id===job.targetId);
                if(old)result={...old,...result,createdAt:old.createdAt,isFavorited:old.isFavorited,needsUpdate:false,updatedAt:Date.now()};
                if(parts){
                    result.isMerged=true;if(job.autoMergeLevel95)result.autoMergeLevel95=job.autoMergeLevel95;if(job.autoMergeStageId95)result.autoMergeStageId95=job.autoMergeStageId95;result.mergeUsesSavedContent=job.useSavedContent===true;result.childIds=parts.map(j=>j.id);result.coverage=collectCoverage(parts);result.coveredCount=result.coverage.length;
                    result.sourceRanges=parts.flatMap(j=>j.sourceRanges?.length?clone(j.sourceRanges):[{segment:j.segment,range:{...(j.range||{start:0,end:0})}}]);
                    const ranges=result.sourceRanges.map(r=>r.range).filter(r=>Number.isFinite(r?.start)&&Number.isFinite(r?.end));
                    result.range={start:ranges.length?Math.min(...ranges.map(r=>r.start)):0,end:ranges.length?Math.max(...ranges.map(r=>r.end)):0};
                    result.segments=[...new Set(parts.flatMap(j=>j.segments?.length?j.segments:[j.segment]).filter(v=>v!==null&&v!==undefined))];result.segment=result.segments.length===1?result.segments[0]:null;
                    const priorCoverage=new Set((chat.memoryJournals||[]).filter(j=>j.isMerged&&j.id!==result.id).flatMap(j=>j.coverage||[]));
                    result.cumulativeRange=old?.cumulativeRange||{start:priorCoverage.size+1,end:priorCoverage.size+result.coverage.filter(id=>!priorCoverage.has(id)).length};
                    result.isFavorited=old?old.isFavorited:true;
                    if(!old||job.append98){
                        const byId=new Map((chat.memoryJournals||[]).map(j=>[j.id,j])),seen=new Set();
                        const unfavorite=node=>{if(seen.has(node.id))return;seen.add(node.id);if(node.favoriteBeforeMerge===undefined)node.favoriteBeforeMerge=node.isFavorited;node.isFavorited=false;for(const id of node.childIds||[]){const child=byId.get(id);if(child)unfavorite(child);}};
                        for(const child of parts){unfavorite(child);child.parentId=result.id;}
                    }
                } else {attach(chat,result,job.messages,{segment:job.segment,periodStart:job.periodStart,periodEnd:job.periodEnd,mode:job.mode});result.sourceCleared=job.sourceCleared===true;result.clearConfirmed=job.sourceCleared===true;if(!old)result.isFavorited=true;}
                chat.memoryJournals=(chat.memoryJournals||[]).filter(j=>j.id!==result.id);chat.memoryJournals.push(result);refreshMessageTimes(chat);
                s.jobs=s.jobs.filter(j=>j.id!==job.id);
                reconcileMergeJobs95(chat);
                if(old&&job.syncParents!==false){for(const parent of chat.memoryJournals.filter(j=>j.childIds?.includes(result.id)))requestUpdate(chat,parent);}
                await saveData();
            } catch(error){chat.memoryJournals=oldList;s.jobs=oldJobs;s.processedCoverage=oldProcessed;throw error;}
            ;
            showToast(job.append98?'已追加到原总结，底层来源已保留':parts?'合并总结已保存，原总结与来源层级已保留':'总结已保存');refresh(chat);
        } catch(error) {
            if((chat.activeArchiveId||null)!==archive||state(chat)!==s)return;
            if(diaryController.signal.aborted){job.status='pending';job.attempts=Math.max(0,job.attempts-1);return;}
            const task=s.jobs.find(j=>j.id===job.id);if(!task)return;
            task.lastError=String(error.message||error);task.status=task.attempts>=3?'paused':'pending';
            task.retryAt=Date.now()+(task.attempts===1?MINUTE:2*MINUTE);
            try{await saveData();}catch(e){console.error('总结任务未保存',e);}
            if(task.status==='paused'){await glassConfirm('总结未完成','初次生成和两次自动重试均未成功。原总结保留，你可以在自动总结设置中手动重试。\n'+task.lastError,'知道了',null);}
            refresh(chat);
        } finally {diaryControllers.delete(chat);running=false;}
    }
    async function tick() {
        if(!ready||running||isGenerating||document.hidden)return;
        for(const chat of chats()){
            if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat))continue;
            if(window.SmartMessaging?.busy(chat))continue;
            const s=state(chat);const before=JSON.stringify(s);
            queueAutomatic(chat);
            if(JSON.stringify(s)!==before)await saveData();
            const job=s.jobs.find(j=>j.status!=='paused'&&!j.waitingSources95&&Date.now()>=(j.retryAt||0)&&!(j.kind==='merge'&&!j.useSavedContent&&mergeMaterials96(chat,(chat.memoryJournals||[]).filter(x=>j.childIds.includes(x.id))).some(x=>!x.isMerged&&x.needsUpdate)));
            if(job){await runJob(chat,job);return;}
        }
    }
    function refresh(chat) {if(chat.id===currentChatId&&document.getElementById('journal-list-container'))renderJournalList();}
    function fullDate(t) {if(validTime(t)===null)return '时间待确认';return new Date(t).toLocaleString('zh-CN',{hour12:false});}
    function date(t){if(validTime(t)===null)return '时间待确认';const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
    function cardTime(j){return j.isMerged||j.summaryMode==='time'?(j.timeRangeUnknown?'时间待确认':date(j.periodStart)+' ～ '+date(j.periodEnd)):date(j.createdAt);}
    function rangeText(j){if(j.sourceIndependent)return '手动补充 · 未关联聊天';return j.isMerged&&j.segments?.length>1?`累计范围: ${j.cumulativeRange?.start||1}-${j.cumulativeRange?.end||j.coveredCount}`:`范围: ${j.range.start}-${j.range.end}`;}
    function detailText(j){if(j.sourceIndependent)return '创建于 '+fullDate(j.createdAt)+'\n手动补充 · 未关联聊天消息，不占自动总结进度';return `创建于 ${fullDate(j.createdAt)}\n${'时间范围：'+(j.timeRangeUnknown?'时间待确认':fullDate(j.periodStart)+' ～ '+fullDate(j.periodEnd))+'\n'}${j.sourceRanges?j.sourceRanges.map(r=>`聊天段${r.segment}：${r.range.start}-${r.range.end}`).join('；'):`聊天段${j.segment||1} · 消息范围：${j.range.start}-${j.range.end}`} · ${j.sourceUnverified&&!(j.sourceIds||[]).length?'原记录':'覆盖'}${j.coveredCount||0}条${j.sourceCleared?' · 原消息已清空':j.sourceUnverified?' · 旧总结来源未确认':''}${j.needsUpdate?' · 总结待更新':''}${j.updateError?'\n'+j.updateError:''}`;}
    function decorate(chat,container) {
        migrate(chat);
        const cards=new Map([...container.querySelectorAll('.journal-card[data-id]')].map(c=>[c.dataset.id,c]));
        const list=chat.memoryJournals||[],byId=new Map(list.map(j=>[j.id,j]));
        for(const j of list){
            const card=cards.get(j.id);if(!card)continue;
            card.dataset.summaryKind=j.isMerged?'merged':'small';
            card.querySelector('.journal-card-date').textContent=cardTime(j);
            card.querySelector('.journal-card-range').textContent=rangeText(j);
            for(const badge of card.querySelectorAll('.journal-summary-kind'))badge.remove();
            if(j.sourceCleared||j.needsUpdate){const label=document.createElement('div');label.className='journal-state-label';label.textContent=j.needsUpdate?'总结待更新':'原消息已清空';card.append(label);}
            if(j.parentId&&!byId.has(j.parentId))delete j.parentId;
        }
        const referenced=new Set(list.flatMap(j=>j.isMerged?(j.childIds||[]):[])),rendered=new Set();
        function claim(j){if(rendered.has(j.id))return;rendered.add(j.id);for(const id of j.isMerged?j.childIds||[]:[]){const child=byId.get(id);if(child)claim(child);}}
        function view(j,path=new Set()){
            if(path.has(j.id)||!cards.has(j.id))return null;
            const next=new Set(path);next.add(j.id);
            const card=cards.get(j.id).cloneNode(true);
            const visibleViews=[...container.querySelectorAll('.journal-card')];
            if(visibleViews.some(v=>v.classList.contains('select-mode')))card.classList.add('select-mode');
            if(visibleViews.some(v=>v.dataset.id===j.id&&v.querySelector('.journal-checkbox')?.classList.contains('checked')))card.querySelector('.journal-checkbox')?.classList.add('checked');
            if(j.isMerged){
                const parts=[...new Set(j.childIds||[])].map(id=>byId.get(id)).filter(child=>child&&!next.has(child.id));
                const button=document.createElement('button'),drawer=document.createElement('div');
                button.type='button';button.className='journal-drawer-button';button.setAttribute('aria-expanded','false');
                button.textContent=`展开来源总结 · ${parts.length}篇`;drawer.className='journal-drawer';drawer.hidden=true;
                let populated=false;
                button.onclick=e=>{e.stopPropagation();drawer.hidden=!drawer.hidden;
                    if(!drawer.hidden&&!populated){for(const child of parts){const childCard=view(child,next);if(childCard)drawer.append(childCard);}populated=true;}
                    button.textContent=`${drawer.hidden?'展开':'收起'}来源总结 · ${parts.length}篇`;button.setAttribute('aria-expanded',String(!drawer.hidden));};
                card.append(button,drawer);
            }
            return card;
        }
        for(const card of cards.values())card.remove();
        for(const j of list.filter(j=>!referenced.has(j.id)).sort((a,b)=>a.createdAt-b.createdAt)){claim(j);const card=view(j);if(card)container.append(card);}
        // Safely display legacy malformed graphs without recursive DOM cycles.
        for(const j of list)if(!rendered.has(j.id)){claim(j);const card=view(j);if(card)container.append(card);}
    }
    function glassConfirm(title,message,yes='确认删除',no='取消') {
        return new Promise(resolve=>{
            const overlay=document.createElement('div');overlay.className='v18-glass-overlay';
            const box=document.createElement('div');box.className='v18-glass-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
            const heading=document.createElement('h3'),body=document.createElement('p'),actions=document.createElement('div');heading.textContent=title;body.textContent=message;
            const previous=document.activeElement;const finish=value=>{overlay.remove();previous?.focus?.();resolve(value);};
            const ok=document.createElement('button');ok.type='button';ok.textContent=yes;ok.onclick=()=>finish(true);actions.append(ok);
            if(no){const cancel=document.createElement('button');cancel.type='button';cancel.textContent=no;cancel.onclick=()=>finish(false);actions.append(cancel);}
            box.append(heading,body,actions);overlay.append(box);document.body.append(overlay);(actions.lastChild||ok).focus();
            overlay.onkeydown=e=>{if(e.key==='Escape'&&no)finish(false);if(e.key==='Tab'){const bs=[...actions.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===bs[0]){e.preventDefault();bs.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===bs.at(-1)){e.preventDefault();bs[0].focus();}}};
        });
    }
    function manualChoice98(title,message,choices){
        return new Promise(resolve=>{
            const overlay=document.createElement('div'),box=document.createElement('div'),heading=document.createElement('h3'),body=document.createElement('p'),actions=document.createElement('div');
            overlay.className='v18-glass-overlay';box.className='v18-glass-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');heading.textContent=title;body.textContent=message;
            const previous=document.activeElement,finish=value=>{overlay.remove();previous?.focus?.();resolve(value);};
            for(const choice of [...choices,{label:'取消',value:null}]){const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.onclick=()=>finish(choice.value);actions.append(button);}
            box.append(heading,body,actions);overlay.append(box);document.body.append(overlay);actions.children[0]?.focus?.();
            overlay.onkeydown=e=>{if(e.key==='Escape')finish(null);if(e.key==='Tab'){const buttons=[...actions.children];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}}};
        });
    }
    async function chooseManualOperation98(chat,ids){
        const mode=await manualChoice98('手动合并总结','新建会生成另一篇总结；追加会更新选定的已有总结。两种方式都只读取底层小总结。',[{label:'新建合并总结',value:'new'},{label:'追加到已有总结',value:'append'}]);
        if(!mode)return null;if(mode==='new')return {mode};
        const list=chat.memoryJournals||[],nested=new Set(list.filter(j=>j.isMerged).flatMap(j=>j.childIds||[])),selected=new Set(ids);
        const roots=list.filter(j=>j.isMerged&&!nested.has(j.id)),selectedRoots=roots.filter(j=>selected.has(j.id)),targets=selectedRoots.length?selectedRoots:roots;
        if(!targets.length){showToast('没有可追加的独立合并总结，请先新建一篇');return null;}
        const targetId=await manualChoice98('选择要更新的总结','所选其他总结将追加进去。已经包含在更高层里的总结不能单独追加。',targets.map(j=>({label:j.title||'未命名总结',value:j.id})));
        return targetId?{mode,targetId}:null;
    }
    async function appendManual98(chat,targetId,ids){
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat)){showToast('请先切换到日记记忆模式');return;}
        const s=migrate(chat),list=chat.memoryJournals||[],target=list.find(j=>j.id===targetId),selected=new Set(ids.filter(id=>id!==targetId)),added=list.filter(j=>selected.has(j.id));
        if(!target?.isMerged){showToast('要追加的总结已变化，请重新选择');return;}
        if(list.some(j=>j.isMerged&&j.childIds?.includes(targetId))){showToast('这篇已收进更高层总结，请选择最外层总结追加');return;}
        if(!selected.size||added.length!==selected.size){showToast('请选择要追加的新总结');return;}
        if(running||isGenerating||s.jobs.some(j=>j.targetId===targetId)){showToast('该总结正在生成或已有更新任务，请稍后再试');return;}
        const byId=new Map(list.map(j=>[j.id,j])),original=(target.childIds||[]).map(id=>byId.get(id));
        if(!original.length||original.some(j=>!j)||(target.deletedChildIds||[]).length){showToast('原总结的底稿不完整，请恢复底稿后再追加');return;}
        if(mergeMaterials96(chat,added).some(j=>j.id===targetId)){showToast('不能把总结追加到它自己的来源中');return;}
        try{mergeBaseSources97(chat,[target,...added]);}catch(error){showToast(error.message);return;}
        const originals=new Set(mergeMaterials96(chat,[target]).map(j=>j.id));
        if(added.every(j=>originals.has(j.id))){showToast('这些总结已包含在原总结里，无需重复追加');return;}
        if(s.mergeScope96){const facts=summaryFacts95(chat),current=facts.get(target.id).level>=0;if(added.some(j=>(facts.get(j.id).level>=0)!==current)){showToast('旧内容和本轮新内容不属于同一自动范围，请分开整理');return;}}
        const parts=mergeRoots(chat,[...original,...added]);
        const job=mergeJob(chat,parts,targetId,{useSavedContent:true,append98:true,appendTargetStamp98:JSON.stringify(target),syncParents:false});
        try{await saveData();}catch(error){s.jobs=s.jobs.filter(j=>j.id!==job.id);throw error;}
        await runJob(chat,job);
    }
    async function mergeManual(chat,ids) {
        if(window.VectorMemory&&!window.VectorMemory.diaryAllowed(chat)){showToast('当前未启用日记记忆，请在向量记忆页切换模式');return;}
        migrate(chat);const selected=new Set(ids),selectedParts=(chat.memoryJournals||[]).filter(j=>selected.has(j.id));
        if(selected.size<2){showToast('请至少选择两篇总结');return;}
        if(selectedParts.length!==selected.size){showToast('选中的总结已变化，请重新选择');return;}
        if(selectedParts.some(j=>!String(j.content||'').trim())){showToast('选中的总结没有正文，请先补充内容');return;}
        if(running||isGenerating){showToast('当前正在生成，请稍后再试');return;}
        const parts=mergeRoots(chat,selectedParts);
        if(!parts.length){showToast('总结来源关系异常，未修改原总结');return;}
        const job=mergeJob(chat,parts,null,{useSavedContent:true});await saveData();await runJob(chat,job);
    }
    function settings(chat) {
        const s=migrate(chat),archive=chat.activeArchiveId||null,overlay=document.createElement('div'),box=document.createElement('form');overlay.className='v18-glass-overlay';box.className='v18-glass-dialog journal-auto-settings';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
        box.innerHTML=`<h3>自动总结</h3><fieldset><legend>基础小总结</legend><label><input name="smallEnabled" type="checkbox">开启自动小总结</label><label><input name="smallMode" type="radio" value="count">按条数 <input name="smallCount" type="number" min="1" max="1000000" step="1"> 条</label><label><input name="smallMode" type="radio" value="time">按天数 <input name="smallDays" type="number" min="1" max="3650" step="1"> 天</label><p>手机当地时间凌晨4点分界；user停发满30分钟才结算，char单方面发消息不延后。</p></fieldset><div class="journal-merge-stages95"></div><button type="button" class="journal-drawer-button journal-add-stage95">＋添加合并层级</button><p>每层都可按原聊天条数、上一级总结篇数或时间周期自动合并。最后开启的一层为最终大总结。首次开启后仅自动合并新总结，已有旧总结保留。未收藏的新总结也计入；手动合并按实际来源接续进度。整篇、整天来源不拆分，允许超过门槛。更高层只根据底层小总结整理；各层原文均保留供展开。</p><div class="journal-job-list"></div><div class="journal-settings-actions"><button type="submit">保存</button><button type="button" class="close-settings">取消</button></div>`;
        const note=document.createElement('p');note.textContent=s.mergeScope96?'本轮自动合并起点：'+fullDate(s.mergeScope96.startedAt)+'。修改门槛或暂停后继续，不重置已有进度。':'保存并首次开启后开始累计，当前已有总结不参与自动合并。';box.insertBefore(note,box.querySelector('.journal-merge-stages95'));
        const f=box.elements;f.smallEnabled.checked=s.small.enabled;f.smallMode.value=s.small.mode;f.smallCount.value=s.small.count;f.smallDays.value=s.small.days;
        let smallBooks=Array.isArray(s.small.worldBookIds)?[...s.small.worldBookIds]:null;
        function formatPicker(parent,label,getIds,setIds){
            const pick=document.createElement('button'),reset=document.createElement('button');pick.type=reset.type='button';pick.className=reset.className='journal-drawer-button';
            const update=()=>{const ids=getIds();pick.textContent=label+'：'+(Array.isArray(ids)?'已选 '+ids.length+' 本':'沿用原设置');};
            pick.onclick=()=>{overlay.style.display='none';openWorldBookSelector(getIds()||[],{title:label,onSave:ids=>{if(state(chat)!==s||(chat.activeArchiveId||null)!==archive)throw new Error('聊天存档已切换，请重新设置');setIds([...ids]);update();},onClose:()=>{overlay.style.display='';}});};
            reset.textContent='沿用原设置';reset.onclick=()=>{setIds(null);update();};update();parent.append(pick,reset);
        }
        formatPicker(box.querySelector('fieldset'),'基础小总结格式世界书',()=>smallBooks,ids=>{smallBooks=ids;});
        let draft=clone(s.mergeStages95);const rows=new Map(),host=box.querySelector('.journal-merge-stages95');
        function readDraft(){return draft.map(cfg=>{const row=rows.get(cfg.id);if(!row)return cfg;const get=name=>row.querySelector('[data-field="'+name+'"]');return {...cfg,id:cfg.id,enabled:get('enabled').checked,mode:get('mode').value,count:Number(get('count').value),pieces:Number(get('pieces').value),amount:Number(get('amount').value),unit:get('unit').value};});}
        function drawStages(){
            host.replaceChildren();rows.clear();
            let last=-1;for(let i=0;i<draft.length&&draft[i].enabled;i++)last=i;
            draft.forEach((cfg,index)=>{
                const row=document.createElement('fieldset');row.dataset.stageId=cfg.id;
                row.innerHTML=`<legend></legend><label><input type="checkbox" data-field="enabled">开启本层自动合并</label><label>合并方式 <select data-field="mode"><option value="count">按原聊天条数</option><option value="pieces">按上一级总结篇数</option><option value="time">按时间周期</option></select></label><label data-mode="count">累计 <input data-field="count" type="number" min="1" max="100000000" step="1"> 条原聊天</label><label data-mode="pieces">累计 <input data-field="pieces" type="number" min="1" max="100000" step="1"> 篇上一级总结</label><label data-mode="time">每 <input data-field="amount" type="number" min="1" max="3650" step="1"><select data-field="unit"><option value="day">天</option><option value="week">周</option><option value="month">月</option><option value="year">年</option></select></label><p class="journal-stage-progress95"></p><button type="button" class="journal-drawer-button journal-remove-stage95">删除本层</button>`;
                row.querySelector('legend').textContent=(index===last?'最终大总结':'中间总结')+' · 第'+(index+1)+'级合并';
                const get=name=>row.querySelector('[data-field="'+name+'"]');get('enabled').checked=cfg.enabled;get('mode').value=cfg.mode;get('count').value=Number(cfg.count)||4000;get('pieces').value=Number(cfg.pieces)||4;get('amount').value=Number(cfg.amount)||1;get('unit').value=cfg.unit||'month';
                const modes=()=>{for(const name of ['count','pieces','time'])row.querySelector('[data-mode="'+name+'"]').hidden=get('mode').value!==name;get('count').disabled=get('mode').value!=='count';get('pieces').disabled=get('mode').value!=='pieces';get('amount').disabled=get('mode').value!=='time';get('unit').disabled=get('mode').value!=='time';};modes();
                const progress=stageInputs95(chat,index),text=row.querySelector('.journal-stage-progress95');
                if(cfg.mode==='pieces')text.textContent='当前累计：'+progress.pieces(progress.parts)+' / '+(Number(cfg.pieces)||4)+' 篇上一级来源；已手动合并的篇数仍会计入。';
                else if(cfg.mode==='time'){const begin=progress.parts[0]?progress.start(progress.parts[0]):null;text.textContent=begin===null?'当前暂无待合并来源':'本轮起点：'+fullDate(begin)+'；达到周期：'+fullDate(addPeriod(begin,Number(cfg.amount)||1,cfg.unit||'month'));}
                else text.textContent='当前累计：'+progress.count(progress.parts)+' / '+(Number(cfg.count)||4000)+' 条原聊天；手动部分合并不会清零进度。';
                formatPicker(row,'本层总结格式世界书',()=>draft.find(stage=>stage.id===cfg.id)?.worldBookIds,ids=>{const stage=draft.find(stage=>stage.id===cfg.id);if(ids===null)delete stage.worldBookIds;else stage.worldBookIds=ids;});
                rows.set(cfg.id,row);get('mode').onchange=()=>{draft=readDraft();drawStages();};get('enabled').onchange=()=>{draft=readDraft();drawStages();};
                row.querySelector('.journal-remove-stage95').onclick=()=>{draft=readDraft();draft.splice(index,1);drawStages();};host.append(row);
            });
        }
        drawStages();box.querySelector('.journal-add-stage95').onclick=()=>{draft=readDraft();const previous=draft.at(-1);draft.push({id:uid(),enabled:draft.every(stage=>stage.enabled),mode:'count',count:Math.max(1,(Number(previous?.count)||Number(f.smallCount.value)||1000)*4),pieces:4,amount:1,unit:'month'});drawStages();};
        if(s.legacyBoundary&&!s.legacyBoundary.confirmed){const warning=document.createElement('p');warning.textContent='旧总结结束边界未确认，自动小总结暂停，已有进度保留。';const resume=document.createElement('button');resume.type='button';resume.textContent='从当前记录末尾继续';resume.onclick=async()=>{if(!chat.history.length)return;s.legacyBoundary={segment:s.segment,endMessageId:chat.history.at(-1).id,confirmed:true};await saveData();overlay.remove();void tick();};box.querySelector('.journal-job-list').append(warning,resume);}
        const jobList=box.querySelector('.journal-job-list');
        for(const job of s.jobs){const row=document.createElement('div');row.textContent=(job.kind==='merge'?'第'+(job.autoMergeLevel95||1)+'级合并':'小总结')+'：'+(job.waitingSources95?'等待来源补足':job.status==='paused'?'未完成':job.status==='running'?'生成中':'等待重试')+' · 已请求'+job.attempts+'次 ';if(job.status==='paused'){const btn=document.createElement('button');btn.type='button';btn.textContent='重试';btn.onclick=async()=>{job.status='pending';job.attempts=0;job.retryAt=0;await saveData();overlay.remove();void tick();};row.append(btn);}jobList.append(row);}
        box.querySelector('.close-settings').onclick=()=>overlay.remove();
        box.onsubmit=async e=>{
            e.preventDefault();if(!box.reportValidity())return;if(state(chat)!==s||(chat.activeArchiveId||null)!==archive){showToast('聊天存档已切换，请重新设置');return;}
            const stages=readDraft();let stopped=false;for(const stage of stages){if(!stage.enabled)stopped=true;else if(stopped){showToast('请先开启前面的合并层级，或删除不需要的层级');return;}}
            const before={small:s.small,mergeStages95:s.mergeStages95,big:s.big,higher:s.higher,dayCursor:s.dayCursor,mergeScope96:s.mergeScope96,jobs:s.jobs};
            s.small={...s.small,enabled:f.smallEnabled.checked,mode:f.smallMode.value,count:Number(f.smallCount.value),days:Number(f.smallDays.value)};if(smallBooks===null)delete s.small.worldBookIds;else s.small.worldBookIds=smallBooks;s.mergeStages95=stages;s.big=stages[0]||{enabled:false,mode:'count',count:4000,pieces:7,amount:1,unit:'month'};s.higher={enabled:stages[1]?.enabled===true,count:Number(stages[1]?.count)||4000};if(before.small.mode!==s.small.mode)delete s.dayCursor;
            ensureMergeScope96(chat,s);
            try{await saveData();}catch(error){Object.assign(s,before);showToast('自动总结设置保存失败，请重试');return;}
            overlay.remove();showToast('自动总结层级已保存');void tick();
        };
        const books=document.createElement('button');books.type='button';books.className='journal-drawer-button';books.textContent='合并总结世界书';books.onclick=()=>{overlay.remove();worldBooks(chat);};box.insertBefore(books,box.querySelector('.journal-settings-actions'));
        overlay.append(box);document.body.append(overlay);
    }
    function worldBooks(chat) {
        const s=state(chat),archive=chat.activeArchiveId||null;
        openWorldBookSelector(s.mergeWorldBookIds||[],{title:'合并总结世界书',onSave:async ids=>{
            if(state(chat)!==s||(chat.activeArchiveId||null)!==archive)throw new Error('聊天存档已切换，请重新选择');
            const previous=s.mergeWorldBookIds;s.mergeWorldBookIds=ids;
            try{await saveData();}catch(error){s.mergeWorldBookIds=previous;throw error;}
            showToast('合并总结世界书已保存');
        }});
    }
    function toolbar(chat,container) {
        document.getElementById('journal-auto-toolbar')?.remove();
        const header=document.querySelector('#memory-journal-screen > .app-header');if(!header)return;
        let left=header.querySelector('.journal-header-left');
        if(!left){left=document.createElement('div');left.className='journal-header-left';const back=header.querySelector('.back-btn');header.insertBefore(left,back);left.append(back);}
        let button=document.getElementById('journal-auto-settings-btn');
        if(!button){button=document.createElement('button');button.id='journal-auto-settings-btn';button.type='button';button.className='action-btn';button.title='自动总结设置';button.setAttribute('aria-label','自动总结设置');
            button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="9" cy="18" r="2" fill="white"/></svg>';left.append(button);}
        let api=document.getElementById('journal-summary-api-btn');
        if(!api){api=document.createElement('button');api.id='journal-summary-api-btn';api.type='button';api.className='action-btn';api.title='总结 API';api.setAttribute('aria-label','总结 API');api.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M6 6h12v12H6zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>';left.insertBefore(api,button);}
        document.getElementById('journal-add-written-btn')?.remove();
        api.onclick=()=>window.SummaryApi.open(chat);
        button.onclick=()=>settings(chat);
    }
    window.JournalAutomation={onMessageInserted,summaryMessages,isAuxiliary,validTime,applyMessageTimes,refreshMessageTimes,suspend,detailTools,regenerate,syncEdited,deleteWithChoice,beginRoll,finishRoll,removeJournals,addWritten,favorites,state,migrate,attach,clearHistory,reconcileAll,queueAutomatic,runJob,tick,confirm:glassConfirm,mergeManual,appendManual98,chooseManualOperation98,decorate,toolbar,cardTime,rangeText,detailText,requestUpdate,reconcileCompletedJobs,collectCoverage,unmergedCoverage,availableSmall,unassigned,settlement,addPeriod,smallJob};
    window.addEventListener('uwu-db-ready',()=>{ready=true;for(const c of chats()){const s=migrate(c);for(const job of s.jobs)if(job.status==='running'){job.status='pending';job.retryAt=Date.now();}}reconcileAll();void saveData().then(()=>tick()).catch(console.error);setInterval(()=>void tick().catch(console.error),15000);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void tick().catch(console.error);});
})();
