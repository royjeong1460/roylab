import {FREE_SITES,FREE_BOSS} from './sites.js';
export const FREE_STAGES=[...FREE_SITES,FREE_BOSS].map((site,index)=>({...site,name:`고물 바람골 - ${index===6?'Boss':index+1}`,subtitle:site.name,boss:index===6}));
export const stageBest=(profile,id)=>{const r=profile.stageRecords?.[id];return r?r.recovered/r.total:0;};
export function stageOpen(profile,index){return Number.isInteger(index)&&index>=0&&index<FREE_STAGES.length&&(!FREE_STAGES[index].boss||FREE_STAGES.filter(s=>!s.boss).every(s=>stageBest(profile,s.id)>=.7));}
export const nextStage=profile=>FREE_STAGES.find((s,i)=>stageOpen(profile,i)&&stageBest(profile,s.id)<.7)||FREE_STAGES[0];
export function rememberStage(records,id,recovered,total){
 if(!FREE_STAGES.some(s=>s.id===id)||!Number.isSafeInteger(recovered)||!Number.isSafeInteger(total)||total<1||recovered<0||recovered>total)return;
 const old=records[id];if(!old||recovered/total>old.recovered/old.total)records[id]={recovered,total};
}
export function migrateStages(profile){
 const p={...profile,version:4};
 if(profile.version<4){p.stageRecords={};for(const row of p.history)rememberStage(p.stageRecords,row.site,row.recovered,row.total);}
 return p;
}
export function validStageRecords(records){
 return !!records&&typeof records==='object'&&!Array.isArray(records)&&Object.entries(records).every(([id,r])=>FREE_STAGES.some(s=>s.id===id)&&r&&Number.isSafeInteger(r.recovered)&&Number.isSafeInteger(r.total)&&r.total>0&&r.total<=20000&&r.recovered>=0&&r.recovered<=r.total);
}
