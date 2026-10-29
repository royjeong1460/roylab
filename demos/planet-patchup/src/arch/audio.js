import {SoftEffects,CampaignEffects} from './effects-core.js';
import {EFFECT_URLS} from './effect-assets.js';
import {musicBytes} from '../../paid-app/src/feedback-core.js';
export let effects,campaignEffects;
export function initEffects(doc=document,native=false){
 if(effects)return effects;
 const view=doc.defaultView;
 effects=new SoftEffects(()=>new (view.AudioContext||view.webkitAudioContext)(),async key=>musicBytes(await view.fetch(EFFECT_URLS[key]),native));
 campaignEffects=new CampaignEffects(effects);
 const unlock=()=>{void effects.unlock().then(()=>Promise.allSettled(Object.keys(EFFECT_URLS).map(key=>effects.prepare(key))));};
 doc.addEventListener('pointerdown',unlock,{passive:true});doc.addEventListener('keydown',unlock);
 doc.addEventListener('click',event=>{
  const button=event.target.closest?.('button,[role="button"],input[type="checkbox"]');
  if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||button.matches('#offers button,#arch-skills button,#arch-active,.stage-row,#tutorial-replay,#practice,#workshop-retry,#workshop-boss,#pause-return'))return;
  void effects.play('ui-tap');
 });
 return effects;
}
