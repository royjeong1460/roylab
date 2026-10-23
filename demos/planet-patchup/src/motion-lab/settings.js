export const KEY='planet-patchup-motion-v1';
export const FIELDS=[
 {key:'gravity',label:'중력',min:.5,max:3,help:'전체 낙하 가속도. 기울어지는 힘과 공중 픽셀에도 적용돼요.'},
 {key:'rotation',label:'회전 반응',min:.5,max:4,help:'높일수록 회전 관성이 작아져 더 쉽게 돌아요. 2배 = 관성 절반이며 실제 회전 속도 2배를 뜻하지는 않아요.'},
 {key:'speed',label:'최고 속도 제한',min:1,max:2,help:'이미 제한에 도달했을 때만 효과가 있어요. 조각 끝부분의 회전 이동도 포함해요.'},
];
export const PRESETS=[
 {label:'기본값 1배',values:{}},
 {label:'중력만 1.5배',values:{gravity:1.5}},
 {label:'회전만 2배',values:{rotation:2}},
 {label:'속도 제한만 1.5배',values:{speed:1.5}},
];
export function normalizeMotion(input){
 return Object.fromEntries(FIELDS.map(f=>{const n=input?.[f.key];return [f.key,typeof n==='number'&&Number.isFinite(n)?Math.min(f.max,Math.max(f.min,n)):1];}));
}
export function loadMotion(storage){
 try{const raw=storage.getItem(KEY);if(raw===null)return {settings:normalizeMotion({})};const data=JSON.parse(raw);if(data?.version!==1||!data.settings||typeof data.settings!=='object')throw Error('version');return {settings:normalizeMotion(data.settings)};}
 catch{return {settings:normalizeMotion({}),warning:'낙하 설정을 읽지 못해 기본값으로 시작했어요.'};}
}
export function saveMotion(storage,input){try{storage.setItem(KEY,JSON.stringify({version:1,settings:normalizeMotion(input)}));return {ok:true};}catch{return {ok:false};}}
const baselines=new WeakMap();
export function applyMotion(world,input){
 const s=normalizeMotion(input),p=world.labParameters;
 if(!baselines.has(world))baselines.set(world,{gravity:world.engine.gravity.scale,grainGravity:p.grainGravity,inertia:p.inertia,motionCap:p.motionCap,grainSpeedCap:p.grainSpeedCap});
 const b=baselines.get(world);
 p.gravity=world.engine.gravity.scale=b.gravity*s.gravity;p.grainGravity=b.grainGravity*s.gravity;
 p.inertia=b.inertia/s.rotation;p.motionCap=b.motionCap*s.speed;p.grainSpeedCap=b.grainSpeedCap*s.speed;
 for(const piece of world.bodies)world.applyMaterial(piece);
 return s;
}
