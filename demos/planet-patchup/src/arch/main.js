import {installCampaign} from '../free30/campaign.js';
import {ArchJourney,ArchRun} from './journey.js';
import * as stages from './stages.js';
import {BALANCE_VERSION,upgradeGuide} from './balance.js';
import {ARCH_TUTORIAL} from './maps.js';
import {createArchSurface,createArchBackdrop} from './art.js';
import {ArchJournal,tabSession} from './telemetry.js';
import {ActiveOverlay} from '../ideas-lab/active/overlay.js';
import {ArchGuide,ArchTutorialOverlay,archTouchHelp,archTip,receiptText,mountArchUI,renderArchProfile,renderEquipment,renderSkillHUD,drawArchHome} from './ui.js';
import './style.css';
let journal;
const warn=()=>{document.getElementById('arch-journal-warning').textContent=journal.warning;};
installCampaign({Journey:ArchJourney,Run:ArchRun,stages,BALANCE_VERSION,upgradeGuide,tutorial:ARCH_TUTORIAL,Guide:ArchGuide,TutorialOverlay:ArchTutorialOverlay,gameTip:archTip,firstUpgrade:'blastRadius',
 offerHelp:offer=>offer.kind?'Learn and upgrade here; equip one passive and one active skill below.':offer.id==='blackhole'?'Unlock after 3 distinct site clears. Select Black Hole at the bottom left in the field.':'Applies next sortie. Collection upgrades affect global quantity or cadence, with no range limit.',
 touchHelp:archTouchHelp,
 renderer:world=>({surface:createArchSurface(world.width,world.cells),createBackdrop:createArchBackdrop,collectionMode:'rise'}),
 overlay:(scene,view)=>new ActiveOverlay(scene,view),
 drawHome:drawArchHome,
 init(storage,{qa,previewId}){mountArchUI(document);if(qa){const raw=storage,prefix='qa:';storage={get length(){return Array.from({length:raw.length},(_,i)=>raw.key(i)).filter(k=>k?.startsWith(prefix)).length;},key(i){return Array.from({length:raw.length},(_,n)=>raw.key(n)).filter(k=>k?.startsWith(prefix))[i]?.slice(prefix.length);},getItem:k=>raw.getItem(prefix+k),setItem:(k,v)=>raw.setItem(prefix+k,v),removeItem:k=>raw.removeItem(prefix+k)};}if(previewId){const m=new Map();storage={get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}let session;try{session=globalThis.sessionStorage;}catch{}journal=new ArchJournal({storage,sessionId:tabSession(session)});warn();},
 profile(journey){renderArchProfile(document,journey,journal);warn();},
 offers(journey,equip){renderEquipment(document,journey,equip);const p=journey.profile;document.getElementById('tutorial-workshop').textContent=p.tutorial==='upgrade'?'Use 300 parts to buy Blast Radius. Loose pixels collect globally.':p.tutorial==='next'?'Blast Radius upgraded. Choose your next site.':'The first Blast Radius upgrade costs 300 parts. Practice to earn more.';},
 receipt(result){const text=receiptText(result);document.getElementById('result-copy').textContent=text.copy;document.getElementById('result-bonus').textContent=text.bonus;},
 start(run,flags){journal.start(run,flags);warn();},
 frame(run,elapsedMs,updateMs){journal.frame(elapsedMs,updateMs);if(Date.now()-(journal.current?.checkpointAt||0)>=5000){journal.sample(run);warn();}},
 checkpoint(run,options){if(run)journal.checkpoint(run,options);warn();},
 finish(run,result,profile){journal.finish(run,result,profile);warn();},
 abandon(run,reason){journal.abandon(run,reason);warn();},
 hud(run,activate){renderSkillHUD(document,run,activate);document.getElementById('run-mode').textContent=run.mode==='boss'?'Crooked Bell Twins · Boss':'Arch Quarter';},
 async export(profile){await journal.flush();warn();return journal.export(profile);}
});
await import('../free30/main.js');
