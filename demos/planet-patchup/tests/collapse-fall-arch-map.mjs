import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCH_SITES} from '../src/arch/maps.js';
import {FALL_MAPS,createExperiment} from '../src/collapse-fall/model.js';

test('local comparison includes the real free campaign map 1 without changing its pixels or structural roles',()=>{
 const site=ARCH_SITES[0],map=FALL_MAPS.find(m=>m.id===site.id);
 assert(map,'use the existing Arch Lane campaign map, not collapse-stack');
 assert.deepEqual(map.data,site.data);assert.deepEqual(map.structure,site.structure);
 assert.deepEqual(map.aim,site.preview[0]);
 for(const response of ['chain','fall','sensitive']){
  const {world:w}=createExperiment(site.id,'base',true,response);
  assert.equal(w.initial,2000);assert.equal(w.chainPower,10);
  assert.equal(w.looseCount(),0);assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});

test('the real map 1 body splits after the same support blast, preserving gravity and material',()=>{
 const old=createExperiment(ARCH_SITES[0].id,'base',true,'fall'),current=createExperiment(ARCH_SITES[0].id,'base',true,'sensitive');
 assert.deepEqual(current.world.engine.gravity,old.world.engine.gravity);assert.deepEqual(current.world.stats(),old.world.stats());
 const results=[];
 for(const {world:w,map} of [old,current]){
  const parts=[],apply=w.applyImpact.bind(w);
  w.applyImpact=(...args)=>{const before=new Set(w.bodies),n=w.fallSummary.impacts,r=apply(...args);
   if(w.fallSummary.impacts>n)parts.push(w.bodies.filter(p=>!before.has(p)).map(p=>p.pixels.filter(v=>w.roles[v.id]===2).length));return r;};
  assert(w.activate(map.aim.x,map.aim.y));
  for(let i=0;i<1800;i++){w.step(1/60);w.events=[];}
  assert(w.diagnostics().balanced&&w.diagnostics().finite);results.push(parts);
 }
 assert(!results[0].some(parts=>parts.filter(n=>n>=20).length>=2),'previous fall response retains body chunks');
 assert(results[1].some(parts=>parts.filter(n=>n>=20).length>=3),'lowered response splits actual body material');
});
