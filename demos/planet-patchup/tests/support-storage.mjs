import test from 'node:test';import assert from 'node:assert/strict';
import {comparisonStorage} from '../src/support-lab/storage.js';
import {OPTIONS_KEY,TUNING_KEY} from '../src/ideas-lab/options.js';
test('comparison snapshots existing options and tuning without writing original saves',()=>{
 const data=new Map([[OPTIONS_KEY,'old options'],[TUNING_KEY,'old tuning']]);
 const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},copy=comparisonStorage(storage);
 assert.equal(copy.getItem(OPTIONS_KEY),'old options');assert.equal(copy.getItem(TUNING_KEY),'old tuning');
 data.set(OPTIONS_KEY,'later original');assert.equal(copy.getItem(OPTIONS_KEY),'old options');
 copy.setItem(TUNING_KEY,'comparison tuning');assert.equal(data.get(TUNING_KEY),'old tuning');
 assert.equal(copy.getItem(TUNING_KEY),'comparison tuning');assert.throws(()=>copy.setItem('game-progress','x'));
});
test('read-only storage can still seed the comparison',()=>{
 const copy=comparisonStorage({getItem:k=>k===OPTIONS_KEY?'options':null,setItem(){throw Error('quota');}});
 assert.equal(copy.getItem(OPTIONS_KEY),'options');assert.throws(()=>copy.setItem(OPTIONS_KEY,'new'));
});
test('fresh comparison snapshots defaults even before the original has any settings',()=>{
 const data=new Map(),copy=comparisonStorage({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 for(const key of [OPTIONS_KEY,TUNING_KEY]){
  const initial=copy.getItem(key);assert.equal(JSON.parse(initial).version,1);
  data.set(key,'later settings');assert.equal(copy.getItem(key),initial);
 }
});
