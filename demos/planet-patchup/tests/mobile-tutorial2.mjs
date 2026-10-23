import test from 'node:test';
import assert from 'node:assert/strict';
import {contactStorage,pressContact} from '../src/mobile-tutorial2/controls.js';
import {FreeJourney,FreeRun,FREE_SAVE_KEYS} from '../src/free30/journey.js';
import {FREE_TUTORIAL} from '../src/free30/sites.js';
import {FirstRunGuide,gameTip} from '../src/free30/tutorial.js';
const locks={request:async(_,fn)=>fn()};
test('tutorial2 progresses and resets without modifying the original campaign',async()=>{
 const data=new Map(FREE_SAVE_KEYS.map(k=>[k,'original'])),raw={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const journey=new FreeJourney(contactStorage(raw),locks);assert(journey.persistent);
 assert((await journey.skipTutorial()).ok);
 const restored=new FreeJourney(contactStorage(raw),locks);assert.equal(restored.profile.tutorial,'done');
 assert((await restored.resetProgress(restored.profile.revision)).ok);
 for(const key of FREE_SAVE_KEYS)assert.equal(raw.getItem(key),'original');
 assert.equal(new FreeJourney(contactStorage(raw),locks).profile.tutorial,'intro');
});
test('confirmed contact tap has no fuse wait and preserves PC/default delay and accounting',()=>{
 const profile=new FreeJourney({getItem:()=>null,setItem:()=>{}},locks).profile;
 const run=new FreeRun(FREE_TUTORIAL,profile),w=run.world,q=FREE_TUTORIAL.preview[0],before=w.charge,parameters=w.labParameters;
 assert(pressContact(run,q));assert.equal(w.charge,before-w.cost());assert.equal(w.bombs[0].delay,0);assert.equal(w.labParameters,parameters);
 run.release();run.update(1/30,{...q,working:false});assert(w.targetReleased>0);assert(w.diagnostics().balanced);assert(w.diagnostics().finite);
 assert(run.press(q));assert.equal(w.bombs.at(-1).delay,.35);
 run.release();run.pause(true);const charge=w.charge;assert.equal(pressContact(run,q),false);assert.equal(w.charge,charge);assert.equal(w.labParameters,parameters);
});
test('tap guide teaches contact and pinch while original guide and PC stay intact',()=>{
 const old=new FirstRunGuide({x:1,y:1}),guide=new FirstRunGuide({x:1,y:1},{touchTap:true});
 assert.match(guide.copy('touch'),/톡/);assert.doesNotMatch(guide.copy('touch'),/조준점/);
 assert.match(old.copy('touch'),/왼쪽 위/);assert.equal(guide.copy('mouse'),old.copy('mouse'));
 guide.stage='collect';assert.match(guide.copy('touch'),/끌/);assert.doesNotMatch(guide.copy('touch'),/떼면 폭파/);
 assert.match(gameTip(0,'touch',true),/톡/);assert.match(gameTip(9,'touch',true),/두 손가락/);
});
