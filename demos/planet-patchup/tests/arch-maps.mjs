import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCH_SITES,ARCH_BOSS,ARCH_TUTORIAL,ARCH_MAP_VERSION} from '../src/arch/maps.js';
import {createArchSurface} from '../src/arch/art.js';
import {pixelCount,validateSite,packMapCells} from '../src/map-maker-generator.js';
import {compileStructure} from '../src/structure/model.js';
import {StructuralFreeWorld} from '../src/structure/free-world.js';
import {FreeJourney} from '../src/free30/journey.js';
const all=[...ARCH_SITES,ARCH_BOSS,ARCH_TUTORIAL];
test('Arch catalog has exact campaign targets and distinct identities',()=>{
 assert.deepEqual(ARCH_SITES.map(s=>pixelCount(s.data)),[2000,2400,2800,3200,3600,4000]);
 assert.equal(pixelCount(ARCH_BOSS.data),6000);assert.equal(new Set(all.map(s=>s.id)).size,8);assert(ARCH_MAP_VERSION);
});
test('deterministic grid packing, complete roles, bounded dimensions and grounded components',async()=>{
 const again=await import('../src/arch/maps.js?determinism');assert.deepEqual(again.ARCH_SITES,ARCH_SITES);
 for(const s of all){assert.deepEqual(validateSite(s),s);const m=compileStructure(s.data,s.structure);
  assert.deepEqual(packMapCells(m.cells,s.data.width,s.data.floorY),s.data.shapes);
  for(let i=0;i<m.cells.length;i++)assert.equal(Boolean(m.roles[i]),Boolean(m.cells[i]),s.id);
  for(const point of s.preview)assert.equal(m.roles[Math.floor(point.y)*s.data.width+Math.floor(point.x)],1,s.id+' exposed target');
  for(const role of ['pillar','body','roof'])assert(m.modules.some(p=>p.type===role),s.id+' '+role);
  const art=createArchSurface(s.data.width,m.cells);assert.deepEqual(art.pixels,createArchSurface(s.data.width,m.cells).pixels);
  for(let i=0;i<m.cells.length;i++)if(m.cells[i]){assert(art.color(i,m.cells[i]));assert.match(art.css(i,m.cells[i]),/^#[\da-f]{6}$/);}
 }
});
test('exposed column attack sequences release heavy dynamic facades while pristine maps stay stable',()=>{
 const profile=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
 for(const s of all){const w=new StructuralFreeWorld(s,profile);w.unlimited=true;
  for(let i=0;i<90;i++)w.step(1/60);
  assert.equal(w.snapCount,0,s.id);assert.equal(w.targetReleased,0,s.id);
  let largestDynamic=0;
  for(const point of s.preview){
   assert(w.activate(point.x,point.y),s.id+' support attack');
   for(let i=0;i<120;i++){
    w.step(1/60);w.events=[];
    largestDynamic=Math.max(largestDynamic,0,...w.bodies.map(body=>body.pixels.length));
    assert(w.diagnostics().balanced&&w.diagnostics().finite,s.id);
   }
  }
  assert(largestDynamic>200,s.id+' heavy facade must become a moving body');
  assert(w.targetReleased>pixelCount(s.data)*.4,s.id+' release must exceed the direct blast cores');
  if([ARCH_SITES[2],ARCH_SITES[4],ARCH_SITES[5],ARCH_BOSS].includes(s))assert(w.snapCount>0,s.id+' loaded structures fracture');
 }
});
