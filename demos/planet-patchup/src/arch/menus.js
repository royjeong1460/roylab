import {FREE_STAGES,stageBest,stageOpen} from './stages.js';
import {SKILLS,freeStats,distinctClears} from './balance.js';

const icons={
 battery:new URL('./icons/hud-battery.svg',import.meta.url).href,
 collect:new URL('./icons/hud-recovery.svg',import.meta.url).href,
 blast:new URL('./icons/tool-blast.svg',import.meta.url).href,
 well:new URL('./icons/tool-blackhole.svg',import.meta.url).href,
 aftershock:new URL('./icons/passive-aftershock.svg',import.meta.url).href,
 relay:new URL('./icons/passive-impact-relay.svg',import.meta.url).href,
 orbital:new URL('./icons/active-orbital-drop.svg',import.meta.url).href,
};
const GROUPS=[
 {tab:'weapons',name:'Blast',ids:['blastForce','blastRadius','blastReach'],icon:'blast'},
 {tab:'weapons',name:'Black Hole',ids:['blackhole','wellPull','wellReach','wellDuration','mix','wear'],icon:'well'},
 {tab:'skills',name:'Skills',ids:['aftershock','relay','orbital'],icon:'aftershock'},
 {tab:'utility',name:'Battery & Collection',ids:['battery','range','suction','collectBatch'],icon:'collect'},
];
const element=(doc,tag,className,text)=>{const e=doc.createElement(tag);e.className=className;if(text!==undefined)e.textContent=text;return e;};
function icon(doc,key){const image=element(doc,'img','menu-icon');image.src=icons[key];image.alt='';image.setAttribute('aria-hidden','true');return image;}

export function workshopTabs(profile){
 const tabs=[{id:'weapons',name:'Weapons'}];
 if(['upgrade','next'].includes(profile.tutorial))return tabs;
 if(Object.entries(SKILLS).some(([id,s])=>(profile.skills?.[id]||0)>0||distinctClears(profile)>=s.clears))tabs.push({id:'skills',name:'Skills'});
 tabs.push({id:'utility',name:'Utility'});return tabs;
}

function renderWorkshopTabs(doc,profile){
 const root=doc.getElementById('offers'),equipment=doc.getElementById('arch-skills');
 let tabs=doc.getElementById('workshop-tabs'),panel=doc.getElementById('upgrade-panel');
 if(!tabs){
  tabs=element(doc,'div','workshop-tabs');tabs.id='workshop-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Upgrade categories');
  panel=element(doc,'div','upgrade-panel');panel.id='upgrade-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;
  root.before(tabs,panel);panel.append(root,equipment);
 }
 const options=workshopTabs(profile);
 const select=(id,scroll=false)=>{
  root.dataset.tab=id;panel.setAttribute('aria-labelledby',`upgrade-tab-${id}`);
  for(const button of tabs.children){const selected=button.dataset.tab===id;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;}
  for(const group of root.children)group.hidden=group.dataset.tab!==id;
  equipment.hidden=id!=='skills';
  if(scroll)tabs.scrollIntoView({block:'start'});
 };
 tabs.replaceChildren(...options.map(({id,name},index)=>{
  const button=element(doc,'button','workshop-tab',name);button.type='button';button.id=`upgrade-tab-${id}`;button.dataset.tab=id;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
  button.onclick=()=>select(id,true);
  button.onkeydown=event=>{
   const next={ArrowRight:(index+1)%options.length,ArrowLeft:(index+options.length-1)%options.length,Home:0,End:options.length-1}[event.key];
   if(next===undefined)return;event.preventDefault();select(options[next].id,true);tabs.children[next].focus();
  };return button;
 }));
 select(options.some(t=>t.id===root.dataset.tab)?root.dataset.tab:'weapons');
}

