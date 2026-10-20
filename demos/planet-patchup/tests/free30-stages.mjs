import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeJourney,FreeRun,FREE_SAVE_KEYS} from '../src/free30/journey.js';
import {FREE_STAGES,stageOpen,stageBest} from '../src/free30/stages.js';
const fixture=()=>{const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},locks={request:async(_,fn)=>fn()};return {m,storage,locks,j:new FreeJourney(storage,locks)};};
test('seven named maps require preceding 70 percent; no boss shortcut',async()=>{
 const {j}=fixture();assert.equal(FREE_STAGES.length,7);assert.equal(FREE_STAGES[6].name,'고물 바람골 - Boss');
 assert(stageOpen(j.profile,0));assert(!stageOpen(j.profile,1));assert.equal((await j.start('boss')).reason,'locked');
 assert.equal((await j.start('stage',FREE_STAGES[3].id)).reason,'locked');
 await j.skipTutorial();const {run}=await j.start('stage',FREE_STAGES[0].id);assert.equal(run.site.name,'고물 바람골 - 1');
 run.world.collected=Math.ceil(run.world.initial*.7)-1;await j.finish();assert(!stageOpen(j.profile,1));
 const next=(await j.start('retry')).run;next.world.collected=Math.ceil(next.world.initial*.7);await j.finish();assert(stageOpen(j.profile,1));
});
test('highest recovery survives replay, reload and reset; exact 100 marks full clear',async()=>{
 const {j,storage,locks}=fixture();await j.skipTutorial();
 const {run}=await j.start('stage',FREE_STAGES[0].id);run.world.collected=run.world.initial;await j.finish();assert.equal(stageBest(j.profile,FREE_STAGES[0].id),1);
 const repeat=(await j.start('retry')).run;repeat.world.collected=1;await j.finish();assert.equal(stageBest(j.profile,FREE_STAGES[0].id),1);
 const reload=new FreeJourney(storage,locks);assert.equal(stageBest(reload.profile,FREE_STAGES[0].id),1);
 assert((await reload.resetProgress(reload.profile.revision)).ok);assert.equal(stageBest(reload.profile,FREE_STAGES[0].id),0);assert(!stageOpen(reload.profile,1));
});
test('70 percent leaves normal and boss maps running for all-clear',()=>{
 const {j}=fixture();for(const site of [FREE_STAGES[0],FREE_STAGES[6]]){const r=new FreeRun(site,j.profile,site.boss?'boss':'stage');r.world.collected=Math.ceil(r.world.initial*.7);r.update(.001);assert(r.qualified);assert(!r.finishReady);assert(r.world.charge>0);}
});
test('schema 3 migration preserves money and restores best historical map records without inventing gaps',()=>{
 const {j,m,storage,locks}=fixture();const p=structuredClone(j.profile);p.version=3;delete p.stageRecords;p.parts=p.earned=300;p.tutorial='done';p.history=[{site:FREE_STAGES[1].id,mode:'random',recovered:100,total:100,batteryUsed:12,workMs:2000,tools:['bomb']}];p.runCount=1;p.workMs=2000;
 m.set(FREE_SAVE_KEYS[0],JSON.stringify(p));const loaded=new FreeJourney(storage,locks);assert.equal(loaded.profile.version,4);assert.equal(loaded.profile.parts,300);assert.equal(stageBest(loaded.profile,FREE_STAGES[1].id),1);assert(!stageOpen(loaded.profile,2));
});
test('failed settlement preserves old highest and current run for retry',async()=>{
 const {j,storage}=fixture();await j.skipTutorial();const {run}=await j.start('stage',FREE_STAGES[0].id);run.world.collected=run.world.initial;storage.setItem=()=>{throw Error('quota')};assert.equal((await j.finish()).reason,'storage');assert.equal(stageBest(j.profile,FREE_STAGES[0].id),0);assert.equal(j.currentRun,run);
});
test('70 percent checkpoint unlocks immediately while run remains active and awards no parts yet',async()=>{
 const {j,storage,locks}=fixture();await j.skipTutorial();const {run}=await j.start('stage',FREE_STAGES[0].id);
 run.world.collected=Math.ceil(run.world.initial*.7)-1;assert.equal((await j.checkpointStage()).ok,false);
 run.world.collected++;assert((await j.checkpointStage()).ok);assert(stageOpen(new FreeJourney(storage,locks).profile,1));assert.equal(j.profile.parts,0);assert.equal(j.currentRun,run);assert(!run.finishReady);
 run.world.collected=run.world.initial;await j.finish();assert.equal(stageBest(j.profile,run.site.id),1);assert.equal(j.profile.parts,run.world.initial);
});
test('checkpoint cannot save progress from a run predating reset',async()=>{
 const {j,storage,locks}=fixture();await j.skipTutorial();const {run}=await j.start('stage',FREE_STAGES[0].id);run.world.collected=run.world.initial;
 const other=new FreeJourney(storage,locks);await other.resetProgress(other.profile.revision);assert.equal((await j.checkpointStage()).reason,'reset');assert.equal(stageBest(new FreeJourney(storage,locks).profile,run.site.id),0);
});
test('failed checkpoint leaves the run playable and can retry without rewards',async()=>{
 const {j,storage}=fixture();await j.skipTutorial();const {run}=await j.start('stage',FREE_STAGES[0].id);run.world.collected=Math.ceil(run.world.initial*.7);
 const write=storage.setItem;storage.setItem=()=>{throw Error('quota')};assert.equal((await j.checkpointStage()).reason,'storage');assert(!run.paused);assert(!run.finishReady);assert.equal(stageBest(j.profile,run.site.id),0);
 storage.setItem=write;assert((await j.checkpointStage()).ok);assert.equal(j.profile.parts,0);
});
