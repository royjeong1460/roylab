import {FreeAnalytics,posthogConfig,isTestVisit,visitSource} from '../arch/analytics.js';
import {balance_version as balanceVersion} from '../../godot-free/data/collection_upgrades.json';
import {tutorial} from '../../godot-free/data/campaign.json';
import {mountFeedback} from './feedback.js';
import './shell.css';

const FREE_KEYS=['pixel-demolition-arch-v2-a','pixel-demolition-arch-v2-b','pixel-demolition-arch-v1-a','pixel-demolition-arch-v1-b'];
const JOURNAL_PREFIX='pixel-demolition-arch-journal-v1:run:';
const url=new URL(location.href);
let legacy=JSON.stringify({error:'legacy-snapshot-not-ready',slots:{},journals:{}});
let settings=JSON.stringify({'free30-collection-sound':null});
let analytics,feedback,feedbackCallback,activeRun,screen='loading',entry='home';
let beforeFeedback='loading',feedbackRun,feedbackWasPlaying=false;

function notice(message,fatal=false){
 let panel=document.getElementById('pp-free-notice');
 if(!panel){panel=document.createElement('aside');panel.id='pp-free-notice';panel.setAttribute('role','alert');document.body.append(panel);}
 panel.replaceChildren();
 const text=document.createElement('p');text.textContent=message;panel.append(text);
 const button=document.createElement('button');button.type='button';button.textContent=fatal?'Reload':'Dismiss';
 button.onclick=()=>fatal?location.reload():panel.remove();panel.append(button);
}
function fail(error){
 const problem=error instanceof Error?error:new Error(String(error));
 notice(problem.message,true);
 globalThis.PPFreeWebReject?.(problem);
}
function track(action){try{action(analytics);}catch{/* Analytics must never prevent engine startup or input. */}}
function notifyFeedback(open){try{feedbackCallback?.(open);}catch{}}
function syncVisibility(){track(a=>a?.visibility(!document.hidden&&document.hasFocus()));}
function bootAnalytics(){
 try{
  let storage;try{storage=localStorage;}catch{}
  analytics=new FreeAnalytics({config:posthogConfig(import.meta.env),storage,excluded:isTestVisit(url),properties:{
   edition:'free',campaign:'arch',build_version:'godot-free-0.5.34',balance_version:balanceVersion,
   map_version:tutorial.replace(/^arch-0-/,''),device_type:matchMedia('(pointer:coarse)').matches?'touch':'desktop',source:visitSource(url,document.referrer)
  }});
 }catch{}
 document.addEventListener('visibilitychange',syncVisibility);
 window.addEventListener('blur',syncVisibility);window.addEventListener('focus',syncVisibility);window.addEventListener('pageshow',syncVisibility);
 window.addEventListener('pagehide',event=>{
  track(a=>{
   if(a?.run)a.abandon(a.run,'pagehide');
   a?.flush(event.persisted?'page-cached':'page-left');
   void a?.send(event.persisted?'pp_page_cached':'pp_page_left');
  });
  activeRun=undefined;
 });
 setInterval(()=>track(a=>a?.flush()),15000);
 syncVisibility();track(a=>{void a?.send('pp_page_loaded');});
}