export function stagePresentation(profile,site,index){
 const best=stageBest(profile,site.id),open=stageOpen(profile,index);
 return {open,best,percent:best===1?'100%':`${(Math.floor(best*1000)/10).toFixed(1)}%`,state:!open?'locked':best===1?'complete':best>=.7?'cleared':'open'};
}
export function renderArchStageList(container,profile,onChoose){
 const doc=container.ownerDocument;
 container.replaceChildren(...FREE_STAGES.map((site,index)=>{
  const model=stagePresentation(profile,site,index),button=element(doc,'button','stage-row arch-map-row');
  button.disabled=!model.open;button.dataset.stage=site.id;button.dataset.state=model.state;button.dataset.boss=String(site.boss);
  const number=element(doc,'span','map-number',site.boss?'B':'0'+(index+1));
  const copy=element(doc,'span','map-copy');copy.append(element(doc,'strong','',site.name));
  copy.append(element(doc,'small','map-state',model.state==='locked'?'Clear all 6 sites at 70%':model.state==='complete'?'FULL CLEAR':model.state==='cleared'?'CLEARED':site.boss?'BOSS · 70% to clear':'Reach 70% to clear'));
  const best=element(doc,'span','stage-best');best.append(element(doc,'small','',model.open?'BEST':'LOCKED'),element(doc,'strong','',model.percent));
  const track=element(doc,'span','map-track'),fill=element(doc,'i','');fill.style.width=`${model.best*100}%`;track.setAttribute('aria-hidden','true');track.append(fill);
  button.append(number,copy,best,track);button.onclick=()=>onChoose(site.id);return button;
 }));
}

export function offerPresentation(offer,profile){
 const max=offer.max!==null&&offer.level>=offer.max;
 let hint={range:'Widens the suction circle. Collection costs no energy.',suction:'Collects pixels inside the suction circle faster.',collectBatch:'Collects loose pixels anywhere on the map, even outside the circle.'}[offer.id]||'';
 if(!max&&!offer.available){
  if(offer.id==='blackhole')hint='Clear 3 sites at 70% to unlock.';
  else if(SKILLS[offer.id])hint=`Clear ${SKILLS[offer.id].clears} sites at 70% to unlock.`;
  else hint='Unlock Black Hole first.';
 }
 const learn=!offer.level&&(offer.kind||offer.id==='blackhole'||offer.id==='collectBatch'&&!freeStats(profile).autoCollect);
 return {hint,price:max?'':offer.cost===0?'FREE':`${offer.cost.toLocaleString()} parts`,action:max?'Max level':!offer.available?'Locked':profile.parts<offer.cost?`Need ${(offer.cost-profile.parts).toLocaleString()}`:learn?'Learn':'Upgrade'};
}

export function mountArchMenus(doc){
 const $=id=>doc.getElementById(id),mapHead=$('home-zones-dialog').querySelector('.home-dialog-heading');
 const mapTitle=$('home-zones-title'),titles=element(doc,'div','menu-titles');mapTitle.textContent='Arch Quarter';titles.append(element(doc,'small','menu-kicker','REGION 01 · MAP SELECT'),mapTitle);mapHead.prepend(titles);
 mapHead.querySelector('button').setAttribute('aria-label','Close map selection');
 const tutorial=$('tutorial-replay');tutorial.querySelector('strong').textContent='Tutorial';tutorial.querySelector('small').textContent='Blast · Collect · Upgrade';tutorial.querySelector('.stage-best').textContent='Practice →';
 const editor=$('home-zones-dialog').querySelector('.map-editor-link');editor.textContent='Map Maker ↗';
 const workshop=$('workshop'),heading=element(doc,'div','workshop-heading'),bar=element(doc,'div','workshop-topbar');
 const back=$('workshop-back');back.textContent='← Planet';
 const wallet=element(doc,'div','workshop-wallet'),parts=$('parts');wallet.append(icon(doc,'collect'),parts,element(doc,'small','','parts'));bar.append(back,wallet);
 const title=workshop.querySelector('h1');title.textContent='Upgrades';heading.append(bar,element(doc,'small','menu-kicker','FIELD WORKSHOP'),title);
 workshop.querySelector('.eyebrow').remove();workshop.prepend(heading);
 $('workshop-skip').textContent='Skip upgrade guide';
}

