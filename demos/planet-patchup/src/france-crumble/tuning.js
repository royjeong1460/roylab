export const TUNING_STORAGE_KEY='pixel-demolition-france-crumble-tuning-v1';
export const TUNING_FIELDS=Object.freeze([
  {key:'collision',label:'충돌 붕괴',min:.5,max:3,step:.05},
  {key:'crackStrength',label:'폭파 균열 강도',min:.5,max:3,step:.05},
  {key:'crackRange',label:'폭파 균열 범위',min:.5,max:2,step:.05},
]);
export const DEFAULT_TUNING=Object.freeze({collision:1,crackStrength:1,crackRange:1});
export const TUNING_PRESETS=Object.freeze([
  {label:'기본값',value:DEFAULT_TUNING},
  {label:'조금 더',value:{collision:1.5,crackStrength:1.3,crackRange:1.15}},
  {label:'시원하게',value:{collision:2,crackStrength:1.6,crackRange:1.3}},
]);
export function normalizeTuning(value,base=DEFAULT_TUNING){
  return Object.fromEntries(TUNING_FIELDS.map(({key,min,max,step})=>{
    const n=value?.[key];
    if(typeof n!=='number'||!Number.isFinite(n))return [key,base[key]];
    const bounded=Math.max(min,Math.min(max,n));
    return [key,Number((Math.round((bounded+Number.EPSILON)/step)*step).toFixed(2))];
  }));
}
export function readTuning(storage){
  try{return normalizeTuning(JSON.parse(storage.getItem(TUNING_STORAGE_KEY)));}
  catch{return {...DEFAULT_TUNING};}
}
export function saveTuning(storage,value){
  try{storage.setItem(TUNING_STORAGE_KEY,JSON.stringify(normalizeTuning(value)));return true;}
  catch{return false;}
}
