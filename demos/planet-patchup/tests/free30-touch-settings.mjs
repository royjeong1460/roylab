import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTouchMode,saveTouchMode,TOUCH_MODE_KEY} from '../src/free30/touch-settings.js';
test('mobile mode defaults to legacy and persists separately from progress',()=>{
 const data=new Map([['progress','unchanged']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 assert.equal(loadTouchMode(storage),false);
 assert.equal(saveTouchMode(storage,true),true);assert.equal(loadTouchMode(storage),true);
 assert.equal(saveTouchMode(storage,false),true);assert.equal(loadTouchMode(storage),false);
 data.set(TOUCH_MODE_KEY,'garbage');assert.equal(loadTouchMode(storage),false);
 assert.equal(data.get('progress'),'unchanged');
});
test('unavailable storage never prevents choosing a session mode',()=>{
 const storage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(loadTouchMode(storage),false);assert.equal(saveTouchMode(storage,true),false);
});
