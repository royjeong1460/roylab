import test from 'node:test';
import assert from 'node:assert/strict';
import {bearingStrength} from '../src/bearing-lab/strength.js';
import {BearingWorld} from '../src/bearing-lab/world.js';
import {BEARING_MAPS} from '../src/bearing-lab/maps.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import {applySettings} from '../src/paid-lab/settings.js';
import {loadIdeaTuning} from '../src/ideas-lab/options.js';
import {FreeJourney} from '../src/free30/journey.js';
import {applyMotion,DEFAULTS} from '../src/motion-lab/settings.js';
const profile=()=>new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
const make=key=>{const w=new BearingWorld(BEARING_MAPS.find(m=>m.key===key).site,profile(),{blast:'normal'});applyMotion(w,DEFAULTS);return w;};
test('absolute width, load and eccentricity control utilization',()=>{
 const one=bearingStrength(600,20,[{x:12,strength:1}]);
 const two=bearingStrength(600,20,[{x:11,strength:1},{x:12,strength:1}]);
 assert(one.utilization>1);assert(two.utilization<1);
 assert(bearingStrength(900,20,[{x:12,strength:1}]).utilization>one.utilization);
 assert(bearingStrength(600,12.5,[{x:12,strength:1}]).utilization<one.utilization);
 assert(bearingStrength(600,20,[{x:12,strength:.5}]).utilization>one.utilization);
 assert.equal(bearingStrength(600,20,[{x:12,strength:1}]).width,1);
 assert.equal(bearingStrength(100,20,[{x:0,strength:1},{x:40,strength:1}]).bendingWidth,2,'empty span is not material');
});
test('same upper art in one and two column fixtures',()=>{
 const a=make('bearing-one'),b=make('bearing-two');
 assert.equal(a.width,b.width);
 assert.deepEqual(a.cells.slice(0,48*a.width),b.cells.slice(0,48*b.width));
 assert.equal(b.initial-a.initial,47);
});
test('load test yields thin column with hinge, thick column holds',()=>{
 const thin=make('bearing-one'),thick=make('bearing-two');
 thin.detach();thick.detach();
 assert(thin.bodies.some(p=>p.hinge));assert.equal(thick.bodies.length,0);
 for(let i=0;i<360;i++){
  thin.step(1/60);thick.step(1/60);
  assert(thin.diagnostics().finite&&thin.diagnostics().balanced);
  assert(thick.diagnostics().finite&&thick.diagnostics().balanced);
 }
 assert(thin.history.some(e=>e.kind==='tear'),'visible tilt followed by release');
 assert.equal(thick.bodies.length,0);
});
test('remaining width matters even when original column was twice as wide',()=>{
 const w=make('bearing-two');
 for(let y=48;y<95;y++)w.makeSand(y*w.width+25);
 w.detach();assert(w.bodies.some(p=>p.hinge));assert(w.diagnostics().balanced);
});
test('centered load stays while centered overload crushes support',()=>{
 const light=make('bearing-centered'),heavy=make('bearing-heavy');
 light.detach();assert.equal(light.bodies.length,0);
 heavy.detach();assert(heavy.history.some(e=>e.kind==='bearing-crush'));
 assert(heavy.bodies.length>0);assert(heavy.diagnostics().balanced);
});

test('paired specimens do not knock each other down during the unforced comparison',()=>{
 const {site,bounds}=extendWorksite(BEARING_MAPS[0].site);
 const w=new BearingWorld(site,profile(),{blast:'normal'});
 applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);applyMotion(w,DEFAULTS);w.detach();
 const rightStart=bounds.x+160;
 for(let i=0;i<1200;i++){w.step(1/60);assert(w.diagnostics().finite&&w.diagnostics().balanced);w.events=[];}
 const right=w.bearingReadings().find(r=>r.center>rightStart);
 assert(right);assert.equal(right.width,2);assert.equal(right.load,814);
});

test('gravity setting changes actual support load as well as later motion',()=>{
 const w=make('bearing-two');const initial=w.bearingReadings()[0].utilization;
 applyMotion(w,{...DEFAULTS,gravity:2});
 assert(Math.abs(w.bearingReadings()[0].utilization-initial*2)<1e-9);
 w.detach();assert(w.bodies.length>0);
});

test('bearing settings cannot alter earlier edition saves',async()=>{
 const {bearingStorage}=await import('../src/bearing-lab/storage.js');
 const data=new Map([['planet-patchup-motion-v1','old-motion'],['planet-patchup-ideas-options-v1','old-ideas']]);
 const storage=bearingStorage({getItem:key=>data.get(key)??null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(storage.getItem('planet-patchup-motion-v1'),null);
 storage.setItem('planet-patchup-motion-v1','new-motion');storage.setItem('planet-patchup-ideas-options-v1','new-ideas');
 assert.equal(data.get('planet-patchup-motion-v1'),'old-motion');
 assert.equal(data.get('planet-patchup-ideas-options-v1'),'old-ideas');
 assert.equal(storage.getItem('planet-patchup-motion-v1'),'new-motion');
});
