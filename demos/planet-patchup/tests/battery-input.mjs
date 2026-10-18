import assert from 'node:assert/strict';
import { MapViewport } from '../src/map-viewport.js';
import { bindBatteryInput } from '../src/battery-input.js';

let passed=0,failed=0;
const test=(name,run)=>{try{run();passed++;console.log(`PASS: ${name}`);}catch(error){failed++;console.error(`FAIL: ${name}: ${error.message}`);}};
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const viewport=()=>new MapViewport({worldWidth:192,worldHeight:288});
class Surface extends EventTarget {
  captures=new Set();
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);}
  getBoundingClientRect(){return {left:10,top:20,right:394,bottom:596,width:384,height:576};}
}
const harness=(press,touchPressOnRelease=()=>false,extraOptions={})=>{
  const surface=new Surface();
  const canvas={getBoundingClientRect:()=>surface.getBoundingClientRect()};
  const view=viewport(),calls=[];
  let allowed=true;
  const control=bindBatteryInput(surface,canvas,view,{
    ...extraOptions,press,touchPressOnRelease,canStart:()=>allowed,start:p=>calls.push(['start',p]),move:p=>calls.push(['move',p]),end:()=>calls.push(['end']),onViewChange:()=>calls.push(['view']),
  });
  const fire=(type,{x=200,y=300,id=1,pointerType='touch',button=0,buttons=1,target=canvas,...extra}={})=>{
    const e=new Event(type,{cancelable:true});
    Object.defineProperty(e,'target',{value:target});
    Object.assign(e,{clientX:x,clientY:y,pointerId:id,pointerType,button,buttons,...extra});
    surface.dispatchEvent(e);return e;
  };
  return {surface,canvas,view,calls,control,fire,setAllowed:value=>{allowed=value;}};
};

