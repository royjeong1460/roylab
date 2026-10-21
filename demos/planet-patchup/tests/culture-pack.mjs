import test from 'node:test';
import assert from 'node:assert/strict';
import {CULTURE_MAPS,findCultureMap} from '../src/free30/culture/maps.js';
import {TILE_YARD} from '../src/free30/culture/tile-yard.js';
import {validateSite,pixelCount} from '../src/map-maker-generator.js';
import {MapDraft} from '../src/free30/editor/model.js';
import {FreeJourney,FreeRun} from '../src/free30/journey.js';
import {FREE_STAGES} from '../src/free30/stages.js';

test('six culture stages and boss are grounded, distinct, editable and isolated',()=>{
 assert.equal(CULTURE_MAPS.length,7);assert.equal(new Set(CULTURE_MAPS.map(m=>m.site.id)).size,7);
 let previous=0;
 for(const map of CULTURE_MAPS){
  assert.deepEqual(validateSite(map.site),map.site);assert(!FREE_STAGES.some(s=>s.id===map.site.id));
  const d=new MapDraft(map.site);assert.deepEqual(MapDraft.open(d.serialize()).cells,d.cells);
  const count=pixelCount(map.site.data);assert(count>previous,`${map.key}: increasing budget`);previous=count;
  assert.equal(findCultureMap(map.key),map);assert(map.site.data.shapes.length<=240);
 }
 assert.equal(findCultureMap('tile-yard').site,TILE_YARD);assert.equal(pixelCount(TILE_YARD.data),7859);
 assert.equal(findCultureMap('bad-key'),undefined);
});
test('opening blast causes collapse beyond the directly erased pixels; both tools conserve pixels',()=>{
 for(const map of CULTURE_MAPS)for(const tool of ['bomb','blackhole']){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];
  const r=new FreeRun(map.site,p,'stage'),w=r.world;w.unlimited=true;r.selectTool(tool);
  const target=map.site.preview[0];assert(r.press(target));r.release();
  let displaced=0;
  for(let i=0;i<300;i++){
   r.update(1/30,{...target,working:false});w.events=[];
   displaced=Math.max(displaced,w.initial-w.cells.reduce((sum,c)=>sum+(c?1:0),0));
  }
  const d=w.diagnostics();assert(d.finite,`${map.key} ${tool} finite`);assert(d.balanced,`${map.key} ${tool} conservation`);
  if(tool==='bomb')assert(displaced>80,`${map.key}: opening blast should detach a visible load, got ${displaced}`);
 }
});
