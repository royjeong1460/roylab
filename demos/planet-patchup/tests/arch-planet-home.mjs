import test from 'node:test';
import assert from 'node:assert/strict';
import Projection from '../src/arch/planet/projection.js';
import {HOME_REGIONS,homeRegions} from '../src/arch/planet/regions.js';
import {createPlanetGlobe} from '../src/arch/planet/globe.js';

test('free Arch access and real boss restoration remain separate from prototype flags',()=>{
 const p={bossCleared:false,available:[0,1,2,3,4,5],cleared:[0],zone:5,state:'clean'};
 const regions=homeRegions(p);
 assert.equal(regions[0].name,'Arch Quarter');assert.equal(regions[0].art,1);
 assert.equal(regions[1].art,0);assert.equal(regions.filter(r=>r.available).length,1);
 assert(!regions.some(r=>r.cleared));
 assert.deepEqual(homeRegions({...p,bossCleared:true}).filter(r=>r.cleared).map(r=>r.name),['Arch Quarter']);
 assert.equal(p.bossCleared,false);
});

test('every cultural anchor centers on the actual globe and respects approved turn speed',()=>{
 for(const from of HOME_REGIONS)for(const to of HOME_REGIONS){
  const a=Projection.target(from.art,0),b=Projection.target(to.art,a.yaw);
  const v=Projection.view(Projection.vector(Projection.anchors[to.art]),b.yaw,b.pitch);
  assert(Math.abs(v[0])<1e-9&&Math.abs(v[1])<1e-9&&Math.abs(v[2]-1)<1e-9);
  const seconds=Projection.duration(a.yaw,b.yaw,a.pitch,b.pitch)/1000;
  assert(Math.hypot(b.yaw-a.yaw,b.pitch-a.pitch)*180/Math.PI*1.875/seconds<=110.00001);
  assert(Math.abs(b.pitch-a.pitch)*180/Math.PI*1.875/seconds<=40.00001);
 }
});

function renderer(){
 let loader,lastFrame,renders=0;const jobs=new Map();let time=0,id=0;
 const texture=new Uint8ClampedArray(512*256*4);for(let i=0;i<texture.length;i+=4)texture.set([90,160,120,255],i);
 const ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(frame){renders++;lastFrame=frame.data.slice();}};
 const pin={dataset:{},style:{}};
 const view={Image:class{constructor(){loader=this;}},performance:{now:()=>time},matchMedia:()=>({matches:false}),requestAnimationFrame(fn){jobs.set(++id,fn);return id;},cancelAnimationFrame(id){jobs.delete(id);}};
 const doc={defaultView:view,createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:texture})})})};
 const globe=createPlanetGlobe({ownerDocument:doc,getContext:()=>ctx},pin);
 return {globe,pin,load:()=>loader.onload(),frame:()=>lastFrame,renders:()=>renders,jobs,advance(){time+=10000;const pending=[...jobs.values()];jobs.clear();for(const fn of pending)fn(time);},loader:()=>loader};
}

test('saved clear before image load restores Arch; reset hides restoration, other regions stay concealed',()=>{
 const r=renderer();r.globe.update(homeRegions({bossCleared:true}));r.load();
 const clean=r.frame();assert(clean.some(x=>x));assert.equal(r.pin.style.left,'49.73958333333333%');
 r.globe.update(homeRegions({bossCleared:false}));assert.notDeepEqual(r.frame(),clean);
 const count=r.renders();r.globe.update(homeRegions({bossCleared:false}));assert.equal(r.renders(),count,'unchanged profile must not rebuild planet');
 r.globe.select(1);r.advance();assert.equal(r.pin.dataset.hidden,'true');
 r.globe.select(0);r.advance();assert.equal(r.pin.dataset.hidden,'false');
 r.globe.update(homeRegions({bossCleared:true}));assert.deepEqual(r.frame(),clean);
});

test('rapid selection replaces rotation and disposal stops pending image/animation work',()=>{
 const r=renderer();r.load();r.globe.select(5);r.globe.select(1);assert.equal(r.jobs.size,1);
 r.advance();assert.equal(r.pin.dataset.hidden,'true');
 r.globe.select(0);r.globe.destroy();assert.equal(r.jobs.size,0);assert.equal(r.loader().onload,null);
});
