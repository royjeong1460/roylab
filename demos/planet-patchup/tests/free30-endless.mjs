import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeJourney,FreeRun} from '../src/free30/journey.js';
import {UPGRADES,totalSpent} from '../src/free30/balance.js';
import {FREE_BOSS,FREE_SITES} from '../src/free30/sites.js';
const fixture=()=>{const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},locks={request:async(_,f)=>f()};return {m,storage,locks,j:new FreeJourney(storage,locks)};};
test('boss ends at 70 percent without exhausting battery; random maps do not',()=>{
 const {j}=fixture(),r=new FreeRun(FREE_BOSS,j.profile,'boss'),target=Math.ceil(r.world.initial*.7);
 r.world.collected=target-1;r.update(1/1000);assert(!r.finishReady);
 r.world.collected=target;r.pause(true);r.update(1/1000);assert(!r.finishReady);
 r.pause(false);r.update(1/1000);assert(r.finishReady);assert.equal(r.finishReason,'boss-clear');assert(!r.world.toolEnabled);assert(r.world.charge>0);assert(!r.press(r.aim));
 const normal=new FreeRun(FREE_SITES[0],j.profile);normal.world.collected=Math.ceil(normal.world.initial*.7);normal.update(1/1000);assert(!normal.finishReady);
});
test('first boss award unlocks every capped upgrade, persists purchases and does not pay twice',async()=>{
 const {j,storage,locks}=fixture(),p=structuredClone(j.profile);p.owned.push('blackhole');p.tutorial='done';
 for(const [id,s] of Object.entries(UPGRADES))p.upgrades[id]=s.max;
 p.spent=totalSpent(p);p.parts=100000;p.earned=p.spent+p.parts;j.save(p);
 assert(j.offers().every(o=>!o.available));
 const {run}=await j.start('boss');run.world.collected=Math.ceil(run.world.initial*.7);run.update(1/1000);
 const result=await j.finish();assert(result.firstClear);assert.equal(result.bonus,500);
 for(const id of Object.keys(UPGRADES)){assert(j.offers().find(o=>o.id===id).available,id);assert((await j.buy(id)).ok,id);assert(j.profile.upgrades[id]>UPGRADES[id].max);}
 const reload=new FreeJourney(storage,locks);assert.deepEqual(reload.profile,j.profile);assert.equal(totalSpent(reload.profile),reload.profile.spent);
 const repeat=(await reload.start('boss')).run;repeat.world.collected=Math.ceil(repeat.world.initial*.7);repeat.update(1/1000);assert.equal((await reload.finish()).bonus,0);
});
test('failed boss keeps caps and old over-cap uncleared save remains invalid',async()=>{
 const {j,storage,locks}=fixture();const r=(await j.start('boss')).run;r.world.collected=1;await j.finish();assert(!j.profile.bossCleared);
 const p=structuredClone(j.profile);p.upgrades.capacity=UPGRADES.capacity.max+1;p.spent=totalSpent(p);p.earned=p.spent+p.parts;assert.throws(()=>j.save(p));assert(new FreeJourney(storage,locks).persistent);
});
test('post-clear black-hole upgrades are applied beyond lab slider ceilings',()=>{
 const {j}=fixture(),p=j.profile;p.bossCleared=true;p.owned.push('blackhole');p.upgrades.coreMix=401;p.upgrades.wearSpeed=201;
 const w=new FreeRun(FREE_SITES[0],p).world;assert.equal(w.blackholeSettings.coreMix,w.stats().coreMix);assert.equal(w.wearMultiplier({rubbingTime:1}),w.stats().wearSpeed);
 w.setTool('blackhole');assert(w.activate(FREE_SITES[0].preview[0].x,FREE_SITES[0].preview[0].y));assert.equal(w.capacity-w.charge,24);for(let i=0;i<60;i++)w.step(1/30);assert(w.diagnostics().finite);assert(w.diagnostics().balanced);
});

test('legacy spend migrates without losing parts or levels; new purchases use new prices',async()=>{
 const {j,storage,locks,m}=fixture(),p=structuredClone(j.profile);p.version=1;delete p.pricingVersion;delete p.legacyDiscount;
 p.tutorial='done';p.upgrades.bombRange=5;p.spent=80*5+15*5*4/2;p.parts=5000;p.earned=p.parts+p.spent;
 for(const key of ['pixel-demolition-free30-v1-a','pixel-demolition-free30-v1-b'])m.set(key,JSON.stringify(p));
 const loaded=new FreeJourney(storage,locks);assert.equal(loaded.profile.parts,5000);assert.equal(loaded.profile.spent,p.spent);assert.equal(loaded.profile.upgrades.bombRange,5);assert.equal(loaded.profile.pricingVersion,2);assert.equal(loaded.profile.version,2);
 const price=loaded.offers().find(o=>o.id==='bombRange').cost;assert.equal(price,80+15*5+60*16);assert((await loaded.buy('bombRange')).ok);
 const reloaded=new FreeJourney(storage,locks);assert.equal(reloaded.profile.parts,5000-price);assert.equal(reloaded.profile.spent,p.spent+price);assert.equal(reloaded.profile.upgrades.bombRange,6);assert.equal(totalSpent(reloaded.profile),reloaded.profile.spent);
});
test('first two upgrades keep quick onboarding while later levels grow in cost',()=>{
 const {j}=fixture();assert.equal(j.offers().find(o=>o.id==='bombRange').cost,80);j.profile.upgrades.bombRange=1;assert.equal(j.offers().find(o=>o.id==='bombRange').cost,95);j.profile.upgrades.bombRange=2;assert.equal(j.offers().find(o=>o.id==='bombRange').cost,170);
});

test('new saved schema is rejected by older tabs before they can write old prices',async()=>{
 const {j,m}=fixture();await j.start();const written=[...m.values()].map(JSON.parse);assert(written.every(p=>p.version===2));
});
