import {LoopMusic,musicBytes} from '../../paid-app/src/feedback-core.js';

export function bootFreeMusic(storage,url,doc=document,effects){
 const view=doc.defaultView,settings={value:{music:true,musicVolume:.5}};
 const music=new LoopMusic(settings,()=>new (view.AudioContext||view.webkitAudioContext)(),async()=>musicBytes(await view.fetch(url),false));
 const readEnabled=()=>{try{settings.value.music=storage.getItem('free30-collection-sound')!=='off';}catch{}effects?.setEnabled(settings.value.music);};
 const unlock=()=>{readEnabled();void music.unlock();};
 let focused=true;
 const active=()=>{const enabled=focused&&!doc.hidden;void music.setActive(enabled);effects?.setActive(enabled);};
 doc.addEventListener('pointerdown',unlock,{passive:true});
 doc.addEventListener('keydown',unlock);
 // Existing button handlers persist the sound choice before this bubbles.
 doc.addEventListener('click',event=>{if(event.target.closest?.('[data-game-sound]')){readEnabled();void music.sync();}});
 doc.addEventListener('visibilitychange',active);
 view.addEventListener('blur',()=>{focused=false;active();});
 view.addEventListener('focus',()=>{focused=true;active();});
 readEnabled();active();
 return music;
}
