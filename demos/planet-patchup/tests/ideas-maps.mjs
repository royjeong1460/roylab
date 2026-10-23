import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYOUT_MAPS,findIdeaMap,IDEA_MAPS} from '../src/ideas-lab/maps.js';
import {validateSite} from '../src/map-maker-generator.js';
import {MapDraft} from '../src/free30/editor/model.js';
import {FreeJourney} from '../src/free30/journey.js';
import {IdeaWorld} from '../src/ideas-lab/world.js';
import {CULTURE_MAPS,ORIGINAL_YARD} from '../src/paid-lab/culture/maps.js';

test('three distinct layout maps are grounded, editable and comparable in pixel budget',()=>{
 assert.equal(LAYOUT_MAPS.length,3);
 const [wide,tall,open]=LAYOUT_MAPS.map(m=>m.site.data);
 assert(wide.width/wide.height>=2);assert(tall.height/tall.width>=2);
 assert(open.width>=224&&open.height>=224);
 const counts=LAYOUT_MAPS.map(m=>m.pixels);assert(Math.max(...counts)/Math.min(...counts)<1.25,counts.join('/'));
 for(const m of LAYOUT_MAPS){
  assert.deepEqual(validateSite(m.site),m.site);
  const d=new MapDraft(m.site);assert.deepEqual(MapDraft.open(d.serialize()).cells,d.cells);
  assert.equal(findIdeaMap(m.key),m);
 }
 assert.equal(IDEA_MAPS.length,11);
 for(const m of [...CULTURE_MAPS,ORIGINAL_YARD])assert.equal(findIdeaMap(m.key),m);
 assert.equal(findIdeaMap('missing'),undefined);
});

test('each layout collapses beyond the blast cut and conserves pixels with both tools',()=>{
 for(const map of LAYOUT_MAPS)for(const tool of ['bomb','blackhole']){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];
  const w=new IdeaWorld(map.site,p,{blast:'normal',well:'grind',level:1});w.unlimited=true;w.setTool(tool);
  const point=map.site.preview[0];assert(w.activate(point.x,point.y));
  let displaced=0;
  for(let i=0;i<360;i++){
   w.step(1/30);w.events=[];
   displaced=Math.max(displaced,w.initial-w.cells.reduce((n,c)=>n+Boolean(c),0));
  }
  const d=w.diagnostics();assert(d.finite,`${map.key}/${tool}`);assert(d.balanced,`${map.key}/${tool}`);
  if(tool==='bomb')assert(displaced>100,`${map.key}: only ${displaced} cells displaced`);
 }
});
