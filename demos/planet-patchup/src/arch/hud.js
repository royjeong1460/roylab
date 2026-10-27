const blastIcon=new URL('./icons/tool-blast.svg',import.meta.url).href;
const wellIcon=new URL('./icons/tool-blackhole.svg',import.meta.url).href;
const aftershockIcon=new URL('./icons/passive-aftershock.svg',import.meta.url).href;
const relayIcon=new URL('./icons/passive-impact-relay.svg',import.meta.url).href;
const orbitalIcon=new URL('./icons/active-orbital-drop.svg',import.meta.url).href;
const batteryIcon=new URL('./icons/hud-battery.svg',import.meta.url).href;
const recoveryIcon=new URL('./icons/hud-recovery.svg',import.meta.url).href;
const switchIcon=new URL('./icons/hud-switch.svg',import.meta.url).href;
const passiveIcons={aftershock:aftershockIcon,relay:relayIcon};
import {SKILLS} from './balance.js';
export function renderSkillHUD(doc,run,onActivate){
 const {passive:p,active:a}=run.skillState(),hud=doc.getElementById('arch-skill-hud'),passive=doc.getElementById('arch-passive'),button=doc.getElementById('arch-active');
 const ready=!!p.id&&p.count>=p.threshold-1;hud.hidden=!ready&&!a.id;passive.hidden=!ready;
 if(ready){passive.src=passiveIcons[p.id];passive.alt=passive.title=`${SKILLS[p.id].name} · next Blast`;}
 button.hidden=!a.id;button.disabled=!a.available;button.title=button.ariaLabel=`Orbital Drop · ${a.used?'Used':'Ready'}`;button.classList.toggle('used',!!a.used);
 button.onpointerdown=e=>{e.preventDefault();e.stopPropagation();};button.onclick=e=>{e.preventDefault();e.stopPropagation();onActivate();};
}
export function renderToolSwitch(doc,run){
 const b=doc.getElementById('arch-tool-switch'),well=run.world.tool==='blackhole';
 b.querySelector('img').src=well?wellIcon:blastIcon;b.title=b.ariaLabel=run.profile.owned.includes('blackhole')?`${well?'Black Hole':'Blast'} · switch tool`:'Blast · Black Hole not learned';
 b.disabled=run.paused||run.finishReady||run.state!=='active';b.querySelector('.switch-icon').hidden=!run.profile.owned.includes('blackhole');
 b.onclick=e=>{e.stopPropagation();if(run.profile.owned.includes('blackhole'))doc.querySelector(`[data-tool="${well?'bomb':'blackhole'}"]`).click();};
}
export function mountMinimalHUD(doc){
 doc.documentElement.classList.add('arch-design');
 const meters=doc.querySelector('.compact-hud .meters');
 for(const [id,icon,label]of [['charge',batteryIcon,'Battery'],['recovered',recoveryIcon,'Recovery']]){const strong=doc.getElementById(id),progress=doc.getElementById(id==='charge'?'energy':'recovery'),wrap=strong.parentNode;wrap.replaceChildren();const img=doc.createElement('img');img.src=icon;img.alt=label;wrap.append(img,strong,progress);}
 meters.prepend(doc.getElementById('charge').parentNode);
 const b=doc.createElement('button');b.id='arch-tool-switch';b.type='button';b.innerHTML=`<img src="${blastIcon}" alt=""><img class="switch-icon" src="${switchIcon}" alt="">`;b.ariaLabel='Blast';b.onpointerdown=e=>{e.preventDefault();e.stopPropagation();};doc.getElementById('playfield').append(b);
 const tutorial=doc.getElementById('tutorial-replay');tutorial.querySelector('strong').textContent='Tutorial';tutorial.querySelector('small').textContent='Blast · Suction · Upgrades';tutorial.querySelector('.stage-best').textContent='Practice';
}

export function mountSkillHUD(doc){const hud=doc.createElement('div');hud.id='arch-skill-hud';hud.hidden=true;hud.innerHTML=`<img id="arch-passive" hidden alt=""><button id="arch-active" type="button" hidden><img src="${orbitalIcon}" alt=""></button>`;doc.getElementById('playfield').append(hud);}

export function mountCleanupHUD(doc){
 const hud=doc.createElement('div');hud.id='arch-cleanup';hud.hidden=true;
 hud.innerHTML='<div class="cleanup-intro" aria-hidden="true">BATTERY EMPTY<span>Finish collecting</span></div><div class="cleanup-complete" aria-hidden="true">All pixels collected<span>Returning to camp…</span></div><div class="cleanup-clock"><span>COLLECT</span><strong id="arch-cleanup-seconds"></strong><span class="cleanup-track"><i></i></span></div><span id="arch-cleanup-status" class="cleanup-sr" role="status" aria-live="polite"></span>';
 doc.getElementById('playfield').append(hud);
}
export const collectionComplete=run=>run.finishReady&&['drained','collected'].includes(run.finishReason);
export function renderCleanupHUD(doc,run){
 const complete=collectionComplete(run),hud=doc.getElementById('arch-cleanup'),visible=run.state==='active'&&(complete||run.phase==='finishing'&&!run.finishReady);
 hud.dataset.complete=String(complete);
 const entered=hud.hidden&&visible;hud.hidden=!visible;if(!visible)return;
 const status=doc.getElementById('arch-cleanup-status');
 if(complete){if(status.textContent!=='All pixels collected. Returning to camp.')status.textContent='All pixels collected. Returning to camp.';return;}
 const seconds=Math.max(1,Math.ceil(run.finishRemaining)),label=doc.getElementById('arch-cleanup-seconds');
 if(label.textContent!==String(seconds))label.textContent=String(seconds);
 const resumed=hud.dataset.paused==='true'&&!run.paused;
 hud.dataset.urgent=String(seconds<=3);hud.dataset.paused=String(run.paused);
 hud.style.setProperty('--cleanup-left',String(Math.max(0,Math.min(1,run.finishRemaining/10))));
 const message=run.paused?'Collection paused':entered?'Battery empty. Finish collecting. Up to 10 seconds.':seconds<=3?`${seconds} seconds to collect.`:resumed?'Collection resumed.':'';
 if(message&&status.textContent!==message)status.textContent=message;
}
