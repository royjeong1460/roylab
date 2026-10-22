import {FIELDS,PRESETS,SETTINGS_KEY,normalizeSettings} from '../paid-lab/settings.js';

export const OPTIONS_KEY='planet-patchup-ideas-options-v1';
export const TUNING_KEY='planet-patchup-ideas-tuning-v1';
export const DEFAULT_OPTIONS={blast:'aftershock',well:'grind',level:1};
export const BLASTS=[
 {id:'normal',name:'기본 폭파',description:'추가 효과 없이 같은 화력을 비교해요.'},
 {id:'aftershock',name:'여진 폭파',description:'첫 폭발 뒤 좌우에서 작은 폭발이 이어져요.'},
 {id:'relay',name:'충돌 전달',description:'표시된 파편이 부딪치면 충격을 한 번 전달해요.'},
 {id:'slam',name:'띄우고 내리찍기',description:'주변 파편을 띄운 뒤 아래로 내리쳐요.'},
 {id:'expand',name:'팽창 압력',description:'커지는 압력장이 파편을 바깥으로 밀어요.'},
 {id:'spin',name:'회전 폭파',description:'파편을 옆으로 비틀어 회전을 만들어요.'},
 {id:'wave',name:'지면 파동',description:'표시된 조각이 바닥에 떨어지면 좌우 받침을 흔들어요.'},
];
export const WELLS=[
 {id:'grind',name:'모아 갈기',description:'중심으로 당기고 비벼서 파편을 잘게 갈아요.'},
 {id:'release',name:'모았다 방출',description:'끌어모은 파편을 종료 순간 바깥으로 밀어요.'},
 {id:'drop',name:'들었다 떨어뜨리기',description:'파편을 위로 모은 뒤 아래로 떨어뜨려요.'},
];
export function normalizeOptions(input){
 const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return {blast:BLASTS.some(item=>item.id===source.blast)?source.blast:DEFAULT_OPTIONS.blast,well:WELLS.some(item=>item.id===source.well)?source.well:DEFAULT_OPTIONS.well,level:[1,2,3].includes(source.level)?source.level:DEFAULT_OPTIONS.level};
}
export function optionsLabel(options){
 const value=normalizeOptions(options);
 return `${BLASTS.find(item=>item.id===value.blast).name} + ${WELLS.find(item=>item.id===value.well).name} · 효과 ${value.level}`;
}
export function loadOptions(storage){
 try{
  const raw=storage.getItem(OPTIONS_KEY);if(!raw)return {options:{...DEFAULT_OPTIONS}};
  const data=JSON.parse(raw);if(data?.version!==1||!data.options||typeof data.options!=='object'||Array.isArray(data.options))throw Error('version');
  return {options:normalizeOptions(data.options)};
 }catch{return {options:{...DEFAULT_OPTIONS},warning:'실험 선택을 읽지 못해 여진 · 모아 갈기 · 효과 1로 시작했어요.'};}
}
export function saveOptions(storage,options){
 try{storage.setItem(OPTIONS_KEY,JSON.stringify({version:1,options:normalizeOptions(options)}));return {ok:true};}catch{return {ok:false};}
}
const tuningDefaults={...PRESETS.free.values,gravityRadius:30,gravityPower:.15,gravityDuration:2,coreMix:1,wearSpeed:1,unlimited:true};
export function loadIdeaTuning(storage){
 try{
  const raw=storage.getItem(TUNING_KEY);if(!raw)return {settings:normalizeSettings(tuningDefaults)};
  const data=JSON.parse(raw);if(data?.version!==1||!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings))throw Error('version');
  const merged={...tuningDefaults};
  for(const field of FIELDS)if(typeof data.settings[field.key]==='number'&&Number.isFinite(data.settings[field.key]))merged[field.key]=data.settings[field.key];
  if(typeof data.settings.unlimited==='boolean')merged.unlimited=data.settings.unlimited;
  return {settings:normalizeSettings(merged)};
 }catch{return {settings:normalizeSettings(tuningDefaults),warning:'세부 화력을 읽지 못해 약한 시작값으로 돌아왔어요.'};}
}
export function createTuningStorage(storage){
 const check=key=>{if(key!==SETTINGS_KEY)throw Error('Unexpected settings key');};
 return {getItem(key){check(key);return storage.getItem(TUNING_KEY);},setItem(key,value){check(key);storage.setItem(TUNING_KEY,value);}};
}
