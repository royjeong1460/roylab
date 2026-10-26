import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchWorld} from '../src/arch/world.js';
import {freshProfile} from '../src/arch/journey.js';
import {ARCH_TUTORIAL,ARCH_SITES,ARCH_BOSS} from '../src/arch/maps.js';

function tick(w,seconds){
 for(let i=0;i<seconds*60;i++){
  w.step(1/60);w.events=[];
  assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
}
function severOnePost(w,site,side){
 const y=Math.floor(site.preview[0].y);
 const first=w.roles.findIndex((r,id)=>r===1&&Math.floor(id/w.width)===y);
 const group=w.originalGroup[first],xs=[];
 for(let x=0;x<w.width;x++){const id=y*w.width+x;if(w.cells[id]&&w.roles[id]===1&&w.originalGroup[id]===group)xs.push(x);}
 const cut=side==='left'?xs.slice(0,3):xs.slice(-3);
 w.breakContact(cut[0]+.5,y+.5,p=>Math.abs(Math.floor(p.y)-y)<=3&&cut.includes(Math.floor(p.x)));
 return group;
}

for(const side of ['left','right'])test(`Arch Lane tips toward the removed ${side} post`,()=>{
 const site=ARCH_SITES[0],w=new ArchWorld(site,freshProfile());
 severOnePost(w,site,side);
 const p=w.bodies.find(p=>p.structuralHinge);
 assert(p,'one remaining post must no longer keep the facade static');
 assert(p.hinge,'retain the bearing as a pivot initially');
 tick(w,.5);
 assert(Math.abs(p.body.angle)>.005,'gravity starts rotation');
 assert(side==='left'?p.body.angle<0:p.body.angle>0,'tilt toward the missing support');
 tick(w,9.5);
 if(side==='right'){
  assert(w.snapCount>0,'an unobstructed fall eventually breaks the connection');
  assert(!w.bodies.some(p=>p.structuralHinge&&p.hinge));
 }
});

for(const side of ['left','right'])test(`tutorial facade tips and releases after its ${side} post breaks`,()=>{
 const w=new ArchWorld(ARCH_TUTORIAL,freshProfile());severOnePost(w,ARCH_TUTORIAL,side);
 assert(w.bodies.some(p=>p.hinge));tick(w,10);
 assert(w.snapCount>0);assert(!w.bodies.some(p=>p.structuralHinge&&p.hinge));
});

test('starter explosion at a map-1 post releases more than its direct blast core',()=>{
 const site=ARCH_SITES[0],w=new ArchWorld(site,freshProfile()),q=site.preview[0];
 assert(w.activate(q.x,q.y));tick(w,2);
 assert(w.targetReleased>200);assert(w.bodies.length>0);
 assert.equal(w.charge,48);assert.equal(w.engine.timing.timeScale,1);assert.equal(w.engine.gravity.scale,.00007);
});

test('all intact Arch maps remain standing without player input',()=>{
 for(const site of [ARCH_TUTORIAL,...ARCH_SITES,ARCH_BOSS]){
  const w=new ArchWorld(site,freshProfile());tick(w,3);
  assert.equal(w.bodies.length,0,site.name);
  assert.equal(w.targetReleased,0,site.name);
 }
});
