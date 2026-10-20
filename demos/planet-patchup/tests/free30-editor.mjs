import test from 'node:test';
import assert from 'node:assert/strict';
import {MapDraft,saveDraft,loadDraft,parseDraft,DRAFT_PREFIX,LOCAL_PREVIEW_ID} from '../src/free30/editor/model.js';
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
 assert.throws(()=>parseDraft('{broken',site.id));assert.throws(()=>parseDraft('x'.repeat(4000001),site.id));
 const bad=structuredClone(site);bad.data.shapes[0].rect[2]=99999;assert.throws(()=>parseDraft(JSON.stringify(bad),site.id));
});
test('diagonal lines stay connected to the floor under four-neighbor physics',()=>{
 const d=new MapDraft(FREE_STAGES[0]);d.cells.fill(0);d.line({x:10,y:d.height-1},{x:25,y:d.height-16},1);assert.doesNotThrow(()=>d.export());
});

test('local documents preserve blank and unfinished maps; playable export stays strict',()=>{
 const d=MapDraft.create({width:96,height:100,name:'새 철탑'});
 assert.equal(d.cells.filter(Boolean).length,0);
 assert.deepEqual(MapDraft.open(d.serialize()).cells,d.cells);
 d.point(4,4,3);const copy=MapDraft.open(d.serialize());
 assert.equal(copy.site.name,'새 철탑');assert.equal(copy.width,96);assert.equal(copy.height,100);assert.deepEqual(copy.cells,d.cells);
 assert.throws(()=>copy.export(),/floating/);
 const raw=JSON.parse(d.serialize());raw.cells[0]=7;assert.throws(()=>MapDraft.open(JSON.stringify(raw)));
 raw.cells[0]=1;raw.width=999999;assert.throws(()=>MapDraft.open(JSON.stringify(raw)));
 assert.throws(()=>MapDraft.open('x'.repeat(4000001)));
 const invalid=JSON.parse(d.serialize());invalid.version=2;assert.throws(()=>MapDraft.open(JSON.stringify(invalid)));
 invalid.version=1;invalid.cells.pop();assert.throws(()=>MapDraft.open(JSON.stringify(invalid)));
 assert.deepEqual(MapDraft.open(JSON.stringify(FREE_STAGES[0])).cells,new MapDraft(FREE_STAGES[0]).cells);
});
test('local preview keeps custom name and dimensions without changing campaign drafts',()=>{
 const d=MapDraft.create({name:'내 테스트 맵',width:96,height:100});d.rectangle({x:10,y:90},{x:30,y:99},3);
 const m=new Map([['pixel-demolition-free30-v1-a','player'],[DRAFT_PREFIX+FREE_STAGES[0].id,'old-draft']]),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 saveDraft(storage,LOCAL_PREVIEW_ID,d);const site=loadDraft(storage,LOCAL_PREVIEW_ID);
 assert.equal(site.name,'내 테스트 맵');assert.equal(site.data.width,96);assert.deepEqual(new MapDraft(site).cells,d.cells);
 assert.equal(m.get('pixel-demolition-free30-v1-a'),'player');assert.equal(m.get(DRAFT_PREFIX+FREE_STAGES[0].id),'old-draft');
 d.point(50,0,1);assert.throws(()=>saveDraft(storage,LOCAL_PREVIEW_ID,d));assert.deepEqual(loadDraft(storage,LOCAL_PREVIEW_ID),site);
});
test('square brushes use exact widths, clip at edges, and undo one entire stroke',()=>{
 const d=MapDraft.create();d.line({x:10,y:10},{x:10,y:10},2,6);assert.equal(d.cells.filter(Boolean).length,36);
 d.checkpoint();d.line({x:10,y:10},{x:10,y:10},0,3);assert.equal(d.cells.filter(Boolean).length,27);d.undo();assert.equal(d.cells.filter(Boolean).length,36);
 d.cells.fill(0);d.line({x:0,y:0},{x:0,y:0},1,3);assert.equal(d.cells.filter(Boolean).length,4);
});
test('closed shape outlines contain flood fill and same-color fill terminates',()=>{
 for(const shape of ['rect','triangle','ellipse','circle']){
  const d=MapDraft.create();d.shape(shape,{x:10,y:10},{x:30,y:30},2,false,1);
  assert.equal(d.cells[20*d.width+20],0,shape);d.fill({x:20,y:20},4);
  assert.equal(d.cells[20*d.width+20],4);assert.equal(d.cells[0],0,shape);
  const before=d.cells.slice();d.fill({x:20,y:20},4);assert.deepEqual(d.cells,before);
 }
});
test('filled polygons, concave boundaries and degenerate shapes rasterize safely',()=>{
 const d=MapDraft.create();d.polygon([{x:10,y:10},{x:30,y:10},{x:30,y:20},{x:20,y:20},{x:20,y:30},{x:10,y:30}],3,true,1);
 assert.equal(d.cells[15*d.width+15],3);assert.equal(d.cells[25*d.width+25],0);
 d.shape('ellipse',{x:50,y:10},{x:50,y:20},2,false,1);assert.equal(d.cells[15*d.width+50],2);
 d.shape('rect',{x:60,y:20},{x:64,y:24},5,true,1);assert.equal(d.cells[22*d.width+62],5);
 d.cells.fill(0);d.fill({x:0,y:0},1);assert.equal(d.cells.filter(Boolean).length,d.width*d.height);
});

test('large local maps round trip, reject oversized grids, and preview real physics at far coordinates',async()=>{
 const {FreeJourney,FreeRun}=await import('../src/free30/journey.js');
 const {validateSite}=await import('../src/map-maker-generator.js');
 const d=MapDraft.create({width:1024,height:1012,name:'대형 맵'});
 d.rectangle({x:980,y:982},{x:989,y:1011},2);
 const copy=MapDraft.open(d.serialize());assert.equal(copy.width,1024);assert.equal(copy.height,1012);assert.deepEqual(copy.cells,d.cells);
 const site=copy.export();assert.equal(site.data.height,1024);
 assert.throws(()=>validateSite(site),/width/); // Existing generator/import limits remain unchanged.
 assert.throws(()=>MapDraft.create({width:1025,height:1012}));assert.throws(()=>MapDraft.create({width:1024,height:1013}));
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};
 saveDraft(storage,LOCAL_PREVIEW_ID,d);assert.deepEqual(loadDraft(storage,LOCAL_PREVIEW_ID),site);
 const p=new FreeJourney(storage,{request:async(_,f)=>f()}).profile;p.owned.push('blackhole');
 const r=new FreeRun(site,p),w=r.world;w.unlimited=true;
 assert.equal(w.cells.length,1024*1024);assert.equal(w.initial,300);
 assert(r.press({x:984,y:1004}));r.release();for(let i=0;i<30;i++)r.update(1/30,{x:984,y:1004,working:false});
 assert(w.setTool('blackhole'));assert(r.press({x:984,y:992}));r.release();for(let i=0;i<30;i++)r.update(1/30,{x:984,y:992,working:false});
 const diagnostics=w.diagnostics();assert(diagnostics.finite);assert(diagnostics.balanced);
});
