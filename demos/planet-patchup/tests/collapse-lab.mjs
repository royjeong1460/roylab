import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
const modelURL=new URL('../src/collapse-lab/model.js',import.meta.url);
const tick=(w,s)=>{for(let i=0;i<s*60;i++){w.step(1/60);w.events=[];}};
test('three compact physical maps share campaign firepower and remain stable at rest',async()=>{
 assert(existsSync(modelURL),'local collapse model must exist');
 const {COLLAPSE_MAPS,createExperiment}=await import(modelURL);
 assert.equal(COLLAPSE_MAPS.length,3);
 for(const map of COLLAPSE_MAPS){
  const w=createExperiment(map.id).world,total=w.initial;
  assert(total>400&&total<1800,`${map.id}: compact material budget (${total})`);
  assert.equal(w.stats().bombRadius,3);assert.equal(w.stats().bombPower,1);assert.equal(w.stats().blastReach,18);
  const before=w.ledger();tick(w,20);
  assert.equal(w.ledger().sand+w.ledger().pending+w.collected,0,`${map.id}: no idle destruction`);
  assert.equal(w.ledger().static,before.static);assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});
test('one aimed starter blast creates rotation and secondary collision damage',async()=>{
 assert(existsSync(modelURL),'local collapse model must exist');
 const {COLLAPSE_MAPS,createExperiment}=await import(modelURL);
 for(const map of COLLAPSE_MAPS){
  const e=createExperiment(map.id),w=e.world;let peakAngle=0,impacts=0,direct=0;
  const contacts=new Set();
  Events.on(w.engine,'collisionStart',({pairs})=>{for(const pair of pairs){
   const a=(pair.bodyA.parent||pair.bodyA).plugin.piece,b=(pair.bodyB.parent||pair.bodyB).plugin.piece;if(!a||!b)continue;
   for(const x of new Set(a.pixels.map(p=>w.originalGroup[p.id])))for(const y of new Set(b.pixels.map(p=>w.originalGroup[p.id])))if(x!==y)contacts.add([x,y].sort((a,b)=>a-b).join(':'));
  }});
  assert(w.activate(map.aim.x,map.aim.y));
  for(let n=0;n<900;n++){
   w.step(1/60);
   for(const p of w.bodies)if(p.pixels.length>40)peakAngle=Math.max(peakAngle,Math.abs(p.body.angle));
   for(const event of w.events){if(event.kind==='impact')impacts++;if(event.kind==='tool-blast'&&event.phase==='blast')direct+=event.count||0;}
   w.events=[];
  }
  const l=w.ledger(),loose=l.sand+l.pending+l.collected;
  assert(peakAngle>.12,`${map.id}: visible rotation (${peakAngle})`);
  assert(impacts>0,`${map.id}: actual collision damage`);
  assert(loose>direct+10,`${map.id}: secondary destruction (${loose}, direct ${direct})`);
  const expected=map.id.endsWith('stack')?['1:2','2:3']:map.id.endsWith('bridge')?['1:4']:['1:2','2:3','3:4'];
  for(const pair of expected)assert(contacts.has(pair),`${map.id}: actual cross-structure collision ${pair}`);
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});

test('player preset and battery mode apply equally to every map',async()=>{
 const {COLLAPSE_MAPS,createExperiment}=await import(modelURL);
 for(const map of COLLAPSE_MAPS){
  const w=createExperiment(map.id,'player',false).world,s=w.stats();
  assert.equal(s.bombRadius,3.7);assert.equal(s.bombPower,1.5);assert.equal(s.blastReach,24);assert.equal(s.capacity,115);
  assert.equal(s.suctionRate,60);assert.equal(s.suctionRadius,15.5);assert(s.autoCollect);
  for(let n=0;n<10;n++){assert(w.activate(2,2));tick(w,.5);}
  assert.equal(w.charge,0);assert.equal(w.activate(2,2),false);
  w.unlimited=true;assert(w.activate(2,2));assert.equal(w.charge,w.capacity);
 }
});
