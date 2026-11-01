// The transport and retry identity are shared with the original free edition.
export function mountFeedback(analytics,{opened,closed}){
 const dialog=document.createElement('dialog');
 dialog.id='pp-free-feedback';
 dialog.setAttribute('aria-labelledby','pp-free-feedback-title');
 dialog.innerHTML=`<form><header><h2 id="pp-free-feedback-title">Send feedback</h2><button type="button" data-close aria-label="Close feedback">×</button></header>
 <p>Help us improve Planet Patchup. No account needed.</p>
 <label>How fun was it?<select name="rating" required><option value="">Choose 1–5</option><option value="1">1 · Not fun</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5 · Very fun</option></select></label>
 <label>What could be better?<select name="issue"><option value="none">Nothing in particular</option><option value="controls">Controls</option><option value="tutorial">Instructions</option><option value="repetition">Too repetitive</option><option value="difficulty">Difficulty</option><option value="performance">Slow or hot</option><option value="bug">Something broke</option></select></label>
 <label>Anything else? · optional<textarea name="comment" maxlength="1000" rows="4"></textarea></label>
 <p>Your answers and game context are sent to the developer via PostHog. Please leave out personal information.</p>
 <p data-status role="status" aria-live="polite"></p><button type="submit">Send feedback</button>
 <hr><button type="button" data-statistics></button><p>Share game progress and active play time to help improve the game. Feedback can be sent with statistics off.</p></form>`;
 document.body.append(dialog);
 const form=dialog.querySelector('form'),status=dialog.querySelector('[data-status]'),submit=dialog.querySelector('[type=submit]'),toggle=dialog.querySelector('[data-statistics]');
 const fields=[...form.querySelectorAll('select,textarea')];
 let pending=false,submissionId,notified=false;
 const render=()=>{
  toggle.textContent=`Share play statistics · ${analytics?.enabled?'ON':'OFF'}`;
  toggle.setAttribute('aria-pressed',String(Boolean(analytics?.enabled)));
  toggle.disabled=!analytics;
 };
 const unavailable=()=>{
  if(!analytics?.configured)status.textContent='Feedback sending is unavailable for this visit. Your answers stay on this page.';
  submit.disabled=pending||!analytics?.configured;
 };
 toggle.onclick=()=>{analytics?.setEnabled(!analytics.enabled);render();};
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{
  if(!notified)return;
  notified=false;closed();
 });
 form.addEventListener('input',()=>{
  if(pending)return;
  submissionId=undefined;status.textContent='';unavailable();
 });
 form.onsubmit=async event=>{
  event.preventDefault();
  if(pending||!analytics?.configured||!form.reportValidity())return;
  const values=new FormData(form),answer={rating:Number(values.get('rating')),issue:String(values.get('issue')),comment:String(values.get('comment')||'')};
  submissionId??=crypto.randomUUID();pending=true;submit.disabled=true;
  for(const field of fields)field.disabled=true;
  status.textContent='Sending…';
  let sent=false;
  try{sent=await analytics.feedback(answer,submissionId);}catch{}
  pending=false;for(const field of fields)field.disabled=false;
  unavailable();
  status.textContent=sent?'Thanks! Your feedback was received.':'Could not send. Your answers are still here. Check your connection and try again.';
  if(sent){form.reset();submissionId=undefined;}
 };
 render();unavailable();
 return {
  get open(){return dialog.open;},
  show(){
   if(dialog.open)return;
   dialog.showModal();notified=true;opened();
  }
 };
}
