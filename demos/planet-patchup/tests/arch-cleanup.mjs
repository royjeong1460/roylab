import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchRun} from '../src/arch/journey.js';
import {ExpeditionRun} from '../src/expedition-journey.js';

// Exercise the real run clock with physics held constant, including a moving uncollected chunk.
function run(){
 const r=Object.create(ArchRun.prototype);
 Object.assign(r,{state:'active',paused:false,phase:'working',finishReady:false,finishRemaining:10,quietElapsed:0,accumulator:0,aim:{x:5,y:5},previous:{x:5,y:5},profile:{owned:['bomb']},wallActiveMs:0,finishingElapsedMs:0,workMs:0,first70Ms:null});
 r.world={charge:0,initial:100,collected:20,simulatedMs:0,tool:'bomb',toolEnabled:true,sand:[],pending:[],flying:[],debris:[],bombs:[],wells:[],ideaPending:[],ideaFields:[],ideaMarks:[],activeDevice:null,bodies:[{pixels:Array(80),body:{isSleeping:false,velocity:{x:1,y:1},angularVelocity:.1,position:{x:0,y:0},vertices:[{x:2,y:2}]}}],validPoint:()=>true,work(){},step(dt){this.simulatedMs+=dt*1000;},secureLoose(){this.collected+=this.sand.filter(Boolean).length;this.sand=[];}};
 return r;
}
const advance=(r,n)=>{for(let i=0;i<n;i++)r.update(1/30);};
test('cleanup ends after a short empty-pixel interval, without waiting for moving chunks',()=>{
 const r=run();assert.equal(ExpeditionRun.prototype.debrisDrained.call(r),false);
 advance(r,14);assert(!r.finishReady);advance(r,1);
 assert(r.finishReady);assert.equal(r.finishReason,'drained');assert.equal(r.world.collected,20);
});
test('remaining pixels and pending damage keep cleanup open; pause freezes the countdown',()=>{
 for(const key of ['sand','pending','flying','debris','bombs','wells','ideaPending','ideaFields','ideaMarks','activeDevice']){
  const r=run();r.world[key]=key==='activeDevice'?{}:[1];advance(r,30);assert(!r.finishReady,key);
  const time=r.finishRemaining;r.pause(true);advance(r,30);assert.equal(r.finishRemaining,time);
  r.pause(false);r.world[key]=key==='activeDevice'?null:[];advance(r,15);assert(r.finishReady,key);
 }
});
test('ten-second cap still secures only loose pixels, not chunks, with no duplicate reward',()=>{
 const r=run();r.world.sand=[1,1];advance(r,300);
 assert(r.finishReady);assert.equal(r.finishReason,'timeout');assert.equal(r.world.collected,22);
 assert.equal(r.world.bodies[0].pixels.length,80);advance(r,30);assert.equal(r.world.collected,22);
});

test('new debris resets the short drain window',()=>{
 const r=run();advance(r,10);r.world.flying=[1];advance(r,1);
 r.world.flying=[];advance(r,14);assert(!r.finishReady);advance(r,1);assert(r.finishReady);
});

test('cleanup HUD enters once, emphasizes final seconds, pauses, and clears between runs',async()=>{
 const {renderCleanupHUD}=await import('../src/arch/hud.js');
 const hud={hidden:true,dataset:{},style:{setProperty(){}}},seconds={textContent:''},status={textContent:''};
 const nodes={'arch-cleanup':hud,'arch-cleanup-seconds':seconds,'arch-cleanup-status':status},doc={getElementById:id=>nodes[id]};
 const r={phase:'working',state:'active',finishRemaining:10};renderCleanupHUD(doc,r);assert(hud.hidden);
 r.phase='finishing';renderCleanupHUD(doc,r);assert(!hud.hidden);assert.equal(seconds.textContent,'10');assert.match(status.textContent,/Battery empty/);
 r.paused=true;renderCleanupHUD(doc,r);assert.match(status.textContent,/paused/);assert.equal(hud.dataset.paused,'true');
 r.paused=false;renderCleanupHUD(doc,r);assert.match(status.textContent,/resumed/);
 r.finishRemaining=2.8;renderCleanupHUD(doc,r);assert.equal(seconds.textContent,'3');assert.equal(hud.dataset.urgent,'true');
 r.finishReady=true;renderCleanupHUD(doc,r);assert(hud.hidden);
 r.finishReady=false;r.finishRemaining=10;renderCleanupHUD(doc,r);assert.equal(hud.dataset.urgent,'false');assert.match(status.textContent,/Battery empty/);
});
