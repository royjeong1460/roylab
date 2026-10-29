export const BLAST_GAIN=.25;
export const AUDIO_SETTINGS_KEY='paid-audio-v1';
export async function musicBytes(response,native){
 // Capacitor serves bundled media as URLResponse, which WKWebView exposes as status 0.
 if(!response.ok&&!(native&&response.status===0))throw Error(`Music unavailable (${response.status})`);
 const bytes=await response.arrayBuffer();if(!bytes.byteLength)throw Error('Empty music file');return bytes;
}
const defaults={music:true,musicVolume:.5,effects:true,effectsVolume:1,haptics:true};
export class FeedbackSettings{
 constructor(storage){
  this.storage=storage;this.value={...defaults};this.listeners=new Set();
  try{
   this.value.effects=storage.getItem('free30-collection-sound')!=='off';
   const saved=JSON.parse(storage.getItem(AUDIO_SETTINGS_KEY)||'{}');
   for(const key of Object.keys(defaults))if(typeof saved?.[key]===typeof defaults[key])this.value[key]=typeof defaults[key]==='number'?Math.max(0,Math.min(1,Number.isFinite(saved[key])?saved[key]:defaults[key])):saved[key];
  }catch{}
 }
 set(key,value){
  if(!(key in defaults)||typeof value!==typeof defaults[key])return;
  this.value[key]=typeof value==='number'?Math.max(0,Math.min(1,Number.isFinite(value)?value:defaults[key])):value;
  try{this.storage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(this.value));}catch{}
  for(const listener of this.listeners)listener(this.value);
 }
 subscribe(listener){this.listeners.add(listener);return()=>this.listeners.delete(listener);}
}

// One page-wide buffer survives scene teardown. AudioContext suspension freezes
// the loop when the app leaves the foreground instead of restarting each map.
export class LoopMusic{
 constructor(settings,createContext,loadBytes){this.settings=settings;this.createContext=createContext;this.loadBytes=loadBytes;this.active=true;this.unlocked=false;this.status='waiting';this.onStatus=()=>{};}
 report(status){this.status=status;this.onStatus(status);}
 async unlock(){
  this.unlocked=true;
  if(!this.active||!this.settings.value.music){await this.sync();return;}
  try{
   if(!this.ctx){this.ctx=this.createContext();this.gain=this.ctx.createGain();this.gain.connect(this.ctx.destination);}
   // Call resume inside the input gesture, before fetching/decoding the asset.
   const resume=this.ctx.resume();resume.catch(()=>{});
   if(!this.buffer){
    if(!this.loading)this.loading=this.loadBytes().then(bytes=>this.ctx.decodeAudioData(bytes)).then(buffer=>this.buffer=buffer).finally(()=>this.loading=null);
    await this.loading;
   }
   await resume;await this.sync();
  }catch{this.report('unavailable');}
 }
 async sync(){
  const enabled=this.settings.value.music&&this.settings.value.musicVolume>0;
  if(this.gain)this.gain.gain.value=BLAST_GAIN*this.settings.value.musicVolume;
  if(!enabled||!this.active){if(this.ctx)await this.ctx.suspend().catch(()=>{});this.report(enabled?'paused':'off');return;}
  if(!this.unlocked){this.report('waiting');return;}
  if(!this.buffer){await this.unlock();return;}
  if(!this.source){this.source=this.ctx.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;this.source.connect(this.gain);this.source.start();}
  try{await this.ctx.resume();if(!this.active||!this.settings.value.music){await this.ctx.suspend();this.report(this.active?'off':'paused');}else this.report('playing');}catch{this.report('waiting');}
 }
 async setActive(active){this.active=active;await this.sync();}
}

export function scaledManager(manager,volume){
 return {get locked(){return manager.locked;},add(key){
  const voice=manager.add(key);
  return new Proxy(voice,{get(target,property){
   if(property==='play')return options=>target.play({...options,volume:(options?.volume??1)*volume()});
   if(property==='setVolume')return value=>target.setVolume(value*volume());
   const value=Reflect.get(target,property);return typeof value==='function'?value.bind(target):value;
  }});
 }};
}

export class HapticFeedback{
 constructor(settings,pulse){this.settings=settings;this.pulse=pulse;this.cooldown=0;this.attackCooldown=0;this.collected=0;}
 update(dt,collected,events,active){
  const gained=collected>this.collected;this.collected=collected;
  if(!active||!this.settings.value.haptics){this.cooldown=0;this.attackCooldown=0;return;}
  this.cooldown=Math.max(0,this.cooldown-dt);this.attackCooldown=Math.max(0,this.attackCooldown-dt);
  const attack=events.some(e=>e.kind==='tool-blast'&&e.phase==='blast'||e.kind==='tool-gravity'&&e.phase==='start');
  if(attack?this.attackCooldown>0:!gained||this.cooldown>0)return;
  this.cooldown=attack?.2:.35;
  if(attack)this.attackCooldown=.2;
  try{Promise.resolve(this.pulse(attack?'MEDIUM':'LIGHT')).catch(()=>{});}catch{}
 }
}
