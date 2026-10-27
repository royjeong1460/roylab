import test from 'node:test';
import assert from 'node:assert/strict';
import {createExperiment} from '../src/collapse-fall/model.js';
const run=(w,seconds)=>{const events=[];for(let i=0;i<seconds*60;i++){w.step(1/60);events.push(...w.events.splice(0));}return events;};

test('map 1 starter shot produces a visible falling-body split below the old crack onset',()=>{
 const {world:w,map}=createExperiment('collapse-stack','base',true,'sensitive');
 const bodySplits=[],impact=w.applyImpact.bind(w);
 w.applyImpact=(...args)=>{const before=new Set(w.bodies),n=w.fallSummary.impacts,result=impact(...args);
  if(w.fallSummary.impacts>n)bodySplits.push(w.bodies.filter(p=>!before.has(p)).map(p=>p.pixels.filter(v=>w.roles[v.id]===2).length));return result;};
 w.activate(map.aim.x,map.aim.y);const events=run(w,20);
 const falls=events.filter(e=>e.kind==='fall-fracture'&&e.bodyPixels>=100&&e.speed<30);
 assert(falls.some(e=>e.bonds>0&&e.fragments>=2&&e.largest<e.bodyPixels*.95),'map 1 must actually split a body, not just report invisible bond damage');
 assert(bodySplits.some(parts=>parts.filter(n=>n>=20).length>=2),'the body itself must split, not only its legs');
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('10 and 20 cell drops split the body internally while keeping chunks',()=>{
 for(const height of [10,20]){
  const {world:w}=createExperiment(`drop-${height}`,'base',true,'sensitive');
  const events=run(w,12),first=events.find(e=>e.kind==='fall-fracture');
  assert(first?.fragments>=2,`${height}: split`);assert(first.crackDepth>0,`${height}: internal crack`);
  assert(first.count<first.bodyPixels*.2);assert(w.ledger().chunks>w.initial*.65);
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});
test('first cross-building chain hit and gravity remain the same as the previous variant',()=>{
 const a=createExperiment('collapse-stack','base',true,'sensitive'),b=createExperiment('collapse-stack','base',true,'fall');
 assert.deepEqual(a.world.engine.gravity,b.world.engine.gravity);assert.deepEqual(a.world.stats(),b.world.stats());
 assert.equal(a.world.chainPower,10);assert.equal(b.world.chainPower,10);
 assert.deepEqual(a.world.bodies.map(p=>p.body.position),b.world.bodies.map(p=>p.body.position),'identical starting pose');
 for(const exp of [a,b])exp.world.activate(exp.map.aim.x,exp.map.aim.y);
 const ea=run(a.world,20),eb=run(b.world,20);
 assert.deepEqual(ea.find(e=>e.kind==='chain-impact'),eb.find(e=>e.kind==='chain-impact'));
 assert.equal(eb.filter(e=>e.kind==='fall-fracture').length,0,'previous map 1 comparison preserved');
});
test('resting map and settled rubble do not acquire continuous cracking',()=>{
 const {world:w}=createExperiment('collapse-stack','base',true,'sensitive');
 assert.equal(w.looseCount(),0);assert.equal(run(w,20).filter(e=>e.kind==='fall-fracture').length,0);
 const {world:d}=createExperiment('drop-20','base',true,'sensitive');run(d,30);const loose=d.looseCount();
 assert.equal(run(d,10).filter(e=>e.kind==='fall-fracture').length,0);assert.equal(d.looseCount(),loose);
 assert(d.diagnostics().balanced&&d.diagnostics().finite);
});
test('a low flat landing still chips rather than shredding the whole body',()=>{
 const {world:w}=createExperiment('drop-4','base',true,'sensitive');run(w,12);
 assert(w.firstLanding.count>0&&w.firstLanding.count<20);assert.equal(w.firstLanding.fragments,1);assert(w.firstLanding.largest>=340);
});
test('all maps and both primary tools conserve material with the lowered criteria',()=>{
 for(const mapId of ['collapse-stack','collapse-bridge','collapse-domino'])for(const preset of ['base','player']){
  const {world:w,map}=createExperiment(mapId,preset,true,'sensitive');
  w.activate(map.aim.x,map.aim.y);run(w,10);w.setTool('blackhole');assert(w.activate(map.aim.x,map.aim.y-10));
  const events=run(w,12);for(const e of events.filter(e=>e.kind==='fall-fracture'))assert(e.spent<=e.budget+1e-6);
  assert(w.diagnostics().balanced&&w.diagnostics().finite,`${mapId}/${preset}`);
 }
});
