import {FIELDS} from '../physics-lab/parameters.js';
export const BH_VARIANT='blackhole-lab-v1';
export const BH_FIELDS=[
 ...FIELDS.filter(f=>['gravityPower','gravityRadius','gravityDuration'].includes(f.key)),
 {key:'coreMix',label:'중심부 휘젓기',base:1,min:0,max:100,unit:'배',help:'중심으로 모으면서 안쪽에서 휘저어요. 밖으로 튀는 속도는 줄이고, 실제 충돌로 부서져요. 0이면 기존 인력만 적용해요.'},
 ...FIELDS.filter(f=>f.group==='블랙홀'&&!['gravityPower','gravityRadius','gravityDuration'].includes(f.key)).map(f=>({...f,advanced:true})),
];
export const BH_DEFAULTS=Object.fromEntries(BH_FIELDS.map(f=>[f.key,1]));
export function normalizeBH(patch={},previous=BH_DEFAULTS){return Object.fromEntries(BH_FIELDS.map(f=>{const n=patch?.[f.key];return [f.key,typeof n==='number'&&Number.isFinite(n)?Math.max(f.min,Math.min(100,n)):previous[f.key]];}));}
export function valuesBH(value){const m=normalizeBH(value);return Object.fromEntries(BH_FIELDS.map(f=>[f.key,f.base*m[f.key]]));}
export function importBH(raw){const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.variant!==BH_VARIANT||data?.version!==1||!data.multipliers||BH_FIELDS.some(f=>typeof data.multipliers[f.key]!=='number'||!Number.isFinite(data.multipliers[f.key])))throw Error('블랙홀 실험실에서 저장한 설정 파일을 선택해 주세요.');return normalizeBH(data.multipliers);}
