import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_OPTIONS,OPTIONS_KEY,TUNING_KEY,BLASTS,WELLS,normalizeOptions,loadOptions,saveOptions,loadIdeaTuning,createTuningStorage} from '../src/ideas-lab/options.js';
import {SETTINGS_KEY,saveSettings} from '../src/paid-lab/settings.js';

const memory=entries=>{const values=new Map(entries);return {values,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test('fresh experiments start with aftershock, grinding and strength one',()=>{
 assert.deepEqual(loadOptions(memory()).options,{blast:'aftershock',well:'grind',level:1});
 assert.equal(BLASTS.length,7);assert.equal(WELLS.length,3);
});
test('only listed modes and the three strength levels survive normalization',()=>{
 for(const blast of BLASTS)for(const well of WELLS)for(const level of [1,2,3])assert.deepEqual(normalizeOptions({blast:blast.id,well:well.id,level}),{blast:blast.id,well:well.id,level});
 for(const value of [null,[],{},'spin',{blast:'unknown',well:'normal',level:4},{blast:'__proto__',well:'constructor',level:'2'}])assert.deepEqual(normalizeOptions(value),DEFAULT_OPTIONS);
});
test('options round trip touches only its experiment key',()=>{
 const storage=memory([[SETTINGS_KEY,'paid original'],['free30-progress','free original']]);
 assert.equal(saveOptions(storage,{blast:'spin',well:'drop',level:3}).ok,true);
 assert.deepEqual(loadOptions(storage).options,{blast:'spin',well:'drop',level:3});
 assert.deepEqual([...storage.values.keys()].sort(),[SETTINGS_KEY,'free30-progress',OPTIONS_KEY].sort());
 assert.equal(storage.getItem(SETTINGS_KEY),'paid original');assert.equal(storage.getItem('free30-progress'),'free original');
});
test('malformed or unavailable options fall back and failed writes are reported',()=>{
 for(const raw of ['{','null',JSON.stringify({version:2,options:{blast:'spin'}})]){
  const result=loadOptions(memory([[OPTIONS_KEY,raw]]));assert.deepEqual(result.options,DEFAULT_OPTIONS);assert.ok(result.warning);
 }
 const unavailable={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.ok(loadOptions(unavailable).warning);assert.equal(saveOptions(unavailable,DEFAULT_OPTIONS).ok,false);
});
test('ideas tuning starts weak even when paid settings already exist',()=>{
 const storage=memory([[SETTINGS_KEY,JSON.stringify({version:1,settings:{bombPower:20}})]]);
 const {settings}=loadIdeaTuning(storage);
 assert.equal(settings.bombRadius,3);assert.equal(settings.bombPower,1);assert.equal(settings.gravityRadius,30);assert.equal(settings.gravityPower,.15);assert.equal(settings.gravityDuration,2);assert.equal(settings.coreMix,1);assert.equal(settings.wearSpeed,1);assert.equal(settings.unlimited,true);
});
test('reused settings save through an isolated adapter and reload only ideas tuning',()=>{
 const storage=memory([[SETTINGS_KEY,'paid original']]);const adapter=createTuningStorage(storage);
 const settings={...loadIdeaTuning(storage).settings,bombPower:2.5};assert.equal(saveSettings(adapter,settings).ok,true);
 assert.equal(storage.getItem(SETTINGS_KEY),'paid original');assert.ok(storage.getItem(TUNING_KEY));assert.equal(loadIdeaTuning(storage).settings.bombPower,2.5);
 assert.throws(()=>adapter.setItem('free30-progress','oops'));assert.throws(()=>adapter.getItem('free30-progress'));
});
test('partial or invalid tuning retains low defaults rather than paid early values',()=>{
 const partial=loadIdeaTuning(memory([[TUNING_KEY,JSON.stringify({version:1,settings:{bombPower:2}})]]));
 assert.equal(partial.settings.bombPower,2);assert.equal(partial.settings.gravityPower,.15);
 for(const raw of ['{','null',JSON.stringify({version:2,settings:{}})]){
  const result=loadIdeaTuning(memory([[TUNING_KEY,raw]]));assert.equal(result.settings.bombPower,1);assert.ok(result.warning);
 }
});
