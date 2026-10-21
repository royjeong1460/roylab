import test from 'node:test';import assert from 'node:assert/strict';
import {FirstRunGuide,gameTip} from '../src/free30/tutorial.js';
test('guide reacts to a successful pillar shot, allows animation, then actual collection',()=>{
 const g=new FirstRunGuide({x:42,y:85});assert.match(g.copy('mouse'),/클릭/);assert.match(g.copy('touch'),/손을 떼/);
 g.attack({x:10,y:10},true);assert.equal(g.stage,'aim');g.attack({x:42,y:85},false);assert.equal(g.stage,'aim');
 g.attack({x:42,y:85},true);assert.equal(g.stage,'aim');g.update(.2,0,true);assert.equal(g.stage,'collapse');g.update(1,0);assert.equal(g.stage,'collapse');g.update(2,0);assert.equal(g.stage,'collect');
 g.update(4,0);assert.equal(g.stage,'collect');g.update(1,12);assert.equal(g.stage,'work');g.skip();assert.equal(g.stage,'done');
});
test('accepted near-miss without debris cannot claim collapse or collection',()=>{
 const g=new FirstRunGuide({x:42,y:85});g.attack({x:49,y:85},true);
 for(let i=0;i<120;i++)g.update(1/30,0,false);
 assert.equal(g.stage,'aim');g.attack({x:42,y:85},true);g.update(.2,0,true);assert.equal(g.stage,'collapse');
});
test('tips distinguish device input and rotate during each run',()=>{
 assert.match(gameTip(0,'mouse'),/클릭/);assert.match(gameTip(0,'touch'),/손을 떼/);
 assert.match(gameTip(9,'touch'),/두 손가락/);assert.match(gameTip(9,'mouse'),/우클릭/);
 assert.match(gameTip(63,'touch'),/가장자리/);assert.match(gameTip(63,'mouse'),/클릭/);
 assert.match(gameTip(18,'touch'),/수집/);assert.notEqual(gameTip(27,'mouse'),gameTip(36,'mouse'));
});
