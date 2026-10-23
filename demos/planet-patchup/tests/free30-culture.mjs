import test from 'node:test';import assert from 'node:assert/strict';
import {TILE_YARD} from '../src/paid-lab/culture/tile-yard.js';
import {YardKit} from '../src/paid-lab/culture/kit.js';
import {createYardSurface} from '../src/paid-lab/culture/art.js';
import {validateSite,pixelCount} from '../src/map-maker-generator.js';
import {MapDraft} from '../src/free30/editor/model.js';
import {FreeJourney,FreeRun} from '../src/free30/journey.js';
import {FREE_STAGES} from '../src/free30/stages.js';
test('culture map is grounded, editor compatible and separate from campaign maps',()=>{
 assert.deepEqual(validateSite(TILE_YARD),TILE_YARD);assert(!FREE_STAGES.some(s=>s.id===TILE_YARD.id));
 const draft=new MapDraft(TILE_YARD);assert.deepEqual(draft.export(),TILE_YARD);
 const reloaded=MapDraft.open(draft.serialize());assert.deepEqual(reloaded.cells,draft.cells);
 assert.equal(pixelCount(TILE_YARD.data),7859);assert(TILE_YARD.data.shapes.length<240);
});
test('reusable kit rejects out of bounds; surface follows original pixels without changing occupancy',()=>{
 const k=new YardKit(96,100);assert.throws(()=>k.roof(-20,30,40));
 const d=new MapDraft(TILE_YARD),before=d.cells.slice(),s=createYardSurface(d.width,d.cells);
 assert.deepEqual(d.cells,before);
 for(let i=0;i<d.cells.length;i++)if(d.cells[i]){assert(s.pixels[i]);assert.match(s.css(i,d.cells[i]),/^#[0-9a-f]{6}$/);}
});
test('both tools break the art map with finite physics and conserved pixels',()=>{
 for(const tool of ['bomb','blackhole']){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];
  // This dense paid map needs a developed black hole; the starter may only strain a support.
  if(tool==='blackhole')Object.assign(p.upgrades,{gravityForce:3,coreMix:3,wearSpeed:3});
  const r=new FreeRun(TILE_YARD,p,'stage'),w=r.world;w.unlimited=true;r.selectTool(tool);
  const target=TILE_YARD.preview[0];assert(r.press(target));r.release();
  for(let i=0;i<240;i++){r.update(1/30,{...target,working:false});w.events=[];}
  const d=w.diagnostics();assert(d.finite);assert(d.balanced);assert(w.targetReleased>0);
 }
});
