import Events from "phaser/src/physics/matter-js/lib/core/Events.js";

import test from 'node:test';
import assert from 'node:assert/strict';
import {ActiveIdeaWorld,DEVICES} from '../src/ideas-lab/active/world.js';
import {FreeJourney} from '../src/free30/journey.js';
const site={data:{width:180,height:110,floorY:100,shapes:[{rect:[15,40,3,60],color:1},{rect:[10,36,28,4],color:2},{rect:[140,40,3,60],color:1},{rect:[130,36,30,4],color:2}]}};
function make(){const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];return new ActiveIdeaWorld(site,p,{blast:'aftershock'});}
function advance(w,n=480){for(let i=0;i<n;i++)w.step(1/60);}
test('device activation validates inputs and prevents overlapping sequences',()=>{const w=make();assert.equal(w.activateDevice('bad',1),false);assert.equal(w.activateDevice('orbital',NaN),false);assert.equal(w.activateDevice('orbital',1),true);assert.equal(w.activateDevice('sonic',1),false);});
test('all devices complete, preserve ledger/finite physics and do not retrigger passives',()=>{
 for(const {id} of DEVICES)for(const level of [1,2,3]){const w=make(),charge=w.charge,g=w.engine.gravity.scale;assert(w.activateDevice(id,level));advance(w);assert.equal(w.activeDevice,null,id);assert(w.activeHistory.length>0,id);assert(w.diagnostics().finite,id);assert(w.diagnostics().balanced,id);assert.equal(w.charge,charge);assert.equal(w.engine.gravity.scale,g);assert.equal(w.ideaCounts.echo,undefined);}
});
test('orbital drop targets both sides of the whole map and actually destroys material',()=>{const w=make();w.activateDevice('orbital',2);const xs=w.activeDevice.targets.map(p=>p.x);assert(Math.min(...xs)<40);assert(Math.max(...xs)>130);advance(w);assert(w.activeHistory.some(h=>h.kind==='impact'&&h.x<40));assert(w.activeHistory.some(h=>h.kind==='impact'&&h.x>130));assert(w.ledger().pending+w.ledger().sand+w.collected>0);});
test('no tick means no progress; invalid steps do not advance devices; new run is clean',()=>{const w=make();w.activateDevice('seismic',1);const state=JSON.stringify(w.activeDevice);for(const dt of [0,-1,NaN,Infinity])w.step(dt);assert.equal(JSON.stringify(w.activeDevice),state);assert.equal(make().activeDevice,null);});
test('gravity is temporary, and settling cannot leave gravity modified',()=>{const w=make(),g=w.engine.gravity.scale;w.activateDevice('gravity',3);advance(w,40);assert.equal(w.engine.gravity.scale,g);w.settled=true;w.step(1/60);assert.equal(w.engine.gravity.scale,g);});
test('seismic driver damages foundations and sonic sweep imparts rightward impulse',()=>{
 for(const id of ['seismic','sonic']){
  const w=make(),vectors=[],impulse=w.impulse.bind(w);
  w.impulse=(piece,point,v)=>{vectors.push(v);return impulse(piece,point,v);};
  w.activateDevice(id,2);advance(w,160);
  assert(vectors.some(v=>id==='seismic'?v.y<0:v.x>0),`${id} must deliver its directional impulse`);
  assert(w.cells.filter(Boolean).length<w.initial,`${id} releases real structural material`);
 }
});
test('gravity press increases solver gravity then restores it and accelerates falling bodies',()=>{
 const data={data:{width:80,height:160,floorY:150,shapes:[{rect:[30,10,8,8],color:1}]}};
 const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
 const w=new ActiveIdeaWorld(data,p),control=new ActiveIdeaWorld(data,p);w.detach();control.detach();
 const base=w.engine.gravity.scale;let peak=base;
 const eventCallback=()=>{peak=Math.max(peak,w.engine.gravity.scale);};
 // Observe the actual solver event, not merely the restored property between frames.
 Events.on(w.engine,'beforeUpdate',eventCallback);
 w.activateDevice('gravity',2);advance(w,40);advance(control,40);
 assert(peak>=base*5);assert(w.bodies[0].body.position.y>control.bodies[0].body.position.y);
 advance(w);assert.equal(w.engine.gravity.scale,base);
});