// One object per active run: FreeAnalytics deliberately compares run identity.
function adaptRun(value,starting=false){
 if(!value||typeof value.id!=='string'||typeof value.site?.id!=='string'||!value.world)return;
 if(!activeRun||activeRun.id!==value.id){
  if(!starting)return;
  track(a=>{if(a?.run)a.abandon(a.run,'replaced');});
  activeRun={id:value.id,site:{},world:{}};
 }
 Object.assign(activeRun.site,value.site);
 Object.assign(activeRun.world,value.world);
 Object.assign(activeRun,{mode:value.mode,paused:Boolean(value.paused),finishReady:Boolean(value.finishReady),qualified:Boolean(value.qualified)});
 return activeRun;
}
function event(kind,payloadJSON){
 let payload;try{payload=JSON.parse(payloadJSON);}catch{return;}
 if(!payload||typeof payload!=='object')return;
 track(a=>{
  switch(kind){
   case 'ready':a?.ready();break;
   case 'screen':
    if(typeof payload.screen!=='string')break;
    screen=payload.screen==='play'?'expedition':payload.screen;
    if(!feedback?.open)a?.screen(screen);
    break;
   case 'run_started':{const run=adaptRun(payload,true);if(run)a?.start(run);break;}
   case 'run_frame':{const run=adaptRun(payload);if(run)a?.frame(run);break;}
   case 'run_finished':{
    const run=adaptRun(payload.run);if(!run||!payload.result)break;
    a?.finish(run,payload.result);activeRun=undefined;break;
   }
   case 'run_abandoned':{
    const run=adaptRun(payload.run);if(!run)break;
    a?.abandon(run,payload.reason);activeRun=undefined;break;
   }
   case 'purchase':a?.purchase(payload);break;
   case 'feedback_open':entry=typeof payload.screen==='string'?payload.screen:screen;break;
  }
 });
}
async function readLegacy(){
 try{
  // Share the original writer's lock so slot and journal reads form one snapshot.
  await navigator.locks.request('pixel-demolition-arch-v2',{mode:'exclusive',signal:AbortSignal.timeout(10000)},()=>{
   const storage=localStorage,slots={},journals={};
   for(const key of FREE_KEYS){const raw=storage.getItem(key);if(raw!==null)slots[key]=raw;}
   for(let i=0;i<storage.length;i++){
    const key=storage.key(i);if(!key?.startsWith(JOURNAL_PREFIX))continue;
    const raw=storage.getItem(key);if(raw!==null)journals[key]=raw;
   }
   const sound=storage.getItem('free30-collection-sound');
   settings=JSON.stringify({'free30-collection-sound':['on','off'].includes(sound)?sound:null});
   legacy=JSON.stringify({slots,journals});
  });
 }catch{
  legacy=JSON.stringify({error:'legacy-snapshot-unavailable',slots:{},journals:{}});
  notice('Original browser progress could not be read safely. Automatic import is blocked; your original saves are preserved. Close other game tabs and reload to retry.');
 }
}
async function prepare(){
 await readLegacy();
 bootAnalytics();
 feedback=mountFeedback(analytics,{
  opened(){
   beforeFeedback=screen;
   track(a=>{
    feedbackRun=a?.run;feedbackWasPlaying=Boolean(a?.playing);
    a?.screen('feedback');void a?.send('pp_feedback_opened',{entry_point:entry});
    if(a?.config.surveyId)void a.send('survey shown',{$survey_id:a.config.surveyId,entry_point:entry},true);
   });
   notifyFeedback(true);
  },
  closed(){
   notifyFeedback(false);
   track(a=>{
    a?.screen(screen==='loading'?beforeFeedback:screen);
    // The engine restores its prior pause state; bridge frames arrive every 0.5 seconds.
    if(a&&a.run===feedbackRun&&screen===beforeFeedback&&screen==='expedition')a.playing=feedbackWasPlaying&&!a.run?.finishReady;
   });
   document.getElementById('canvas')?.focus({preventScroll:true});
  }
 });
 globalThis.PPFreeWeb={
  legacySnapshot:()=>legacy,legacySettings:()=>settings,event,
  bindFeedback(callback){feedbackCallback=callback;},
  requestFeedback(){feedback.show();}
 };
 const canvas=document.getElementById('canvas');
 canvas?.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
 if(typeof globalThis.PPFreeWebResolve!=='function')throw Error('The game startup interface is missing. Reload the canonical Planet Patchup play page.');
 globalThis.PPFreeWebResolve();
}
function start(){
 if(url.searchParams.has('mapPreview')||url.searchParams.has('artMap')){
  const archive=new URL('/planet-patchup/archive/free-phaser/',url);archive.search=url.search;archive.hash=url.hash;
  location.replace(archive.href);return;
 }
 if(!navigator.locks?.request){
  fail(new Error('Safe browser storage requires Web Locks. Open Planet Patchup in a current browser over HTTPS, then reload.'));return;
 }
 // Never release on pagehide: Godot may still sync IDBFS while the page is alive.
 void navigator.locks.request('pixel-demolition-arch-free-godot-v1',{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)throw Error('Planet Patchup is already open in another tab. Close the other game tab, then reload this page to protect your progress.');
  await prepare();
  await new Promise(()=>{});
 }).catch(fail);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
