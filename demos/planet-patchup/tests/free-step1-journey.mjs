import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
const file=new URL('../src/free-step1/journey.js',import.meta.url);
const api=existsSync(file)?await import(file):{};
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const locks={request:async(_name,fn)=>fn()};
test('free step1 journey exists independently',()=>assert.equal(typeof api.Step1Journey,'function'));
const feature=api.Step1Journey?test:test.skip;
async function earn(j,n=1000,mode='random'){
 const result=await j.start(mode);assert(result.ok);const {run}=result;
 // Economy fixture; physical collection is tested separately.
 run.world.collected=Math.min(n,run.world.initial);run.workMs=60000;
 return j.finish();
}
feature('fresh profile ignores previous versions and settles/purchases atomically',async()=>{
 const s=memory();s.setItem('pixel-demolition-france-gravity-v1-a','old unrelated data');
 const names=[],j=new api.Step1Journey(s,{request:async(name,fn)=>{names.push(name);return fn();}});
 assert.equal(j.profile.parts,0);assert.deepEqual(j.profile.owned,['cutter']);assert.deepEqual(j.stats(),{cutPixels:1,capacity:60,suctionRate:80,suctionRadius:12,bombRadius:3,bombPower:1,gravityPower:.2});
 assert.equal((await j.buy('capacity')).reason,'insufficient');
 const result=await earn(j);assert.equal(result.recovered,1000);assert.equal(j.profile.workMs,60000);assert.equal(j.profile.history.length,1);
 const price=j.offers().find(o=>o.id==='capacity').cost;assert((await j.buy('capacity')).ok);
 assert.equal(j.profile.parts,1000-price);assert.equal(j.stats().capacity,65);assert.equal(j.profile.purchases[0].workMs,60000);
 assert.equal((await j.finish()).reason,'no-run');assert.equal(s.getItem('pixel-demolition-france-gravity-v1-a'),'old unrelated data');
 assert.deepEqual(new api.Step1Journey(s,locks).profile,j.profile);assert(names.every(n=>n==='pixel-demolition-free-step1-v1'));
});
feature('run equipment is immutable and locked tools cannot be invoked',async()=>{
 const j=new api.Step1Journey(memory(),locks);await earn(j,1400);
 assert((await j.buy('bomb')).ok);assert((await j.buy('bombForce')).ok);
 const r=(await j.start()).run;assert(Object.isFrozen(r.profile.upgrades));assert.equal(r.world.settings.bombForce,1);
 assert(r.selectTool('bomb'));assert.equal(r.selectTool('blackhole'),false);assert.equal(r.world.configure({bombForce:5}),false);
 assert.equal((await j.buy('range')).reason,'active');
 r.pause(true);const elapsed=r.world.elapsed;r.update(.1);assert.equal(r.world.elapsed,elapsed);
});
feature('storage failure preserves pending collection and can be retried exactly once',async()=>{
 const s=memory(),j=new api.Step1Journey(s,locks),r=(await j.start()).run;r.world.collected=27;r.workMs=11000;
 const write=s.setItem;s.setItem=()=>{throw Error('quota');};assert.equal((await j.finish()).ok,false);assert.equal(j.currentRun,r);assert(r.paused);
 s.setItem=write;assert((await j.finish()).ok);assert.equal(j.profile.parts,27);assert.equal(j.profile.workMs,11000);
 assert.equal((await j.finish()).ok,false);assert.equal(j.profile.parts,27);
});
feature('manual boss can be challenged immediately; first completion reward is once only',async()=>{
 const j=new api.Step1Journey(memory(),locks);let r=(await j.start('boss')).run;assert.equal(r.mode,'boss');
 r.world.collected=Math.ceil(r.world.initial*.7);r.workMs=90000;
 const done=await j.finish();assert(done.qualified);assert.equal(done.bonus,500);assert.equal(j.profile.firstClearMs,90000);
 r=(await j.start('boss')).run;r.world.collected=r.world.initial;r.workMs=10000;
 assert.equal((await j.finish()).bonus,0);assert.equal(j.profile.firstClearMs,90000);assert.equal(j.profile.bossAttempts,2);
});
feature('corrupt saves and accounting inconsistencies fail closed',async()=>{
 const s=memory(),j=new api.Step1Journey(s,locks);await earn(j);
 const slot=api.STEP1_SAVE_KEYS.find(k=>s.getItem(k));const data=JSON.parse(s.getItem(slot));data.parts++;
 s.setItem(slot,JSON.stringify(data));const broken=new api.Step1Journey(s,locks);assert.equal(broken.persistent,false);assert.equal(broken.profile.campaign,'free-step1');assert.equal(broken.profile.workMs,0);assert.deepEqual(broken.profile.history,[]);assert.equal((await broken.start()).ok,false);
});
feature('concurrent finish requests and purchases serialize safely',async()=>{
 let chain=Promise.resolve();const serial={request(_name,fn){const next=chain.then(fn);chain=next.catch(()=>{});return next;}};
 const s=memory(),j=new api.Step1Journey(s,serial);const r=(await j.start()).run;r.world.collected=100;
 const results=await Promise.all([j.finish(),j.finish()]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(j.profile.parts,100);
 const other=new api.Step1Journey(s,serial);const bought=await Promise.all([j.buy('capacity'),other.buy('capacity')]);assert.equal(bought.filter(r=>r.ok).length,1);
 const disk=new api.Step1Journey(s,serial);assert.equal(disk.profile.upgrades.capacity,1);assert(disk.profile.parts>=0);
});

feature('a stale shop quote cannot silently charge a higher price',async()=>{
 const s=memory(),a=new api.Step1Journey(s,locks);await earn(a);const b=new api.Step1Journey(s,locks),quote=b.offers().find(o=>o.id==='capacity');
 assert((await a.buy('capacity')).ok);const result=await b.buy('capacity',{level:quote.level,cost:quote.cost});assert.equal(result.reason,'stale');assert.equal(b.profile.upgrades.capacity,1);assert.equal(b.profile.parts,920);
});
feature('active work time includes slow frames but excludes pause and finished runs',async()=>{
 const j=new api.Step1Journey(memory(),locks),r=(await j.start()).run;for(let n=0;n<10;n++)r.update(.2);assert.equal(r.workMs,2000);assert(r.world.elapsed<1.1);
 r.pause(true);r.update(5);assert.equal(r.workMs,2000);r.pause(false);r.update(.1);assert.equal(r.workMs,2100);
 assert((await j.finish()).ok);r.update(2);assert.equal(j.profile.workMs,2100);assert.equal(r.workMs,2100);
});
