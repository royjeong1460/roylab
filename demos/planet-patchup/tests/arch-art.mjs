import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchSurface} from '../src/arch/art.js';
import {restorationTier,environmentDebris,drawArchEnvironment} from '../src/arch/art-background.js';

test('destructible surface is the original masonry palette, with no scrap image atlas',()=>{
 const cells=Uint8Array.from({length:150},(_,i)=>i%5+1),before=cells.slice(),art=createArchSurface(15,cells);
 assert.deepEqual(cells,before);assert.equal(art.paint,undefined);assert.equal(art.resolution,undefined);
 assert.deepEqual([...art.pixels.slice(0,5)],[0x9c7059,0x345a70,0xc9af88,0x99523d,0x8e8b7d]);
 const colors=art.pixels.slice();cells.fill(0);
 for(let i=0;i<cells.length;i++)assert.equal(art.color(i,before[i]),colors[i]);
});
test('completed recovery selects only dirty, 70%, or full restoration',()=>{
 for(const ratio of [NaN,undefined,-1,0,.699999])assert.equal(restorationTier(ratio),0);
 for(const ratio of [.7,.71,.85,.999999])assert.equal(restorationTier(ratio),.7);
 for(const ratio of [1,1.01])assert.equal(restorationTier(ratio),1);
 assert.equal(environmentDebris(0).length,10);assert.equal(environmentDebris(.7).length,3);assert.equal(environmentDebris(1).length,0);
});
function drawn(ratio){
 const sprites=[],ctx=new Proxy({drawImage(im){sprites.push(im.name);}}, {get:(target,key)=>target[key]||(()=>{}),set:(target,key,value)=>(target[key]=value,true)});
 const images=new Proxy({}, {get:(_,name)=>({name,width:176,height:110})});
 const result=drawArchEnvironment(ctx,images,{width:576,height:576,floor:528,restoration:ratio});return {sprites,result};
}
test('dirty scenery contains all six waste types and no revealed culture buildings',()=>{
 const {sprites,result}=drawn(0);
 assert.equal(result.debrisCount,10);assert.equal(sprites.filter(s=>/^0\d-/.test(s)).length,10);
 assert.equal(new Set(sprites.filter(s=>/^0\d-/.test(s))).size,6);
 assert(!sprites.some(s=>s.startsWith('arch-building')));
});
test('70% reveals culture with three waste piles; 100% has zero waste sprites',()=>{
 for(const [ratio,count] of [[.7,3],[.85,3],[1,0]]){
  const {sprites}=drawn(ratio);
  assert(sprites.some(s=>s.startsWith('arch-building')));
  assert.equal(sprites.filter(s=>/^0\d-|shared-scrap/.test(s)).length,count);
 }
});

import {ArchJourney} from '../src/arch/journey.js';
import {ARCH_SITES} from '../src/arch/maps.js';
test('settled results and reloaded site records select the same restoration tier',async()=>{
 for(const [pixels,tier] of [[1399,0],[1400,.7],[1700,.7],[2000,1]]){
  const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},lock={request:async(_,f)=>f()};
  const journey=new ArchJourney(storage,lock),{run}=await journey.start('stage',ARCH_SITES[0].id);
  run.world.breakContact(0,0,()=>true,pixels);
  const result=await journey.finish();assert(result.ok);assert.equal(result.recovered,pixels);
  assert.equal(restorationTier(result.ratio),tier);
  const loaded=new ArchJourney(storage,lock),{run:again}=await loaded.start('stage',ARCH_SITES[0].id),r=again.profile.stageRecords[again.site.id];
  const atEntry=restorationTier(r.recovered/r.total);
  assert.equal(atEntry,tier);again.world.breakContact(0,0,()=>true,Infinity);again.world.secureLoose();
  assert.equal(restorationTier(r.recovered/r.total),atEntry,'live collection cannot change entry snapshot');
 }
});
