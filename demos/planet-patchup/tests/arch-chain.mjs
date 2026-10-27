import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchRun,freshProfile} from '../src/arch/journey.js';
import {JointedArchWorld} from '../src/arch/jointed-world.js';
import {ARCH_TUTORIAL,ARCH_SITES,ARCH_BOSS} from '../src/arch/maps.js';
import {runSnapshot,ArchJournal} from '../src/arch/telemetry.js';
import {COLLAPSE_MAPS} from '../src/collapse-lab/maps.js';

const advance=(w,seconds)=>{const events=[];for(let i=0;i<seconds*60;i++){w.step(1/60);events.push(...w.events.splice(0));}return events;};
test('every free entry uses 10x chains without changing tools, gravity, collection or initial material',()=>{
 for(const site of [ARCH_TUTORIAL,...ARCH_SITES,ARCH_BOSS]){
  const profile=freshProfile(),w=new ArchRun(site,profile).world,old=new JointedArchWorld(site,profile);
  assert.equal(w.physicsVersion,'arch-chain-v1');assert.equal(w.chainPower,10);
  assert.deepEqual(w.stats(),old.stats());assert.deepEqual(w.engine.gravity,old.engine.gravity);
  assert.deepEqual(w.ledger(),old.ledger());assert.equal(w.capacity,old.capacity);
  assert.equal(advance(w,2).filter(e=>e.kind==='chain-impact').length,0);
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});
test('the campaign world actually executes the lab cascade and exports independent chain metrics',()=>{
 const site=COLLAPSE_MAPS[1],run=new ArchRun(site,freshProfile()),w=run.world;
 w.detach();advance(w,3);assert(w.activate(site.aim.x,site.aim.y));
 const events=advance(w,20).filter(e=>e.kind==='chain-impact');assert(events.length>0);
 assert.equal(events[0].boost,10);assert(w.chainSummary.pixels>0);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
 const journal=new ArchJournal({sessionId:'chain-test'});journal.start(run);journal.sample(run);
 const snapshot=runSnapshot(run),expected={power:10,best:w.chainSummary.best,pixels:w.chainSummary.pixels,impacts:w.chainSummary.impacts};
 assert.deepEqual(snapshot.chain,expected);assert.deepEqual(journal.current.latest.chain,expected);
 w.chainSummary.pixels++;assert.deepEqual(snapshot.chain,expected);
});
test('zero chain power preserves original free-map collisions and motion exactly',()=>{
 const site=ARCH_SITES[0],p=freshProfile(),w=new ArchRun(site,p).world,old=new JointedArchWorld(site,p);
 w.setChainPower(0);for(const world of [w,old]){world.unlimited=true;world.activate(site.preview[0].x,site.preview[0].y);advance(world,10);}
 assert.deepEqual(w.ledger(),old.ledger());assert.deepEqual(w.bodies.map(p=>p.body.position),old.bodies.map(p=>p.body.position));
 assert.equal(w.chainSummary.impacts,0);
});
