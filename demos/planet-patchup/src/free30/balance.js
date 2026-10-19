export const BALANCE_VERSION='free30-2';
export const UPGRADES={
 bombRange:{base:80,step:15,max:12,name:'폭파 반경 +0.25칸',field:'bombRadius',tool:'bomb'},
 bombForce:{base:80,step:15,max:10,name:'폭파 힘 +17.5%',field:'bombPower',tool:'bomb'},
 capacity:{base:80,step:15,max:18,name:'배터리 용량 +5',field:'capacity'},
 suction:{base:80,step:25,max:12,name:'흡입량 +8/초',field:'suctionRate'},
 range:{base:80,step:25,max:12,name:'흡입 반경 +0.5칸',field:'suctionRadius'},
 gravityForce:{base:80,step:30,max:8,name:'블랙홀 인력 +0.02',field:'gravityPower',tool:'blackhole'},
 coreMix:{base:80,step:30,max:8,name:'중심부 휘젓기 +0.25배',field:'coreMix',tool:'blackhole'},
 wearSpeed:{base:80,step:30,max:8,name:'갈리는 속도 상한 +0.5배',field:'wearSpeed',tool:'blackhole'},
};
export const UNLOCKS={blackhole:{cost:600,name:'블랙홀 해금',kind:'owned',description:'3초간 조각을 모아 서로 부딪치고 비비게 해요. 24 배터리/회.'}};
export const statsForProfile=p=>({
 capacity:60+5*p.upgrades.capacity,suctionRate:80+8*p.upgrades.suction,suctionRadius:12+.5*p.upgrades.range,
 bombRadius:3+.25*p.upgrades.bombRange,bombPower:1+.175*p.upgrades.bombForce,
 gravityCost:24,gravityPower:.2+.02*p.upgrades.gravityForce,coreMix:1+.25*p.upgrades.coreMix,wearSpeed:1+.5*p.upgrades.wearSpeed,
});
const priceCurve=id=>UPGRADES[id].tool==='blackhole'?30:60;
export function upgradeCost(id,level){const s=UPGRADES[id];return s.base+s.step*level+priceCurve(id)*Math.max(0,level-1)**2;}
export function totalSpent(p){
 return Object.entries(UPGRADES).reduce((sum,[id,s])=>{
  const level=p.upgrades[id],n=Math.max(0,level-2);
  return sum+s.base*level+s.step*level*(level-1)/2+(p.pricingVersion===2?priceCurve(id)*n*(n+1)*(2*n+1)/6:0);
 },0)+Object.entries(UNLOCKS).reduce((sum,[id,s])=>sum+(p[s.kind].includes(id)?s.cost:0),0)-(p.pricingVersion===2?p.legacyDiscount||0:0);
}
export function migratePricing(p){
 if(p.pricingVersion===2)return p;
 const next={...p,pricingVersion:2,legacyDiscount:0};
 // Preserve paid upgrades, remaining parts and historical spend; only future prices change.
 next.legacyDiscount=totalSpent(next)-p.spent;return next;
}
export const UPGRADE_HELP={
 bombRange:'직접 부수는 원이 조금씩 넓어져요. 두꺼운 받침을 뚫는 데 좋아요.',
 bombForce:'주변 조각을 더 강하게 밀고 균열을 퍼뜨려요. 부딪히며 무너지는 힘을 키워요.',
 capacity:'한 출동의 총 에너지예요. 폭파 12, 블랙홀 24를 사용해요. 조금 남아도 마지막 1회는 사용할 수 있어요.',
 suction:'민트색 잔해를 더 빨리 모아요. 수집 대기가 답답하면 먼저 올려 보세요.',
 range:'자동 흡입 원을 넓혀 흩어진 잔해를 편하게 모아요.',
 gravityForce:'주변 조각을 중심으로 당기는 힘이에요. 무거운 조각을 끌어올 때 좋아요.',
 coreMix:'모인 조각을 중심에서 더 힘차게 휘저어 서로 부딪치고 비비게 해요.',
 wearSpeed:'실제로 비비는 시간이 쌓이면 1배에서 표시된 상한까지 가속해요. 정지해서 붙어 있는 조각은 갈리지 않아요.',
};
export function offers(p){const now=statsForProfile(p),format=(id,n)=>id==='bombForce'?`${Math.round(n*1000)/10}%`:['coreMix','wearSpeed'].includes(id)?`${Number(n.toFixed(2))}배`:Number(n.toFixed(2));return [
 ...Object.entries(UPGRADES).map(([id,s])=>{const level=p.upgrades[id],max=p.bossCleared?null:s.max,nextLevel=max===null?level+1:Math.min(level+1,max),nextProfile={...p,upgrades:{...p.upgrades,[id]:nextLevel}},next=statsForProfile(nextProfile);return {id,name:s.name,help:UPGRADE_HELP[id],description:`${format(id,now[s.field])} → ${format(id,next[s.field])}${s.tool&&!p.owned.includes(s.tool)?' · 블랙홀 해금 필요':''}`,cost:upgradeCost(id,level),available:(max===null||level<max)&&Number.isSafeInteger(totalSpent(nextProfile))&&(!s.tool||p.owned.includes(s.tool)),level,max};}),
 ...Object.entries(UNLOCKS).map(([id,s])=>({id,name:s.name,description:s.description,cost:s.cost,available:!p[s.kind].includes(id),level:p[s.kind].includes(id)?1:0,max:1})),
].sort((a,b)=>ORDER.indexOf(a.id)-ORDER.indexOf(b.id));}
const ORDER=['bombRange','bombForce','blackhole','capacity','suction','range','gravityForce','coreMix','wearSpeed'];
export function upgradeGuide(p){
 const available=offers(p).filter(o=>o.available),affordable=available.filter(o=>o.cost<=p.parts);
 const hint=!p.owned.includes('blackhole')?'받침이 안 뚫리면 폭파 반경, 더 작업하고 싶으면 배터리. 600부품을 모아 블랙홀을 해금할 수도 있어요.':'폭파로 받침을 깨고 블랙홀로 모아 보세요. 잘 안 모이면 인력, 모였는데 덜 갈리면 휘젓기·갈리는 속도를 올려요.';
 return `${p.bossCleared?'클리어 후 자유 성장 · 강화 레벨 제한 해제! ':''}보유 ${p.parts.toLocaleString()}부품 · ${affordable.length?`${affordable.length}개 항목 구매 가능`:available.length?'다음 출동에서 부품을 더 모아 보세요.':'무료 구역 최대 성장 완료!'} ${hint}`;
}
export const bossAdvice=p=>p.bossCleared?'쌍봉 철탑 클리어! 강화 레벨 제한이 해제됐어요. 계속 업그레이드해 보세요. 랜덤 현장과 보스에 다시 도전할 수 있어요.':'준비되면 언제든 도전해요. 한 번에 70% 회수하면 성공! 실패해도 모은 부품은 남아요.';
