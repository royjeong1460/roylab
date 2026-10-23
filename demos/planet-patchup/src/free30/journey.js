import {FranceJourney,FranceRun} from '../france/journey.js';
import {StructuralFreeWorld as FreeWorld} from '../structure/free-world.js';
import {FREE_SITES as STEP1_SITES,FREE_BOSS as STEP1_BOSS,FREE_TUTORIAL} from './sites.js';
import {FREE_STAGES,stageOpen,nextStage,rememberStage,migrateStages,validStageRecords} from './stages.js';
import {UPGRADES,UNLOCKS,totalSpent,statsForProfile,offers,migratePricing} from './balance.js';


export const FREE_SAVE_KEYS=['pixel-demolition-free30-v1-a','pixel-demolition-free30-v1-b'];
const LOCK='pixel-demolition-free30-v1',clone=value=>JSON.parse(JSON.stringify(value));
const fresh=()=>({version:4,stageRecords:{},pricingVersion:2,resetCount:0,legacyDiscount:0,campaign:'free30',tutorial:'intro',revision:0,earned:0,spent:0,parts:0,owned:['bomb'],patterns:['dot'],upgrades:Object.fromEntries(Object.keys(UPGRADES).map(k=>[k,0])),bossCleared:false,lastSite:null,runCount:0,bossAttempts:0,workMs:0,firstClearMs:null,history:[],purchases:[]});
const uint=n=>Number.isSafeInteger(n)&&n>=0;
function valid(p){
 if(p?.version===4&&!validStageRecords(p.stageRecords))return false;
 if(p?.resetCount!==undefined&&!uint(p.resetCount))return false;
 if(p?.version>=2&&p.pricingVersion!==2)return false;
 if(p?.pricingVersion!==undefined&&p.pricingVersion!==2)return false;
 if(p?.pricingVersion===2?!uint(p.legacyDiscount):p?.legacyDiscount!==undefined)return false;
 if(p?.tutorial!==undefined&&!['intro','upgrade','next','done'].includes(p.tutorial))return false;
 if(!p||![1,2,3,4].includes(p.version)||p.campaign!=='free30'||!['revision','earned','spent','parts','runCount','bossAttempts','workMs'].every(k=>uint(p[k]))||p.earned-p.spent!==p.parts||typeof p.bossCleared!=='boolean'||p.bossAttempts>p.runCount)return false;
 if(p.bossCleared?!(uint(p.firstClearMs)&&p.firstClearMs<=p.workMs):p.firstClearMs!==null)return false;
 if(!Array.isArray(p.owned)||!p.owned.includes('bomb')||new Set(p.owned).size!==p.owned.length||p.owned.some(id=>!['bomb','blackhole'].includes(id))||!Array.isArray(p.patterns)||p.patterns.length!==1||p.patterns[0]!=='dot')return false;
 if(!p.upgrades||Object.keys(p.upgrades).length!==Object.keys(UPGRADES).length||!Object.entries(UPGRADES).every(([id,s])=>uint(p.upgrades[id])&&(p.bossCleared||p.upgrades[id]<=s.max)&&(!s.tool||p.upgrades[id]===0||p.owned.includes(s.tool))))return false;
 if(!Number.isSafeInteger(totalSpent(p))||totalSpent(p)!==p.spent)return false;
 const ids=[...STEP1_SITES,STEP1_BOSS,FREE_TUTORIAL].map(s=>s.id);
 return (p.lastSite===null||ids.includes(p.lastSite))&&Array.isArray(p.history)&&p.history.length<=100&&p.history.every(r=>ids.includes(r.site)&&['random','retry','boss','stage'].includes(r.mode)&&uint(r.workMs)&&uint(r.recovered)&&uint(r.total)&&r.recovered<=r.total&&Number.isFinite(r.batteryUsed)&&r.batteryUsed>=0&&Array.isArray(r.tools)&&r.tools.every(t=>['bomb','blackhole'].includes(t)))&&Array.isArray(p.purchases)&&p.purchases.length<=100&&p.purchases.every(r=>(Object.hasOwn(UPGRADES,r.id)||Object.hasOwn(UNLOCKS,r.id))&&uint(r.cost)&&uint(r.workMs));
}
export class FreeRun extends FranceRun{
 constructor(site,profile,mode='random'){super(site,profile,mode);this.world=new FreeWorld(site,this.profile);this.workMs=0;}
 selectTool(id){if(this.finishReady||this.state!=='active')return false;this.release();return this.world.setTool(id);}
 exhaust(){if(this.world.charge<=1e-8){this.phase='finishing';this.world.toolEnabled=false;}}
 update(dt,input){
  if(this.paused||this.finishReady||this.state!=='active'||!Number.isFinite(dt)||dt<=0)return;
  this.workMs+=dt*1000;super.update(dt,input);
 }
}
export class FreeJourney extends FranceJourney{
 constructor(storage,locks=globalThis.navigator?.locks){super(storage,locks?.request?{request:(_name,fn)=>locks.request(LOCK,fn)}:null);if(!valid(this.profile))this.profile=fresh();}
 read(){
  const values=FREE_SAVE_KEYS.map(k=>this.storage.getItem(k)).filter(v=>v!==null);if(!values.length)return fresh();
  const parsed=values.map(v=>JSON.parse(v));if(parsed.some(p=>!valid(p)))throw Error('corrupt');parsed.sort((a,b)=>b.revision-a.revision);
  if(parsed.length===2&&parsed[0].revision===parsed[1].revision&&JSON.stringify(parsed[0])!==JSON.stringify(parsed[1]))throw Error('conflict');
  return migrateStages({...migratePricing({...parsed[0],tutorial:parsed[0].tutorial??'done'}),version:parsed[0].version});
 }
 save(next){next.revision++;if(!valid(next))throw Error('invalid');this.storage.setItem(FREE_SAVE_KEYS[next.revision%2],JSON.stringify(next));this.profile=next;}
 stats(p=this.profile){return statsForProfile(p);}
 offers(p=this.profile){return offers(p);}
 async resetProgress(expectedRevision){return this.transact(p=>{
  if(this.currentRun)return {ok:false,reason:'active'};
  if(expectedRevision!==p.revision)return {ok:false,reason:'stale'};
  const next={...fresh(),revision:p.revision,resetCount:(p.resetCount||0)+1};
  this.save(next);this.lastRunSite=null;return {ok:true};
 });}
 async buy(id,expected){return this.transact(p=>{
  if(p.tutorial==='next')return {ok:false,reason:'tutorial-next'};
  if(this.currentRun)return {ok:false,reason:'active'};const offer=this.offers(p).find(o=>o.id===id);
  if(!offer)return {ok:false,reason:'unknown'};if(expected&&(expected.level!==offer.level||expected.cost!==offer.cost))return {ok:false,reason:'stale'};if(!offer.available)return {ok:false,reason:'unavailable'};if(p.parts<offer.cost)return {ok:false,reason:'insufficient'};
  const next=clone(p);next.parts-=offer.cost;next.spent+=offer.cost;if(Object.hasOwn(UPGRADES,id))next.upgrades[id]++;else next[UNLOCKS[id].kind].push(id);
  if(p.tutorial==='upgrade')next.tutorial='next';
  next.purchases.push({id,cost:offer.cost,workMs:p.workMs});next.purchases=next.purchases.slice(-100);this.save(next);return {ok:true};
 });}
 async skipTutorial(){return this.transact(p=>{const next=clone(p);next.tutorial='done';this.save(next);return {ok:true};});}
 async start(mode='random',stageId){return this.transact(p=>{
  if(this.currentRun)return {ok:false,reason:'active'};if(!['random','retry','boss','tutorial','stage'].includes(mode))return {ok:false,reason:'mode'};
  if(p.tutorial==='upgrade'&&['random','retry','stage'].includes(mode))return {ok:false,reason:'tutorial-upgrade'};
  const site=mode==='tutorial'||['random','stage'].includes(mode)&&p.tutorial==='intro'&&(!stageId||stageId===FREE_STAGES[0].id)?FREE_TUTORIAL:mode==='boss'?FREE_STAGES[6]:mode==='retry'?[...FREE_STAGES,FREE_TUTORIAL].find(s=>s.id===this.lastRunSite):mode==='stage'?FREE_STAGES.find(s=>s.id===stageId):nextStage(p);
  if(!site)return {ok:false,reason:'no-previous-site'};
  if(site.id!==FREE_TUTORIAL.id&&!stageOpen(p,FREE_STAGES.findIndex(s=>s.id===site.id)))return {ok:false,reason:'locked'};
  const next=clone(p);next.lastSite=site.id;
  if(p.tutorial==='next')next.tutorial='done';
  const run=new FreeRun(site,next,site.id===STEP1_BOSS.id?'boss':site.id===FREE_TUTORIAL.id?'random':mode==='retry'?'retry':'stage');this.save(next);this.currentRun=run;this.lastRunSite=site.id;return {ok:true,run};
 });}
 async checkpointStage(){const run=this.currentRun;return this.transact(p=>{
  if(!run||run!==this.currentRun||run.settling)return {ok:false,reason:'no-run'};
  if((run.profile.resetCount||0)!==(p.resetCount||0))return {ok:false,reason:'reset'};
  if(!run.qualified||!FREE_STAGES.some(s=>s.id===run.site.id))return {ok:false,reason:'not-qualified'};
  const next=clone(p);rememberStage(next.stageRecords,run.site.id,run.world.collected,run.world.initial);this.save(next);return {ok:true};
 });}
 async finish(){const run=this.currentRun;if(run){run.settling=true;run.pause(true);}return this.transact(p=>{
  if(!run||run!==this.currentRun)return {ok:false,reason:'no-run'};
  if((run.profile.resetCount||0)!==(p.resetCount||0)){run.state='finished';run.world.toolEnabled=false;this.currentRun=null;this.lastRunSite=p.lastSite;return {ok:false,reason:'reset'};}
  const recovered=run.world.collected,workMs=Math.round(run.workMs);
  if(!uint(recovered)||recovered>run.world.initial||!uint(workMs))return {ok:false,reason:'invalid-recovery'};
  const qualified=run.qualified,first=run.mode==='boss'&&qualified&&!p.bossCleared,bonus=first?500:0,next=clone(p);
  rememberStage(next.stageRecords,run.site.id,recovered,run.world.initial);
  next.parts+=recovered+bonus;next.earned+=recovered+bonus;next.lastSite=run.site.id;next.workMs+=workMs;next.runCount++;if(run.mode==='boss')next.bossAttempts++;
  if(p.tutorial==='intro'&&run.site.id===FREE_TUTORIAL.id&&next.parts>=UPGRADES.bombRange.base)next.tutorial='upgrade';
  if(first){next.bossCleared=true;next.firstClearMs=next.workMs;}
  next.history.push({site:run.site.id,mode:run.mode,workMs,recovered,total:run.world.initial,batteryUsed:run.world.capacity-run.world.charge,tools:[...run.world.usedTools]});next.history=next.history.slice(-100);
  this.save(next);run.state='finished';run.world.toolEnabled=false;this.currentRun=null;this.lastRunSite=run.site.id;
  return {ok:true,recovered,bonus,qualified,bossCleared:next.bossCleared,firstClear:first,mode:run.mode,siteName:run.site.name,nextStage:!stageOpen(run.profile,6)&&stageOpen(next,6)?FREE_STAGES[6].name:null,allClear:recovered===run.world.initial,ratio:recovered/run.world.initial,workMs};
 });}
}
