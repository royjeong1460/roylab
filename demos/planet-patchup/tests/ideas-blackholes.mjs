import test from 'node:test';import assert from 'node:assert/strict';
import {IdeaWorld} from '../src/ideas-lab/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {applySettings} from '../src/paid-lab/settings.js';
import {loadIdeaTuning,normalizeOptions} from '../src/ideas-lab/options.js';
import {CULTURE_MAPS} from '../src/paid-lab/culture/maps.js';
import {wellFrame} from '../src/ideas-lab/blackholes.js';
const make=(well,level=1,shapes=[{rect:[35,60,8,8],color:1},{rect:[57,60,8,8],color:2}])=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];const w=new IdeaWorld({data:{width:100,height:160,floorY:145,shapes}},p,{well,level});applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);w.detach();w.setTool('blackhole');return w;};
const step=(w,n)=>{for(let i=0;i<n;i++){w.step(1/60);w.events=[];}};
test('new modes normalize and retired spin falls back safely',()=>{for(const well of ['pulse','twin','travel','hold'])assert.equal(normalizeOptions({well}).well,well);assert.equal(normalizeOptions({blast:'spin'}).blast,'aftershock');});
test('pulse has true rest windows and stronger final compression',()=>{const w=make('pulse');w.activate(50,64);const well=w.wells[0];well.remaining=well.duration*.95;const first=wellFrame(w,well);well.remaining=well.duration*.73;const rest=wellFrame(w,well);well.remaining=well.duration*.05;const final=wellFrame(w,well);assert(first.power>0);assert.equal(rest.power,0);assert(final.power>first.power);});
test('twin cores pull pieces in opposite directions then converge',()=>{const w=make('twin');w.activate(50,64);const well=w.wells[0];well.remaining=well.duration*.5;const f=wellFrame(w,well);assert(f.cores[0].x<39&&f.cores[1].x>61);w.pull(well,1/60);assert(w.bodies[0].body.velocity.x<0);assert(w.bodies[1].body.velocity.x>0);well.remaining=well.duration*.001;assert(wellFrame(w,well).cores[1].x-wellFrame(w,well).cores[0].x<1);});
test('travelling well moves visibly within map bounds, including edges',()=>{for(const x of [2,50,98]){const w=make('travel',3);w.activate(x,64);const well=w.wells[0];step(w,65);assert(Math.abs(well.x-x)>5);assert(well.x>=1&&well.x<=w.width-1);}});
test('hold keeps detached pieces airborne, allows bombs and releases to normal gravity',()=>{const w=make('hold',2);w.activate(50,64);const p=w.bodies[0],start=p.body.position.y;step(w,90);assert(w.wells[0].held.size>0);assert(Math.abs(p.body.position.y-start)<8);w.setTool('bomb');assert(w.canUseTool());step(w,40);assert.equal(w.wells.length,0);const y=p.body.position.y;step(w,45);assert(p.body.position.y>y+5);assert.equal(w.ideaCounts.hold,1);});
test('all modes and strengths expire without losing pixels or repeating release events',()=>{for(const mode of ['pulse','twin','travel','hold'])for(const level of [1,2,3]){const w=make(mode,level);assert(w.activate(50,64));step(w,240);const d=w.diagnostics();assert(d.finite,`${mode}/${level}`);assert(d.balanced,`${mode}/${level}`);assert.equal(w.wells.length,0);assert.equal(w.ideaCounts[mode],1);step(w,60);assert.equal(w.ideaCounts[mode],1);}});
test('hold does not damage supported buildings or turn bodies static',()=>{
 const w=make('hold',1,[{rect:[35,60,8,85],color:1}]);const before=w.cells.slice();assert(before.some(c=>c));w.activate(50,64);step(w,30);assert.deepEqual(w.cells,before);assert(w.bodies.every(p=>!p.body.isStatic));
});
test('pulse rest does not pull material or strain supports',()=>{
 const w=make('pulse');w.activate(50,64);const well=w.wells[0];well.remaining=well.duration*.73;const before=w.bodies.map(p=>({...p.body.velocity}));const cells=w.cells.slice();w.pull(well,1/60);w.strainSupported(well,2);assert.deepEqual(w.bodies.map(p=>({...p.body.velocity})),before);assert.deepEqual(w.cells,cells);
});
test('new modes conserve material on all seven culture maps',()=>{
 for(const map of CULTURE_MAPS)for(const mode of ['pulse','twin','travel','hold']){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];const w=new IdeaWorld(map.site,p,{well:mode,level:3});applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);
  const q=map.site.preview[0];w.activate(q.x,q.y);step(w,45);w.setTool('blackhole');assert(w.activate(q.x,q.y));step(w,180);
  const d=w.diagnostics();assert(d.balanced,`${map.key}/${mode}`);assert(d.finite,`${map.key}/${mode}`);
 }
});
test('twin force follows visible core circles rather than original center radius',()=>{
 const w=make('twin',1,[{rect:[82,60,4,8],color:1},{rect:[48,88,4,4],color:2}]);w.activate(50,64);const well=w.wells[0];well.remaining=well.duration*.5;
 const outsideOriginal=w.bodies.find(p=>p.body.position.x>80),outsideCores=w.bodies.find(p=>p.body.position.y>85);assert(outsideOriginal&&outsideCores);
 w.pull(well,1/60);assert(outsideOriginal.body.velocity.x<0);assert.equal(outsideCores.body.velocity.x,0);assert.equal(outsideCores.body.velocity.y,0);
});
