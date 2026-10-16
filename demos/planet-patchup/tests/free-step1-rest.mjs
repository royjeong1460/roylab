import assert from 'node:assert/strict';
import {test} from 'node:test';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {Step1Journey,Step1Run} from '../src/free-step1/journey.js';
const profile=()=>new Step1Journey({getItem:()=>null,setItem(){}},null).profile;
const world=data=>new Step1Run({id:'fixture',data},profile()).world;
function tick(w,n){for(let i=0;i<n;i++)w.step(1/60);assert.equal(Object.values(w.ledger()).reduce((a,b)=>a+b,0),w.initial);}
function column(tilt=0){
 const w=world({width:96,height:144,floorY:132,shapes:[{rect:[40,72,6,60],color:1}]});
 w.breakContact(43,124.5,q=>Math.floor(q.y)===124);
 Body.setAngle(w.bodies[0].body,tilt);return w;
}
for(const tilt of [-.01,0,.01])test(`a straight-cut column settles without long-term sideways drift (${tilt})`,()=>{
 const w=column(tilt);tick(w,180);const p=w.bodies[0];assert(p.body.isSleeping,'supported low motion should settle');
 const pose={...p.body.position,angle:p.body.angle};tick(w,1200);
 assert(w.bodies.includes(p));assert.equal(p.body.position.x,pose.x);assert.equal(p.body.position.y,pose.y);assert.equal(p.body.angle,pose.angle);
});
test('removing a settled column support wakes it and gravity resumes',()=>{
 const w=column();tick(w,180);const p=w.bodies[0];assert(p.body.isSleeping);
 const y=p.body.position.y;w.breakContact(43,125,q=>q.y>=125&&q.y<132);tick(w,8);
 assert(!p.body.isSleeping);assert(p.body.position.y>y+.1);
});
test('slow free fall cannot sleep just because velocity is small',()=>{
 const w=world({width:96,height:144,floorY:132,shapes:[{rect:[40,20,6,30],color:1}]});w.detach();
 w.engine.gravity.scale=.0000005;const p=w.bodies[0],y=p.body.position.y;tick(w,180);
 assert(!p.body.isSleeping);assert(p.body.position.y>y+1);
});
for(const mirror of [false,true])test(`wall-only contact still falls (${mirror})`,()=>{
 const data={width:96,height:144,floorY:132,shapes:[{rect:[40,40,4,48],color:1},{rect:[44,84,22,4],color:2},{rect:[62,74,4,10],color:2},{rect:[44,56,9,4],color:2}]};
 if(mirror)for(const s of data.shapes)s.rect[0]=data.width-s.rect[0]-s.rect[2];
 const w=world(data);w.detach();const p=w.bodies[0];Body.setAngle(p.body,mirror?-.4:.4);
 Body.translate(p.body,{x:mirror?w.width-p.body.bounds.max.x+.1:-p.body.bounds.min.x-.1,y:45-p.body.bounds.min.y});
 tick(w,1200);assert(w.history.some(e=>e.source==='collision'&&e.y>=w.floorY-2));
 assert(!w.bodies.some(p=>p.body.isSleeping&&p.body.bounds.max.y<w.floorY-20));
});
test('eccentric supported structures keep tipping and release their hinge',()=>{
 const w=world({width:96,height:144,floorY:132,shapes:[{rect:[16,72,6,60],color:1},{rect:[22,78,10,6],color:2},{rect:[32,70,42,30],color:3}]});
 w.breakContact(18,124,q=>Math.floor(q.y)===124&&q.x<21);const p=w.bodies.find(p=>p.hinge);assert(p);
 tick(w,60);assert(!p.body.isSleeping);assert(Math.abs(p.body.angle)>.05);
 tick(w,1140);assert(!w.bodies.some(p=>p.hinge));assert(w.history.some(e=>e.source==='collision'));
});
for(const tool of ['bomb','blackhole'])test(`${tool} can move settled pieces again`,()=>{
 const w=column();tick(w,180);const p=w.bodies[0];assert(p.body.isSleeping);
 const start={...p.body.position};
 if(tool==='bomb')w.blast({x:52,y:103,radius:3,power:1});
 else w.pull({x:60,y:95,radius:44,power:.2},1/60);
 assert(!p.body.isSleeping);tick(w,8);
 assert(!w.bodies.includes(p)||Math.hypot(p.body.position.x-start.x,p.body.position.y-start.y)>.02);
});
test('stacked chunks rest on grounded chunks and wake when their base moves',()=>{
 const w=world({width:96,height:144,floorY:132,shapes:[{rect:[30,122,30,10],color:1},{rect:[35,110,16,10],color:2}]});
 const ids=[];for(let id=0;id<w.cells.length;id++)if(w.cells[id]&&Math.floor(id/w.width)>=122)ids.push(id);
 w.releaseBody(ids);w.detach();tick(w,180);
 const bottom=w.bodies.find(p=>p.pixels.some(q=>q.color===1)),top=w.bodies.find(p=>p.pixels.some(q=>q.color===2));
 assert(bottom&&top);assert(bottom.body.isSleeping);assert(top.body.isSleeping);
 w.impulse(bottom,bottom.body.position,{x:bottom.body.mass*.5,y:0});tick(w,2);
 assert(!top.body.isSleeping,'a moving support cannot keep the upper chunk frozen');
});
test('a slow overhanging column cannot settle on a single edge',()=>{
 const w=column();tick(w,30);const p=w.bodies[0];
 Body.translate(p.body,{x:4,y:0});Body.setVelocity(p.body,{x:0,y:0});Body.setAngularVelocity(p.body,0);
 tick(w,60);assert(!p.body.isSleeping);assert(Math.abs(p.body.angle)>.01);
});
