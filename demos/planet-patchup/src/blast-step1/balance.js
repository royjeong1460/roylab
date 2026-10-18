export const UPGRADES={
 capacity:{base:80,step:50,max:24,name:'배터리 용량 +5',field:'capacity'},
 suction:{base:100,step:40,max:20,name:'흡입량 +8/초',field:'suctionRate'},
 range:{base:120,step:50,max:16,name:'흡입 반경 +0.5칸',field:'suctionRadius'},
 bombRange:{base:120,step:90,max:5,name:'폭파 반경 +1칸',field:'bombRadius',tool:'bomb'},
 bombForce:{base:100,step:80,max:5,name:'폭파 밀어내는 힘 +25%',field:'bombPower',tool:'bomb'},
 gravityForce:{base:450,step:300,max:5,name:'블랙홀 인력 +0.06',field:'gravityPower',tool:'blackhole'},
};
export const UNLOCKS={blackhole:{cost:600,name:'블랙홀 해금',kind:'owned',description:'3초간 조각을 한 점으로 당겨 서로 부딪히게 해요. 18 배터리/회.'}};
export const statsForProfile=p=>({capacity:60+5*p.upgrades.capacity,suctionRate:80+8*p.upgrades.suction,suctionRadius:12+.5*p.upgrades.range,bombRadius:3+p.upgrades.bombRange,bombPower:1+.25*p.upgrades.bombForce,gravityPower:.2+.06*p.upgrades.gravityForce});
export function totalSpent(p){return Object.entries(UPGRADES).reduce((sum,[id,s])=>sum+s.base*p.upgrades[id]+s.step*p.upgrades[id]*(p.upgrades[id]-1)/2,0)+Object.entries(UNLOCKS).reduce((sum,[id,s])=>sum+(p[s.kind].includes(id)?s.cost:0),0);}
export function offers(p){const now=statsForProfile(p);return [
 ...Object.entries(UPGRADES).map(([id,s])=>{const level=p.upgrades[id],next=statsForProfile({...p,upgrades:{...p.upgrades,[id]:Math.min(level+1,s.max)}});return {id,name:s.name,description:`${now[s.field]} → ${next[s.field]}${s.tool&&!p.owned.includes(s.tool)?' · 해당 도구 구매 필요':''}`,cost:s.base+s.step*level,available:level<s.max&&(!s.tool||p.owned.includes(s.tool)),level,max:s.max};}),
 ...Object.entries(UNLOCKS).map(([id,s])=>({id,name:s.name,description:s.description,cost:s.cost,available:!p[s.kind].includes(id),level:p[s.kind].includes(id)?1:0,max:1})),
];}
export function bossAdvice(p){return p.bossCleared?'쌍봉 철탑 청소 완료! 무료 구역은 계속 플레이할 수 있어요.':p.owned.includes('blackhole')?'폭파로 밀고 블랙홀로 모아 보세요. 준비되면 쌍봉 철탑에 도전해요.':'폭파로 받침을 무너뜨려 부품을 모으세요. 블랙홀은 작업장에서 600부품으로 해금해요.';}
