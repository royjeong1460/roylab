import {FreeAnalytics,posthogConfig,isTestVisit,visitSource} from './analytics.js';
import {BALANCE_VERSION} from './balance.js';
import {ARCH_MAP_VERSION} from './maps.js';
import './web-feedback.css';

export function bootFreeAnalytics(){
 const url=new URL(location.href);let storage;try{storage=localStorage;}catch{}
 const analytics=new FreeAnalytics({config:posthogConfig(import.meta.env),storage,excluded:isTestVisit(url),properties:{edition:'free',campaign:'arch',build_version:'free-feedback-v1',balance_version:BALANCE_VERSION,map_version:ARCH_MAP_VERSION,device_type:matchMedia('(pointer:coarse)').matches?'touch':'desktop',source:visitSource(url,document.referrer)}});
 const sync=()=>analytics.visibility(!document.hidden&&document.hasFocus());
 document.addEventListener('visibilitychange',sync);window.addEventListener('blur',sync);window.addEventListener('focus',sync);
 window.addEventListener('pagehide',event=>{analytics.flush(event.persisted?'page-cached':'page-left');void analytics.send(event.persisted?'pp_page_cached':'pp_page_left');});
 window.addEventListener('pageshow',sync);setInterval(()=>analytics.flush(),15000);
 sync();void analytics.send('pp_page_loaded');
 return analytics;
}

export function mountFreeFeedback(doc,analytics){
 if(!analytics.configured)return;
 const dialog=doc.createElement('dialog');dialog.id='pp-feedback-dialog';dialog.setAttribute('aria-labelledby','pp-feedback-title');
 dialog.innerHTML='<form id="pp-feedback-form"><div class="pp-feedback-heading"><h2 id="pp-feedback-title">Send feedback</h2><button type="button" id="pp-feedback-close" aria-label="Close feedback">×</button></div><p>Help us improve Planet Patchup. No account needed.</p><label>How fun was it?<select name="rating" required><option value="">Choose 1–5</option><option value="1">1 · Not fun</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 · Very fun</option></select></label><label>What could be better?<select name="issue"><option value="none">Nothing in particular</option><option value="controls">Controls</option><option value="tutorial">Instructions</option><option value="repetition">Too repetitive</option><option value="difficulty">Difficulty</option><option value="performance">Slow or hot</option><option value="bug">Something broke</option></select></label><label>Anything else? · optional<textarea name="comment" maxlength="1000" rows="4"></textarea></label><p class="pp-feedback-note">Your answers and game context are sent to the developer via PostHog. Please leave out personal information.</p><p id="pp-feedback-status" role="status" aria-live="polite"></p><button type="submit" id="pp-feedback-submit">Send feedback</button></form>';
 doc.body.append(dialog);
 const form=dialog.querySelector('form'),status=dialog.querySelector('#pp-feedback-status'),submit=dialog.querySelector('[type=submit]');
 let pending=false,submissionId;
 dialog.querySelector('#pp-feedback-close').onclick=()=>dialog.close();
 form.addEventListener('input',()=>{if(!pending){submissionId=undefined;status.textContent='';}});
 form.onsubmit=async event=>{
  event.preventDefault();if(pending||!form.reportValidity())return;
  pending=true;submissionId??=crypto.randomUUID();submit.disabled=true;status.textContent='Sending…';
  const values=new FormData(form),answer={rating:Number(values.get('rating')),issue:String(values.get('issue')),comment:String(values.get('comment')||'')};
  const fields=[...form.querySelectorAll('select,textarea')];for(const field of fields)field.disabled=true;
  const sent=await analytics.feedback(answer,submissionId);
  pending=false;submit.disabled=false;for(const field of fields)field.disabled=false;
  status.textContent=sent?'Thanks! Your feedback was received.':'Could not send. Your answers are still here. Check your connection and try again.';
  if(sent){form.reset();submissionId=undefined;}
 };
 const button=(parent,where)=>{
  if(!parent)return;const b=doc.createElement('button');b.type='button';b.className=`pp-feedback-open pp-feedback-${where}`;b.textContent='Feedback';b.setAttribute('aria-haspopup','dialog');
  b.onclick=()=>{void analytics.send('pp_feedback_opened',{entry_point:where});if(analytics.config.surveyId)void analytics.send('survey shown',{$survey_id:analytics.config.surveyId,entry_point:where},true);dialog.showModal();};parent.append(b);
 };
 button(doc.querySelector('#base .home-composition')||doc.getElementById('base'),'home');button(doc.getElementById('pause-dialog'),'pause');button(doc.getElementById('run-receipt'),'result');button(doc.getElementById('workshop'),'workshop');
 const options=doc.getElementById('home-options-dialog'),toggle=doc.createElement('button'),note=doc.createElement('p');toggle.type='button';toggle.className='pp-statistics-toggle';note.className='pp-feedback-note';note.textContent='Share game progress and active play time to help improve the game. Feedback can be sent with statistics off.';
 const render=()=>{toggle.textContent=`Share play statistics · ${analytics.enabled?'ON':'OFF'}`;toggle.setAttribute('aria-pressed',String(analytics.enabled));};
 toggle.onclick=()=>{analytics.setEnabled(!analytics.enabled);render();};render();options.append(toggle,note);
 const screens={'home-zones-dialog':'map-select','home-options-dialog':'options','pause-dialog':'pause','pp-feedback-dialog':'feedback','planet-full-dialog':'full-game','planet-regions-dialog':'regions','reset-dialog':'reset'};
 const syncScreen=()=>{const open=[...doc.querySelectorAll('dialog[open]')].at(-1);analytics.screen(open?(screens[open.id]||'menu'):['base','workshop','expedition'].find(id=>!doc.getElementById(id)?.hidden)||'base');};
 const observer=new MutationObserver(syncScreen);for(const menu of doc.querySelectorAll('dialog'))observer.observe(menu,{attributes:true,attributeFilter:['open']});
}
