import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import Projection from '../src/arch/planet/projection.js';
import {HOME_REGIONS} from '../src/arch/planet/regions.js';
import {orbitPose,SATELLITES,PERIOD} from '../src/arch/planet/orbit-math.mjs';
import {mountSatelliteOrbit} from '../src/arch/planet/orbit.js';

test('actual campaign regions use approved spaced desert anchors',()=>{
 const locations=[[18,125],[-38,155],[8,-100],[32,-25],[-25,30],[46,55]];
 HOME_REGIONS.forEach((r,i)=>{
  assert.deepEqual(Projection.anchors[r.art],[.5+locations[i][1]/360,.5-locations[i][0]/180]);
 });
});
test('shipped desert map and landmarks exactly match the approved art',async()=>{
 const approved={
  "worldmap.png": "5291245987ee514bd95d05fbcee2210ad9f5191bae73920cac97239ce4f202fa",
  "landmark-1.png": "92c8fe1615a8fdeff7ae0ed0cde1167b6fafb6d6087b36bb0648c6729380959c",
  "landmark-2.png": "dc16a608cc0ef14feeaefcf3b8c6a311e0d3ad967e6ba18601a3be31787e3861",
  "landmark-3.png": "b3029f7d4a6ff22ea59014941dbf0b95aba5299c4be0a2b100d1ccd1025b296d",
  "landmark-4.png": "3d7845f736ed49f559e2c94e2ccc0807759e3f2c0213a7aaab9d79338d22d5e8",
  "landmark-5.png": "63e862145ded422d2e85bb030574c479eb0a240597bb0e9575626bd4571a61cc",
  "landmark-6.png": "a8238ee32f6fe3e321e9cf1a08ad5455632793c85ce88c643d93e4d7c1c21c68"
};
 for(const [name,hash] of Object.entries(approved)){
  const bytes=await readFile(new URL('../src/arch/planet/assets/desert/'+name,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,name);
 }
});
test('five slow orbiters disappear behind and leave the globe and controls unobscured',()=>{
 assert.equal(SATELLITES.length,5);assert(PERIOD>=100);
 for(let i=0;i<5;i++)for(let t=0;t<PERIOD;t+=.25){
  const p=orbitPose(t,i);if(p.depth<0)assert.equal(p.opacity,0);if(!p.opacity)continue;
  const w=SATELLITES[i].width*p.scale,h=w*SATELLITES[i].ratio,phi=Math.atan2(p.y-411,p.x-194);
  const extent=Math.abs(Math.cos(p.angle-phi))*w/2+Math.abs(Math.sin(p.angle-phi))*h/2;
  assert(Math.hypot(p.x-194,p.y-411)-extent>172);
  assert(p.y+Math.abs(Math.sin(p.angle))*w/2+Math.abs(Math.cos(p.angle))*h/2<621);
 }
});
test('closing a feedback dialog created after home mount resumes orbit animation',()=>{
 const jobs=new Map(),doc=new EventTarget();let id=0,open=false;
 const reduced={matches:false,addEventListener(){},removeEventListener(){}};
 doc.defaultView={Image:class{constructor(){this.style={};this.dataset={};}},matchMedia:()=>reduced,
  MutationObserver:class{observe(){}disconnect(){}},requestAnimationFrame(fn){jobs.set(++id,fn);return id;},cancelAnimationFrame(key){jobs.delete(key);}};
 doc.hidden=false;doc.querySelector=()=>open?{}:null;doc.querySelectorAll=()=>[];
 const orbit=mountSatelliteOrbit({ownerDocument:doc,hidden:false},{append(){}});
 assert.equal(jobs.size,1);
 open=true;for(const [key,fn] of [...jobs]){jobs.delete(key);fn(16);}assert.equal(jobs.size,0);
 open=false;doc.dispatchEvent(new Event('close'));assert.equal(jobs.size,1);
 orbit.destroy();doc.dispatchEvent(new Event('close'));assert.equal(jobs.size,0);
});
