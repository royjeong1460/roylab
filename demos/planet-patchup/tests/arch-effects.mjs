import test from 'node:test';
import assert from 'node:assert/strict';
const {SoftEffects,CampaignEffects,EFFECT_GAIN}=await import('../src/arch/effects-core.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(loader=async()=>new ArrayBuffer(8)){
 const ctx={currentTime:0,state:'suspended',destination:{},sources:[],gains:[],
  createGain(){const gain={gain:{value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){}};this.gains.push(gain);return gain;},
  createBufferSource(){const source={connect(){},disconnect(){},start(){this.started=true;},stop(when){this.stopped=true;this.stopAt=when??ctx.currentTime;}};this.sources.push(source);return source;},
  async resume(){this.state='running';},async suspend(){this.state='suspended';},async decodeAudioData(){return {duration:1.5};}};
 return {ctx,create:()=>ctx,loader};
}
test('effects use a quiet independent bus, cap repeat voices and stop loops on mute/background',async()=>{
 assert.equal(typeof SoftEffects,'function');const f=fixture(),p=new SoftEffects(f.create,f.loader);
 await p.unlock();assert.equal(EFFECT_GAIN,.2);assert.equal(p.master.gain.value,.2);
 await p.loop('blackhole-loop',true);await p.loop('blackhole-loop',true);assert.equal(f.ctx.sources.length,1);assert.equal(f.ctx.sources[0].loop,true);
 f.ctx.currentTime=1;await p.play('orbital-fall');f.ctx.currentTime=2;await p.play('orbital-fall');assert(f.ctx.sources[1].stopped);assert(p.voices.size<=2);
 p.setVolume(.5);assert.equal(p.master.gain.value,.1);
 p.setEnabled(false);assert.equal(p.voices.size,0);assert.equal(f.ctx.state,'suspended');
 assert(f.ctx.sources.every(source=>source.stopAt<=f.ctx.currentTime),'muting must end fading tails before freezing the audio clock');
 p.setEnabled(true);await tick();assert.equal(p.voices.size,0);
 await p.loop('blackhole-loop',true);p.setActive(false);assert.equal(p.voices.size,0);assert.equal(f.ctx.state,'suspended');
 p.setActive(true);await tick();assert.equal(p.voices.size,0);
});
test('an effect muted or abandoned while loading cannot play later; rejected loads can retry',async()=>{
 assert.equal(typeof SoftEffects,'function');let resolve;const f=fixture(()=>new Promise(r=>resolve=r)),p=new SoftEffects(f.create,f.loader);
 await p.unlock();const pending=p.play('ui-tap');p.setEnabled(false);resolve(new ArrayBuffer(8));await pending;assert.equal(f.ctx.sources.length,0);
 let attempts=0;const retry=new SoftEffects(f.create,async()=>{if(attempts++===0)throw Error('offline');return new ArrayBuffer(8);});
 await retry.unlock();assert.equal(await retry.play('ui-tap'),false);f.ctx.currentTime=3;assert.equal(await retry.play('ui-tap'),true);
});
test('campaign cues follow actual wells and active deployment, never passive readiness or repeated frames',()=>{
 assert.equal(typeof CampaignEffects,'function');const calls=[],p={play:key=>calls.push(key),loop:(key,on)=>calls.push([key,on]),stop:key=>calls.push(['stop',key])};
 const c=new CampaignEffects(p),run={world:{events:[],wells:[],charge:60},paused:false,finishReady:false,state:'active',phase:'working',qualified:false,ratio:0,skillState:()=>({passive:{count:4,threshold:4},active:{id:'orbital',available:true,used:0}})};
 c.start(run);c.frame(run);c.frame(run);assert.equal(calls.filter(k=>k==='active-ready').length,1);assert(!calls.some(k=>typeof k==='string'&&k.includes('passive')));
 run.world.wells=[{}];run.world.events=[{kind:'tool-gravity',phase:'start'},{kind:'sound-active-deploy'},{kind:'sound-orbital-fall'}];c.frame(run);
 assert(calls.includes('blackhole-open')&&calls.includes('active-deploy')&&calls.includes('orbital-fall'));
 run.world.events=[];run.world.wells=[];c.frame(run);assert.equal(calls.filter(k=>k==='blackhole-close').length,1);
 run.qualified=true;run.ratio=.7;c.frame(run);c.frame(run);assert.equal(calls.filter(k=>k==='progress-success').length,1);
 c.pause();assert(calls.some(k=>Array.isArray(k)&&k[0]==='stop'&&k[1]==='blackhole-loop'));
});
test('real passive blast events are silent while orbital deployment and payload events remain audible',async()=>{
 const {ArchWorld}=await import('../src/arch/world.js');const {ARCH_SITES}=await import('../src/arch/maps.js');const {freshProfile}=await import('../src/arch/journey.js');
 const w=new ArchWorld(ARCH_SITES[0],freshProfile());
 w.execute({kind:'echo',x:1,y:1,radius:2,power:.5});w.execute({kind:'relay-hit',x:1,y:1,radius:2,power:.5});
 const passive=w.events.filter(e=>e.kind==='tool-blast'&&e.phase==='blast');assert.equal(passive.length,2);assert(passive.every(e=>e.audio===false));
 const {GameSound}=await import('../src/free30/game-sound.js');let blasts=0;
 const sound=new GameSound({locked:false,add:()=>({play(){blasts++;},setVolume(){},stop(){},destroy(){}})},true,key=>key==='blast');
 sound.update(.1,0,passive);assert.equal(blasts,0);
 w.events.length=0;assert(w.activateDevice('orbital',1));w.deviceTick(.5);
 assert(w.events.some(e=>e.kind==='sound-active-deploy'));assert(w.events.some(e=>e.kind==='sound-orbital-fall'));
 w.events.length=0;w.hitSatellite({x:1,radius:2,power:1},1);assert(w.events.some(e=>e.kind==='tool-blast'&&e.audio!==false));sound.update(.1,0,w.events);assert.equal(blasts,1);assert(w.diagnostics().balanced);
});
