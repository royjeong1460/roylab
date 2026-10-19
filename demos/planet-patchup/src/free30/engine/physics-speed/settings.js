export const SPEED_FIELDS=[
 {key:'startSpeed',label:'깨지기 시작하는 속도',base:40,min:1,max:180,step:1,unit:'칸/s',help:'낮추면 낮은 곳에서 떨어져도 깨져요. 충돌면을 향한 상대속도 기준이에요.'},
 {key:'growth',label:'속도에 따른 파괴 증가량',base:1,min:0,max:100,step:.1,unit:'배',help:'높이면 시작 속도를 넘은 뒤 더 빠르게 바스러져요. 0이면 충돌 파괴를 꺼요.'},
 {key:'maxPercent',label:'한 번에 픽셀화되는 최대 비율',base:95,min:0,max:100,step:1,unit:'%',help:'충돌 한 번의 직접 픽셀화 상한이에요. 큰 덩어리는 더 낮은 비율로 제한하고 내부를 갈라요. 분리된 아주 작은 잔해는 추가로 픽셀이 될 수 있어요.'},
];
export const SPEED_DEFAULTS=Object.fromEntries(SPEED_FIELDS.map(f=>[f.key,f.base]));
export function normalizeSpeed(patch={},previous=SPEED_DEFAULTS){
 const value={...previous};
 for(const f of SPEED_FIELDS){const n=patch?.[f.key];if(typeof n==='number'&&Number.isFinite(n))value[f.key]=Math.max(f.min,Math.min(f.max,n));}
 return value;
}
export function importSpeed(raw){
 const data=typeof raw==='string'?JSON.parse(raw):raw;
 if(data?.variant!=='speed-fracture-v1'||data?.version!==1||!data.multipliers||SPEED_FIELDS.some(f=>typeof data.multipliers[f.key]!=='number'||!Number.isFinite(data.multipliers[f.key])))throw Error('속도 기반 비교판에서 저장한 설정을 선택해 주세요.');
 return normalizeSpeed(data.multipliers);
}
