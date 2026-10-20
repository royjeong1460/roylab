import test from 'node:test';
import assert from 'node:assert/strict';
import {FreeJourney,FREE_SAVE_KEYS} from '../src/free30/journey.js';
const setup=()=>{const m=new Map([['free30-collection-sound','off'],['other-game','keep']]),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},locks={request:async(_,fn)=>fn()};return {m,storage,locks,j:new FreeJourney(storage,locks)};};
test('reset replaces progression, keeps settings and unrelated games, reloads into tutorial',async()=>{
 const {j,m,storage,locks}=setup();const p=structuredClone(j.profile);p.parts=p.earned=1000;p.tutorial='done';j.save(p);await j.buy('bombRange');
 const revision=j.profile.revision;assert((await j.resetProgress(revision)).ok);assert(j.profile.revision>revision);assert.equal(j.profile.parts,0);assert.equal(j.profile.spent,0);assert.equal(j.profile.upgrades.bombRange,0);assert.equal(j.profile.tutorial,'intro');assert.equal(j.lastRunSite,null);assert.equal(j.profile.bossCleared,false);assert.deepEqual(j.profile.history,[]);assert.equal(m.get('free30-collection-sound'),'off');assert.equal(m.get('other-game'),'keep');
 assert.deepEqual(new FreeJourney(storage,locks).profile,j.profile);const {run}=await j.start();assert.equal(run.site.id,'free30-first-cleanup-v1');
});
test('stale confirmation and active run do not reset progress',async()=>{
 const {j,m}=setup();const revision=j.profile.revision;await j.skipTutorial();const before=new Map(m);
 assert.equal((await j.resetProgress(revision)).reason,'stale');assert.deepEqual(m,before);
 await j.start();assert.equal((await j.resetProgress(j.profile.revision)).reason,'active');
});
test('failed reset write leaves previous progress intact',async()=>{
 const {j,storage,locks,m}=setup();await j.skipTutorial();const before=structuredClone(j.profile),disk=new Map(m);storage.setItem=()=>{throw Error('quota');};
 assert.equal((await j.resetProgress(before.revision)).reason,'storage');assert.deepEqual(j.profile,before);assert.deepEqual(m,disk);assert.deepEqual(new FreeJourney(storage,locks).profile,before);
});
test('other tab cannot settle old-run rewards after reset',async()=>{
 const {j,storage,locks}=setup();const {run}=await j.start();run.world.collected=Math.ceil(run.world.initial*.7);
 const other=new FreeJourney(storage,locks);assert((await other.resetProgress(other.profile.revision)).ok);
 assert.equal((await j.finish()).reason,'reset');assert.equal(j.currentRun,null);assert.equal(new FreeJourney(storage,locks).profile.parts,0);assert(!j.profile.bossCleared);
 assert([...FREE_SAVE_KEYS.map(k=>storage.getItem(k))].filter(Boolean).some(v=>JSON.parse(v).version===4));
});
