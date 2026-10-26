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
