export class CollectionSound {
 constructor(manager,enabled=true){
  this.manager=manager;this.enabled=enabled;this.collected=0;this.cooldown=0;this.next=0;
  this.voices=Array.from({length:6},()=>manager.add('pixel-collect'));
 }
 update(dt,collected,active=true){
  const gained=collected>this.collected;this.collected=collected;
  if(!active||!this.enabled){this.stop();return;}
  this.cooldown=Math.max(0,this.cooldown-dt);
  // Batch rapid intake; never queue hundreds of pixel sounds behind the action.
  if(!gained||this.cooldown>0||this.manager.locked)return;
  const voice=this.voices[this.next];this.next=(this.next+1)%this.voices.length;
  if(voice.isPlaying)voice.stop();
  voice.play({volume:.15,rate:.96+Math.random()*.08});this.cooldown=.04;
 }
 stop(){for(const voice of this.voices)if(voice.isPlaying)voice.stop();this.cooldown=0;}
 setEnabled(enabled){this.enabled=enabled;if(!enabled)this.stop();}
 destroy(){this.stop();for(const voice of this.voices)voice.destroy();}
}
