import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync,readFileSync} from 'node:fs';
import {Step1Journey,STEP1_SAVE_KEYS} from '../src/free-step1/journey.js';
const file=new URL('../src/blast-step1/journey.js',import.meta.url);
const api=existsSync(file)?await import(file):{};
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const locks={request:async(_name,fn)=>fn()};
test('blast-first variant exists',()=>assert.equal(typeof api.BlastJourney,'function'));
const feature=api.BlastJourney?test:test.skip;
async function earn(j,n=1000){const {run}=await j.start();run.world.collected=Math.min(n,run.world.initial);run.workMs=30000;return j.finish();}
feature('fresh bomb starts selected, cutter and unowned black hole cannot be used',async()=>{
 const j=new api.BlastJourney(memory(),locks);assert.deepEqual(j.profile.owned,['bomb']);assert.equal(j.profile.parts,0);
 assert(!j.offers().some(o=>o.id==='cutter'||o.id==='bomb'));
 const r=(await j.start()).run;assert.equal(r.world.tool,'bomb');assert.equal(r.selectTool('cutter'),false);assert.equal(r.selectTool('blackhole'),false);
 assert.equal(r.world.capacity,60);assert.equal(r.world.cost(),12);
});
feature('black hole is paid and persists; stats and costs grow without touching original saves',async()=>{
 const s=memory(),old=new Step1Journey(s,locks);await old.start();await old.finish();
 const before=STEP1_SAVE_KEYS.map(k=>s.getItem(k)),j=new api.BlastJourney(s,locks);
 assert.equal(j.offers().find(o=>o.id==='blackhole').cost,600);assert.equal((await j.buy('blackhole')).reason,'insufficient');
 await earn(j,1000);assert((await j.buy('blackhole')).ok);assert.equal(j.profile.parts,400);assert((await j.buy('bombForce')).ok);assert.equal(j.profile.parts,300);
 assert.deepEqual(STEP1_SAVE_KEYS.map(k=>s.getItem(k)),before);
 const loaded=new api.BlastJourney(s,locks);assert.deepEqual(loaded.profile,j.profile);
 const r=(await loaded.start()).run;assert(r.selectTool('blackhole'));assert.equal(r.world.cost(),18);assert.equal(r.world.settings.bombForce,1);
 assert.equal((await loaded.buy('capacity')).reason,'active');
});
feature('both tools spend the last positive battery, cleanup pauses and expires safely',async()=>{
 const j=new api.BlastJourney(memory(),locks);await earn(j);await j.buy('blackhole');
 for(const tool of ['bomb','blackhole']){
  const {run:r}=await j.start();r.selectTool(tool);r.world.charge=1;
  assert(r.press({x:r.world.width/2,y:r.world.floorY/2}));r.release();assert.equal(r.world.charge,0);assert.equal(r.phase,'finishing');
  r.pause(true);const before=r.finishRemaining;r.update(3);assert.equal(r.finishRemaining,before);r.pause(false);
  for(let n=0;n<301&&!r.finishReady;n++)r.update(1/30);assert(r.finishReady);assert((await j.finish()).ok);
 }
});
feature('mobile page exposes exactly two tools and all controller elements',()=>{
 const html=readFileSync(new URL('../blast-step1.html',import.meta.url),'utf8'),main=readFileSync(new URL('../src/blast-step1/main.js',import.meta.url),'utf8');
 assert.deepEqual([...html.matchAll(/data-tool="([^"]+)"/g)].map(m=>m[1]),['bomb','blackhole']);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const [,id] of main.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(id),id);
 assert(!html.includes('cutter-shape'));assert(!html.includes('touch-apron'));
});
feature('paused tool changes never run physics or spend battery',async()=>{
 const j=new api.BlastJourney(memory(),locks);await earn(j);await j.buy('blackhole');const r=(await j.start()).run;
 r.pause(true);const charge=r.world.charge,elapsed=r.world.elapsed;
 assert(r.selectTool('blackhole'));assert.equal(r.world.tool,'blackhole');assert.equal(r.press({x:50,y:50}),false);r.update(10);
 assert.equal(r.world.charge,charge);assert.equal(r.world.elapsed,elapsed);assert(r.paused);
 r.pause(false);assert(r.press({x:50,y:50}));r.release();assert.equal(r.world.wells.length,1);assert.equal(r.world.charge,42);
});
feature('save failure retains the run for exactly-once settlement retry',async()=>{
 const s=memory(),j=new api.BlastJourney(s,locks),r=(await j.start()).run;r.world.collected=27;r.workMs=11000;
 const write=s.setItem;s.setItem=()=>{throw Error('quota');};assert.equal((await j.finish()).ok,false);assert.equal(j.currentRun,r);assert(r.paused);
 s.setItem=write;assert((await j.finish()).ok);assert.equal(j.profile.parts,27);assert.equal((await j.finish()).ok,false);
});
feature('manual boss awards first-clear bonus once at 70 percent',async()=>{
 const j=new api.BlastJourney(memory(),locks);
 for(const bonus of [500,0]){const {run:r}=await j.start('boss');assert.equal(r.world.tool,'bomb');r.world.collected=Math.ceil(r.world.initial*.7);r.workMs=1000;const done=await j.finish();assert(done.qualified);assert.equal(done.bonus,bonus);}
 assert.equal(j.profile.bossAttempts,2);assert.equal(j.profile.firstClearMs,1000);
});
feature('real bomb, collection and black hole keep pixel accounting intact',async()=>{
 const j=new api.BlastJourney(memory(),locks);await earn(j);await j.buy('blackhole');
 const r=(await j.start('retry')).run,w=r.world;const q=w.material(w.bodies[0])[0].q;
 assert(r.press(q));r.release();
 for(let n=0;n<90;n++){r.update(1/30,{...q,working:false});assert.equal(Object.values(w.ledger()).reduce((a,b)=>a+b,0),w.initial);}
 assert(w.collected+w.flying.length+w.sand.filter(Boolean).length>0,'bomb must create collectable pixels');
 assert(r.selectTool('blackhole'));assert(r.press(q));r.release();
 for(let n=0;n<100;n++){r.update(1/30,{...q,working:false});assert.equal(Object.values(w.ledger()).reduce((a,b)=>a+b,0),w.initial);}
 assert.equal(w.charge,30);assert.equal(w.wells.length,0);
});
