import {FranceJourney,FranceRun} from '../france/journey.js';
import {ArchWorld} from './world.js';
import {ARCH_TUTORIAL} from './maps.js';
import {FREE_STAGES,stageOpen,nextStage,rememberStage,validStageRecords} from './stages.js';
import {TRACKS,SKILLS,freeStats,freeOffers,distinctClears,totalSpent,BALANCE_VERSION} from './balance.js';
export const ARCH_SAVE_KEYS=['pixel-demolition-arch-v1-a','pixel-demolition-arch-v1-b'];
export const FREE_SAVE_KEYS=ARCH_SAVE_KEYS;
const LOCK='pixel-demolition-arch-v1',clone=v=>JSON.parse(JSON.stringify(v));
// The save schema/costs are unchanged. Older open tabs strictly validate this tag;
// keep the wire format readable while runtime profiles and journals use the new rules.
const SAVE_BALANCE_VERSION='arch-campaign-v0.2';
const uint=n=>Number.isSafeInteger(n)&&n>=0;
export const freshProfile=()=>({version:1,campaign:'arch',balanceVersion:BALANCE_VERSION,revision:0,resetCount:0,tutorial:'intro',parts:0,earned:0,spent:0,owned:['bomb'],patterns:['dot'],upgrades:Object.fromEntries(Object.keys(TRACKS).map(k=>[k,0])),skills:{aftershock:0,relay:0,orbital:0},equipped:{passive:null,active:null},stageRecords:{},bossCleared:false,lastSite:null,runCount:0,bossAttempts:0,workMs:0,firstClearMs:null,history:[],purchases:[]});
function valid(p){return !!p&&p.version===1&&p.campaign==='arch'&&[BALANCE_VERSION,'arch-campaign-v0.2'].includes(p.balanceVersion)&&['revision','resetCount','parts','earned','spent','runCount','bossAttempts','workMs'].every(k=>uint(p[k]))&&p.earned-p.spent===p.parts&&['intro','upgrade','next','done'].includes(p.tutorial)&&Array.isArray(p.owned)&&p.owned.includes('bomb')&&p.owned.every(id=>['bomb','blackhole'].includes(id))&&new Set(p.owned).size===p.owned.length&&Array.isArray(p.patterns)&&p.patterns.length===1&&p.patterns[0]==='dot'&&p.upgrades&&Object.keys(p.upgrades).length===Object.keys(TRACKS).length&&Object.entries(TRACKS).every(([id,t])=>uint(p.upgrades[id])&&p.upgrades[id]<=t.cap)&&p.skills&&Object.keys(p.skills).length===3&&Object.keys(SKILLS).every(id=>uint(p.skills[id])&&p.skills[id]<=5)&&p.equipped&&['passive','active'].every(kind=>p.equipped[kind]===null||SKILLS[p.equipped[kind]]?.kind===kind&&p.skills[p.equipped[kind]]>0)&&validStageRecords(p.stageRecords)&&typeof p.bossCleared==='boolean'&&(p.lastSite===null||[...FREE_STAGES,ARCH_TUTORIAL].some(s=>s.id===p.lastSite))&&Array.isArray(p.history)&&p.history.length<=100&&Array.isArray(p.purchases)&&p.purchases.length<=100&&totalSpent(p)===p.spent;}
export class ArchRun extends FranceRun{
 constructor(site,profile,mode='stage'){
  super(site,profile,mode);this.world=new ArchWorld(site,this.profile);this.workMs=0;this.wallActiveMs=0;this.finishingElapsedMs=0;this.first70Ms=null;this.skillUses={orbital:0};
  Object.freeze(this.profile.skills);Object.freeze(this.profile.equipped);
 }
 exhaust(){if(this.world.charge<=1e-8){this.phase='finishing';this.world.toolEnabled=false;}}
 seal(){this.release();this.state='finished';this.world.toolEnabled=false;this.world.settled=true;this.world.activeDevice=null;for(const key of ['bombs','wells','ideaPending','ideaFields','ideaMarks'])this.world[key]=[];}
 selectTool(id){if(this.paused||this.finishReady||this.state!=='active'||this.phase!=='working')return false;this.release();return this.world.setTool(id);}
 debrisDrained(){return !this.world.activeDevice&&!this.world.ideaPending.length&&!this.world.ideaFields.length&&!this.world.ideaMarks.length&&super.debrisDrained();}
 activateSkill(id){if(this.paused||this.settling||this.state!=='active'||this.phase!=='working'||this.finishReady||this.world.charge<=1e-8||this.profile.equipped.active!==id||this.skillUses[id])return false;const ok=this.world.activateDevice(id,this.profile.skills[id]);if(ok)this.skillUses[id]++;return ok;}
 skillState(){const id=this.profile.equipped.passive,level=this.profile.skills[id]||0;return {passive:{id,level,count:this.world.passiveCount,threshold:level?SKILLS[id].trigger-(level===5?1:0):0,triggers:this.world.passiveTriggers},active:{id:this.profile.equipped.active,level:this.profile.skills.orbital,used:this.skillUses.orbital,available:!!this.profile.equipped.active&&!this.skillUses.orbital&&!this.paused&&!this.settling&&this.state==='active'&&this.phase==='working'&&!this.finishReady&&this.world.charge>0}};}
 update(dt,input){if(this.paused||this.finishReady||this.state!=='active'||!Number.isFinite(dt)||dt<=0)return;const finishing=this.phase==='finishing'||this.world.charge<=1e-8,simulatedBefore=this.world.simulatedMs;this.wallActiveMs+=dt*1000;super.update(dt,input);if(finishing)this.finishingElapsedMs+=this.world.simulatedMs-simulatedBefore;this.workMs=this.world.simulatedMs;if(this.first70Ms===null&&this.qualified)this.first70Ms=this.workMs;if(this.finishReady){this.world.secureLoose();if(this.first70Ms===null&&this.qualified)this.first70Ms=this.workMs;}}
}
export class ArchJourney extends FranceJourney{
 constructor(storage,locks=globalThis.navigator?.locks){super(storage,locks?.request?{request:(_name,f)=>locks.request(LOCK,f)}:null);if(!valid(this.profile)){this.profile=freshProfile();this.lastRunSite=null;}}
 read(){const values=ARCH_SAVE_KEYS.map(k=>this.storage.getItem(k)).filter(v=>v!==null);if(!values.length)return freshProfile();const parsed=values.map(v=>JSON.parse(v));if(parsed.some(p=>!valid(p)))throw Error('corrupt');parsed.sort((a,b)=>b.revision-a.revision);if(parsed.length===2&&parsed[0].revision===parsed[1].revision&&JSON.stringify(parsed[0])!==JSON.stringify(parsed[1]))throw Error('conflict');return {...parsed[0],balanceVersion:BALANCE_VERSION};}
 save(next){next.revision++;if(!valid(next))throw Error('invalid');this.storage.setItem(ARCH_SAVE_KEYS[next.revision%2],JSON.stringify({...next,balanceVersion:SAVE_BALANCE_VERSION}));this.profile=next;}
 stats(p=this.profile){return freeStats(p);}
 offers(p=this.profile){return freeOffers(p);}
 skillState(){return {skills:{...this.profile.skills},equipped:{...this.profile.equipped},clears:distinctClears(this.profile),offers:this.offers().filter(o=>SKILLS[o.id])};}
 async resetProgress(revision){return this.transact(p=>{if(this.currentRun)return {ok:false,reason:'active'};if(revision!==p.revision)return {ok:false,reason:'stale'};this.save({...freshProfile(),revision:p.revision,resetCount:p.resetCount+1});this.lastRunSite=null;return {ok:true};});}
 async skipTutorial(){return this.transact(p=>{const next=clone(p);next.tutorial='done';this.save(next);return {ok:true};});}
 async buy(id,expected){return this.transact(p=>{if(this.currentRun)return {ok:false,reason:'active'};const o=this.offers(p).find(o=>o.id===id);if(!o)return {ok:false,reason:'unknown'};if(expected&&(expected.level!==o.level||expected.cost!==o.cost))return {ok:false,reason:'stale'};if(!o.available)return {ok:false,reason:'unavailable'};if(p.parts<o.cost)return {ok:false,reason:'insufficient'};const next=clone(p);next.parts-=o.cost;next.spent+=o.cost;if(TRACKS[id])next.upgrades[id]++;else if(SKILLS[id]){next.skills[id]++;if(!next.equipped[SKILLS[id].kind])next.equipped[SKILLS[id].kind]=id;}else next.owned.push(id);if(p.tutorial==='upgrade')next.tutorial='next';next.purchases.push({id,cost:o.cost,workMs:p.workMs});next.purchases=next.purchases.slice(-100);this.save(next);return {ok:true};});}
 async equipSkill(id){return this.transact(p=>{if(this.currentRun)return {ok:false,reason:'active'};const s=SKILLS[id];if(!s||!p.skills[id])return {ok:false,reason:'unowned'};const next=clone(p);next.equipped[s.kind]=id;this.save(next);return {ok:true};});}
 async start(mode='random',stageId){return this.transact(p=>{
  if(this.currentRun)return {ok:false,reason:'active'};if(!['random','stage','retry','boss','tutorial'].includes(mode))return {ok:false,reason:'mode'};
  const site=mode==='tutorial'?ARCH_TUTORIAL:mode==='boss'?FREE_STAGES[6]:mode==='retry'?[...FREE_STAGES,ARCH_TUTORIAL].find(s=>s.id===this.lastRunSite):mode==='stage'?FREE_STAGES.find(s=>s.id===stageId):nextStage(p);
  if(!site)return {ok:false,reason:'no-previous-site'};if(site.id!==ARCH_TUTORIAL.id&&!stageOpen(p,FREE_STAGES.findIndex(s=>s.id===site.id)))return {ok:false,reason:'locked'};
  const next=clone(p);next.lastSite=site.id;if(p.tutorial==='next')next.tutorial='done';const run=new ArchRun(site,next,site.boss?'boss':site.id===ARCH_TUTORIAL.id?'tutorial':mode==='retry'?'retry':'stage');this.save(next);this.currentRun=run;this.lastRunSite=site.id;return {ok:true,run};
 });}
 grantSkills(p){if(distinctClears(p)>=2&&!p.skills.aftershock){p.skills.aftershock=1;if(!p.equipped.passive)p.equipped.passive='aftershock';}}
 async checkpointStage(){const run=this.currentRun;return this.transact(p=>{if(!run||run!==this.currentRun||run.settling)return {ok:false,reason:'no-run'};if(run.profile.resetCount!==p.resetCount){run.seal();this.currentRun=null;return {ok:false,reason:'reset'};}if(!run.qualified)return {ok:false,reason:'not-qualified'};const next=clone(p);rememberStage(next.stageRecords,run.site.id,run.world.collected,run.world.initial);this.grantSkills(next);this.save(next);return {ok:true};});}
 async finish(){const run=this.currentRun;if(run){run.settling=true;run.pause(true);}return this.transact(p=>{
  if(!run||run!==this.currentRun)return {ok:false,reason:'no-run'};
  if(run.profile.resetCount!==p.resetCount){run.seal();this.currentRun=null;return {ok:false,reason:'reset'};}
  run.world.secureLoose();if(run.first70Ms===null&&run.qualified)run.first70Ms=run.workMs;const recovered=run.world.collected,workMs=Math.round(run.workMs);if(!uint(recovered)||recovered>run.world.initial)return {ok:false,reason:'invalid-recovery'};
  const qualified=run.qualified,boss=run.mode==='boss',firstClear=boss&&qualified&&!p.bossCleared,reward=boss?(qualified?(firstClear?4000:1000):0):recovered,next=clone(p);
  rememberStage(next.stageRecords,run.site.id,recovered,run.world.initial);next.parts+=reward;next.earned+=reward;next.workMs+=workMs;next.runCount++;next.bossAttempts+=boss?1:0;next.lastSite=run.site.id;if(firstClear){next.bossCleared=true;next.firstClearMs=next.workMs;}this.grantSkills(next);
  if(run.site.id===ARCH_TUTORIAL.id&&p.tutorial==='intro'&&next.parts>=300)next.tutorial='upgrade';
  next.history.push({site:run.site.id,mode:run.mode,workMs,recovered,total:run.world.initial,reward,batteryUsed:run.world.energyUsed,tools:[...run.world.usedTools]});next.history=next.history.slice(-100);this.save(next);run.seal();this.currentRun=null;this.lastRunSite=run.site.id;
  return {ok:true,recovered,reward,bonus:boss?reward:0,qualified,firstClear,bossCleared:next.bossCleared,mode:run.mode,siteName:run.site.name,nextStage:!stageOpen(p,6)&&stageOpen(next,6)?FREE_STAGES[6].name:null,allClear:recovered===run.world.initial,ratio:run.ratio,workMs};
 });}
}
