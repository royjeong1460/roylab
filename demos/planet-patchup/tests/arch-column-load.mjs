import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {ArchWorld} from '../src/arch/world.js';
import {freshProfile} from '../src/arch/journey.js';
import {ARCH_SITES} from '../src/arch/maps.js';
import {packMapCells} from '../src/map-maker-generator.js';
import {YardKit} from '../src/paid-lab/culture/kit.js';

function column({length=30,width=3,bodyHeight=12}={}){
 const k=new YardKit(80,130),top=130-length;
 k.paintAs(2,()=>k.rect(25,top-bodyHeight,30,bodyHeight,3));
 k.paintAs(1,()=>k.rect(40,top,width,length,3));
 const site={data:{width:80,height:142,floorY:130,shapes:packMapCells(k.cells,80,130)},structure:{version:1,roles:packMapCells(k.roles,80,130)}};
 return new ArchWorld(site,freshProfile());
}
const ids=w=>Array.from(w.cells,(_,id)=>id).filter(id=>w.cells[id]);
function tick(w,seconds){for(let n=0;n<seconds*60;n++){w.step(1/60);w.events=[];assert(w.diagnostics().balanced&&w.diagnostics().finite);}}

test('map-1 starter shot cannot leave the reported heavy head on a long leaning leg',()=>{
 const site=ARCH_SITES[0],w=new ArchWorld(site,freshProfile()),q=site.preview[0];
 w.activate(q.x,q.y);tick(w,30);
 const stranded=w.bodies.filter(p=>{
  if(!w.isSupported(p)||Math.abs(Math.sin(p.body.angle))<.3||Math.abs(Math.cos(p.body.angle))<.3)return false;
  const head=p.pixels.filter(v=>w.roles[v.id]!==1),lengths=w.pillarLengths(p.pixels.map(v=>v.id));
  const roots=w.supportPixels(p,w.supportBodies());
  const span=Math.max(0,...roots.map(id=>lengths.get(id)||0));
  return head.length>=500&&span>=15;
 });
 assert.equal(stranded.length,0,'the screenshot-like rigid head/leg compound must fracture');
});

test('longer columns buckle under more load even when the head is centered',()=>{
 const short=column({length:12}),long=column({length:110});
 const a=short.sections(ids(short))[0],b=long.sections(ids(long))[0];
 assert(b.utilization>a.utilization*3,'length must change capacity, not only add a few pixels');
 assert(b.utilization>1,'long thin centered post must not have unlimited axial strength');
});

test('thicker posts resist bending and a heavier head increases it',()=>{
 const thin=column(),thick=column({width:5}),heavy=column({bodyHeight:24});
 const load=w=>w.sections(ids(w),.7)[0].utilization;
 assert(load(thin)>load(thick)*1.5);assert(load(heavy)>load(thin));
});

test('free fall alone never invokes supported column fracture',()=>{
 const w=column({length:80}),p=w.releaseBody(ids(w));w.syncStatic();Body.setAngle(p.body,.7);
 assert(!w.isSupported(p));for(let n=0;n<30;n++)w.checkStructure(.1);
 assert.equal(w.snapCount,0);assert(w.bodies.includes(p));
});

test('a dangling post does not share load with the post that reaches a support',()=>{
 const w=new ArchWorld(ARCH_SITES[0],freshProfile()),all=ids(w),q=ARCH_SITES[0].preview[0];
 const group=w.originalGroup[Math.floor(q.y)*w.width+Math.floor(q.x)],house=all.filter(id=>w.originalGroup[id]===group);
 const roots=house.filter(id=>Math.floor(id/w.width)===w.floorY-1),right=roots.filter(id=>id%w.width>20);
 const both=w.sections(house,0,Infinity,roots)[0],one=w.sections(house,0,Infinity,right)[0];
 assert(one.width<both.width);assert(one.utilization>both.utilization);
});

test('a head resting directly on a support does not load its dangling legs',()=>{
 const w=column(),all=ids(w),head=all.find(id=>w.roles[id]===2);
 assert.equal(w.sections(all,Math.PI/2,Infinity,[head]).length,0);
});
