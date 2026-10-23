import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {extendWorksite,frameWorksite} from '../src/ideas-lab/space.js';
import {IDEA_MAPS} from '../src/ideas-lab/maps.js';
import {IdeaWorld} from '../src/ideas-lab/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {MapViewport} from '../src/map-viewport.js';
const profile=()=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];return p;};

test('all authored maps gain empty sides without changing their cells or original documents',()=>{
 for(const m of IDEA_MAPS){
  const before=JSON.stringify(m.site),{site,bounds}=extendWorksite(m.site),w=new IdeaWorld(site,profile());
  assert.equal(JSON.stringify(m.site),before);assert.equal(w.initial,m.pixels);
  assert(bounds.x>=m.site.data.floorY);assert.equal(bounds.width,m.site.data.width);
  assert.equal(w.width,bounds.x*2+bounds.width);assert.equal(w.floorY,m.site.data.floorY);
  assert.equal(site.preview[0].x,m.site.preview[0].x+bounds.x);
  for(let y=0;y<w.floorY;y++){
   assert(!w.cells.subarray(y*w.width,y*w.width+bounds.x).some(Boolean));
   assert(!w.cells.subarray(y*w.width+bounds.x+bounds.width,(y+1)*w.width).some(Boolean));
  }
 }
});
test('initial view keeps worksite scale while zoom and camera reach both aprons',()=>{
 for(const map of IDEA_MAPS)for(const [viewWidth,viewHeight] of [[390,740],[900,500]]){
  const {site,bounds}=extendWorksite(map.site);
  const v=new MapViewport({worldWidth:site.data.width,worldHeight:site.data.height,viewWidth,viewHeight});
  frameWorksite(v,bounds);
  assert(Math.abs(v.zoom-Math.min(viewWidth/bounds.width,viewHeight/bounds.height))<1e-8);
  assert(Math.abs(v.screenToWorld(viewWidth/2,viewHeight/2).x-(bounds.x+bounds.width/2))<1e-8);
  v.zoomAt(4,viewWidth/2,viewHeight/2);v.pan(100000,0);assert.equal(v.x,0);
  v.pan(-100000,0);assert(v.x+v.rect().width>bounds.x+bounds.width);
  v.fit();assert(v.rect().width>=site.data.width-1e-8);
 }
});
test('dynamic fragments cross both original edges and land on the extended floor',()=>{
 for(const direction of [-1,1]){
  const original={data:{width:80,height:100,floorY:84,shapes:[{rect:[direction<0?1:71,45,8,8],color:1}]},preview:[{x:40,y:60}]};
  const {site,bounds}=extendWorksite(original),w=new IdeaWorld(site,profile(),{blast:'normal'});w.detach();
  const p=w.bodies[0];assert(p);Body.setVelocity(p.body,{x:direction*1.8,y:0});
  for(let i=0;i<25;i++)w.step(1/60);
  assert(direction<0?p.body.position.x<bounds.x-4:p.body.position.x>bounds.x+bounds.width+4,'no collision at old edge');
  for(let i=0;i<420;i++){w.step(1/60);w.events=[];}
  assert(w.diagnostics().finite);assert(w.diagnostics().balanced);
  const outside=[...w.bodies.flatMap(b=>w.material(b).map(v=>v.q)),...w.flying];
  assert(outside.some(q=>direction<0?q.x<bounds.x:q.x>bounds.x+bounds.width)||w.sand.some(Boolean));
 }
});
test('debris in the apron is reachable and collectible with the normal suction',()=>{
 const {site,bounds}=extendWorksite(IDEA_MAPS[0].site),w=new IdeaWorld(site,profile());
 const origin=w.cells.findIndex(Boolean),color=w.cells[origin];w.cells[origin]=0;
 const x=bounds.x-20,y=w.floorY-1,id=y*w.width+x;
 w.sand[id]=color;w.sandOrigins[id]=origin+1;w.syncStatic();
 w.suctionRate=80;w.suctionRadius=12;w.work(x+.5,y+.5,.1);
 assert.equal(w.collected,1);assert(w.diagnostics().balanced);
});
