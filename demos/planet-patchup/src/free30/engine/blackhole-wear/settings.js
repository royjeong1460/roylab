import {BH_FIELDS as BASE_FIELDS,BH_DEFAULTS as BASE_DEFAULTS,BH_VARIANT as BASE_VARIANT,normalizeBH as normalizeBase,valuesBH as valuesBase,importBH as importBase} from '../blackhole-lab/settings.js';
const wearField={key:'wearSpeed',label:'갈리는 속도 상한',base:1,min:0,max:100,unit:'배',help:'처음 1배 → 실제로 비비는 시간 1초가 쌓이면 설정한 상한까지 가속돼요. 기본 상한 5배. 떨어지면 서서히 1배로 돌아가고, 정지 접촉은 갈리지 않아요. 0배는 마모 끄기.'};
const fields=BASE_FIELDS.map(f=>f.key==='coreMix'?{...f,help:'중심으로 모아 휘저어요. 0배에서는 휘젓는 힘이 없어지고, 조각이 실제로 비빌 때만 마모돼요.'}:f);
export const BH_FIELDS=[...fields.filter(f=>!f.advanced),wearField,...fields.filter(f=>f.advanced)];
export const BH_VARIANT='blackhole-wear-v2';
export const BH_DEFAULTS={...BASE_DEFAULTS,coreMix:2,wearSpeed:5};
export function normalizeBH(patch={},previous=BH_DEFAULTS){
 const n=patch?.wearSpeed;
 return {...normalizeBase(patch,previous),wearSpeed:typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(100,n)):previous.wearSpeed};
}
export function valuesBH(value){const m=normalizeBH(value);return {...valuesBase(m),wearSpeed:m.wearSpeed};}
export function importBH(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(![BH_VARIANT,'blackhole-wear-v1'].includes(data?.variant))throw Error('접촉 마모 비교판에서 저장한 설정 파일을 선택해 주세요.');
 const base=importBase({...data,variant:BASE_VARIANT});
 const present=Object.hasOwn(data.multipliers,'wearSpeed'),n=data.multipliers.wearSpeed;
 if(present&&(typeof n!=='number'||!Number.isFinite(n)))throw Error('갈리는 속도는 0~100 사이 숫자여야 해요.');
 return normalizeBH({...base,wearSpeed:data.variant===BH_VARIANT&&present?n:5});
}
