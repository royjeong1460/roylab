import {installCampaign} from '../free30/campaign.js';
import {ArchJourney,ArchRun} from './journey.js';
import * as stages from './stages.js';
import {BALANCE_VERSION,upgradeGuide} from './balance.js';
import {ARCH_TUTORIAL} from './maps.js';
import {createArchSurface,createArchBackdrop} from './art.js';
import {ArchJournal,tabSession} from './telemetry.js';
import {ArchOverlay} from './overlay.js';
import {ArchGuide,ArchTutorialOverlay,archTouchHelp,archTip,receiptText,mountArchUI,renderArchProfile,renderEquipment} from './ui.js';
import './style.css';
import './planet/home.css';
import './menus.css';
import {mountArchMenus,mountArchOptions,renderArchStageList,renderArchWorkshop} from './menus.js';
import {mountPlanetHome} from './planet/home.js';
import {mountMinimalHUD,mountSkillHUD,renderSkillHUD,renderToolSwitch,mountCleanupHUD,renderCleanupHUD,collectionComplete} from './hud.js';
import {COLLECTIBLE_STYLE} from '../blast-step1/presentation.js';
import {loadArchArt} from './art-assets.js';
import {restorationTier} from './art-background.js';
import {renderEnvironmentReceipt} from './environment-receipt.js';
const salvageArt=await loadArchArt();
let journal,planet,entryRestoration=0;
const warn=()=>{document.getElementById('arch-journal-warning').textContent=journal.warning;};
installCampaign({Journey:ArchJourney,Run:ArchRun,stages,BALANCE_VERSION,upgradeGuide,tutorial:ARCH_TUTORIAL,Guide:ArchGuide,TutorialOverlay:ArchTutorialOverlay,gameTip:archTip,firstUpgrade:'blastRadius',
 offerHelp:offer=>offer.kind?'Learn and upgrade here; equip one passive and one active skill below.':offer.id==='blackhole'?'Unlock after 3 distinct site clears. Select Black Hole at the bottom left in the field.':'Applies next sortie. Proximity suction stays free. Upgrade the suction circle’s range and speed separately. Auto Collect adds map-wide pickup and upgrades its speed.',
 touchHelp:archTouchHelp,
 initialView:viewport=>viewport.fit(),
 finishNoticeMs:run=>collectionComplete(run)?1000:0,
 renderer:world=>({surface:createArchSurface(world.width,world.cells),createBackdrop:(scene,w,layer)=>createArchBackdrop(scene,w,layer,salvageArt,entryRestoration),collectibleStyle:COLLECTIBLE_STYLE}),
 overlay:(scene,view)=>new ArchOverlay(scene,view),
 home(doc){planet=mountPlanetHome(doc);mountArchMenus(doc);},
 settings:mountArchOptions,
 soundLabel:enabled=>`Sound · ${enabled?'ON':'OFF'}`,
 renderStages:renderArchStageList,
 init(storage,{qa,previewId}){mountArchUI(document);mountMinimalHUD(document);mountSkillHUD(document);mountCleanupHUD(document);if(qa){const raw=storage,prefix='qa:';storage={get length(){return Array.from({length:raw.length},(_,i)=>raw.key(i)).filter(k=>k?.startsWith(prefix)).length;},key(i){return Array.from({length:raw.length},(_,n)=>raw.key(n)).filter(k=>k?.startsWith(prefix))[i]?.slice(prefix.length);},getItem:k=>raw.getItem(prefix+k),setItem:(k,v)=>raw.setItem(prefix+k,v),removeItem:k=>raw.removeItem(prefix+k)};}if(previewId){const m=new Map();storage={get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}let session;try{session=globalThis.sessionStorage;}catch{}journal=new ArchJournal({storage,sessionId:tabSession(session)});warn();},
 profile(journey){renderArchProfile(document,journey,journal);planet?.update(journey.profile);warn();},
 offers(journey,equip){renderEquipment(document,journey,equip);const p=journey.profile;document.getElementById('tutorial-workshop').hidden=!['upgrade','next'].includes(p.tutorial);document.getElementById('workshop-skip').hidden=!['upgrade','next'].includes(p.tutorial);document.getElementById('workshop-random').textContent='Choose a site →';document.getElementById('tutorial-workshop').textContent=p.tutorial==='upgrade'?'Use 300 parts to buy Blast Radius. Move the suction circle over loose pixels.':p.tutorial==='next'?'Blast Radius upgraded. Choose your next site.':'The first Blast Radius upgrade costs 300 parts. Practice to earn more.';renderArchWorkshop(document,journey);},
 receipt(result){renderEnvironmentReceipt(document,salvageArt,result);const text=receiptText(result);document.getElementById('result-title').textContent=`${result.recovered.toLocaleString()} pixels recovered`;document.getElementById('result-copy').textContent=text.copy;document.getElementById('result-bonus').textContent=text.bonus;},
 start(run,flags){const record=run.profile.stageRecords?.[run.site.id];entryRestoration=restorationTier(record?record.recovered/record.total:0);journal.start(run,flags);warn();},
 frame(run,elapsedMs,updateMs){journal.frame(elapsedMs,updateMs);if(Date.now()-(journal.current?.checkpointAt||0)>=5000){journal.sample(run);warn();}},
 checkpoint(run,options){if(run)journal.checkpoint(run,options);warn();},
 finish(run,result,profile){journal.finish(run,result,profile);warn();},
 abandon(run,reason){journal.abandon(run,reason);warn();},
 hud(run,activate){const feedback=document.getElementById('feedback');feedback.hidden=!run.paused;renderCleanupHUD(document,run);renderToolSwitch(document,run);renderSkillHUD(document,run,activate);document.getElementById('run-mode').textContent=run.mode==='boss'?'Crooked Bell Twins · Boss':'Arch Quarter';},
 async export(profile){await journal.flush();warn();return journal.export(profile);}
});
await import('../free30/main.js');
