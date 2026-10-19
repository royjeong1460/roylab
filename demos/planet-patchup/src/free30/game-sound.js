import {CollectionSound} from './collection-sound.js';

export class GameSound {
 constructor(manager,enabled=true,hasAudio=()=>true){
  this.manager=manager;this.enabled=enabled;
  this.collection=hasAudio('pixel-collect')?new CollectionSound(manager,enabled):null;
  const channel=(key)=>({voices:hasAudio(key)?Array.from({length:2},()=>manager.add(key)):[],next:0,wait:0});
  this.blast=channel('blast');this.impact=channel('debris-impact');
 }
 play(channel,volume,rate){
  if(!channel.voices.length)return;
  const voice=channel.voices[channel.next];channel.next=(channel.next+1)%channel.voices.length;
  if(voice.isPlaying)voice.stop();voice.mixVolume=volume;voice.play({volume,rate});
 }
 update(dt,collected,events=[],active=true){
  if(!active||!this.enabled||this.manager.locked){this.collection?.update(dt,collected,false);this.stop();return;}
  this.blast.wait=Math.max(0,this.blast.wait-dt);this.impact.wait=Math.max(0,this.impact.wait-dt);
  if(this.blast.wait===0&&events.some(e=>e.kind==='tool-blast'&&e.phase==='blast')){
   this.play(this.blast,.25,.98+Math.random()*.04);this.blast.wait=.09;
  }
  let hit=null;
  for(const event of events)if(event.kind==='sound-impact'&&event.speed>=8&&event.energy>0&&(!hit||event.energy>hit.energy))hit=event;
  if(hit&&this.impact.wait===0){
   this.play(this.impact,.035+Math.min(1,Math.sqrt(hit.energy)/8)*.085,.94+Math.random()*.12);this.impact.wait=.06;
  }
  // Keep simultaneous channels, but let explosions take the foreground.
  const blasting=this.blast.voices.some(v=>v.isPlaying),colliding=this.impact.voices.some(v=>v.isPlaying);
  for(const voice of this.impact.voices)if(voice.isPlaying)voice.setVolume(Math.min(voice.mixVolume,blasting?.08:.12));
  this.collection?.update(dt,collected,true,blasting?.04:colliding?.09:.15);
 }
 stop(){this.collection?.stop();for(const channel of [this.blast,this.impact]){channel.wait=0;for(const voice of channel.voices)if(voice.isPlaying)voice.stop();}}
 setEnabled(enabled){this.enabled=enabled;this.collection?.setEnabled(enabled);if(!enabled)this.stop();}
 destroy(){this.stop();this.collection?.destroy();for(const channel of [this.blast,this.impact])for(const voice of channel.voices)voice.destroy();}
}
