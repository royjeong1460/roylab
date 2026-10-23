import test from 'node:test';import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {SupportWorld} from '../src/support-lab/world.js';
import {FreeJourney} from '../src/free30/journey.js';
import {applyMotion,normalizeMotion,loadMotion,saveMotion,KEY,BASELINE} from '../src/motion-lab/settings.js';
const make=()=>{const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];return new SupportWorld({data:{width:180,height:240,floorY:224,shapes:[{rect:[80,30,8,8],color:1}]}},p,{blast:'normal'});};
test('defaults preserve physics; applying a preset twice does not compound and reset restores it',()=>{
 const w=make(),base={...w.labParameters},g=w.engine.gravity.scale;w.detach();const inertia=w.bodies[0].body.inertia;
 applyMotion(w,BASELINE);assert.deepEqual(w.labParameters,base);assert.equal(w.engine.gravity.scale,g);
 applyMotion(w,{gravity:1.5,rotation:2,speed:1.5});applyMotion(w,{gravity:1.5,rotation:2,speed:1.5});
 assert.equal(w.engine.gravity.scale,g*1.5);assert.equal(w.labParameters.inertia,base.inertia/2);assert.equal(w.labParameters.motionCap,base.motionCap*1.5);
 assert.equal(w.bodies[0].body.inertia,inertia/2);assert.equal(w.labParameters.grainGravity,base.grainGravity*1.5);
 applyMotion(w,BASELINE);assert.deepEqual(w.labParameters,base);assert.equal(w.bodies[0].body.inertia,inertia);
});
test('gravity alone increases free fall while rotation alone leaves translation unchanged',()=>{
 const speeds=[];
 for(const setting of [BASELINE,{...BASELINE,gravity:1.5},{...BASELINE,rotation:2}]){const w=make();applyMotion(w,setting);w.detach();for(let i=0;i<30;i++)w.step(1/60);speeds.push(w.bodies[0].body.velocity.y);assert(w.diagnostics().balanced);}
 assert(speeds[1]>speeds[0]*1.45);assert.equal(speeds[2],speeds[0]);
});
test('rotation response lowers inertia on newly detached pieces and increases angular response',()=>{
 const values=[];
 for(const rotation of [1,2]){const w=make();applyMotion(w,{rotation});w.detach();const p=w.bodies[0];w.impulse(p,{x:p.body.position.x+2,y:p.body.position.y},{x:0,y:.01});values.push(p.body.angularVelocity);}
 assert(Math.abs(values[1]/values[0]-2)<1e-9);
});
test('speed limit changes actual clamping and leaves gravity unchanged',()=>{
 for(const speed of [1,1.5,2]){const w=make(),g=w.engine.gravity.scale;applyMotion(w,{speed});w.detach();const p=w.bodies[0];Body.setVelocity(p.body,{x:0,y:10});w.limitMotion(p);assert(Math.abs(p.body.velocity.y-3*speed)<1e-9);assert.equal(w.engine.gravity.scale,g);}
});
test('settings validate, persist in their own key, and report unavailable storage',()=>{
 assert.deepEqual(normalizeMotion({gravity:100,rotation:-2,speed:NaN}),{gravity:3,rotation:.5,speed:1});
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert(saveMotion(storage,{gravity:1.5,rotation:2,speed:1}).ok);assert.equal(data.size,1);assert(data.has(KEY));assert.equal(loadMotion(storage).settings.gravity,1.5);
 data.set(KEY,'broken');assert(loadMotion(storage).warning);assert(!saveMotion({setItem(){throw Error('blocked');}},{}).ok);
});

test('trial options snapshot support values and never write support or ideas keys',async()=>{
 const {motionStorage}=await import('../src/motion-lab/storage.js'),key='planet-patchup-ideas-options-v1';
 const data=new Map([[key,'ideas'],[key.replace('ideas','support'),'support']]),raw={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},copy=motionStorage(raw);
 assert.equal(copy.getItem(key),'support');copy.setItem(key,'motion');assert.equal(data.get(key),'ideas');assert.equal(data.get(key.replace('ideas','support')),'support');
 const empty=new Map(),fresh=motionStorage({getItem:k=>empty.get(k)??null,setItem:(k,v)=>empty.set(k,v)});const first=fresh.getItem(key);empty.set(key,'later');assert.equal(fresh.getItem(key),first);
});

test('tall-map single-variable presets release sooner; upper settings remain finite and conserve material',async()=>{
 const {LAYOUT_MAPS}=await import('../src/ideas-lab/maps.js'),{extendWorksite}=await import('../src/ideas-lab/space.js');
 const {applySettings}=await import('../src/paid-lab/settings.js'),{loadIdeaTuning}=await import('../src/ideas-lab/options.js');
 const {site}=extendWorksite(LAYOUT_MAPS.find(m=>m.key==='layout-tall').site),results=[];
 for(const setting of [BASELINE,{...BASELINE,gravity:1.5},{...BASELINE,rotation:2},{gravity:3,rotation:4,speed:2}]){
  const p=new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile;p.owned=['bomb','blackhole'];
  const w=new SupportWorld(site,p,{blast:'normal'});applySettings(w,loadIdeaTuning({getItem:()=>null}).settings);applyMotion(w,setting);
  w.activate(site.preview[0].x,site.preview[0].y);let seen=false,release=null;
  for(let i=0;i<480;i++){w.step(1/60);const held=w.bodies.some(p=>p.hinge);seen ||= held;if(seen&&!held&&release===null)release=(i+1)/60;assert(w.diagnostics().finite);assert(w.diagnostics().balanced);w.events=[];}
  if(setting.speed===1)assert(release!==null,JSON.stringify({setting,seen}));results.push({setting,release});
 }
 assert(results[1].release<results[0].release);assert(results[2].release<results[0].release);console.log('release comparison',JSON.stringify(results));
});

 test('default rotation is three; old saves migrate once without changing gravity or speed',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 assert.deepEqual(loadMotion(storage).settings,{gravity:1,rotation:3,speed:1});
 data.set(KEY,JSON.stringify({version:1,settings:{gravity:1.5,rotation:1,speed:1.5}}));
 assert.deepEqual(loadMotion(storage).settings,{gravity:1.5,rotation:3,speed:1.5});
 assert.equal(JSON.parse(data.get(KEY)).version,2);
 saveMotion(storage,{gravity:1.5,rotation:2,speed:1});assert.equal(loadMotion(storage).settings.rotation,2);
 });
