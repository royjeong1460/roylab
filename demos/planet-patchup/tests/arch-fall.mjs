import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchRun,freshProfile} from '../src/arch/journey.js';
import {ChainArchWorld} from '../src/arch/chain-world.js';
import {SensitiveFallWorld} from '../src/collapse-fall/sensitive-world.js';
import {ARCH_TUTORIAL,ARCH_SITES,ARCH_BOSS} from '../src/arch/maps.js';
import {runSnapshot} from '../src/arch/telemetry.js';

const advance=(w,seconds)=>{const events=[];for(let i=0;i<seconds*60;i++){w.step(1/60);events.push(...w.events.splice(0));}return events;};

test('free map 1 actually fractures falling bodies with the accepted lab thresholds',()=>{
 const site=ARCH_SITES[0],run=new ArchRun(site,freshProfile()),w=run.world;
 w.detach();advance(w,3);
 assert(w.activate(site.preview[0].x,site.preview[0].y));
 const events=advance(w,30),falls=events.filter(e=>e.kind==='fall-fracture');
 assert(falls.some(e=>e.bodyPixels>=100&&e.bonds>0&&e.fragments>=2),'falling map 1 body must split internally');
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
 assert.equal(w.charge,48);assert.equal(w.energyUsed,12);
 assert.deepEqual(w.fallSettings,new SensitiveFallWorld(site,freshProfile()).fallSettings);
 assert.equal(runSnapshot(run).physicsVersion,'arch-fall-sensitive-v1');
});

test('all campaign entries retain original stats and gravity and do not fracture at rest',()=>{
 for(const site of [ARCH_TUTORIAL,...ARCH_SITES,ARCH_BOSS]){
  const p=freshProfile(),w=new ArchRun(site,p).world,old=new ChainArchWorld(site,p);
  assert.equal(w.physicsVersion,'arch-fall-sensitive-v1');
  assert.equal(w.chainPower,10);assert.deepEqual(w.stats(),old.stats());
  assert.deepEqual(w.engine.gravity,old.engine.gravity);assert.deepEqual(w.ledger(),old.ledger());
  assert.equal(advance(w,3).filter(e=>e.kind==='fall-fracture').length,0,site.id);
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});
