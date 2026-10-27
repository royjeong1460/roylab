import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperiment} from '../src/collapse-fall/model.js';
const advance=(w,seconds)=>{const events=[];for(let i=0;i<seconds*60;i++){w.step(1/60);events.push(...w.events.splice(0));}return events;};
const drop=(height,response='fall')=>{const {world:w}=createExperiment(`drop-${height}`,'base',true,response),events=advance(w,12);return {w,events};};

test('low drop chips a little but retains the body',()=>{
 const {w}=drop(4);assert(w.looseCount()>0,'ordinary low fall must chip');assert(w.looseCount()<36);
 assert(Math.max(...w.bodies.map(p=>p.pixels.length))>=300);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('high drop opens internal cracks and keeps multiple substantial chunks',()=>{
 const {w,events}=drop(70),hit=events.find(e=>e.kind==='fall-fracture');assert(hit,'real falling collision');
 assert(hit.fragments>=3);assert(hit.largest<360*.8);assert(hit.count<360*.3);
 assert(hit.crackDepth>5);assert(hit.spent<=hit.budget+1e-6);
 assert(w.bodies.filter(p=>p.pixels.length>=15).length>=3);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('new comparison preserves the old low-drop result, gravity and stats',()=>{
 const a=createExperiment('drop-4').world,b=createExperiment('drop-4','base',true,'chain').world;
 assert.equal(a.chainPower,10);assert.equal(b.chainPower,10);assert.deepEqual(a.stats(),b.stats());assert.deepEqual(a.engine.gravity,b.engine.gravity);
 advance(b,12);assert.equal(b.looseCount(),0);assert.equal(b.bodies[0].pixels.length,360);
 assert.equal(b.firstLanding.count,0);assert(b.firstLanding.speed>20);
});
test('chain routing and primary attacks are unchanged in the stacked-map cascade',()=>{
 const a=createExperiment('collapse-stack'),b=createExperiment('collapse-stack','base',true,'chain');
 a.world.activate(a.map.aim.x,a.map.aim.y);b.world.activate(b.map.aim.x,b.map.aim.y);
 const ea=advance(a.world,20),eb=advance(b.world,20);
 const hits=ea.filter(e=>e.kind==='chain-impact');assert(hits.length>0);
 assert.deepEqual(hits,eb.filter(e=>e.kind==='chain-impact'));
 assert.deepEqual(a.world.ledger(),b.world.ledger());assert.deepEqual(a.world.bodies.map(p=>p.body.position),b.world.bodies.map(p=>p.body.position));
});
test('all three maps remain stable before attacks; Blast and Black Hole conserve material',()=>{
 for(const id of ['collapse-stack','collapse-bridge','collapse-domino']){
  const {world:w,map}=createExperiment(id);assert.equal(w.looseCount(),0);
  assert.equal(advance(w,8).filter(e=>e.kind==='fall-fracture').length,0);
  assert(w.activate(map.aim.x,map.aim.y));advance(w,10);
  w.setTool('blackhole');assert(w.activate(map.aim.x,map.aim.y-10));const events=advance(w,10);
  for(const e of events.filter(e=>e.kind==='fall-fracture'))assert(e.spent<=e.budget+1e-6);
  assert(w.diagnostics().balanced&&w.diagnostics().finite,id);
 }
});
test('low-energy and horizontal contacts keep the original collision path',()=>{
 for(const direction of [{x:1,y:0},{x:0,y:1},{x:0,y:-1}]){
  const a=createExperiment('drop-4').world,b=createExperiment('drop-4','base',true,'chain').world;
  // No recorded downward approach: manually queued hits must not gain fall assistance.
  for(const w of [a,b]){const p=w.bodies[0],point={...p.body.position};w.contactEnergy.set(point,{speed:10,energy:5});w.applyImpact(p,point,direction,1,'collision');}
  assert.deepEqual(a.ledger(),b.ledger());assert.equal(a.fallSummary.impacts,0);
 }
});
test('settled debris does not keep grinding, and every pixel is conserved',()=>{
 const {w}=drop(70);advance(w,18);const loose=w.looseCount(),chunks=w.ledger().chunks;
 assert.equal(advance(w,10).filter(e=>e.kind==='fall-fracture').length,0);assert.equal(w.looseCount(),loose);assert.equal(w.ledger().chunks,chunks);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
