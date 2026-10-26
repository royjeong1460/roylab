import test from 'node:test';
import assert from 'node:assert/strict';
import {freeStats,freeOffers} from '../src/arch/balance.js';
import {ArchJourney} from '../src/arch/journey.js';
import {FREE_STAGES,stageOpen} from '../src/arch/stages.js';
export const fixture=()=>{const m=new Map();return {m,j:new ArchJourney({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},{request:async(_,f)=>f()})};};
test('approved base, costs and open normal stages',()=>{const {j}=fixture();assert.equal(freeStats(j.profile).capacity,60);assert.equal(freeStats(j.profile).collectBatch,20);assert.equal(freeStats(j.profile).collectInterval,.25);assert.equal(freeOffers(j.profile).find(o=>o.id==='blastRadius').cost,300);for(let i=0;i<6;i++)assert(stageOpen(j.profile,i));assert(!stageOpen(j.profile,6));});
import {TRACKS,totalSpent,upgradeCost} from '../src/arch/balance.js';
import {ARCH_SAVE_KEYS,ArchRun,freshProfile} from '../src/arch/journey.js';
const fund=(j,n=1000000)=>{const p=structuredClone(j.profile);p.parts+=n;p.earned+=n;j.save(p);};
const clear=(j,index)=>{const p=structuredClone(j.profile);for(let i=0;i<index;i++){const s=FREE_STAGES[i];p.stageRecords[s.id]={recovered:7,total:10,boss:false};}j.save(p);};
const pixelize=r=>{r.world.breakContact(r.world.width/2,r.world.floorY/2,()=>true,Infinity);r.world.secureLoose();assert(r.world.diagnostics().balanced);};
test('isolated namespace, exact prices/caps, stale buys, reset revision',async()=>{
 const {j,m}=fixture();m.set('pixel-demolition-free30-v1-a','untouched');fund(j);await j.skipTutorial();
 for(const [id,t] of Object.entries(TRACKS)){if(['wellPull','wellReach','wellDuration','mix','wear'].includes(id))continue;for(let i=0;i<t.cap;i++){const o=j.offers().find(o=>o.id===id);assert.equal(o.cost,upgradeCost(id,i));assert((await j.buy(id,{level:i,cost:o.cost})).ok);}assert.equal(j.offers().find(o=>o.id===id).available,false);assert.equal((await j.buy(id)).reason,'unavailable');}
 assert.equal(j.profile.spent,totalSpent(j.profile));assert.equal((await j.buy('blackhole')).reason,'unavailable');assert.equal(m.get('pixel-demolition-free30-v1-a'),'untouched');assert(ARCH_SAVE_KEYS.some(k=>m.has(k)));
 const o=j.offers().find(o=>o.id==='blackhole');clear(j,3);assert.equal((await j.buy('blackhole',{level:o.level,cost:o.cost+1})).reason,'stale');assert((await j.buy('blackhole')).ok);assert.equal(j.stats().gravityPower,.2);
 const rev=j.profile.revision;assert.equal((await j.resetProgress(rev-1)).reason,'stale');assert((await j.resetProgress(rev)).ok);assert.equal(j.profile.parts,0);assert.equal(j.profile.resetCount,1);
});
test('skills grant and unlock at distinct clears, equip at camp, frozen run snapshot',async()=>{
 const {j}=fixture();fund(j);await j.skipTutorial();clear(j,2);const {run}=await j.start('stage',FREE_STAGES[0].id);pixelize(run);assert((await j.finish()).ok);assert.equal(j.profile.skills.aftershock,1);assert.equal(j.profile.equipped.passive,'aftershock');
 assert.equal((await j.buy('orbital')).reason,'unavailable');clear(j,4);assert((await j.buy('orbital')).ok);assert.equal(j.profile.equipped.active,'orbital');clear(j,5);assert((await j.buy('relay')).ok);assert((await j.equipSkill('relay')).ok);
 for(const expectedCost of [600,1800,6000,18000]){assert.equal(j.offers().find(o=>o.id==='relay').cost,expectedCost);assert((await j.buy('relay')).ok);}assert.equal(j.profile.skills.relay,5);assert.equal((await j.buy('relay')).reason,'unavailable');
 const r=(await j.start('stage',FREE_STAGES[0].id)).run;assert(Object.isFrozen(r.profile.skills));assert(Object.isFrozen(r.profile.equipped));assert.equal(r.skillState().passive.threshold,4);assert.equal((await j.equipSkill('aftershock')).reason,'active');assert.equal((await j.buy('battery')).reason,'active');assert.equal((await j.resetProgress(j.profile.revision)).reason,'active');
});
test('boss is manual and fixed first/repeat/failure payout, settlement idempotent',async()=>{
 const {j}=fixture();await j.skipTutorial();assert.equal((await j.start('boss')).reason,'locked');clear(j,6);assert(stageOpen(j.profile,6));
 let r=(await j.start('boss')).run;let out=await j.finish();assert.equal(out.reward,0);assert.equal(out.recovered,0);assert.equal(j.profile.parts,0);
 r=(await j.start('boss')).run;pixelize(r);assert.equal(r.world.collected,r.world.initial);out=await j.finish();assert.equal(out.reward,4000);assert.equal(out.firstClear,true);assert.equal(j.profile.parts,4000);assert.equal((await j.finish()).reason,'no-run');assert.equal(j.profile.parts,4000);
 r=(await j.start('boss')).run;pixelize(r);out=await j.finish();assert.equal(out.reward,1000);assert.equal(out.firstClear,false);assert.equal(j.profile.parts,5000);
 r=(await j.start('stage',FREE_STAGES[0].id)).run;pixelize(r);out=await j.finish();assert.equal(out.reward,out.recovered);assert.equal(out.bonus,0);
});
test('cross-tab reset invalidates old runs, corrupted/conflicting saves fail closed',async()=>{
 const {j,m}=fixture();await j.skipTutorial();const r=(await j.start('stage',FREE_STAGES[0].id)).run;const j2=new ArchJourney(j.storage,{request:async(_,f)=>f()});assert((await j2.resetProgress(j2.profile.revision)).ok);pixelize(r);assert.equal((await j.finish()).reason,'reset');assert.equal(j2.profile.parts,0);
 m.set(ARCH_SAVE_KEYS[0],'{bad');const corrupt=new ArchJourney(j.storage,{request:async(_,f)=>f()});assert.equal(corrupt.persistent,false);assert.equal((await corrupt.start()).reason,'storage');
});
import {readFileSync} from 'node:fs';
test('all track prices and values match approved CSV, including ten-unit ceiling',()=>{
 const rows=readFileSync(new URL('../simulation/campaign-plan-v0.2/upgrade-prices.csv',import.meta.url),'utf8').trim().split(/\r?\n/).slice(1);
 for(const row of rows){const [id,nextLevel,price,value]=row.split(',');assert.equal(upgradeCost(id,+nextLevel-1),+price,`${id} Lv${nextLevel}`);assert(Math.abs(freeStats({upgrades:{[id]:+nextLevel}})[id]-+value)<1e-8);}
 assert.equal(upgradeCost('battery',1),180);assert.equal(upgradeCost('battery',2),220);
});
test('tutorial auto-dispatch and active skip safely persist without changing frozen run',async()=>{
 const {j}=fixture(),{run}=await j.start('stage',FREE_STAGES[0].id);assert.equal(run.mode,'tutorial');assert.equal(run.profile.tutorial,'intro');assert((await j.skipTutorial()).ok);assert.equal(j.profile.tutorial,'done');assert.equal(run.profile.tutorial,'intro');pixelize(run);await j.finish();assert.equal(j.profile.tutorial,'done');
});
test('corruption fallback stays Arch and storage write failure cannot spend',async()=>{
 const {j,m}=fixture();fund(j);const before=structuredClone(j.profile);j.storage.setItem=()=>{throw Error('quota');};assert.equal((await j.buy('battery')).reason,'storage');assert.deepEqual(j.profile,before);
 m.set(ARCH_SAVE_KEYS[0],'{bad');const bad=new ArchJourney(j.storage,{request:async(_,f)=>f()});assert.equal(bad.persistent,false);assert.equal(bad.profile.campaign,'arch');assert.deepEqual(bad.profile.owned,['bomb']);assert.equal(bad.stats().capacity,60);assert.equal(m.get(ARCH_SAVE_KEYS[0]),'{bad');
});
test('withdrawal sweep captures first70 time and seals all queued physical effects',async()=>{
 const {j}=fixture();await j.skipTutorial();const r=(await j.start('stage',FREE_STAGES[0].id)).run;
 r.world.breakContact(r.world.width/2,r.world.floorY/2,()=>true,Infinity);assert.equal(r.first70Ms,null);assert.equal(r.world.collected,0);r.world.bombs.push({x:1,y:1,delay:10,radius:3,power:1});
 assert((await j.finish()).ok);assert.equal(r.first70Ms,0);assert.equal(r.world.settled,true);assert.equal(r.world.bombs.length,0);assert.equal(r.world.ideaPending.length,0);const before=r.world.diagnostics().total;r.world.step(.1);assert.equal(r.world.diagnostics().total,before);assert.equal(r.world.simulatedMs,0);assert(!r.activateSkill('orbital'));
});
