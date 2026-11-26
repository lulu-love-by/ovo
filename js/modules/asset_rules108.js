/* Shared generation contract. Existing/manual transactions are never rewritten here. */
(()=>{'use strict';
const finance='生成前先核对人设、世界书和记忆中的职业、收入来源、金额或范围及结算周期，再结合所选日期和已有流水判断应到账项目。工资、工作报酬、经营回款、分红、租金或利息等有依据且在所选时段内已到账的收入，必须进入entries，不因聊天只提到消费就遗漏；没有写明金额或到账日时可结合人设合理推定并在note标明估算，不超出所选时段。年收入不是单日到账额，不能每次生成都全额入账，也不为凑收入每天发工资。初始余额是时段之前的存款，不能代替时段内应记的收入；accounts.balance不得包含entries中的同一笔收支。核对existing.entries、fixed及generated，已入账或已覆盖时段的收入和支出不得重复生成。收入用type:income、正数amount、category:收入；支出用type:expense、负数amount及提供的支出分类。示例只说明格式，实际来源、金额和日期依角色与时段决定，不要求每次收支成对或固定数量。activities应体现角色的工作、收入相关进展和生活近况；涉及到账的近况同时在entries记账一次，只有工作进展或待收款时不提前入账。没有当期收入依据时允许只有支出或无流水，但不能把资产与近况任务理解成只生成消费。';
function examples(day,accountId){return [{date:day,title:'符合人设且当期到账的收入项目',type:'income',amount:100,category:'收入',accountId,note:'收入来源与结算依据；合理推定时注明估算'},{date:day,title:'符合人设的消费项目',type:'expense',amount:-100,category:'餐饮',accountId}];}
function normalize(entry){
 const direction=String(entry.type||entry.direction||'').trim().toLowerCase(),income=['income','收入','收款'].includes(direction)||entry.category==='收入',expense=['expense','支出','付款'].includes(direction);
 if(income&&expense)throw Error('生成流水的收入类别与支出方向冲突');
 const amount=Number(entry.amount);if(!Number.isFinite(amount)||amount===0)return entry;
 if(income){entry.amount=Math.abs(amount);entry.category='收入';}else if(expense)entry.amount=-Math.abs(amount);
 return entry;
}
globalThis.UwUAssetRules108={finance,examples,normalize};
})();
