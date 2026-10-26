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
test('all Arch maps remain pristine at spawn and conserve material after a support blast',()=>{
 const profile=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
 for(const s of all){const w=new StructuralFreeWorld(s,profile);w.unlimited=true;
  for(let i=0;i<90;i++)w.step(1/60);
  assert.equal(w.snapCount,0,s.id);assert.equal(w.targetReleased,0,s.id);
  assert(w.activate(s.preview[0].x,s.preview[0].y));
  for(let i=0;i<240;i++){w.step(1/60);w.events=[];}
  assert(w.targetReleased>0,s.id);assert(w.diagnostics().balanced&&w.diagnostics().finite,s.id);
 }
});
