import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeJourney,FREE_SAVE_KEYS} from '../src/free30/journey.js';
import * as sites from '../src/free30/sites.js';
import {play} from '../simulation/free30-probe.mjs';
const fixture=()=>{const m=new Map();const storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},locks={request:async(_,f)=>f()};return {m,storage,locks,j:new FreeJourney(storage,locks)};};
test('completed tutorial can be replayed repeatedly without losing upgrades or stage records',async()=>{
 const {j}=fixture();
 const {run}=await j.start();run.world.collected=100;await j.finish();
 await j.buy('bombRange');await j.skipTutorial();
 const normal=await j.start('stage',sites.FREE_SITES[0].id);
 assert(normal.ok);normal.run.world.collected=Math.ceil(normal.run.world.initial*.7);await j.finish();
 const before=structuredClone(j.profile);
 for(let i=0;i<2;i++){
  const replay=await j.start('tutorial');assert(replay.ok);assert.equal(replay.run.site.id,sites.FREE_TUTORIAL.id);
  await j.finish();assert.equal(j.profile.tutorial,'done');
  assert.deepEqual(j.profile.upgrades,before.upgrades);assert.deepEqual(j.profile.stageRecords,before.stageRecords);assert.equal(j.profile.parts,before.parts);
 }
});
test('first visit uses a tutorial, one real upgrade leads into a normal map',async()=>{
 const {j,storage,locks}=fixture();assert.equal(j.profile.tutorial,'intro');
 const {run}=await j.start();assert.equal(run.site.id,sites.FREE_TUTORIAL.id);
 run.world.collected=100;assert((await j.finish()).ok);assert.equal(j.profile.tutorial,'upgrade');
 assert((await j.buy('bombRange')).ok);assert.equal(j.profile.parts,20);assert.equal(j.profile.tutorial,'next');
 const reload=new FreeJourney(storage,locks);assert.equal(reload.profile.tutorial,'next');
 assert.equal((await reload.buy('capacity')).reason,'tutorial-next');
 assert.notEqual((await reload.start()).run.site.id,sites.FREE_TUTORIAL.id);assert.equal(reload.profile.tutorial,'done');
});
test('legacy saves keep progress and do not force tutorial; low collection never invents currency',async()=>{
 const {j,m,storage,locks}=fixture();const old=structuredClone(j.profile);delete old.tutorial;m.set(FREE_SAVE_KEYS[0],JSON.stringify(old));
 const reload=new FreeJourney(storage,locks);assert.equal(reload.profile.tutorial,'done');assert.equal(reload.profile.parts,0);
 m.clear();const {run}=await j.start();run.world.collected=12;await j.finish();assert.equal(j.profile.parts,12);assert.equal(j.profile.tutorial,'intro');
 assert.equal((await j.start()).run.site.id,sites.FREE_TUTORIAL.id);
});
test('skip is saved and failure cannot silently dismiss tutorial',async()=>{
 const {j,storage}=fixture();storage.setItem=()=>{throw Error('quota')};assert.equal((await j.skipTutorial()).reason,'storage');assert.equal(j.profile.tutorial,'intro');
 storage.setItem=()=>{};assert((await j.skipTutorial()).ok);assert.equal(j.profile.tutorial,'done');assert.equal(j.profile.parts,0);
});
test('intro pillar blast creates real falling pieces and enough recoverable pixels for first upgrade',async()=>{
 const {j}=fixture();const {run:r}=await j.start();assert.equal(r.site.id,sites.FREE_TUTORIAL.id);const w=r.world;
 assert(r.press(r.site.preview[0]));r.release();let moved=false;
 for(let i=0;i<30*40;i++){
  const id=w.sand.findIndex(Boolean);const aim=id>=0?{x:id%w.width+.5,y:Math.floor(id/w.width)+.5}:w.flying[0]||r.aim;
  r.update(1/30,{...aim,working:false});if(w.bodies.length||w.flying.length)moved=true;w.events=[];
 }
 assert(moved);assert(w.collected>0,`actual first-shot collection ${w.collected}`);assert(w.diagnostics().balanced);
 const result=play(sites.FREE_TUTORIAL,j.profile,{interval:10});assert(result.recovered>=80,`first expedition collected ${result.recovered}`);
});