export function mountArchOptions(doc){
 const $=id=>doc.getElementById(id),dialog=$('home-options-dialog'),heading=dialog.querySelector('.home-dialog-heading');
 const titles=element(doc,'div','menu-titles');$('home-options-title').textContent='Options';titles.append(element(doc,'small','menu-kicker','SYSTEM · SETUP'),$('home-options-title'));heading.prepend(titles);
 heading.querySelector('button').setAttribute('aria-label','Close options');
 const sound=dialog.querySelector('[data-game-sound]');$('stats').after(sound);
 const label=dialog.querySelector('.pattern-label'),select=label.querySelector('select');
 label.firstChild.textContent='Mobile controls';select.setAttribute('aria-label','Mobile controls');
 for(const option of select.options)option.textContent=option.value==='contact'?'Tap at touch point':'Aim with offset pointer';
 const shortcuts=element(doc,'div','option-shortcuts');$('practice').textContent='Tutorial ↗';shortcuts.append($('practice'),$('home-map-maker'));dialog.querySelector('.playtest').before(shortcuts);
 dialog.querySelector('.playtest summary').textContent='Play records';$('export-report').textContent='Export records';dialog.querySelector('.playtest p.fine').textContent='Saved on this device only.';
 $('reset-open').textContent='Reset progress';dialog.querySelector('.home-back-link').before($('reset-open'));
 $('reset-title').textContent='Reset your progress?';$('reset-dialog').querySelector('p.fine').textContent='Sound settings and other game saves are kept.';$('reset-cancel').textContent='Cancel · keep playing';$('reset-confirm').textContent='Reset and start over';
}

export function renderArchWorkshop(doc,journey){
 const $=id=>doc.getElementById(id),profile=journey.profile,root=$('offers');
 // Move the actual controller-created cards, retaining disabled states and guarded purchase handlers.
 const cards=new Map([...root.querySelectorAll('[data-offer-id]')].map(card=>[card.dataset.offerId,card]));
 const offers=new Map(journey.offers().map(offer=>[offer.id,offer]));
 for(const [id,card]of cards){
  const offer=offers.get(id),view=offerPresentation(offer,profile),title=card.querySelector('h3');
  const key=id==='battery'?'battery':['range','suction','collectBatch'].includes(id)?'collect':SKILLS[id]?id:id.startsWith('blast')?'blast':'well';
  title.replaceChildren(icon(doc,key),element(doc,'span','offer-name',offer.name),element(doc,'span','offer-level',`Lv ${offer.level}/${offer.max??'∞'}`));
  const description=card.querySelector('p');description.className='offer-value';
  const help=card.querySelector('.offer-help');help.textContent=view.hint;help.hidden=!view.hint;
  const button=card.querySelector('button');button.replaceChildren(element(doc,'span','offer-price',view.price),element(doc,'span','offer-action',view.action));
  card.dataset.state=view.action==='Max level'?'max':!offer.available?'locked':button.disabled?'unaffordable':'ready';
 }
 root.replaceChildren();
 for(const group of GROUPS){
  const entries=group.ids.map(id=>cards.get(id)).filter(Boolean);if(!entries.length)continue;
  const section=element(doc,'section','upgrade-group'),title=element(doc,'h2','upgrade-heading'),grid=element(doc,'div','upgrade-grid');section.dataset.tab=group.tab;title.append(icon(doc,group.icon),element(doc,'span','',group.name));grid.append(...entries);section.append(title,grid);root.append(section);
 }
 renderWorkshopTabs(doc,profile);
 $('workshop-note').textContent='Upgrades apply next sortie. Save parts or spend them here.';
 $('upgrade-guide').textContent='';
 $('workshop-random').textContent='Choose a map →';$('workshop-retry').textContent='Retry this map';$('workshop-boss').textContent='Challenge Boss';
}
