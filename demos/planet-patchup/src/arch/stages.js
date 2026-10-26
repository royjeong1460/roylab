import {ARCH_SITES,ARCH_BOSS} from './maps.js';
export const FREE_STAGES=[...ARCH_SITES.map(s=>({...s,boss:false})),{...ARCH_BOSS,boss:true}];
export const ARCH_STAGES=FREE_STAGES;
export const stageBest=(p,id)=>{const r=p.stageRecords?.[id];return r?r.recovered/r.total:0;};
export const stageOpen=(p,index)=>Number.isInteger(index)&&index>=0&&index<7&&(index<6||FREE_STAGES.slice(0,6).every(s=>stageBest(p,s.id)>=.7));
// Boss entry is always manual.
export const nextStage=p=>FREE_STAGES.slice(0,6).find(s=>stageBest(p,s.id)<.7)||FREE_STAGES[0];
export function rememberStage(records,id,recovered,total){const site=FREE_STAGES.find(s=>s.id===id);if(!site||!Number.isSafeInteger(recovered)||!Number.isSafeInteger(total)||total<1||recovered<0||recovered>total)return;const old=records[id];if(!old||recovered/total>old.recovered/old.total)records[id]={recovered,total,boss:site.boss};}
export const validStageRecords=records=>!!records&&typeof records==='object'&&!Array.isArray(records)&&Object.entries(records).every(([id,r])=>FREE_STAGES.some(s=>s.id===id)&&Number.isSafeInteger(r.recovered)&&Number.isSafeInteger(r.total)&&r.total>0&&r.total<=20000&&r.recovered>=0&&r.recovered<=r.total);
export const migrateStages=p=>p;
