// Reader tables are independent of the chat settings object. Keep them in backups explicitly.
(() => {'use strict';
const tables=()=>[dexieDB.reader_books,dexieDB.reader_chapters,dexieDB.reader_comments];
function validate(data){if(data===undefined)return null;if(!data||data.version!==1||!['books','chapters','comments'].every(k=>Array.isArray(data[k])))throw Error('阅读器备份结构无效');
 for(const name of ['books','chapters','comments']){const ids=new Set();for(const r of data[name]){if(!r||typeof r!=='object'||Array.isArray(r))throw Error('阅读器备份记录无效');if(name!=='comments'&&typeof r.id!=='string'||name==='comments'&&r.id!==undefined&&(!Number.isSafeInteger(r.id)||r.id<1))throw Error('阅读器备份 ID 无效');if(r.id!==undefined){if(ids.has(r.id))throw Error('阅读器备份有重复 ID');ids.add(r.id);}if(name==='books'){if(typeof r.title!=='string')throw Error('阅读器书名无效');}else if(typeof r.bookId!=='string'||!Number.isInteger(name==='chapters'?r.index:r.chapterIndex)||(name==='chapters'?r.index:r.chapterIndex)<0||typeof r.content!=='string')throw Error('阅读器章节或段评无效');if(name==='comments'&&(!Number.isInteger(r.paragraphIndex)||r.paragraphIndex<0))throw Error('阅读器段评位置无效');}}
 return data;
}
async function capture(){await window.ReaderDrafts98?.flushAll();await window.readerView?.flushProgress?.();await window.ReaderAppearance89?.flush();return dexieDB.transaction('r',tables(),async()=>{const [books,chapters,comments]=await Promise.all(tables().map(t=>t.toArray()));return {version:1,books,chapters,comments};});}
// Caller includes this work in the same transaction as the other restored app data.
async function restore(data,replace=true){data=validate(data);if(!data)return;
 if(replace){await Promise.all(tables().map(t=>t.clear()));}else{for(const b of data.books){await dexieDB.reader_chapters.where('bookId').equals(b.id).delete();await dexieDB.reader_comments.where('bookId').equals(b.id).delete();}}
 if(data.books.length)await dexieDB.reader_books.bulkPut(data.books);if(data.chapters.length)await dexieDB.reader_chapters.bulkPut(data.chapters);
 const comments=[],newComments=[];for(const row of data.comments){const next={...row};if(!replace&&next.id!==undefined){const old=await dexieDB.reader_comments.get(next.id);if(old&&old.bookId!==next.bookId)delete next.id;}(next.id===undefined?newComments:comments).push(next);}if(comments.length)await dexieDB.reader_comments.bulkPut(comments);for(const row of newComments)await dexieDB.reader_comments.add(row);
}
async function beforeRestore(){await Promise.all([window.readerView?.suspendPersistence?.(),window.ReaderAppearance89?.detach()]);}
function afterRestore(){void beforeRestore();}
window.ReaderBackup89={capture,validate,restore,beforeRestore,afterRestore};
})();
