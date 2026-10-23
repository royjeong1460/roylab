import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {SupportWorld} from '../src/support-lab/world.js';
import {IdeaWorld} from '../src/ideas-lab/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {LAYOUT_MAPS} from '../src/ideas-lab/maps.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import {loadIdeaTuning} from '../src/ideas-lab/options.js';
import {applySettings} from '../src/paid-lab/settings.js';
const profile=()=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];return p;};
function fixture(remaining=5){
 const w=new SupportWorld({data:{width:100,height:110,floorY:90,shapes:[{rect:[30,20,5,70],color:1}]}},profile());
 for(let x=30+remaining;x<35;x++)w.cells[49*w.width+x]=0;
 const ids=[];for(let id=0;id<50*w.width;id++)if(w.cells[id])ids.push(id);
 const p=w.releaseBody(ids);w.attachHinge(p,{x:31,y:50},49*w.width+30,50*w.width+30);
 return {w,p};
}
test('damaged supports tear sooner, but keep a visible tilt before release',()=>{
 const intact=fixture(),half=fixture(3),thin=fixture(1);
 assert.equal(intact.w.releaseAngle(intact.p),.5);
 assert(half.w.releaseAngle(half.p)<.5);
 assert(thin.w.releaseAngle(thin.p)<half.w.releaseAngle(half.p));
 for(const {w,p} of [intact,half,thin]){w.updateHinges();assert(p.hinge,'not instant detachment');}
 Body.setAngle(thin.p.body,.1);thin.w.updateHinges();assert(thin.p.hinge,'first tilts at least about 7 degrees');
 Body.setAngle(thin.p.body,.2);thin.w.updateHinges();assert.equal(thin.p.hinge,null);
 Body.setAngle(intact.p.body,.2);intact.w.updateHinges();assert(intact.p.hinge);
});
test('support loss is rechecked, detached material is not mistaken for damage',()=>{
 const {w,p}=fixture();assert.equal(w.releaseAngle(p),.5,'released upper cells still carry their joint');
 for(let x=31;x<35;x++)w.cells[50*w.width+x]=0;
 assert(w.releaseAngle(p)<.15);Body.setAngle(p.body,.2);w.updateHinges();assert.equal(p.hinge,null);
 const lost=fixture();lost.w.cells[lost.p.supportId]=0;lost.w.updateHinges();assert.equal(lost.p.hinge,null);
});
test('fragment inheriting the joint retains its original bearing denominator',()=>{
 const {w,p}=fixture(1),angle=w.releaseAngle(p);
 const child=w.addPiece(p.pixels.filter(v=>v.id%w.width===30),p);
 assert(child.hinge);assert.equal(w.releaseAngle(child),angle);
 w.removePiece(p);Body.setAngle(child.body,.2);w.updateHinges();assert.equal(child.hinge,null);
});
test('gravity and unconnected free fall remain identical',()=>{
 const site={data:{width:100,height:160,floorY:150,shapes:[{rect:[40,20,8,8],color:1}]}};
 const old=new IdeaWorld(site,profile()),fresh=new SupportWorld(site,profile());
 assert.deepEqual(fresh.engine.gravity,old.engine.gravity);
 for(const w of [old,fresh]){w.detach();for(let i=0;i<60;i++)w.step(1/60);}
 assert.deepEqual(fresh.bodies[0].body.position,old.bodies[0].body.position);
 assert.deepEqual(fresh.bodies[0].body.velocity,old.bodies[0].body.velocity);
});
test('same tall-map blast releases a tilted load sooner and conserves every pixel',()=>{
 const {site}=extendWorksite(LAYOUT_MAPS.find(m=>m.key==='layout-tall').site);
 const results=[];
 for(const World of [IdeaWorld,SupportWorld]){
  const w=new World(site,profile(),{blast:'normal'});applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);
  w.activate(site.preview[0].x,site.preview[0].y);
  let release=null,maxTilt=0,seen=false;
  for(let i=0;i<600;i++){
   w.step(1/60);
   const held=w.bodies.filter(p=>p.hinge);if(held.length){seen=true;maxTilt=Math.max(maxTilt,...held.map(p=>Math.abs(p.body.angle)));}
   if(seen&&!held.length&&release===null)release=(i+1)/60;
   assert(w.diagnostics().finite);assert(w.diagnostics().balanced);w.events=[];
  }
  assert(release!==null);results.push({release,maxTilt});
 }
 assert(results[1].release<results[0].release-.3,JSON.stringify(results));
 assert(results[1].maxTilt>.1,JSON.stringify(results));
 console.log('same tall-map blast:',JSON.stringify(results));
});
