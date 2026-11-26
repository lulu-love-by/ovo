// Recover a known WebKit connection/transaction failure without wiping data,
// reloading the page, replaying a model request, or bypassing revision checks.
(() => {'use strict';
const openings=new WeakMap();
const state={recovering:false,recoveries:0,lastRecoveryAt:0};
function transient(error,seen=new Set()){
 if(!error||seen.has(error)||seen.size>20||error.dataGuard90)return false;seen.add(error);
 if(['QuotaExceededError','ConstraintError','DataError','DataCloneError','VersionError'].includes(error.name))return false;
 const failures=Array.isArray(error.failures)?error.failures.filter(Boolean):[];
 if(failures.length)return failures.every(f=>transient(f,new Set(seen)));
 const message=String(error.message||error);
 if(/without an in-progress transaction|connection to indexed\s*database server lost|connection to indexeddb server lost/i.test(message))return true;
 return !!((error.inner&&transient(error.inner,seen))||(error.cause&&transient(error.cause,seen)));
}
async function reopen(database){
 if(openings.has(database))return openings.get(database);
 const task=(async()=>{
  state.recovering=true;let timer;
  try{
   // The failed transaction has already rejected/aborted before reaching here.
   database.close();
   await Promise.race([database.open(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('本地数据库重新连接超时，未清空数据')),10000);})]);
   state.recoveries++;state.lastRecoveryAt=Date.now();
  }finally{clearTimeout(timer);state.recovering=false;}
 })();openings.set(database,task);
 try{return await task;}finally{openings.delete(database);}
}
async function transaction(mode,tables,work){
 const database=dexieDB;if(!database)throw Error('数据库尚未初始化');
 // Let only the outermost transaction replay after rollback; never close a DB
 // from inside an active parent transaction.
 const nested=!!Dexie.currentTransaction;
 if(!nested&&openings.has(database))await openings.get(database);
 const attempt=()=>{if(database!==dexieDB)throw Error('数据库已切换，旧操作已停止');return database.transaction(mode,tables,work);};
 try{return await attempt();}catch(error){
  if(nested||!transient(error))throw error;
  await reopen(database);
  // At most one retry. The caller repeats all guard/revision checks in work().
  return attempt();
 }
}
window.UwUStorageRetry93={transaction,status:()=>({...state})};
})();
