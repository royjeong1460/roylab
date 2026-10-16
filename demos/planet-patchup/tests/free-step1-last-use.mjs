import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Step1Journey,Step1Run} from '../src/free-step1/journey.js';
const site={id:'fixture',data:{width:80,height:90,floorY:85,shapes:[{rect:[20,20,40,65],color:1}]}};
function run(){const p=new Step1Journey({getItem:()=>null,setItem(){}},null).profile;p.owned.push('bomb','blackhole');p.upgrades.cutter=8;return new Step1Run(site,p);}
for(const tool of ['cutter','bomb','blackhole'])test(`${tool} uses the remaining battery once at full strength`,()=>{
 const r=run(),w=r.world;r.selectTool(tool);w.charge=.5;
 r.update(1/30,{working:false,x:1,y:1});assert.equal(r.phase,'working','positive remainder must not end the outing early');
 assert(r.press({x:40.5,y:40.5}));r.release();assert.equal(w.charge,0);assert.equal(r.phase,'finishing');
 if(tool==='cutter')assert.equal(w.flying.length,9,'the entire upgraded cut is applied');
 if(tool==='bomb'){assert.equal(w.bombs.length,1);assert.equal(w.bombs[0].radius,w.stats().bombRadius);assert.equal(w.bombs[0].power,w.stats().bombPower);}
 if(tool==='blackhole'){assert.equal(w.wells.length,1);assert.equal(w.wells[0].power,w.stats().gravityPower);assert.equal(w.wells[0].remaining,3);}
 assert.equal(r.press({x:45,y:45}),false);assert.equal(w.activate(45,45),false,'zero battery cannot cast again');
 for(let n=0;n<100;n++)r.update(1/30,{working:true,x:1,y:1});
 assert.equal(w.charge,0);assert.equal(w.bombs.length,0);assert.equal(w.wells.length,0);assert(!r.finishReady,'cleanup is not skipped');
 if(tool==='bomb')assert(w.history.some(e=>e.kind==='tool-blast'&&e.phase==='blast'),'last fuse still detonates during cleanup');
 for(let n=0;n<220&&!r.finishReady;n++)r.update(1/30,{working:false,x:1,y:1});assert(r.finishReady);
});
test('empty cutting preserves the last remainder, and a held cut then uses it once',()=>{
 const r=run(),w=r.world;w.charge=.5;
 assert.equal(r.press({x:2,y:2}),false);r.release();assert.equal(w.charge,.5);assert.equal(r.phase,'working');
 r.update(.1,{working:true,x:40.5,y:40.5});assert.equal(w.charge,0);assert.equal(r.phase,'finishing');
 assert.equal(w.history.filter(e=>e.kind==='cut').length,1);
});
test('an active black hole cannot spend the remainder on a second well',()=>{
 const r=run(),w=r.world;r.selectTool('blackhole');assert(r.press({x:40,y:40}));r.release();w.charge=1;
 assert.equal(r.press({x:45,y:40}),false);r.release();assert.equal(w.charge,1);assert.equal(w.wells.length,1);
 for(let n=0;n<100;n++)r.update(1/30,{working:false,x:1,y:1});assert(r.press({x:45,y:40}));assert.equal(w.charge,0);
});
