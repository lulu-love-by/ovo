// Literal, bounded local chapter rules. Samples infer structure; no API and no user regex execution.
(() => {
'use strict';
const trim=v=>String(v??'').trim(),P=()=>window.readerParser;
const NUM='0-9０-９零〇一二三四五六七八九十百千万壹贰叁肆伍陆柒捌玖拾佰仟两';
function normalize(raw={}){return {mode:['keywords','markers','samples'].includes(raw.mode)?raw.mode:'samples',keywords:String(raw.keywords||'').slice(0,1000),prefix:String(raw.prefix||'').slice(0,60),suffix:String(raw.suffix||'').slice(0,60),samples:String(raw.samples||'').slice(0,2000),maxLength:Math.min(120,Math.max(10,Number(raw.maxLength)||80))};}
function commonStart(rows){let p=rows[0];for(const s of rows)while(p&&!s.startsWith(p))p=p.slice(0,-1);return p;}
function commonEnd(rows){const rev=s=>Array.from(s).reverse().join('');return rev(commonStart(rows.map(rev)));}
function infer(source){
 const samples=[...new Set(String(source||'').split(/\r?\n/).map(trim).filter(Boolean))];
 if(samples.length<2)return {error:'请粘贴至少两条不同的章节标题，每行一条。'};
 if(samples.length>8||samples.some(s=>s.length>120))return {error:'请保留2～8条标题样例，每条不超过120字。'};
 const known=samples.map(s=>P().readerHeading(s));
 if(known.every(Boolean)){
  const signatures=[...new Map(known.map(h=>[h.kind+':'+(h.family||''),{kind:h.kind,family:h.family}])).values()];
  return {description:signatures.length===1?({DECORATED:'按相同的标题前后标记匹配',CHINESE_NUM:'按“第N章／回／节／卷”格式匹配',ENGLISH_CHAPTER:'按“Chapter N”格式匹配',PURE_DIGIT:'按数字序号格式匹配',BRACKETS:'按数字括号序号格式匹配',SPECIAL:'按序言、番外等标题格式匹配'}[signatures[0].kind]):'按样例中的 '+signatures.length+' 类标题格式匹配',test:line=>{const h=P().readerHeading(line);return !!h&&signatures.some(sig=>h.kind===sig.kind&&(!sig.family||h.family===sig.family));}};
 }
 // A changing ordinal after a stable literal prefix: e.g. 卷一·初见 / 卷二·重逢.
 const numbered=samples.map(s=>s.match(new RegExp('^(.*?)(['+NUM+']{1,14})([ \\t·.．、:：_-]*)(.*)$')));
 if(numbered.every(Boolean)&&numbered.every(m=>m[1]===numbered[0][1]&&m[3]===numbered[0][3])&&numbered[0][1].length<=20){
  const prefix=numbered[0][1],sep=numbered[0][3];
  return {description:'按“'+prefix+'序号'+sep+'标题”格式匹配',test:line=>{if(!line.startsWith(prefix))return false;const m=line.slice(prefix.length).match(new RegExp('^['+NUM+']{1,14}'));return !!m&&line.slice(prefix.length+m[0].length).startsWith(sep);}};
 }
 const prefix=commonStart(samples),suffix=commonEnd(samples);
 // Only stable punctuation wrappers are generalized; ordinary shared prose is not a title grammar.
 if(prefix&&suffix&&prefix.length+suffix.length<Math.min(...samples.map(s=>s.length))&&/[^\p{L}\p{N}\s]/u.test(prefix)&&/[^\p{L}\p{N}\s]/u.test(suffix))return {description:'按“'+prefix+' … '+suffix+'”匹配',test:line=>line.startsWith(prefix)&&line.endsWith(suffix)&&line.length>prefix.length+suffix.length};
 return {error:'这些样例没有稳定的共同格式。请换几条标题，或改用前后标记、关键词。'};
}
function compile(raw){const c=normalize(raw);
 if(c.mode==='samples'){const result=infer(c.samples);return {...result,config:c};}
 if(c.mode==='markers'){
  const prefix=trim(c.prefix),suffix=trim(c.suffix);if(!prefix&&!suffix)return {config:c,error:'请填写标题开头或结尾标记，至少一项。'};
  return {config:c,description:'匹配'+(prefix?'以“'+prefix+'”开头':'')+(prefix&&suffix?'、':'')+(suffix?'以“'+suffix+'”结尾':'')+'的独立短行',test:line=>(!prefix||line.startsWith(prefix))&&(!suffix||line.endsWith(suffix))&&line.length>prefix.length+suffix.length};
 }
 const words=[...new Set(c.keywords.split(/[\s,，、;；]+/).map(trim).filter(Boolean))];if(!words.length)return {config:c,error:'请填写至少一个标题关键词。'};
 return {config:c,description:'标题关键词：'+words.join('、'),test:line=>words.some(w=>{
  const outer=P().readerHeading(line),base=outer?.kind==='DECORATED'?outer.title:line;
  if(['第','章','回','节','卷'].includes(w)){const h=P().readerHeading(base);return h?.kind==='CHINESE_NUM'&&base.slice(0,20).includes(w);}
  if(/^chapter$/i.test(w))return P().readerHeading(base)?.kind==='ENGLISH_CHAPTER';
  return line.toLocaleLowerCase().startsWith(w.toLocaleLowerCase())||base.toLocaleLowerCase().startsWith(w.toLocaleLowerCase());
 })};
}
function analyze(text,raw){const compiled=compile(raw);if(compiled.error)return {...compiled,chapters:[],matches:0};const source=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/[\u2028\u2029]/g,'\n'),headings=[];let at=0;
 for(const rawLine of source.split('\n')){const line=rawLine.trim();if(line&&line.length<=compiled.config.maxLength&&(compiled.config.mode!=='keywords'||!/[。！？!?]/.test(line))&&compiled.test(line)){headings.push({title:line,start:at,end:at+rawLine.length});}at+=rawLine.length+1;}
 if(!headings.length)return {...compiled,chapters:[],matches:0};
 const chapters=[],prefix=source.slice(0,headings[0].start).trim();if(prefix.length>120)chapters.push({title:'前言／简介',content:prefix});
 headings.forEach((h,i)=>{let content=source.slice(h.end,headings[i+1]?.start??source.length).trim();if(i===0&&prefix&&prefix.length<=120)content=prefix+'\n\n'+content;chapters.push({title:h.title,content});});
 return {...compiled,chapters,matches:headings.length};
}
function list(){return Array.isArray(db.uwuReaderRules)?db.uwuReaderRules:[];}
async function save(name,config,id){name=trim(name).slice(0,60);if(!name)throw Error('请填写规则名称');const valid=compile(config);if(valid.error)throw Error(valid.error);const old=list(),existing=id&&old.find(r=>r.id===id);if(!existing&&old.length>=50)throw Error('最多保存50条规则，请先删除不用的规则');const row={id:existing?.id||'reader_rule_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name,config:valid.config,updatedAt:Date.now()};db.uwuReaderRules=existing?old.map(r=>r.id===id?row:r):[...old,row];try{await saveData();}catch(e){db.uwuReaderRules=old;throw e;}return row;}
async function remove(id){const old=list();db.uwuReaderRules=old.filter(r=>r.id!==id);try{await saveData();}catch(e){db.uwuReaderRules=old;throw e;}}
function editor(host,text,onResult){
 const E=(tag,t)=>{const n=document.createElement(tag);if(t!==undefined)n.textContent=t;return n;};
 const field=(label,type='input')=>{const row=E('label'),span=E('span',label),input=E(type);row.append(span,input);host.append(row);return input;};
 host.className='reader-rule-editor';host.hidden=true;
 const saved=field('已保存的规则','select'),mode=field('识别方式','select');for(const [value,label]of [['samples','标题样例'],['markers','前后标记'],['keywords','关键词']]){const op=E('option',label);op.value=value;mode.append(op);}mode.value='samples';
 const samples=field('标题样例（每行一条，粘贴2～8条）','textarea');samples.rows=4;samples.maxLength=2000;samples.placeholder='===第一章 初见===\n===第二章 重逢===';
 const prefix=field('标题开头标记'),suffix=field('标题结尾标记');prefix.placeholder='例如 === 或 【';suffix.placeholder='例如 === 或 】';prefix.maxLength=suffix.maxLength=60;
 const keywords=field('标题关键词（用逗号分隔）');keywords.placeholder='第，章，Chapter，番外';keywords.maxLength=1000;
 const max=field('标题最多字数');max.type='number';max.min='10';max.max='120';max.value='80';
 const hint=E('p');hint.className='reader-rule-hint';hint.setAttribute('aria-live','polite');host.append(hint);
 const name=field('规则名称');name.placeholder='例如：等号章节标题';name.maxLength=60;const actions=E('div');actions.className='reader-rule-actions';host.append(actions);let timer,last=null;
 const config=()=>normalize({mode:mode.value,samples:samples.value,prefix:prefix.value,suffix:suffix.value,keywords:keywords.value,maxLength:Number(max.value)});
 function refreshSaved(id=saved.value){saved.replaceChildren();const empty=E('option','新建规则');empty.value='';saved.append(empty);for(const row of list()){const o=E('option',row.name);o.value=row.id;saved.append(o);}saved.value=id;}
 function showFields(){for(const [input,visible]of [[samples,mode.value==='samples'],[prefix,mode.value==='markers'],[suffix,mode.value==='markers'],[keywords,mode.value==='keywords']])input.parentElement.hidden=!visible;}
 function run(){clearTimeout(timer);showFields();last=analyze(text,config());hint.textContent=last.error||last.description+'；找到 '+last.matches+' 个标题'+(!last.matches?'，请调整规则。':'。');hint.classList.toggle('is-error',!!last.error||!last.matches);onResult(last);return last;}
 for(const input of [samples,prefix,suffix,keywords,max])input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(run,180);});mode.onchange=run;
 saved.onchange=()=>{const row=list().find(r=>r.id===saved.value);if(!row)return;const c=normalize(row.config);mode.value=c.mode;samples.value=c.samples;prefix.value=c.prefix;suffix.value=c.suffix;keywords.value=c.keywords;max.value=c.maxLength;name.value=row.name;run();};
 function button(label,fn){const b=E('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){hint.textContent=e.message;hint.classList.add('is-error');}finally{b.disabled=false;}};actions.append(b);}
 button('保存规则',async()=>{const result=run();if(result.error)throw Error(result.error);if(!result.matches)throw Error('当前没有匹配标题，请调整后保存');const row=await save(name.value,config(),saved.value||undefined);refreshSaved(row.id);hint.textContent='规则已保存；'+result.description;});
 button('删除所选规则',async()=>{if(!saved.value)throw Error('请先选择一条已保存的规则');await remove(saved.value);refreshSaved('');name.value='';run();});refreshSaved('');
 return {show(){host.hidden=false;run();},hide(){host.hidden=true;clearTimeout(timer);},flush:run,dispose(){clearTimeout(timer);},config};
}
window.ReaderChapterRules={normalize,infer,compile,analyze,list,save,remove,editor};
})();
