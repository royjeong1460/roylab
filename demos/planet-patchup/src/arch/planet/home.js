import {createPlanetGlobe} from './globe.js';
import {homeRegions} from './regions.js';
import {mountSatelliteOrbit} from './orbit.js';
import rustMoon from './scenery/rust-moon.svg';
import slateMoon from './scenery/slate-moon.svg';
import sky from './assets/desert/sky.png';

// Approved 390 × 844 composition, wired to the campaign's real buttons.
export function mountPlanetHome(doc){
 const base=doc.getElementById('base'),keep=id=>doc.getElementById(id);
 const options=keep('home-options'),enter=keep('dispatch'),upgrade=keep('workshop-open'),maps=keep('home-zones'),editor=keep('home-map-maker'),zoneLink=keep('home-zone-link'),caption=keep('start-caption');
 base.classList.add('planet-home');
 base.innerHTML=`<div class="home-composition">
 <img class="planet-sky" src="${sky}" alt="" aria-hidden="true">
 <div class="planet-topline"><span id="zone-number"></span><span class="planet-edition">FREE</span></div>
 <header class="planet-heading"><p>행성을 지켜줘!</p><h1 class="planet-brand">PLANET<br>PATCHUP</h1></header>
 <div class="orbital-scenery" aria-hidden="true"><img class="moon-left" src="${rustMoon}" alt=""><img class="moon-right" src="${slateMoon}" alt=""></div>
 <section class="planet-field" aria-label="Planet regions"><canvas id="globe" width="192" height="192" role="img" aria-label="Desert planet with six cleanup regions"></canvas><div class="planet-pins"></div><span id="region-pin" aria-hidden="true"><i></i></span></section>
 <div class="satellite-orbit" aria-hidden="true"></div>
 <section class="planet-selection"><div class="orbit-nav"><button id="prev" aria-label="Previous region">‹</button><div class="selected-region"><span id="zone-name" aria-live="polite"></span><small id="zone-status"></small></div><button id="next" aria-label="Next region">›</button></div><div id="dots" aria-label="Region list"></div></section>
 <section class="planet-action"></section><footer class="planet-footer"></footer><div class="home-current-zone" hidden></div></div>`;
 const q=s=>base.querySelector(s);
 options.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1h6v6H1zm8 0h6v6H9zM1 9h6v6H1zm8 0h6v6H9z" fill="currentColor"/></svg>';
 options.setAttribute('aria-label','Options');q('.home-composition').append(options);
 caption.hidden=true;q('.planet-action').append(enter,caption);upgrade.textContent='Upgrades';
 const regionMenu=doc.createElement('button');regionMenu.id='planet-regions';regionMenu.textContent='Regions';regionMenu.setAttribute('aria-haspopup','dialog');
 const achievements=doc.createElement('button');achievements.disabled=true;achievements.innerHTML='Achievements<small>Coming soon</small>';
 q('footer').append(upgrade,regionMenu,achievements);q('.home-current-zone').append(zoneLink,maps);
 const full=doc.createElement('button');full.id='planet-full-game';full.textContent='Full Game';full.setAttribute('aria-haspopup','dialog');
 editor.textContent='Map Maker ↗';keep('home-options-dialog').querySelector('.home-back-link').before(full,editor);
 const dialog=doc.createElement('dialog');dialog.id='planet-full-dialog';dialog.className='home-dialog';dialog.setAttribute('aria-labelledby','planet-full-title');
 dialog.innerHTML='<div class="home-dialog-heading"><h2 id="planet-full-title">Full Game</h2><button aria-label="Close full game details">×</button></div><p>One planet. Six cultural regions.</p><p>Arch Quarter is free to play. Five more regions are planned for the full game.</p><p class="fine">The full game is not available to purchase yet.</p>';
 doc.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();full.onclick=()=>{keep('home-options-dialog').close();dialog.showModal();};
 options.onclick=()=>keep('home-options-dialog').showModal();
 for(const id of ['home-options-dialog','home-zones-dialog'])keep(id).querySelector('[data-home-close]').onclick=()=>keep(id).close();
 const regionDialog=doc.createElement('dialog');regionDialog.id='planet-regions-dialog';regionDialog.className='home-dialog';regionDialog.setAttribute('aria-labelledby','planet-regions-title');
 regionDialog.innerHTML='<div class="home-dialog-heading"><h2 id="planet-regions-title">Regions</h2><button aria-label="Close regions">×</button></div><div class="planet-region-list"></div>';
 doc.body.append(regionDialog);regionDialog.querySelector('button').onclick=()=>regionDialog.close();regionMenu.onclick=()=>regionDialog.showModal();
 let selected=0,regions=homeRegions({});const markers=[],regionButtons=[];
 function select(index){selected=(index+regions.length)%regions.length;globe.select(selected);sync();}
 for(let i=0;i<regions.length;i++){
  const dot=doc.createElement('button');dot.onclick=()=>select(i);q('#dots').append(dot);
  const marker=doc.createElement('button');marker.className='planet-pin';marker.onclick=()=>select(i);q('.planet-pins').append(marker);markers.push(marker);
  const choice=doc.createElement('button');choice.className='planet-region-choice';choice.onclick=()=>{select(i);regionDialog.close();};regionDialog.querySelector('.planet-region-list').append(choice);regionButtons.push(choice);
 }
 const globe=createPlanetGlobe(q('#globe'),q('#region-pin'),markers);
 function sync(){
  const region=regions[selected];q('#zone-number').textContent=String(selected+1).padStart(2,'0')+' / 06';
  q('#zone-name').textContent=region.available?region.name+(region.cleared?' ✓':''):'?';
  q('#zone-status').textContent=region.available?(region.cleared?'Restored':region.restoration?`${Math.round(region.restoration*100)}% restored`:'Available'):'Undiscovered';
  q('#globe').setAttribute('aria-label',region.available?`${region.name} · ${q('#zone-status').textContent}`:'Undiscovered region');
  enter.disabled=!region.available;enter.innerHTML=region.available?'Enter <span>→</span>':'Undiscovered';zoneLink.disabled=!region.available;
  for(const [i,b] of [...q('#dots').children].entries()){
   const r=regions[i],label=`${i+1}. ${r.available?r.name:'? · Undiscovered'}`;
   b.dataset.locked=String(!r.available);b.dataset.cleared=String(r.cleared);b.setAttribute('aria-current',String(i===selected));b.setAttribute('aria-label',label);markers[i].setAttribute('aria-label',label);
   regionButtons[i].textContent=`${String(i+1).padStart(2,'0')} · ${r.available?r.name:'?'}`;regionButtons[i].setAttribute('aria-pressed',String(i===selected));
  }
 }
 q('#prev').onclick=()=>select(selected-1);q('#next').onclick=()=>select(selected+1);
 const field=q('.planet-field');let down;
 field.addEventListener('pointerdown',e=>{if(!e.target.closest('button'))down={x:e.clientX,y:e.clientY};});
 field.addEventListener('pointerup',e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;down=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)select(selected+(dx<0?1:-1));});
 for(const event of ['pointercancel','pointerleave'])field.addEventListener(event,()=>down=null);
 const observer=new doc.defaultView.ResizeObserver(([entry])=>{if(!entry.contentRect.width)return;const scale=entry.contentRect.width/390;q('.home-composition').style.transform=`scale(${scale})`;base.style.height=`${844*scale}px`;});observer.observe(base);
 const orbit=mountSatelliteOrbit(base,q('.satellite-orbit'));sync();
 return {update(profile){regions=homeRegions(profile);globe.update(regions);sync();},destroy(){observer.disconnect();orbit.destroy();globe.destroy();}};
}
