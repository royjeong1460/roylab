import test from 'node:test';
import assert from 'node:assert/strict';
import {findIdeaMap} from '../src/ideas-lab/maps.js';
import {ActiveIdeaWorld} from '../src/ideas-lab/active/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import {validateSite} from '../src/map-maker-generator.js';
const keys=['layout-stacked','layout-bridged'];
const advance=(w,n)=>{for(let i=0;i<n;i++){w.step(1/60);w.events=[];}};
function make(key){
 const map=findIdeaMap(key);assert(map,`${key} is selectable`);assert.equal(map.looseBodies,true);
 const {site}=extendWorksite(map.site);
 const profile=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
 return new ActiveIdeaWorld(site,profile,{blast:'normal',looseBodies:map.looseBodies});
}
test('contact maps start with independently simulated upper bodies and settle without crumbling',()=>{
 for(const key of keys){
  const w=make(key);assert(w.bodies.length>=4,key);assert(w.bodies.length<18,key);
  for(const p of w.bodies)assert.equal(w.groups(p.pixels).length,1,'no welded disconnected bodies');
  let bodyContact=false;
  Events.on(w.engine,'collisionStart collisionActive',({pairs})=>{
   bodyContact ||= pairs.some(pair=>!pair.bodyA.isStatic&&!pair.bodyB.isStatic);
  });
  advance(w,240);
  assert(w.bodies.length>=4,key+' retains bodies');
  assert(bodyContact,key+' bodies physically contact each other');
  assert(w.bodies.every(p=>Math.hypot(p.body.velocity.x,p.body.velocity.y)<.1),key+' settles at rest');
  const l=w.ledger();assert(l.sand+l.pending+l.collected<w.initial*.05,key+' starts intact');
  assert(w.diagnostics().balanced&&w.diagnostics().finite,key);
 }
});
test('removing a lower support moves the bodies resting above it',()=>{
 for(const key of keys){
  const w=make(key);advance(w,240);
  const tracked=w.bodies.map(p=>({ids:new Set(p.pixels.map(v=>v.id)),x:p.body.position.x,y:p.body.position.y}));
  const base=w.groups(Array.from(w.cells.keys()).filter(id=>w.cells[id]).map(id=>({id}))).sort((a,b)=>Math.min(...a.map(p=>p.id%w.width))-Math.min(...b.map(p=>p.id%w.width)))[0];
  assert(base);for(const p of base)w.makeSand(p.id);w.detach();advance(w,360);
  assert(tracked.some(t=>w.bodies.some(p=>p.pixels.some(v=>t.ids.has(v.id))&&Math.hypot(p.body.position.x-t.x,p.body.position.y-t.y)>5)),key+' support loss causes movement');
  assert(w.diagnostics().balanced&&w.diagnostics().finite,key);
 }
});
test('each active device works on both contact maps without losing material',()=>{
 for(const key of keys)for(const device of ['orbital','seismic','gravity','sonic']){
  const w=make(key);advance(w,240);assert(w.activateDevice(device,2));advance(w,480);
  assert.equal(w.activeDevice,null,key+'/'+device);
  assert(w.diagnostics().balanced&&w.diagnostics().finite,key+'/'+device);
 }
});
test('floating assembly validation is opt-in and does not relax existing map rules',()=>{
 for(const key of keys){
  const {site}=findIdeaMap(key);
  assert.throws(()=>validateSite(site),/floating component/);
  assert.deepEqual(validateSite(site,{allowFloating:true}),site);
  const invalid=structuredClone(site);invalid.data.shapes[0].rect[0]=-1;
  assert.throws(()=>validateSite(invalid,{allowFloating:true}));
 }
});
