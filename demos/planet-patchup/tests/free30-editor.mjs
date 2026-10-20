import test from 'node:test';
import assert from 'node:assert/strict';
import {MapDraft,saveDraft,loadDraft,parseDraft,DRAFT_PREFIX} from '../src/free30/editor/model.js';
import {FREE_STAGES} from '../src/free30/stages.js';
test('all seven templates round trip with unchanged pixels and no mutation',()=>{
 for(const site of FREE_STAGES){const before=JSON.stringify(site),draft=new MapDraft(site),copy=new MapDraft(draft.export());assert.deepEqual(copy.cells,draft.cells);assert.equal(JSON.stringify(site),before);}
});
test('drawing, erasing and undo operate on individual grid cells',()=>{
 const d=new MapDraft(FREE_STAGES[0]);d.cells.fill(0);d.checkpoint();d.line({x:3,y:4},{x:6,y:4},2);assert.equal(d.cells.filter(Boolean).length,4);d.rectangle({x:3,y:5},{x:4,y:6},3);assert.equal(d.cells.filter(Boolean).length,8);d.point(3,4,0);assert.equal(d.cells.filter(Boolean).length,7);d.point(-1,0,1);assert(d.undo());assert.equal(d.cells.filter(Boolean).length,0);
});
test('draft storage is isolated; malformed or floating imports never replace valid data',()=>{
 const m=new Map([['pixel-demolition-free30-v1-a','real-progress']]),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},site=FREE_STAGES[0],d=new MapDraft(site);
 saveDraft(storage,site.id,d);assert.deepEqual(new MapDraft(loadDraft(storage,site.id)).cells,d.cells);assert.equal(m.get('pixel-demolition-free30-v1-a'),'real-progress');
 const before=m.get(DRAFT_PREFIX+site.id);d.cells.fill(0);d.point(5,5,1);assert.throws(()=>saveDraft(storage,site.id,d),/floating/);assert.equal(m.get(DRAFT_PREFIX+site.id),before);
 assert.throws(()=>parseDraft('{broken',site.id));assert.throws(()=>parseDraft('x'.repeat(2000001),site.id));
 const bad=structuredClone(site);bad.data.shapes[0].rect[2]=99999;assert.throws(()=>parseDraft(JSON.stringify(bad),site.id));
});
test('diagonal lines stay connected to the floor under four-neighbor physics',()=>{
 const d=new MapDraft(FREE_STAGES[0]);d.cells.fill(0);d.line({x:10,y:d.height-1},{x:25,y:d.height-16},1);assert.doesNotThrow(()=>d.export());
});
