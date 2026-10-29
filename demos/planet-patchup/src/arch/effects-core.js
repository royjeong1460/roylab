// Keeps the approved preview's effect/music ratio close to the default 0.125 music gain.
export const EFFECT_GAIN=.2;
const gaps={'ui-tap':.055,'ui-confirm':.16,'ui-unavailable':.22,'blackhole-open':.18,'blackhole-close':.18,'active-ready':.3,'active-deploy':.4,'orbital-fall':.18,'progress-success':.8};
const levels={'blackhole-loop':.75,'active-ready':.85,'orbital-fall':.85};
const gameplay=['blackhole-open','blackhole-loop','blackhole-close','active-ready','active-deploy','orbital-fall'];

export class SoftEffects{
 constructor(createContext,loadBytes){Object.assign(this,{createContext,loadBytes,enabled:true,active:true,volume:1,unlocked:false});this.buffers=new Map();this.voices=new Map();this.retiring=new Set();this.pending=new Map();this.loops=new Set();this.last=new Map();this.epoch=0;}
 async unlock(){
  this.unlocked=true;if(!this.enabled||!this.active)return;
  try{
   if(!this.ctx){this.ctx=this.createContext();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.setVolume(this.volume);}
   await this.ctx.resume();
  }catch{}
 }
 prepare(key){
  if(!this.ctx)return Promise.reject(Error('Audio not unlocked'));
  if(!this.buffers.has(key))this.buffers.set(key,this.loadBytes(key).then(bytes=>this.ctx.decodeAudioData(bytes)).catch(error=>{this.buffers.delete(key);throw error;}));
  return this.buffers.get(key);
 }
 async play(key,loop=false){
  if(!this.enabled||!this.active||!this.unlocked||this.volume<=0)return false;
  if(!this.ctx)await this.unlock();if(!this.ctx)return false;
  const now=this.ctx.currentTime;
  if(loop&&(this.voices.has(key)||this.pending.has(key)))return false;
  if(!loop&&now-(this.last.get(key)??-Infinity)<(gaps[key]??.1))return false;
  if(key==='ui-confirm'||key==='ui-unavailable')this.stop('ui-tap');
  this.last.set(key,now);const ticket=Symbol(key),epoch=this.epoch;this.pending.set(key,ticket);
  try{
   const buffer=await this.prepare(key);
   if(epoch!==this.epoch||this.pending.get(key)!==ticket||!this.enabled||!this.active||this.volume<=0||loop&&!this.loops.has(key))return false;
   this.stopVoice(key);
   if(this.voices.size>=6)this.stopVoice(this.voices.keys().next().value);
   const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=loop;
   gain.gain.value=loop?0:(levels[key]??1);source.connect(gain);gain.connect(this.master);
   if(loop)gain.gain.linearRampToValueAtTime(levels[key]??1,this.ctx.currentTime+.06);
   const voice={source,gain};this.voices.set(key,voice);
   source.onended=()=>{source.disconnect();gain.disconnect();this.retiring.delete(voice);if(this.voices.get(key)===voice)this.voices.delete(key);};
   source.start();this.onPlay?.(key);return true;
  }catch{return false;}finally{if(this.pending.get(key)===ticket)this.pending.delete(key);}
 }
 loop(key,on){if(!on){this.stop(key);return Promise.resolve(false);}this.loops.add(key);return this.play(key,true);}
 stopVoice(key){
  const voice=this.voices.get(key);if(!voice)return;this.voices.delete(key);this.retiring.add(voice);
  const t=this.ctx.currentTime;voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setValueAtTime(voice.gain.gain.value,t);voice.gain.gain.linearRampToValueAtTime(0,t+.02);
  try{voice.source.stop(t+.025);}catch{}
 }
 stop(key){this.loops.delete(key);this.pending.delete(key);this.stopVoice(key);}
 stopAll(){
  this.epoch++;this.pending.clear();this.loops.clear();for(const key of [...this.voices.keys()])this.stopVoice(key);
  // Suspension freezes scheduled fades too; discard their tails before resuming later.
  for(const voice of this.retiring){voice.gain.gain.cancelScheduledValues(this.ctx.currentTime);voice.gain.gain.value=0;try{voice.source.stop();}catch{}}
  this.retiring.clear();
 }
 setEnabled(enabled){this.enabled=enabled;if(!enabled){this.stopAll();void this.ctx?.suspend().catch(()=>{});}else if(this.unlocked)void this.unlock();}
 setActive(active){this.active=active;if(!active){this.stopAll();void this.ctx?.suspend().catch(()=>{});}else if(this.unlocked)void this.unlock();}
 setVolume(volume){this.volume=Math.max(0,Math.min(1,volume));if(this.master)this.master.gain.value=EFFECT_GAIN*this.volume;if(!this.volume)this.stopAll();}
}

export class CampaignEffects{
 constructor(player){this.player=player;}
 start(run){this.leave();this.run=run;this.wells=0;this.ready=false;this.qualified=!!run.qualified;this.complete=run.ratio>=1;this.empty=false;void this.player.play('ui-confirm');}
 frame(run){
  if(this.run!==run)this.start(run);
  if(run.paused||run.finishReady){this.pause();return;}
  const world=run.world;
  if(!this.ready&&run.skillState().active.available&&!this.player.voices?.has('ui-confirm')){this.ready=true;void this.player.play('active-ready');}
  for(const event of world.events){
   if(event.kind==='tool-gravity'&&event.phase==='start')void this.player.play('blackhole-open');
   else if(event.kind==='sound-active-deploy')void this.player.play('active-deploy');
   else if(event.kind==='sound-orbital-fall')void this.player.play('orbital-fall');
  }
  const wells=world.wells.length;
  void this.player.loop('blackhole-loop',wells>0);
  if(this.wells>0&&!wells)void this.player.play('blackhole-close');
  this.wells=wells;
  if(!this.empty&&run.phase==='finishing'){this.empty=true;void this.player.play('ui-unavailable');}
  if(run.qualified&&!this.qualified||run.ratio>=1&&!this.complete)void this.player.play('progress-success');
  this.qualified=!!run.qualified;this.complete=run.ratio>=1;
 }
 pause(){for(const key of gameplay)this.player.stop(key);}
 leave(){this.pause();this.run=null;}
 finish(result){
  const success=result.allClear&&!this.complete||result.qualified&&!this.qualified;
  this.leave();void this.player.play(success?'progress-success':'ui-confirm');
 }
}
