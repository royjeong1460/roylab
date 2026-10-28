import {createPlanetGlobe} from './globe.js';
import {homeRegions} from './regions.js';
import rustMoon from './scenery/rust-moon.svg';
import slateMoon from './scenery/slate-moon.svg';
import satellite from './scenery/dead-satellite.svg';

// Adapted from 픽셀디자인 V10. Keep the campaign's real buttons and their handlers.
export function mountPlanetHome(doc){
 const base=doc.getElementById('base'),keep=id=>doc.getElementById(id);
 const options=keep('home-options'),enter=keep('dispatch'),upgrade=keep('workshop-open'),maps=keep('home-zones'),editor=keep('home-map-maker'),zoneLink=keep('home-zone-link'),caption=keep('start-caption');
 base.classList.add('planet-home');
 base.innerHTML=`<header class="planet-heading"><div class="planet-brand">PLANET<br><span>PATCHUP</span></div><span class="planet-edition">FREE</span></header>
 <section class="planet-stage" aria-label="Planet regions">
  <div class="orbital-scenery" aria-hidden="true">
   <img class="distant-moon moon-left" src="${rustMoon}" alt="">
   <img class="distant-moon moon-right" src="${slateMoon}" alt="">
   <img class="dead-satellite satellite-upper" src="${satellite}" alt="">
   <img class="dead-satellite satellite-lower" src="${satellite}" alt="">
  </div>
  <div class="planet-bubble" aria-live="polite"><small id="zone-number"></small><span id="zone-name"></span></div>
  <div class="planet-portrait"><canvas id="globe" width="192" height="192" role="img" aria-label="Planet with two continents"></canvas><span id="region-pin" aria-hidden="true"><i></i></span></div>
  <div class="orbit-nav"><button id="prev" aria-label="Previous region"><svg viewBox="0 0 8 12" aria-hidden="true"><path d="M6 0h2v2H6v2H4v4h2v2h2v2H6v-2H4V8H2V4h2V2h2z" fill="currentColor"/></svg></button><div id="dots" aria-label="Region list"></div><button id="next" aria-label="Next region"><svg viewBox="0 0 8 12" aria-hidden="true"><path d="M0 0h2v2h2v2h2v4H4v2H2v2H0v-2h2V8h2V4H2V2H0z" fill="currentColor"/></svg></button></div>
 </section><section class="planet-action"></section><footer class="planet-footer"></footer><div class="home-current-zone" hidden><span></span></div>`;
 const q=s=>base.querySelector(s);
 options.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v2h2v2h2v6h-2v2h-2v2H6v-2H4v-2H2V5h2V3h2z" fill="currentColor"/><path d="M6 6h4v4H6z" fill="#091322"/></svg>';
 options.setAttribute('aria-label','Options');q('header').append(options);
 caption.hidden=true;q('.planet-action').append(enter,caption);
 upgrade.textContent='↑ Upgrades';
 const dot=doc.createElement('span');dot.className='footer-dot';dot.textContent='·';dot.setAttribute('aria-hidden','true');
 const full=doc.createElement('button');full.id='planet-full-game';full.textContent='Full Game ⌑';full.setAttribute('aria-haspopup','dialog');
 q('footer').append(upgrade,dot,full);
 q('.home-current-zone').append(zoneLink,maps);
 editor.textContent='Map Maker ↗';
 keep('home-options-dialog').querySelector('.home-back-link').before(editor);
 const dialog=doc.createElement('dialog');dialog.id='planet-full-dialog';dialog.className='home-dialog';dialog.setAttribute('aria-labelledby','planet-full-title');
 dialog.innerHTML='<div class="home-dialog-heading"><h2 id="planet-full-title">Full Game</h2><button aria-label="Close full game details">×</button></div><p>One planet. Six cultural regions.</p><p>Arch Quarter is free to play. Five more regions are planned for the full game.</p><p class="fine">The full game is not available to purchase yet.</p>';
 doc.body.append(dialog);
 dialog.querySelector('button').onclick=()=>dialog.close();
 full.onclick=()=>dialog.showModal();
 options.onclick=()=>keep('home-options-dialog').showModal();
 for(const id of ['home-options-dialog','home-zones-dialog'])keep(id).querySelector('[data-home-close]').onclick=()=>keep(id).close();
 const globe=createPlanetGlobe(q('#globe'),q('#region-pin'));
 let selected=0,regions=homeRegions({});
 function sync(){
  const region=regions[selected];
  q('#zone-number').textContent=String(selected+1).padStart(2,'0')+' / 06';
  q('#zone-name').textContent=region.available?region.name+(region.cleared?' ✓':''):'?';
  q('#globe').setAttribute('aria-label',region.available?`${region.name} · ${region.cleared?'Restored':region.restoration?`${Math.round(region.restoration*100)}% restored`:'Awaiting cleanup'}`:'Undiscovered region');
  enter.disabled=!region.available;enter.innerHTML=region.available?'Enter <span>→</span>':'Undiscovered';
  zoneLink.disabled=!region.available;
  for(const [i,b]of [...q('#dots').children].entries()){
   const r=regions[i];b.dataset.locked=String(!r.available);b.dataset.cleared=String(r.cleared);b.setAttribute('aria-current',String(i===selected));b.setAttribute('aria-label',`${i+1}. ${r.available?r.name:'? · Undiscovered'}`);
  }
 }
 function select(index){selected=(index+regions.length)%regions.length;globe.select(selected);sync();}
 for(let i=0;i<regions.length;i++){const b=doc.createElement('button');b.onclick=()=>select(i);q('#dots').append(b);}
 q('#prev').onclick=()=>select(selected-1);q('#next').onclick=()=>select(selected+1);
 sync();
 return {update(profile){regions=homeRegions(profile);globe.update(regions);sync();}};
}
