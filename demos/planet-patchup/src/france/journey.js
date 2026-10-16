import {ThreeToolRun} from '../three-tool-run.js';

import {ThreeToolWorld} from '../three-tool-world.js';

import {FRANCE_SITES,FRANCE_BOSS,chooseFranceSite} from './sites.js';

export const FRANCE_SAVE_KEYS=['pixel-demolition-france-v1-a','pixel-demolition-france-v1-b'];

const specs={capacity:[80,30,24,'배터리 용량 +5'],suction:[100,40,20,'무료 흡입량 +8 픽셀/초'],range:[120,50,20,'무료 흡입 반경 +0.5칸'],bombRange:[180,80,5,'폭탄 반경 +1칸','bomb'],bombForce:[120,60,5,'폭탄 충격량 +25%','bomb'],gravityForce:[180,80,5,'블랙홀 인력 +0.06','blackhole']};

const unlocks={bomb:[180,'폭탄 해금'],blackhole:[420,'블랙홀 해금'],claw:[120,'발톱 패턴 (6 배터리)'],ring:[220,'고리 패턴 (10 배터리)'],foot:[340,'발자국 패턴 (14 배터리)']};

const fresh=()=>({version:1,revision:0,earned:0,spent:0,parts:0,owned:['cutter'],patterns:['dot'],upgrades:Object.fromEntries(Object.keys(specs).map(k=>[k,0])),bossCleared:false,lastSite:null});

export const statsForProfile=p=>({capacity:60+5*p.upgrades.capacity,suctionRate:80+8*p.upgrades.suction,suctionRadius:12+.5*p.upgrades.range,bombRadius:3+p.upgrades.bombRange,bombPower:1+.25*p.upgrades.bombForce,gravityPower:.2+.06*p.upgrades.gravityForce});

const clone=x=>JSON.parse(JSON.stringify(x));

