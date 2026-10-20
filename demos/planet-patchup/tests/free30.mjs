import {FREE_STAGES} from '../src/free30/stages.js';
const openBoss=j=>{const p=structuredClone(j.profile);p.stageRecords=Object.fromEntries(FREE_STAGES.slice(0,6).map(s=>[s.id,{recovered:7,total:10}]));j.save(p);};
import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeJourney,FreeRun,FREE_SAVE_KEYS} from '../src/free30/journey.js';
import {UPGRADES,statsForProfile,totalSpent} from '../src/free30/balance.js';
import {FREE_SITES,FREE_BOSS} from '../src/free30/sites.js';
const fixture=()=>{const m=new Map([['pixel-demolition-blast-step1-v1-a','old-save']]);return {m,j:new FreeJourney({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},{request:async(_,f)=>f()})};};
test('new progress is isolated, bomb-first and physically battery-limited',async()=>{
 const {j,m}=fixture();assert.equal(j.stats().capacity,60);assert.equal(j.stats().suctionRate,80);
 const {run:r}=await j.start();assert(r);const w=r.world;
 assert.equal(w.unlimited,false);assert.equal(w.setTool('cutter'),false);assert.equal(w.setTool('blackhole'),false);
 w.charge=1;assert(r.press({x:w.width/2,y:w.floorY-10}));r.release();assert.equal(w.charge,0);assert.equal(r.phase,'finishing');assert.equal(r.finishRemaining,10);assert(!r.press(r.aim));
 assert.equal(m.get('pixel-demolition-blast-step1-v1-a'),'old-save');assert(FREE_SAVE_KEYS.some(k=>m.has(k)));
});
test('purchases persist, costs agree with ledger and active run cannot buy',async()=>{
 const {j}=fixture(),p=structuredClone(j.profile);p.parts=p.earned=50000;j.save(p);
 for(const id of ['bombForce','bombRange','blackhole','coreMix','wearSpeed'])assert((await j.buy(id)).ok,id);
 assert.equal(j.profile.spent,totalSpent(j.profile));assert.equal(j.stats().bombRadius,3.25);assert.equal(j.stats().bombPower,1.175);
 const {run}=await j.start();assert.equal(run.world.stats().coreMix,j.stats().coreMix);assert.equal(run.world.wearSettings.wearSpeed,j.stats().wearSpeed);
 assert.equal((await j.buy('capacity')).reason,'active');assert(Object.isFrozen(run.profile.upgrades));
});
test('rubbing ramps only to purchased ceiling; physics stays finite and conserves pixels',()=>{
 const {j}=fixture();j.profile.owned.push('blackhole');j.profile.upgrades.wearSpeed=2;j.profile.upgrades.coreMix=2;
 const r=new FreeRun(FREE_SITES[0],j.profile),w=r.world;assert(w.setTool('blackhole'));
 assert.equal(w.wearMultiplier({rubbingTime:0}),1);assert.equal(w.wearMultiplier({rubbingTime:1}),j.stats().wearSpeed);
 r.press(r.site.preview[0]);r.release();for(let i=0;i<90;i++)r.update(1/30,{...r.aim,working:false});
 const d=w.diagnostics();assert(d.finite);assert(d.balanced);assert(w.charge<w.capacity);
});
test('unlocked boss qualifies at 70% and pays once',async()=>{
 const {j}=fixture();const {run:r}=await (openBoss(j),j.start('boss'));assert.equal(r.site.id,FREE_BOSS.id);assert(!r.qualified);
 r.world.collected=Math.ceil(r.world.initial*.7);assert(r.qualified);r.workMs=2000;
 const result=await j.finish();assert(result.firstClear);assert.equal(result.bonus,500);assert.equal(j.profile.firstClearMs,2000);
 const r2=(await (openBoss(j),j.start('boss'))).run;r2.world.collected=Math.ceil(r2.world.initial*.7);assert.equal((await j.finish()).bonus,0);
});
test('free upgrades have bounded incremental stats and finite costs',()=>{
 const {j}=fixture();j.profile.owned.push('blackhole');for(const [id,s] of Object.entries(UPGRADES)){j.profile.upgrades[id]=s.max;}
 const s=statsForProfile(j.profile);assert(s.coreMix<=10&&s.wearSpeed<=10);assert(Number.isSafeInteger(totalSpent(j.profile)));assert(j.offers().every(o=>!o.available));
});
test('saved upgrades reload without reading old demo progress',async()=>{
 const {j,m}=fixture(),p=structuredClone(j.profile);p.parts=p.earned=1000;j.save(p);assert((await j.buy('blackhole')).ok);assert((await j.buy('coreMix')).ok);
 const reload=new FreeJourney({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},{request:async(_,f)=>f()});assert.deepEqual(reload.profile,j.profile);assert.equal(reload.stats().coreMix,1.25);
 assert.equal((await reload.buy('coreMix',{level:0,cost:80})).reason,'stale');
});
test('storage failure does not spend the displayed balance',async()=>{
 const {j}=fixture(),p=structuredClone(j.profile);p.parts=p.earned=1000;j.save(p);const before=structuredClone(j.profile);j.storage.setItem=()=>{throw Error('quota')};assert.equal((await j.buy('bombRange')).reason,'storage');assert.deepEqual(j.profile,before);
});
test('free tower is smaller while retaining a valid 70% goal',()=>{
 const {j}=fixture(),r=new FreeRun(FREE_BOSS,j.profile,'boss');assert.equal(r.world.initial,2282);assert.equal(r.world.width,156);assert(r.world.initial>FREE_SITES[0].data.shapes.length);
});
