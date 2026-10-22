import test from 'node:test';import assert from 'node:assert/strict';
import {IdeaWorld} from '../src/ideas-lab/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {CULTURE_MAPS} from '../src/paid-lab/culture/maps.js';
const make=(blast='aftershock',well='grind',level=1)=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];const w=new IdeaWorld(CULTURE_MAPS[0].site,p,{blast,well,level});w.unlimited=true;return w;};
const advance=(w,n=240)=>{for(let i=0;i<n;i++)w.step(1/60);};
const point=CULTURE_MAPS[0].site.preview[0];
test('aftershock adds bounded delayed explosions; no recursive children',()=>{const w=make();w.activate(point.x,point.y);advance(w);assert.equal(w.ideaCounts.echo,2);assert.equal(w.ideaPending.length,0);advance(w);assert.equal(w.ideaCounts.echo,2);});
test('all five blast variants run physically with finite conserved pixels at all strengths',()=>{for(const id of ['aftershock','relay','slam','expand','wave'])for(const level of [1,2,3]){const w=make(id,'grind',level);assert(w.activate(point.x,point.y));advance(w,360);const d=w.diagnostics();assert(d.finite,`${id}/${level}`);assert(d.balanced,`${id}/${level}`);assert(w.ideaCounts[id]>0,`${id} executed`);}});
test('blackhole grind, release and lift/drop expire and conserve pixels',()=>{for(const id of ['grind','release','drop']){const w=make('normal',id);w.setTool('blackhole');assert(w.activate(point.x,point.y));advance(w,360);assert.equal(w.wells.length,0);const d=w.diagnostics();assert(d.finite,id);assert(d.balanced,id);if(id!=='grind')assert(w.ideaCounts[id]>0,id);}});
test('fresh world has no effects from previous run and invalid steps do not advance timers',()=>{const w=make();w.activate(point.x,point.y);advance(w,25);const snapshot=JSON.stringify(w.ideaPending);for(const dt of [0,-1,NaN,Infinity])w.step(dt);assert.equal(JSON.stringify(w.ideaPending),snapshot);assert.equal(make().ideaPending.length,0);});
const falling=blast=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];const w=new IdeaWorld({data:{width:80,height:100,floorY:90,shapes:[{rect:[30,20,10,10],color:1}]}},p,{blast});w.detach();return w;};
test('real floor collision consumes relay/wave mark once and delayed effects drain',()=>{
 for(const id of ['relay','wave']){const w=falling(id);w.blast({x:24,y:24,radius:1,power:.1});assert.equal(w.ideaMarks.length,1);advance(w,600);assert.equal(w.ideaCounts[`${id}-hit`],1);assert.equal(w.ideaMarks.length,0);assert.equal(w.ideaPending.length,0);advance(w,300);assert.equal(w.ideaCounts[`${id}-hit`],1);assert(w.diagnostics().balanced);}
});
test('additional impulses lift and slam material, with velocity caps',()=>{
 const w=falling('normal'),p=w.bodies[0];w.kick(35,25,15,'up',1);assert(p.body.velocity.y<0);w.kick(35,25,15,'down',3);assert(p.body.velocity.y>0);assert(w.diagnostics().finite);assert(w.diagnostics().balanced);
});
test('wave cannot trigger from a wall collision above the floor',()=>{
 const w=falling('wave'),p=w.bodies[0];w.ideaClock=1;w.ideaMarks=[{kind:'wave',ids:new Set(p.pixels.map(v=>v.id)),remaining:12,armedAt:0}];
 const wall=w.staticBodies[0]||w.engine.world.bodies.find(b=>b.isStatic);assert(wall);p.body.velocity.x=-1;p.lastImpact=-1;
 w.recordCollisions([{bodyA:p.body,bodyB:wall,collision:{supports:[{x:0,y:30}],normal:{x:1,y:0}}}]);assert.equal(w.ideaPending.length,0);assert(!w.ideaMarks[0].used);
});
test('slam follows launched material above the original blast area at all strengths',()=>{
 for(const level of [1,2,3]){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];
  const w=new IdeaWorld({data:{width:180,height:220,floorY:210,shapes:[{rect:[80,130,10,10],color:1}]}},p,{blast:'slam',level});w.detach();w.blast({x:74,y:134,radius:1,power:.1});
  const action=w.ideaPending.find(a=>a.kind==='slam');w.ideaPending=[];advance(w,48);
  const target=w.bodies.find(b=>b.pixels.some(v=>action.ids.has(v.id)));assert(target);const before=target.body.velocity.y;w.execute(action);assert(target.body.velocity.y>before+.5,`level ${level} receives downward impulse`);assert(w.diagnostics().balanced);
 }
});