function totalSpent(p){return Object.entries(specs).reduce((sum,[k,[base,step]])=>sum+base*p.upgrades[k]+step*p.upgrades[k]*(p.upgrades[k]-1)/2,0)+Object.entries(unlocks).reduce((sum,[id,[cost]])=>sum+((p.owned.includes(id)||p.patterns.includes(id))?cost:0),0);
}
function valid(p){
 if(!p||p.version!==1||!['revision','earned','spent','parts'].every(k=>Number.isSafeInteger(p[k])&&p[k]>=0)||p.earned-p.spent!==p.parts||typeof p.bossCleared!=='boolean')return false;

 if(!Array.isArray(p.owned)||!Array.isArray(p.patterns)||!p.owned.includes('cutter')||!p.patterns.includes('dot')||new Set(p.owned).size!==p.owned.length||new Set(p.patterns).size!==p.patterns.length||p.owned.some(k=>!['cutter','bomb','blackhole'].includes(k))||p.patterns.some(k=>!['dot','claw','ring','foot'].includes(k)))return false;

 return Object.entries(specs).every(([k,v])=>Number.isInteger(p.upgrades?.[k])&&p.upgrades[k]>=0&&p.upgrades[k]<=v[2]&&(!v[4]||p.upgrades[k]===0||p.owned.includes(v[4])))&&totalSpent(p)===p.spent&&(p.lastSite===null||[...FRANCE_SITES,FRANCE_BOSS].some(s=>s.id===p.lastSite));

}
class FranceWorld extends ThreeToolWorld{
 constructor(site,p){super(site.data,{capacity:60+5*p.upgrades.capacity});
this.allowedTools=[...p.owned];
this.allowedPatterns=[...p.patterns];
this.suctionRate=80+8*p.upgrades.suction;
this.suctionRadius=12+.5*p.upgrades.range;
super.configure({bombRange:p.upgrades.bombRange,bombForce:p.upgrades.bombForce,gravityForce:p.upgrades.gravityForce});
}
 setTool(id){return this.allowedTools.includes(id)&&super.setTool(id);
}
 configure(patch){if(!patch||Object.entries(patch).some(([key,value])=>key==='pattern'?!this.allowedPatterns.includes(value):this.settings[key]!==value))return false;
return super.configure(patch);
}
}
export class FranceRun extends ThreeToolRun{
 constructor(site,profile,mode='random'){const snapshot=clone(profile);
super(site,{capacity:60+5*snapshot.upgrades.capacity});
Object.freeze(snapshot.owned);
Object.freeze(snapshot.patterns);
Object.freeze(snapshot.upgrades);
Object.freeze(snapshot);
this.profile=snapshot;
this.world=new FranceWorld(site,snapshot);
this.mode=mode;
}
 pause(value){super.pause(this.settling||value);
}
 selectTool(id){if(this.finishReady||this.paused)return false;
this.release();
return this.world.setTool(id);
}
 selectPattern(id){if(this.finishReady||this.paused)return false;
this.release();
return this.world.configure({pattern:id});
}
 exhaust(){if(this.world.charge<1-1e-8){this.phase='finishing';
this.world.toolEnabled=false;
}}
 update(dt,input){if(this.paused||this.finishReady||this.state!=='active')return;
super.update(dt,input);
if(this.world.collected>=this.world.initial){this.finishReady=true;
this.finishReason='collected';
this.release();
this.accumulator=0;
}}
}
export class FranceJourney{
 constructor(storage,locks=globalThis.navigator?.locks){this.storage=storage;
this.locks=locks;
this.currentRun=null;
this.busy=false;
this.notice='';
this.persistent=!!locks?.request;
if(!this.persistent)this.notice='안전한 저장 잠금을 사용할 수 없습니다.';
try{this.profile=this.read();
}catch{this.profile=fresh();
this.persistent=false;
this.notice='저장 데이터를 읽을 수 없습니다.';
}
this.lastRunSite=this.profile.lastSite;
}
 read(){const values=FRANCE_SAVE_KEYS.map(k=>this.storage.getItem(k)).filter(x=>x!==null);
if(!values.length)return fresh();
const parsed=values.map(x=>JSON.parse(x));
if(parsed.some(p=>!valid(p)))throw Error('corrupt');
parsed.sort((a,b)=>b.revision-a.revision);
if(parsed.length===2&&parsed[0].revision===parsed[1].revision&&JSON.stringify(parsed[0])!==JSON.stringify(parsed[1]))throw Error('conflict');
return parsed[0];
}
 async transact(action){if(this.busy)return {ok:false,reason:'busy'};
this.busy=true;
try{const execute=async()=>{if(!this.persistent)return {ok:false,reason:'storage'};
const disk=this.read();
const result=action(disk);
if(!result.ok)this.profile=disk;
return result;
};
return this.locks?.request?await this.locks.request('pixel-demolition-france-v1',execute):await execute();
}catch{this.notice='저장에 실패했습니다. 다시 시도하세요.';
return {ok:false,reason:'storage'};
}finally{this.busy=false;
}}
 save(next){next.revision+=1;
if(!valid(next))throw Error('invalid');
const encoded=JSON.stringify(next);
this.storage.setItem(FRANCE_SAVE_KEYS[next.revision%2],encoded);
this.profile=next;
}
 async start(mode='random'){return this.transact((profile)=>{if(this.currentRun)return {ok:false,reason:'active'};
if(!['random','retry','boss'].includes(mode))return {ok:false,reason:'mode'};
const site=mode==='boss'?FRANCE_BOSS:mode==='retry'?[...FRANCE_SITES,FRANCE_BOSS].find(s=>s.id===this.lastRunSite):chooseFranceSite(this.lastRunSite);
if(!site)return {ok:false,reason:'no-previous-site'};
const next=clone(profile);
next.lastSite=site.id;
const run=new FranceRun(site,next,site.id===FRANCE_BOSS.id?'boss':mode==='retry'?'retry':'random');
this.save(next);
this.currentRun=run;
this.lastRunSite=site.id;
return {ok:true,run};
});
}
 async finish(){const run=this.currentRun;
if(run){run.settling=true;
run.pause(true);
}return this.transact((profile)=>{if(!run||run!==this.currentRun)return {ok:false,reason:'no-run'};
const recovered=run.world.collected;
if(!Number.isSafeInteger(recovered)||recovered<0||recovered>run.world.initial)return {ok:false,reason:'invalid-recovery'};
const qualified=run.qualified;
const bossQualified=run.mode==='boss'&&qualified;
const next=clone(profile),bonus=bossQualified&&!next.bossCleared?500:0;
next.lastSite=run.site.id;
next.earned+=recovered+bonus;
next.parts+=recovered+bonus;
next.bossCleared ||= bossQualified;
this.save(next);
run.state='finished';
run.world.toolEnabled=false;
this.currentRun=null;
this.lastRunSite=run.site.id;
return {ok:true,recovered,bonus,qualified,bossCleared:next.bossCleared,mode:run.mode,siteName:run.site.name};
});
}
 stats(profile=this.profile){return statsForProfile(profile);
}
 offers(profile=this.profile){return [...Object.entries(specs).map(([id,[base,step,max,description,tool]])=>{const level=profile.upgrades[id];
const now=this.stats(profile),next=statsForProfile({...profile,upgrades:{...profile.upgrades,[id]:level+1}}),field={capacity:'capacity',suction:'suctionRate',range:'suctionRadius',bombRange:'bombRadius',bombForce:'bombPower',gravityForce:'gravityPower'}[id];
return {id,name:description,description:`${description}: ${now[field]} → ${next[field]}`,cost:base+step*level,available:level<max&&(!tool||profile.owned.includes(tool)),level,max};
}),...Object.entries(unlocks).map(([id,[cost,description]])=>{const owned=(['bomb','blackhole'].includes(id)?profile.owned:profile.patterns).includes(id);
return {id,name:description,description,cost,available:!owned,level:owned?1:0,max:1};
})];
}
 async buy(id){return this.transact((profile)=>{if(this.currentRun)return {ok:false,reason:'active'};
const offer=this.offers(profile).find(o=>o.id===id);
if(!offer)return {ok:false,reason:'unknown'};
if(!offer.available)return {ok:false,reason:'unavailable'};
if(profile.parts<offer.cost)return {ok:false,reason:'insufficient'};
const next=clone(profile);
next.parts-=offer.cost;
next.spent+=offer.cost;
if(specs[id])next.upgrades[id]++;
else (['bomb','blackhole'].includes(id)?next.owned:next.patterns).push(id);
this.save(next);
return {ok:true};
});
}
}
