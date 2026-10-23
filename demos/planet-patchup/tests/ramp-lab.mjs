import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {RampWorld} from '../src/ramp-lab/world.js';
import {RAMP_MAPS} from '../src/ramp-lab/maps.js';
import {FreeJourney} from '../src/free30/journey.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
import {applySettings} from '../src/paid-lab/settings.js';
import {loadIdeaTuning} from '../src/ideas-lab/options.js';
import {MapDraft} from '../src/free30/editor/model.js';
const profile=()=>new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;
const make=key=>new RampWorld(RAMP_MAPS.find(m=>m.key===key).site,profile(),{blast:'normal'});
test('same roofs on 1/3/5-cell pillars and editor roundtrip',()=>{
 const worlds=[1,3,5].map(n=>make('ramp-'+n));
 for(const w of worlds)assert.deepEqual(w.cells.slice(0,48*w.width),worlds[0].cells.slice(0,48*w.width));
 assert.equal(worlds[1].initial-worlds[0].initial,47*2);
 assert.equal(worlds[2].initial-worlds[1].initial,47*2);
 const readings=worlds.map(w=>w.bearingReadings()[0]);
 assert.deepEqual(readings.map(r=>r.width),[1,3,5]);
 assert(readings[0].utilization>readings[1].utilization&&readings[1].utilization>readings[2].utilization);
 for(const map of RAMP_MAPS){const draft=new MapDraft(map.site);assert.equal(MapDraft.open(draft.serialize()).cells.filter(Boolean).length,map.pixels);}
});
test('rotation response starts with motion, reaches5x over5 simulated seconds and caps',()=>{
 const w=make('ramp-1');w.detach();const p=w.bodies[0],baseline=p.body.inertia;
 w.elapsed=30;w.updateRotation(p);assert.equal(p.rotationGain,1);assert.equal(p.rampStart,undefined);
 Body.setAngularVelocity(p.body,.01);const v=p.body.angularVelocity;
 w.updateRotation(p);assert.equal(p.rampStart,30);assert.equal(p.body.inertia,baseline);
 w.elapsed=32.5;w.updateRotation(p);assert.equal(p.rotationGain,3);assert(Math.abs(p.body.inertia-baseline/3)<1e-8);
 for(let i=0;i<10;i++)w.updateRotation(p);assert.equal(p.rotationGain,3,'paused simulation does not accumulate wall time');
 w.elapsed=35;w.updateRotation(p);assert.equal(p.rotationGain,5);assert.equal(p.body.angularVelocity,v,'no artificial angular velocity jump');
 w.elapsed=100;w.updateRotation(p);assert.equal(p.rotationGain,5);assert(Math.abs(p.body.inertia-baseline/5)<1e-8);
});
test('fractured children inherit rotation ramp age instead of resetting',()=>{
 const w=make('ramp-1');w.detach();const p=w.bodies[0];Body.setAngularVelocity(p.body,.01);w.updateRotation(p);w.elapsed=2.5;w.updateRotation(p);
 const child=w.addPiece(p.pixels.slice(0,20),p);
 assert.equal(child.rampStart,p.rampStart);assert.equal(child.rotationGain,3);
 w.removePiece(p);w.elapsed=5;w.updateRotation(child);assert.equal(child.rotationGain,5);
});
test('real runtime triple map retains thicker specimens and conserves material',()=>{
 const {site,bounds}=extendWorksite(RAMP_MAPS[0].site),w=new RampWorld(site,profile(),{blast:'normal'});
 applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);w.detach();
 for(let i=0;i<1200;i++){w.step(1/60);assert(w.diagnostics().finite&&w.diagnostics().balanced);w.events=[];}
 const held=w.bearingReadings().filter(r=>r.center>bounds.x+160);
 assert.deepEqual(held.map(r=>r.width),[3,5]);assert.deepEqual(held.map(r=>r.load),[861,955]);
});

test('UI settings use5 as the target and leave1x base inertia intact on reapply',async()=>{
 const {DEFAULTS,normalizeMotion,applyRampMotion,saveMotion,loadMotion}=await import('../src/ramp-lab/settings.js');
 const {rampStorage}=await import('../src/ramp-lab/storage.js');
 assert.equal(DEFAULTS.rotation,5);assert.equal(normalizeMotion({rotation:100}).rotation,5);
 const w=make('ramp-1');applyRampMotion(w,DEFAULTS);w.detach();const p=w.bodies[0];Body.setAngularVelocity(p.body,.01);w.updateRotation(p);w.elapsed=2.5;w.updateRotation(p);const before=p.body.inertia;
 applyRampMotion(w,DEFAULTS);assert(Math.abs(before-p.body.inertia)<1e-8);assert.equal(p.rotationGain,3);
 const data=new Map([['planet-patchup-bearing-planet','unchanged']]);const store=rampStorage({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert(saveMotion(store,DEFAULTS).ok);assert.equal(loadMotion(store).settings.rotation,5);
 assert([...data.keys()].filter(k=>k!== 'planet-patchup-bearing-planet').every(k=>k.startsWith('planet-patchup-ramp-')));
});
