import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {StructureWorld} from '../src/structure-lab/world.js';
import {LAYOUT_MAPS} from '../src/ideas-lab/maps.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import {FreeJourney} from '../src/free30/journey.js';
const make=()=>{const {site,bounds}=extendWorksite(LAYOUT_MAPS.find(m=>m.key==='layout-tall').site);return new StructureWorld(site,{...new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile,owned:['bomb','blackhole']},{blast:'normal'},bounds.x);};
const tick=(w,s)=>{for(let n=0;n<s*60;n++){w.step(1/60);assert(w.diagnostics().balanced&&w.diagnostics().finite);w.events=[];}};
test('all tall art pixels have exactly one structural owner and connected module interfaces',()=>{
 const w=make();assert.equal(w.modules.length,12);assert(w.moduleLinks.length>=11);
 for(let id=0;id<w.original.length;id++)if(w.original[id])assert(w.moduleOf[id]>=0);
 assert.deepEqual(w.modules.reduce((a,m)=>(a[m.type]=(a[m.type]||0)+1,a),{}),{roof:3,body:3,pillar:6});
});
test('intact two-column tower remains supported without intervention',()=>{const w=make();w.detach();tick(w,4);assert.equal(w.bodies.length,0);assert.equal(w.snapCount,0);});
test('one surviving slender column leans then snaps under the same roof load',()=>{
 const w=make();for(let y=200;y<204;y++)for(let x=33;x<35;x++)w.makeSand(y*w.width+w.structureOffset+x);
 w.detach();assert(w.bodies.some(p=>p.structuralHinge));tick(w,6);assert(w.snapCount>0);assert(!w.bodies.some(p=>p.structuralHinge&&p.hinge));
});
test('more remaining width lowers load; more overhead material raises load',()=>{
 const w=make(),ids=[];for(let id=0;id<w.cells.length;id++)if(w.cells[id])ids.push(id);
 const full=w.sections(ids)[0];const thin=ids.filter(id=>!(id%w.width===w.structureOffset+34&&Math.floor(id/w.width)>187));
 assert(w.sections(thin)[0].utilization>full.utilization);
 const light=ids.filter(id=>Math.floor(id/w.width)>86);assert(w.sections(light)[0].utilization<full.utilization);
});
test('unsupported free fall does not fracture from gravity stress alone',()=>{
 const w=make(),ids=[];for(let id=0;id<w.cells.length;id++)if(w.cells[id])ids.push(id);
 const p=w.releaseBody(ids);w.syncStatic();Body.setAngle(p.body,.4);
 assert(!w.isSupported(p));for(let n=0;n<30;n++)w.checkStructure(.1);
 assert.equal(w.snapCount,0);assert(w.bodies.includes(p));assert(w.diagnostics().balanced);
});
test('real explosion and black hole preserve pixels, finite bodies, and body cap',()=>{
 for(const tool of ['bomb','blackhole']){
  const w=make();w.unlimited=true;w.setTool(tool);
  assert(w.activate(w.structureOffset+34,221));tick(w,12);
  assert(w.bodies.length<=w.tune('bodyCap',18));if(tool==='bomb')assert(w.snapCount>0);assert(w.targetReleased>0,tool+' releases material');
 }
});
test('a supported moving compound fractures internally but a side wall is not support',()=>{
 const w=make(),ids=[];for(let id=0;id<w.cells.length;id++)if(w.cells[id])ids.push(id);
 const p=w.releaseBody(ids);w.syncStatic();Body.setAngle(p.body,.7);
 const floor=w.engine.world.bodies.find(b=>b.isStatic&&b.position.y>w.floorY);
 const pair={isActive:true,bodyA:p.body,bodyB:floor,collision:{normal:{x:-1,y:0},supports:[{x:p.body.position.x,y:w.floorY}],supportCount:1}};
 w.engine.pairs.list=[pair];assert(!w.isSupported(p));pair.collision.normal={x:0,y:-1};assert(w.isSupported(p));
 Body.setVelocity(p.body,{x:.1,y:.2});Body.setAngularVelocity(p.body,.001);
 for(let n=0;n<20&&!w.snapCount;n++)w.checkStructure(.1);
 assert(w.snapCount>0);assert(w.bodies.length>1);assert(!w.bodies.includes(p));assert(w.diagnostics().balanced);
 assert(w.bodies.every(child=>!child.hinge&&child.tiltStopped));
});

test('initial gravity overload is evaluated without an attack or manual detach',()=>{
 const w=make();w.engine.gravity.scale*=3;tick(w,3);assert(w.snapCount>0);assert(w.bodies.length>0);
});
test('compound reconstruction retains only an attached joint fatigue state',()=>{
 const w=make();for(let y=200;y<204;y++)for(let x=33;x<35;x++)w.makeSand(y*w.width+w.structureOffset+x);
 w.detach();const p=w.bodies.find(p=>p.structuralHinge);assert(p);p.structuralHinge.age=.2;
 w.removePiece(p);w.addConnected(p.pixels,p,p.damage);
 const child=w.bodies.find(p=>p.hinge);assert(child);assert.equal(child.structuralHinge.age,.2);
 tick(w,4);assert(w.snapCount>0);assert(w.diagnostics().balanced);
});
test('a grounded roof does not load pillars hanging beyond that contact',()=>{
 const w=make(),ids=[];for(let id=0;id<w.cells.length;id++)if(w.cells[id])ids.push(id);
 const p=w.releaseBody(ids);w.syncStatic();Body.setAngle(p.body,Math.PI/2);
 const roof=p.pixels.find(pixel=>Math.floor(pixel.id/w.width)===20),q=w.pixelPosition(p,roof);
 const floor=w.engine.world.bodies.find(b=>b.isStatic&&b.position.y>w.floorY);
 // At 90 degrees a contact along the roof's right edge lies below the COM.
 q.y=p.body.position.y+10;
 w.engine.pairs.list=[{isActive:true,bodyA:p.body,bodyB:floor,collision:{normal:{x:0,y:-1},supports:[q],supportCount:1}}];
 assert(w.isSupported(p));assert(w.supportCutLimit(p,w.supportBodies())<54);
 for(let n=0;n<30;n++)w.checkStructure(.1);assert.equal(w.snapCount,0);
});
test('new experiment settings cannot overwrite the previous tilt experiment',async()=>{
 const {structureStorage}=await import('../src/structure-lab/storage.js');
 const data=new Map([['planet-patchup-tilt-motion','old']]);const store=structureStorage({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 store.setItem('planet-patchup-motion','new');assert.equal(data.get('planet-patchup-tilt-motion'),'old');assert.equal(data.get('planet-patchup-structure-motion'),'new');
});
