import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELDS,PRESETS,normalizeSettings,loadSettings,saveSettings,SETTINGS_KEY,applySettings} from '../src/paid-lab/settings.js';
import {FreeRun,FreeJourney} from '../src/free30/journey.js';
import {CULTURE_MAPS} from '../src/paid-lab/culture/maps.js';
const run=()=>new FreeRun(CULTURE_MAPS[0].site,{...new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile,owned:['bomb','blackhole']},'stage');
test('normalization rejects nonfinite and unknown fields and clamps finite values',()=>{
 const s=normalizeSettings({bombPower:Infinity,gravityPower:'bad',wearSpeed:100,capacity:-1,unlimited:'false',bad:1});
 assert.equal(s.bombPower,PRESETS.early.values.bombPower);assert.equal(s.wearSpeed,10);assert.equal(s.capacity,10);assert.equal(s.unlimited,true);assert(!('bad' in s));
 for(const f of FIELDS)assert(Number.isFinite(s[f.key]));
 assert.deepEqual(normalizeSettings(null),normalizeSettings({}));
});
test('settings use a separate key and handle malformed/unavailable storage',()=>{
 const m=new Map([['free-progress','keep']]),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};
 assert(saveSettings(storage,{...PRESETS.late.values,unlimited:false}).ok);
 assert.equal(loadSettings(storage).settings.unlimited,false);assert.equal(m.get('free-progress'),'keep');assert.equal(m.size,2);assert(m.has(SETTINGS_KEY));
 m.set(SETTINGS_KEY,'bad');assert(loadSettings(storage).warning);
 assert.equal(saveSettings({setItem(){throw Error('quota');}},{}).ok,false);
});
test('free preset exactly matches fresh free world; applying paid settings cannot change another run',()=>{
 const untouched=run(),r=run(),before=untouched.world.stats();applySettings(r.world,{...PRESETS.free.values,unlimited:false});
 for(const f of FIELDS){const k=f.key;assert.equal(r.world.stats()[k]??r.world.labParameters[k],before[k]??untouched.world.labParameters[k],k);}
 applySettings(r.world,PRESETS.late.values);assert.deepEqual(untouched.world.stats(),before);assert.equal(untouched.world.unlimited,false);
});
test('preset reaches real bombs, blackhole wells, wear, suction and limited battery',()=>{
 const r=run(),w=r.world,s=normalizeSettings({...PRESETS.middle.values,unlimited:false});applySettings(w,s);
 assert(r.press(r.site.preview[0]));r.release();assert.equal(w.bombs[0].power,s.bombPower);assert.equal(w.bombs[0].radius,s.bombRadius);assert.equal(w.charge,s.capacity-s.bombCost);
 r.selectTool('blackhole');assert(r.press(r.site.preview[0]));r.release();const well=w.wells[0];
 assert.equal(well.power,s.gravityPower);assert.equal(well.radius,s.gravityRadius);assert.equal(well.duration,s.gravityDuration);assert.equal(well.coreMix,s.coreMix);
 assert.equal(w.wearMultiplier({rubbingTime:1}),s.wearSpeed);assert.equal(w.suctionRate,s.suctionRate);assert.equal(w.tuning.crackStrength,s.crackStrength);
});
test('stronger preset removes more material immediately, both tools preserve pixel totals for every preset',()=>{
 const counts=[];
 for(const [id,p] of Object.entries(PRESETS)){
  for(const tool of ['bomb','blackhole']){
   const r=run(),w=r.world;applySettings(w,p.values);r.selectTool(tool);assert(r.press(r.site.preview[0]));r.release();
   for(let i=0;i<180;i++){r.update(1/30,{...r.site.preview[0],working:false});w.events=[];}
   const d=w.diagnostics();assert(d.finite,`${id} ${tool}`);assert(d.balanced,`${id} ${tool}`);
  }
  const w=run().world;applySettings(w,p.values);const s=w.stats();w.blast({...CULTURE_MAPS[0].site.preview[0],radius:s.bombRadius,power:s.bombPower});counts.push(w.flying.length+w.collected);
 }
 assert(counts[1]>counts[0],String(counts));assert(counts[3]>counts[1],String(counts));
});
