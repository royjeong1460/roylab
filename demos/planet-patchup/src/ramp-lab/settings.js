import {applyMotion as applyBaseMotion} from '../motion-lab/settings.js';
export const BASELINE={gravity:1,rotation:1,speed:1};
export const DEFAULTS={...BASELINE,rotation:5};
export const KEY='planet-patchup-motion-v1';
export const FIELDS=[
 {key:'gravity',label:'중력',min:.5,max:3,help:'전체 낙하 가속도. 기울어지는 힘과 공중 픽셀에도 적용돼요.'},
 {key:'rotation',label:'최대 회전 반응',min:1,max:5,help:'기울기 시작 후 5초 동안 1배에서 이 배수까지 증가해요. 각속도를 직접 곱하지 않고 회전 관성을 줄여요.'},
 {key:'speed',label:'최고 속도 제한',min:1,max:2,help:'이미 제한에 도달했을 때만 효과가 있어요. 조각 끝부분의 회전 이동도 포함해요.'},
];
export const PRESETS=[
 {label:'기본값 · 5초에 5배',values:DEFAULTS},
 {label:'증가 없음 · 모두 1배',values:BASELINE},
 {label:'중력만 1.5배',values:{...BASELINE,gravity:1.5}},
 {label:'5초에 2배',values:{...BASELINE,rotation:2}},
 {label:'속도 제한만 1.5배',values:{...BASELINE,speed:1.5}},
];
export function normalizeMotion(input){
 return Object.fromEntries(FIELDS.map(f=>{const n=input?.[f.key];return [f.key,typeof n==='number'&&Number.isFinite(n)?Math.min(f.max,Math.max(f.min,n)):DEFAULTS[f.key]];}));
}
export function loadMotion(storage){
 try{
  const raw=storage.getItem(KEY);if(raw===null)return {settings:normalizeMotion({})};
  const data=JSON.parse(raw);if(![1,2].includes(data?.version)||!data.settings||typeof data.settings!=='object')throw Error('version');
  const settings=normalizeMotion(data.version===1?{...data.settings,rotation:5}:data.settings);
  if(data.version===1&&!saveMotion(storage,settings).ok)return {settings,warning:'회전 5배를 적용했지만 저장하지 못했어요.'};
  return {settings};
 }catch{return {settings:normalizeMotion({}),warning:'낙하 설정을 읽지 못해 기본값으로 시작했어요.'};}
}
export function saveMotion(storage,input){try{storage.setItem(KEY,JSON.stringify({version:2,settings:normalizeMotion(input)}));return {ok:true};}catch{return {ok:false};}}
export function applyRampMotion(world,input){
 const settings=normalizeMotion(input);
 applyBaseMotion(world,{...settings,rotation:1});
 world.rotationLimit=settings.rotation;
 for(const piece of world.bodies)world.updateRotation(piece);
 return settings;
}
