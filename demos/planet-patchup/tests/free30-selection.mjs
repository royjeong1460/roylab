import test from 'node:test';
import assert from 'node:assert/strict';
import {selectConnected,selectArea,transformSelection} from '../src/free30/editor/selection.js';
const fixture=()=>{const cells=new Uint8Array(100);for(const i of [11,12,21,22,31,32])cells[i]=2;cells[18]=3;return cells;};
test('select structure without selecting disconnected neighbor; area can isolate a part',()=>{const c=fixture(),s=selectConnected(c,10,10,1,1);assert.equal(s.indices.length,6);assert.deepEqual([s.x,s.y,s.width,s.height],[1,1,2,3]);assert.equal(selectConnected(c,10,10,0,0),null);assert.equal(selectArea(c,10,10,{x:1,y:1},{x:2,y:1}).indices.length,2);});
test('move preserves colors, holes and other structures; original remains intact until commit',()=>{const c=fixture(),s=selectConnected(c,10,10,1,1),r=transformSelection(c,10,10,s,{x:4,y:4,width:2,height:3});assert(r.ok);assert.equal(r.cells[11],0);assert.equal(r.cells[44],2);assert.equal(r.cells[18],3);assert.equal(c[11],2);assert.equal(r.cells.filter(Boolean).length,7);});
test('resize uses pixel colors and rejects collisions, clipped placement and invalid dimensions',()=>{const c=fixture(),s=selectConnected(c,10,10,1,1);const r=transformSelection(c,10,10,s,{x:1,y:1,width:4,height:6});assert(r.ok);assert.equal(r.cells.filter(Boolean).length,25);for(const bounds of [{x:8,y:1,width:2,height:3},{x:9,y:9,width:2,height:3},{x:1,y:1,width:0,height:3},{x:1,y:1,width:NaN,height:3}])assert.equal(transformSelection(c,10,10,s,bounds).ok,false);});

test('redrawing the same selection does not overwrite typed resize dimensions',async()=>{
 const {SelectionView}=await import('../src/free30/editor/selection-view.js');
 const previous=globalThis.document,elements=new Map();
 globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false});return elements.get(id);}};
 try{
  const view=new SelectionView({getDraft:()=>null,render:()=>{},edited:()=>{},status:()=>{}}),ctx={setLineDash(){},strokeRect(){},fillRect(){}};
  view.selected={x:1,y:2,width:10,height:20};view.draw(ctx,4);
  elements.get('selection-width').value='14';view.draw(ctx,4);
  assert.equal(elements.get('selection-width').value,'14');
  view.selected={x:1,y:2,width:14,height:20};view.draw(ctx,4);assert.equal(Number(elements.get('selection-width').value),14);
 }finally{globalThis.document=previous;}
});
