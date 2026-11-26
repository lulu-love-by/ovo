// Reader drafts live with each book and are included in its existing backup.
(()=>{'use strict';
const bindings=new Set(),jobs=new Map(),prefix='uwu-reader-draft98:';let warned=false;
const key=(book,id)=>prefix+encodeURIComponent(book)+':'+encodeURIComponent(id);
function local(book,id){try{return JSON.parse(localStorage.getItem(key(book,id))||'null');}catch{return null;}}
function stash(book,id,value){try{localStorage.setItem(key(book,id),JSON.stringify(value));}catch{if(!warned){warned=true;showToast('草稿暂存空间不可用，正在保存到阅读器');}}}
function write(book,id,value){const task=(jobs.get(book)||Promise.resolve()).catch(()=>{}).then(()=>dexieDB.transaction('rw',dexieDB.reader_books,async()=>{const b=await dexieDB.reader_books.get(book);if(!b)return;const drafts={...(b.drafts98||{})};if(value.text)drafts[id]=value;else delete drafts[id];await dexieDB.reader_books.update(book,{drafts98:drafts});}));jobs.set(book,task);task.catch(()=>{if(!warned){warned=true;showToast('草稿仍保留在本机，阅读器保存暂未完成');}}).finally(()=>{if(jobs.get(book)===task)jobs.delete(book);});return task;}
function bind(input,book,id,initial=''){const saved=local(book,id);input.value=saved?.text||initial;let baseline=initial;let touched=false,disposed=false,frozen=null,last=saved||null;
 const flush=()=>{const current=disposed?frozen:input.value;const value={text:current===baseline?'':current,at:Date.now()};last=value;stash(book,id,value);return write(book,id,value);};
 const onInput=()=>{touched=true;void flush().catch(()=>{});};input.addEventListener('input',onInput);
 const ready=(async()=>{const b=await dexieDB.reader_books.get(book),stored=b?.drafts98?.[id];if(!disposed&&!touched&&stored&&(!last||stored.at>last.at)){input.value=stored.text||initial;last=stored;stash(book,id,stored);}})();ready.catch(()=>{});
 const binding={ready,flush,async accept(expected){if((disposed?frozen:input.value)!==expected)return false;baseline=expected;await flush();return true;},async clear(expected){if(expected!==undefined&&(disposed?frozen:input.value)!==expected)return false;touched=true;baseline='';if(disposed)frozen='';else input.value='';await flush();return true;},detach(){if(disposed)return;frozen=input.value;disposed=true;input.removeEventListener('input',onInput);void flush().catch(()=>{});bindings.delete(binding);}};bindings.add(binding);return binding;
}
async function flushAll(){await Promise.all([...bindings].map(b=>b.flush()));await Promise.all([...jobs.values()]);}
window.addEventListener('pagehide',()=>{void flushAll().catch(()=>{});});
async function move(book,from,to){const b=await dexieDB.reader_books.get(book),a=local(book,from)||b?.drafts98?.[from],other=local(book,to)||b?.drafts98?.[to];if(!a?.text||other?.text)return;stash(book,to,a);await write(book,to,a);const cleared={text:'',at:Date.now()};stash(book,from,cleared);await write(book,from,cleared);}
window.ReaderDrafts98={bind,flushAll,move};
})();
