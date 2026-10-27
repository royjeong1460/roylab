import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLAPSE_MAPS,createExperiment,readMetrics} from '../src/collapse-lab/model.js';

const advance=(w,seconds)=>{const events=[];for(let i=0;i<seconds*60;i++){w.step(1/60);events.push(...w.events.splice(0));}return events;};
test('chain assistance comes only from large moving chunks hitting another structure',()=>{
 let totalHits=0;
 for(const map of COLLAPSE_MAPS){
  const {world:w}=createExperiment(map.id,'base',true,'chain',30);
  assert(w.activate(map.aim.x,map.aim.y));
  const events=advance(w,16),chains=events.filter(e=>e.kind==='chain-impact');
  totalHits+=chains.length;
  const depths=new Map();
  for(const hit of chains){
   const [a,b]=hit.edge.split(':').map(Number);
   assert(a>0&&b>0&&a!==b,`${map.id}: floor/self contact ${hit.edge}`);
   assert(hit.sourcePixels>=64&&hit.speed>=12&&hit.energy>=1.2,'large strong collision');
   assert(hit.sourceApproach>0,'moving source approaches its target');
   assert.equal(hit.stage,(depths.get(`${hit.chainId}:${hit.sourceGroup}`)||0)+1,'branches keep their source depth');
   depths.set(`${hit.chainId}:${hit.targetGroup}`,hit.stage);
  }
  assert(w.diagnostics().balanced&&w.diagnostics().finite,`${map.id}: material and motion preserved`);
 }
 assert(totalHits>=2,'real cross-structure cascades remain possible');
});
test('unattacked and missed-attack scenes cannot create an arcade cascade',()=>{
 for(const map of COLLAPSE_MAPS){
  const {world:w}=createExperiment(map.id,'base',true,'chain');
  assert.equal(advance(w,10).filter(e=>e.kind==='chain-impact').length,0);
  w.activate(3,5);
  assert.equal(advance(w,10).filter(e=>e.kind==='chain-impact').length,0);
  assert.equal(readMetrics(w).pixelized,0);
 }
});
test('comparison mode retains the previous world and stats',()=>{
 const old=createExperiment('collapse-stack').world,chain=createExperiment('collapse-stack','base',true,'chain').world;
 assert.equal(old.physicsVersion,'arch-yielding-joints-v1');
 assert.notEqual(chain.physicsVersion,old.physicsVersion);
 assert.deepEqual(chain.stats(),old.stats());
 assert.deepEqual(chain.ledger(),old.ledger());
});
test('zero chain power reproduces original collision results',()=>{
 for(const map of COLLAPSE_MAPS){
  const original=createExperiment(map.id).world,w=createExperiment(map.id,'base',true,'chain',0).world;
  original.activate(map.aim.x,map.aim.y);w.activate(map.aim.x,map.aim.y);
  advance(original,20);const events=advance(w,20);
  assert.equal(events.filter(e=>e.kind==='chain-impact').length,0);
  assert.deepEqual(w.ledger(),original.ledger());
  assert.deepEqual(w.bodies.map(p=>p.body.position),original.bodies.map(p=>p.body.position));
 }
});
test('live power adjustment is bounded and retains the scene and weapon stats',()=>{
 const {world:w,map}=createExperiment('collapse-domino','base',true,'chain');
 assert.equal(w.chainPower,10);w.activate(map.aim.x,map.aim.y);advance(w,.5);
 const ledger=w.ledger(),stats=w.stats(),elapsed=w.elapsed;
 assert.equal(w.setChainPower(12.5),12.5);
 assert.deepEqual(w.ledger(),ledger);assert.deepEqual(w.stats(),stats);assert.equal(w.elapsed,elapsed);
 assert.equal(w.setChainPower(NaN),12.5);assert.equal(w.setChainPower(Infinity),12.5);
 assert.equal(w.setChainPower(100),30);assert.equal(w.setChainPower(-1),0);
 assert.equal(w.setChainPower(6),6);
});
test('strength adjustment changes the first eligible collision, not the incoming attack',()=>{
 const hits=[];
 for(const power of [6,30]){
  const {world:w,map}=createExperiment('collapse-bridge','base',true,'chain',power);
  w.activate(map.aim.x,map.aim.y);
  const hit=advance(w,20).find(e=>e.kind==='chain-impact');assert(hit);hits.push(hit);
 }
 assert.equal(hits[0].edge,hits[1].edge);assert.equal(hits[0].speed,hits[1].speed);
 assert.equal(hits[0].energy,hits[1].energy);assert(hits[1].count>hits[0].count);
});
test('one attack cannot repeatedly amplify the same group contact or keep settled rubble cascading',()=>{
 for(const map of COLLAPSE_MAPS){
  const {world:w}=createExperiment(map.id,'base',true,'chain');
  w.activate(map.aim.x,map.aim.y);
  const hits=advance(w,30).filter(e=>e.kind==='chain-impact'),keys=hits.map(e=>`${e.chainId}:${e.edge}:${e.recipient}`);
  assert.equal(new Set(keys).size,keys.length,`${map.id}: repeated contact credit`);
  assert.equal(advance(w,10).filter(e=>e.kind==='chain-impact').length,0,`${map.id}: expired chain`);
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});
test('Black Hole and repeated Blast preserve material and finite motion in both presets',()=>{
 for(const preset of ['base','player']){
  const {world:w,map}=createExperiment('collapse-bridge',preset,true,'chain');
  w.tool='blackhole';assert(w.activate(map.aim.x,map.aim.y-12));advance(w,8);
  w.tool='bomb';
  for(let i=0;i<3;i++){assert(w.activate(map.aim.x+i*6,map.aim.y));advance(w,5);}
  assert(w.diagnostics().balanced&&w.diagnostics().finite,preset);
 }
});