test('initial bottom-left reset, coordinate roundtrip, bounds, fit and centering',()=>{
  const v=viewport();assert.equal(v.zoom,4);assert.equal(v.x,0);assert.equal(v.y,144);
  const p=v.worldToScreen(72,220),q=v.screenToWorld(p.x,p.y);near(q.x,72);near(q.y,220);
  v.pan(1000,-1000);assert.equal(v.x,0);assert.equal(v.y,144);
  v.pan(-1000,1000);assert.equal(v.x,96);assert.equal(v.y,0);
  v.fit();assert.equal(v.zoom,2);assert.deepEqual(v.rect(),{x:0,y:0,width:192,height:288});
  v.reset();assert.equal(v.zoom,4);assert.equal(v.x,0);assert.equal(v.y,144);
  const narrow=new MapViewport({worldWidth:20,worldHeight:288});assert.equal(narrow.x,-38);
  narrow.pan(-100,0);assert.equal(narrow.x,-38);narrow.fit();assert.equal(narrow.x,-86);
});
test('zoom keeps anchor and resize keeps center where bounds permit',()=>{
  const v=viewport();v.pan(-100,100);const before=v.screenToWorld(160,240);
  v.zoomAt(1.5,160,240);const after=v.screenToWorld(160,240);near(before.x,after.x);near(before.y,after.y);
  const center=v.screenToWorld(192,288);v.setSize(300,400);const resized=v.screenToWorld(150,200);
  near(center.x,resized.x);near(center.y,resized.y);v.zoomAt(1e300,150,200);assert.equal(v.zoom,8);
  v.zoomAt(1e-300,150,200);assert.equal(v.zoom,v.minZoom);
});
test('invalid viewport inputs never corrupt valid camera state',()=>{
  for(const bad of [0,-1,NaN,Infinity])assert.throws(()=>new MapViewport({worldWidth:bad,worldHeight:288}));
  const v=viewport(),snapshot=()=>[v.x,v.y,v.zoom,v.viewWidth,v.viewHeight,v.minZoom];const before=snapshot();
  for(const bad of [0,-1,NaN,Infinity]){v.setSize(bad,576);v.zoomAt(bad,50,50);}
  v.pan(Infinity,0);v.zoomAt(2,NaN,0);assert.deepEqual(snapshot(),before);
});
test('single captured input stops outside and resumes with fresh start',()=>{
  const h=harness();h.fire('pointerdown',{pointerType:'mouse'});assert.equal(h.calls[0][0],'start');
  assert(h.surface.captures.has(1));h.fire('pointermove',{x:500,pointerType:'mouse'});assert.equal(h.calls.at(-1)[0],'end');
  const count=h.calls.length;h.fire('pointermove',{x:550,pointerType:'mouse'});assert.equal(h.calls.length,count);
  h.fire('pointermove',{x:210,pointerType:'mouse'});assert.equal(h.calls.at(-1)[0],'start');
  h.fire('pointerup');assert.equal(h.calls.at(-1)[0],'end');assert.equal(h.surface.captures.size,0);
});
test('world padding refuses work and mouse hover outside board does not move aim',()=>{
  const h=harness();h.view.fit();h.view.setSize(500,576);h.fire('pointerdown',{x:11,pointerType:'mouse'});
  assert.equal(h.calls.length,0);h.fire('pointermove',{x:200,pointerType:'mouse'});assert.equal(h.calls.at(-1)[0],'start');
  h.fire('pointerup');h.calls.length=0;h.fire('pointermove',{x:11,pointerType:'mouse',buttons:0});assert.equal(h.calls.length,0);
  h.fire('pointermove',{pointerType:'mouse',buttons:0});assert.equal(h.calls[0][0],'move');
});
test('touch nozzle offset uses CSS pixels, fades to floor/right and maps through zoom',()=>{
  const h=harness();h.fire('pointerdown');const p=h.calls[0][1];near(p.x,(200-10-32)/4);near(p.y,144+(300-20-64)/4);
  h.fire('pointermove',{x:394,y:596});const edge=h.calls.at(-1)[1];near(edge.x,96);near(edge.y,288);
  h.control.release();h.canvas.getBoundingClientRect=()=>({left:10,top:20,right:202,bottom:308,width:192,height:288});
  h.fire('pointerdown',{x:100,y:150});const scaled=h.calls.at(-1)[1];near(scaled.x,(100-10-32)/2);near(scaled.y,144+(150-20-64)/2);
});
test('second touch immediately ends work, centroid pans and pinch zooms without cutting',()=>{
  const h=harness();h.fire('pointerdown',{x:100,y:300});h.fire('pointerdown',{x:250,y:300,id:2});
  assert.equal(h.calls.at(-1)[0],'end');h.calls.length=0;const before=h.view.zoom;
  h.fire('pointermove',{x:280,y:330,id:2});assert(h.view.zoom>before);assert.deepEqual(h.calls.map(c=>c[0]),['view']);
  h.fire('pointerup',{id:2});h.fire('pointermove',{x:150});assert(!h.calls.some(c=>c[0]==='start'||c[0]==='move'));
  h.fire('pointerup');h.fire('pointerdown');assert.equal(h.calls.at(-1)[0],'start');
});
test('third touch and replacement gesture pair stay finite without work',()=>{
  const h=harness();h.fire('pointerdown',{x:100});h.fire('pointerdown',{x:200,id:2});h.fire('pointerdown',{x:300,id:3});h.calls.length=0;
  const z=h.view.zoom;h.fire('pointermove',{x:320,id:3});assert.equal(h.view.zoom,z);
  h.fire('pointerup',{id:1});h.fire('pointermove',{x:340,id:3});assert(Number.isFinite(h.view.zoom));
  assert(!h.calls.some(c=>c[0]==='start'||c[0]==='move'));h.control.release();assert.equal(h.surface.captures.size,0);
});
test('cancel/lost capture/stray up/release/destroy leave no stuck work or gestures',()=>{
  for(const type of ['pointercancel','lostpointercapture']){
    const h=harness();h.fire('pointerdown');h.fire(type);assert.equal(h.calls.at(-1)[0],'end');
    h.fire('pointermove');assert.equal(h.calls.at(-1)[0],'end');h.fire('pointerdown');assert.equal(h.calls.at(-1)[0],'start');h.control.destroy();
  }
  const h=harness();h.fire('pointerdown');h.fire('pointerup',{id:9});assert.equal(h.calls.at(-1)[0],'start');
  h.fire('pointerdown',{id:2});h.control.release();const saved=[h.view.x,h.view.y,h.view.zoom];
  h.fire('pointermove',{x:350,id:2});assert.deepEqual([h.view.x,h.view.y,h.view.zoom],saved);
  h.fire('pointerdown');h.control.destroy();const count=h.calls.length;h.fire('pointerdown');h.control.release();h.control.destroy();assert.equal(h.calls.length,count);
});
test('right and shift-left drags pan with correct button tracking, never cut',()=>{
  for(const [button,buttons,shiftKey] of [[2,2,false],[0,1,true]]){
    const h=harness();const y=h.view.y;h.fire('pointerdown',{pointerType:'mouse',button,buttons,shiftKey});
    h.fire('pointermove',{x:220,y:320,pointerType:'mouse',button:-1,buttons,shiftKey});assert.equal(h.view.y,y-5);
    assert.deepEqual(h.calls.map(c=>c[0]),['view']);h.fire('pointermove',{pointerType:'mouse',buttons:0});
    const saved=h.view.y;h.fire('pointermove',{y:350,pointerType:'mouse',buttons});assert.equal(h.view.y,saved);
  }
});
test('wheel zooms around pointer, clamps extremes, ignores overlays and paused controls',()=>{
  const h=harness();h.view.pan(-100,100);const p=h.view.screenToWorld(190,280);
  const e=h.fire('wheel',{deltaY:-100});assert(e.defaultPrevented);const q=h.view.screenToWorld(190,280);near(p.x,q.x);near(p.y,q.y);
  h.fire('wheel',{deltaY:-1e300});assert.equal(h.view.zoom,8);h.fire('wheel',{deltaY:1e300});assert.equal(h.view.zoom,h.view.minZoom);
  h.setAllowed(false);const state=[h.view.x,h.view.y,h.view.zoom];h.fire('wheel',{deltaY:-100});
  h.fire('pointerdown',{pointerType:'mouse',button:2,buttons:2});h.fire('pointermove',{x:250,pointerType:'mouse',buttons:2});assert.deepEqual([h.view.x,h.view.y,h.view.zoom],state);
  h.setAllowed(true);h.fire('wheel',{deltaY:-100,target:{}});h.fire('pointerdown',{target:{}});assert.deepEqual([h.view.x,h.view.y,h.view.zoom],state);
  assert(h.fire('contextmenu').defaultPrevented);assert(!h.fire('contextmenu',{target:{}}).defaultPrevented);
});
test('pinch centroid translation preserves the shared world anchor',()=>{
  const h=harness();h.view.pan(-100,100);
  h.fire('pointerdown',{x:100,y:300});h.fire('pointerdown',{x:300,y:300,id:2});
  const anchor=h.view.screenToWorld(190,280);
  h.fire('pointermove',{x:80,y:320});h.fire('pointermove',{x:340,y:320,id:2});
  const result=h.view.screenToWorld(200,300);near(result.x,anchor.x);near(result.y,anchor.y);near(h.view.zoom,5.2);
});
test('paused pinch cannot move camera and canceled touch pair waits for all lifts',()=>{
  const h=harness();h.fire('pointerdown');h.fire('pointerdown',{id:2,x:300});h.setAllowed(false);
  const before=[h.view.x,h.view.y,h.view.zoom];h.fire('pointermove',{id:2,x:350});assert.deepEqual([h.view.x,h.view.y,h.view.zoom],before);
  h.fire('pointercancel',{id:2});h.setAllowed(true);h.calls.length=0;h.fire('pointermove');assert.equal(h.calls.length,0);
  h.fire('pointerup');h.fire('pointerdown');assert.equal(h.calls[0][0],'start');
});
test('touch offset clamps only nozzle, while viewport padding and outside finger stay inactive',()=>{
  const h=harness();h.fire('pointerdown',{x:10,y:20});assert.deepEqual(h.calls[0][1],{x:0,y:128});
  h.fire('pointermove',{x:9});assert.equal(h.calls.at(-1)[0],'end');h.fire('pointermove',{x:10});assert.equal(h.calls.at(-1)[0],'start');
});
test('left mouse release ends work even if another button remains held',()=>{
  const h=harness();h.fire('pointerdown',{pointerType:'mouse'});h.fire('pointermove',{pointerType:'mouse',buttons:3});assert.equal(h.calls.at(-1)[0],'move');
  h.fire('pointermove',{pointerType:'mouse',buttons:2});assert.equal(h.calls.at(-1)[0],'end');
});
test('tiny map fit overrides nominal zoom cap and stays centered',()=>{
  const v=new MapViewport({worldWidth:10,worldHeight:10});assert.equal(v.minZoom,38.4);assert.equal(v.maxZoom,38.4);v.fit();assert.equal(v.x,0);near(v.y,-2.5);
});
test('unrepresentable finite size ratios and overflowing anchors are rejected without NaN state',()=>{
  assert.throws(()=>new MapViewport({worldWidth:Number.MIN_VALUE,worldHeight:Number.MIN_VALUE}));
  const v=viewport(),before=[v.x,v.y,v.zoom,v.viewWidth,v.viewHeight,v.minZoom];
  v.setSize(Number.MIN_VALUE,Number.MIN_VALUE);assert.deepEqual([v.x,v.y,v.zoom,v.viewWidth,v.viewHeight,v.minZoom],before);
  const enormous=new MapViewport({worldWidth:1e200,worldHeight:1e200,viewWidth:1,viewHeight:1});
  enormous.fit();const saved=[enormous.x,enormous.y,enormous.zoom];enormous.zoomAt(2,1e300,1e300);assert.deepEqual([enormous.x,enormous.y,enormous.zoom],saved);
});
test('one-shot press fires once on physical down, never hover, hold or captured re-entry',()=>{
  const presses=[],h=harness(point=>presses.push(point));
  h.fire('pointermove',{pointerType:'mouse',buttons:0});assert.equal(presses.length,0);
  h.fire('pointerdown',{pointerType:'mouse'});assert.equal(presses.length,1);
  h.fire('pointermove',{pointerType:'mouse',x:220});
  h.fire('pointermove',{pointerType:'mouse',x:500});h.fire('pointermove',{pointerType:'mouse',x:210});assert.equal(presses.length,1);
  h.fire('pointerup');h.fire('pointerdown',{pointerType:'mouse'});assert.equal(presses.length,2);
});
test('one-shot ignores pan, second touch, disabled input, padding and overlays',()=>{
  const presses=[],h=harness(point=>presses.push(point));
  for(const extra of [{button:2,buttons:2},{shiftKey:true}]){
    h.fire('pointerdown',{pointerType:'mouse',...extra});h.fire('pointerup');
  }
  h.setAllowed(false);h.fire('pointerdown');h.setAllowed(true);h.fire('pointerdown',{target:{}});assert.equal(presses.length,0);
  h.fire('pointerdown');h.fire('pointerdown',{id:2});assert.equal(presses.length,1);h.control.release();
  h.view.fit();h.view.setSize(500,576);h.fire('pointerdown',{x:11,pointerType:'mouse'});h.fire('pointermove',{x:200,pointerType:'mouse'});assert.equal(presses.length,1);
});
test('discrete touch fires once on lift; pinch, drag, cancel and lost capture never spend',()=>{
  const presses=[],h=harness(point=>presses.push(point),()=>true);
  h.fire('pointerdown');assert.equal(presses.length,0);h.fire('pointerup');assert.equal(presses.length,1);
  h.fire('pointerdown');h.fire('pointerdown',{id:2,x:300});h.fire('pointerup',{id:2});h.fire('pointerup');assert.equal(presses.length,1,'camera gesture cannot fire first finger');
  h.fire('pointerdown');h.fire('pointermove',{x:230});h.fire('pointermove',{x:200});h.fire('pointerup');assert.equal(presses.length,1,'drag returning to start is not tap');
  for(const type of ['pointercancel','lostpointercapture']){h.fire('pointerdown');h.fire(type);assert.equal(presses.length,1);}
  h.fire('pointerdown');h.setAllowed(false);h.fire('pointerup');assert.equal(presses.length,1);h.setAllowed(true);
  h.fire('pointerdown');h.fire('pointerup');assert.equal(presses.length,2,'next genuine tap works');
  h.fire('pointerdown',{pointerType:'mouse'});assert.equal(presses.length,3,'mouse remains immediate');
});
test('extended touch can start in the right/bottom apron and stops beyond its limit',()=>{
  const presses=[],h=harness(p=>presses.push(p),()=>false,{touchMargin:{right:32,bottom:64}});
  h.view.fit();
  h.canvas.getBoundingClientRect=()=>({left:10,top:20,right:394,bottom:596,width:384,height:576});
  h.surface.getBoundingClientRect=()=>({left:10,top:20,right:426,bottom:660,width:416,height:640});
  h.fire('pointerdown',{x:426,y:660,target:h.surface});
  assert.equal(presses.length,1);near(presses[0].x,192);near(presses[0].y,288);
  h.fire('pointermove',{x:427,y:660});assert.equal(h.calls.at(-1)[0],'end');
  h.fire('pointermove',{x:426,y:660});assert.equal(h.calls.at(-1)[0],'start');
  h.fire('pointerup');h.fire('pointerdown',{x:410,y:630,target:{}});assert.equal(presses.length,1,'buttons are not a touch apron');
  h.fire('pointerdown',{x:410,y:630,pointerType:'mouse',target:h.surface});assert.equal(presses.length,1,'mouse stays canvas-bound');
});
test('extended touch reaches letterboxed map edge without accepting unlimited padding',()=>{
  const h=harness(null,()=>false,{touchMargin:{right:32,bottom:64}});h.view.fit();h.view.setSize(500,576);h.view.fit();
  const edge=h.view.worldToScreen(192,140),rect=h.canvas.getBoundingClientRect();
  const x=rect.left+edge.x*rect.width/h.view.viewWidth,y=rect.top+edge.y*rect.height/h.view.viewHeight;
  h.fire('pointerdown',{x:x+24,y});assert.equal(h.calls[0]?.[0],'start');near(h.calls[0][1].x,192);
  h.fire('pointermove',{x:x+33,y});assert.equal(h.calls.at(-1)[0],'end');
});
test('extended deferred taps still cancel on pinch and release outside apron',()=>{
 const presses=[],h=harness(p=>presses.push(p),()=>true,{touchMargin:{right:32,bottom:64}});h.view.fit();
 h.fire('pointerdown');h.fire('pointerdown',{id:2,x:250});h.fire('pointerup',{id:2});h.fire('pointerup');assert.equal(presses.length,0);
 h.fire('pointerdown');h.fire('pointerup',{x:500});assert.equal(presses.length,0);
});
test('full-width touch offset fades smoothly at the visible map edge, including letterboxing',()=>{
 const h=harness(null,()=>false,{touchMargin:{right:32,bottom:64}});h.view.fit();h.view.setSize(500,576);h.view.fit();
 const rect=h.canvas.getBoundingClientRect(),edge=h.view.worldToScreen(192,140);
 const right=rect.left+edge.x*rect.width/h.view.viewWidth,y=rect.top+edge.y*rect.height/h.view.viewHeight;
 let previous=-Infinity;
 for(const distance of [80,64,48,32,16,8,0]){
   const x=right-distance;h.fire(distance===80?'pointerdown':'pointermove',{x,y});const q=h.calls.at(-1)[1];
   const shown=h.view.worldToScreen(q.x,q.y).x*rect.width/h.view.viewWidth+rect.left;
   const t=Math.min(1,distance/64);near(x-shown,32*t*t*(3-2*t));assert(shown>previous);previous=shown;
 }
 near(h.calls.at(-1)[1].x,192);
});
test('zoomed touch reaches viewport right and bottom without an outside strip',()=>{
 const h=harness(null,()=>false,{touchMargin:{right:32,bottom:64}});h.view.pan(-180,100);
 h.fire('pointerdown',{x:394,y:596});const q=h.calls.at(-1)[1],edge=h.view.screenToWorld(384,576);
 near(q.x,edge.x);near(q.y,edge.y);
});
console.log(`${passed} passed, ${failed} failed battery viewport/input cases`);
if(failed)process.exitCode=1;
