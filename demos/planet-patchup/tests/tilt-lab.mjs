import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {TiltWorld} from '../src/tilt-lab/world.js';
import {RAMP_MAPS} from '../src/ramp-lab/maps.js';
import {FreeJourney} from '../src/free30/journey.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import {applySettings} from '../src/paid-lab/settings.js';
import {loadIdeaTuning} from '../src/ideas-lab/options.js';
const make=()=>{
 const {site}=extendWorksite(RAMP_MAPS[0].site);
 const w=new TiltWorld(site,new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile,{blast:'normal'});
 applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);w.detach();return w;
};
const moving=w=>{const p=w.bodies.find(p=>p.hinge);assert(p);Body.setAngularVelocity(p.body,.01);return p;};
test('supported torque ramps without changing mass or inertia, and follows COM lever arm',()=>{
 const w=make(),p=moving(w),{mass,inertia}=p.body;
 for(let i=0;i<300;i++){p.body.torque=0;w.assistTilt(1/60);}
 assert(Math.abs(p.rotationGain-5)<1e-9);
 const g=w.engine.gravity,dx=p.body.position.x-p.hinge.pointA.x;
 assert(Math.abs(p.body.torque-4*dx*mass*g.y*g.scale)<1e-9);
 assert.equal(p.body.mass,mass);assert.equal(p.body.inertia,inertia);
});
test('upward swing and stationary bodies receive no extra torque',()=>{
 const w=make(),p=moving(w);w.assistTilt(1);p.body.torque=0;
 Body.setAngularVelocity(p.body,-.01);w.assistTilt(1);assert.equal(p.body.torque,0);assert.equal(p.rotationGain,1);
 Body.setAngularVelocity(p.body,0);w.assistTilt(1);assert.equal(p.body.torque,0);
});
test('hinge release, missing support and fragmented children cannot inherit assistance',()=>{
 const w=make(),p=moving(w);w.assistTilt(4);
 const child=w.addPiece(p.pixels.slice(0,20),p);assert(child);
 const h=p.hinge;Composite.remove(w.engine.world,h);p.hinge=null;
 p.body.torque=0;child.body.torque=0;w.assistTilt(1);
 assert.equal(p.body.torque,0);assert.equal(child.body.torque,0);assert.equal(child.rotationGain,1);
 const w2=make(),p2=moving(w2);w2.cells[p2.supportId]=0;w2.assistTilt(1);assert.equal(p2.body.torque,0);
});
test('pivot contact is allowed but floor or other contacts permanently stop assistance',()=>{
 const w=make(),p=moving(w),pivot=p.hinge.pointA;
 const support=w.staticBodies.find(b=>pivot.x>=b.bounds.min.x&&pivot.x<=b.bounds.max.x&&pivot.y>=b.bounds.min.y&&pivot.y<=b.bounds.max.y);
 assert(support);
 const pair=(other,point)=>({isActive:true,bodyA:p.body,bodyB:other,collision:{supports:[point],supportCount:1}});
 const pivotPair=pair(support,pivot);
 pivotPair.collision.supports.push({x:pivot.x+10,y:pivot.y}); // Matter retains an inactive cached point.
 w.stopContactAssist([pivotPair]);w.assistTilt(1);assert(p.rotationGain>1);
 const floor=Composite.allBodies(w.engine.world).find(b=>b.isStatic&&!w.staticBodies.includes(b)&&b.position.y>w.floorY);
 w.stopContactAssist([pair(floor,{x:pivot.x,y:w.floorY})]);p.body.torque=0;w.assistTilt(5);
 assert.equal(p.body.torque,0);assert.equal(p.rotationGain,1);
 w.stopContactAssist([]);w.assistTilt(5);assert.equal(p.body.torque,0);
});
test('runtime preserves body material, stops boosts after detachment, and conserves pixels',()=>{
 const w=make(),material=new WeakMap();let boosted=false,released=false;
 for(let i=0;i<1200;i++){
  for(const p of w.bodies)if(!material.has(p))material.set(p,{mass:p.body.mass,inertia:p.body.inertia});
  w.step(1/60);
  for(const p of w.bodies){
   const before=material.get(p);if(before){assert.equal(p.body.mass,before.mass);assert.equal(p.body.inertia,before.inertia);}
   boosted ||= p.rotationGain>1;
   if(!p.hinge){released=true;assert.equal(p.rotationGain??1,1);}
  }
  assert(w.diagnostics().finite&&w.diagnostics().balanced);w.events=[];
 }
 assert(boosted);assert(released);
 assert.deepEqual(w.bearingReadings().filter(r=>r.center>288).map(r=>r.width),[3,5]);
});

test('isolated settings preserve base inertia when reapplied and never touch ramp saves',async()=>{
 const {applyTiltMotion,DEFAULTS,saveMotion,loadMotion}=await import('../src/tilt-lab/settings.js');
 const {tiltStorage}=await import('../src/tilt-lab/storage.js');
 const w=make(),p=moving(w),inertia=p.body.inertia;
 applyTiltMotion(w,DEFAULTS);w.assistTilt(4);applyTiltMotion(w,DEFAULTS);
 assert.equal(p.body.inertia,inertia);assert.equal(w.rotationLimit,5);
 const data=new Map([['planet-patchup-ramp-planet','keep']]);
 const store=tiltStorage({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert(saveMotion(store,DEFAULTS).ok);assert.equal(loadMotion(store).settings.rotation,5);
 assert.equal(data.get('planet-patchup-ramp-planet'),'keep');assert.equal(data.size,2);
});
