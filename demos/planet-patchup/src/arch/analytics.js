const BROWSER_KEY='pp-analytics-browser-v1',ENABLED_KEY='pp-analytics-enabled-v1';
export const FEEDBACK_ISSUES=['none','controls','tutorial','repetition','difficulty','performance','bug'];
const safeRead=(storage,key)=>{try{return storage?.getItem(key);}catch{return null;}};
const safeWrite=(storage,key,value)=>{try{storage?.setItem(key,value);}catch{}};

export function posthogConfig(env={}){
 const token=env.VITE_POSTHOG_PROJECT_TOKEN||'',host=(env.VITE_POSTHOG_HOST||'https://us.i.posthog.com').replace(/\/$/,'');
 const valid=/^phc_[a-zA-Z0-9_-]+$/.test(token)&&['https://us.i.posthog.com','https://eu.i.posthog.com'].includes(host);
 return {token:valid?token:'',endpoint:valid?`${host}/i/v0/e/`:'',surveyId:env.VITE_POSTHOG_SURVEY_ID||''};
}
export function isTestVisit(url){return ['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.searchParams.get('qa')==='1'||url.searchParams.has('mapPreview')||url.searchParams.has('artMap');}
export function visitSource(url,referrer=''){
 const source=url.searchParams.get('utm_source');if(source&&/^[a-zA-Z0-9_-]{1,64}$/.test(source))return source;
 try{return new URL(referrer).hostname;}catch{return 'direct';}
}

// Explicit game events only. Local saves and the detailed physics journal never leave this device.
export class FreeAnalytics{
 constructor({config={},storage,excluded=false,sessionId=globalThis.crypto.randomUUID(),uuid=()=>globalThis.crypto.randomUUID(),now=()=>performance.now(),fetchImpl=(...args)=>fetch(...args),properties={}}={}){
  this.config=config;this.storage=storage;this.excluded=excluded;this.sessionId=sessionId;this.uuid=uuid;this.now=now;this.fetchImpl=fetchImpl;this.properties=properties;
  this.enabled=safeRead(storage,ENABLED_KEY)!=='off';this.visible=true;this.view='loading';this.playing=false;this.lastAt=now();this.activeMs=0;this.menuMs=0;this.pendingActive=0;this.pendingMenu=0;this.run=null;this.snapshot={};
 }
 get configured(){return Boolean(this.config.token&&this.config.endpoint&&!this.excluded);}
 get collecting(){return this.configured&&this.enabled;}
 identity(){if(!this.enabled)return this.sessionId;if(!this.browserId){this.browserId=safeRead(this.storage,BROWSER_KEY)||this.uuid();safeWrite(this.storage,BROWSER_KEY,this.browserId);}return this.browserId;}
 async send(event,properties={},explicit=false,submission){
  if(!this.configured||!explicit&&!this.enabled)return false;
  try{
   const response=await this.fetchImpl(this.config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,signal:AbortSignal.timeout(10000),body:JSON.stringify({api_key:this.config.token,event,uuid:submission?.id,distinct_id:submission?.distinctId||this.identity(),timestamp:submission?.timestamp||new Date().toISOString(),properties:{...this.properties,page_session_id:this.sessionId,screen:this.view,...this.snapshot,...properties,$process_person_profile:false,$geoip_disable:true,$ip:null,$lib:'planet-patchup-web'}})});
   if(!response.ok)return false;const status=(await response.json()).status;return status===1||status==='Ok';
  }catch{return false;}
 }
 tick(){
  const at=this.now(),delta=Math.max(0,at-this.lastAt);this.lastAt=at;
  if(!this.collecting||!this.visible||this.view==='loading')return;
  if(this.playing){this.activeMs+=delta;this.pendingActive+=delta;}else{this.menuMs+=delta;this.pendingMenu+=delta;}
 }
 flush(reason='interval'){
  this.tick();if(!this.pendingActive&&!this.pendingMenu)return;
  void this.send('pp_activity',{active_ms:Math.round(this.pendingActive),menu_ms:Math.round(this.pendingMenu),session_active_ms:Math.round(this.activeMs),session_menu_ms:Math.round(this.menuMs),reason});
  this.pendingActive=0;this.pendingMenu=0;
 }
 setEnabled(value){this.flush('statistics-choice');this.enabled=Boolean(value);safeWrite(this.storage,ENABLED_KEY,this.enabled?'on':'off');this.lastAt=this.now();}
 ready(){void this.send('pp_game_ready',{load_ms:Math.round(this.now())});}
 screen(view){if(view===this.view)return;this.flush('screen-change');this.view=view;this.playing=view==='expedition'&&Boolean(this.run&&!this.run.paused&&!this.run.finishReady);void this.send('pp_screen_view');}
 visibility(visible){this.flush(visible?'foreground':'background');this.visible=Boolean(visible);this.lastAt=this.now();}
 updateRun(run){
  this.snapshot={run_id:run.id,map_id:run.site.id,mode:run.mode,recovered:run.world.collected,total_pixels:run.world.initial,battery_remaining:run.world.charge};
 }
 start(run){if(this.run===run)return;this.flush('run-start');this.run=run;this.firstAttack=false;this.reached70=false;this.updateRun(run);this.playing=this.view==='expedition'&&!run.paused&&!run.finishReady;void this.send('pp_run_started');}
 frame(run){
  if(!run||this.run!==run)return;this.tick();this.updateRun(run);this.playing=this.view==='expedition'&&!run.paused&&!run.finishReady;
  this.milestones(run);
 }
 milestones(run){
  if(!this.firstAttack&&Object.values(run.world.attackCounts||{}).some(n=>n>0)){this.firstAttack=true;void this.send('pp_first_attack');}
  if(!this.reached70&&run.qualified){this.reached70=true;void this.send('pp_recovery_70');}
 }
 checkpoint(run){if(!run||this.run!==run)return;this.tick();this.updateRun(run);this.playing=this.view==='expedition'&&!run.paused&&!run.finishReady;this.flush('checkpoint');}
 finish(run,result){
  if(!run||this.run!==run)return;this.tick();this.updateRun(run);this.milestones(run);this.flush('run-finish');this.playing=false;
  void this.send('pp_run_finished',{qualified:Boolean(result.qualified),recovered:result.recovered,recovery_ratio:result.ratio,reward:result.reward});
  if(result.mode==='boss'&&result.qualified)void this.send('pp_boss_completed',{first_clear:Boolean(result.firstClear)});
  this.run=null;
 }
 abandon(run,reason){if(!run||this.run!==run)return;this.checkpoint(run);void this.send('pp_run_abandoned',{reason});this.run=null;this.playing=false;}
 purchase(offer){void this.send('pp_upgrade_bought',{upgrade_id:offer.id,previous_level:offer.level,parts_cost:offer.cost});}
 async feedback({rating,issue,comment=''},submissionId){
  if(!Number.isInteger(rating)||rating<1||rating>5||!FEEDBACK_ISSUES.includes(issue)||typeof comment!=='string'||!submissionId)return false;
  if(!this.configured)return false;
  if(this.submission?.id!==submissionId)this.submission={id:submissionId,timestamp:new Date().toISOString(),distinctId:this.identity()};
  const response={rating,issue,comment:comment.trim().slice(0,1000),submission_id:submissionId},survey=this.config.surveyId;
  return this.send(survey?'survey sent':'pp_feedback_submitted',survey?{$survey_id:survey,$survey_submission_id:submissionId,$survey_completed:true,$survey_response:String(rating),$survey_response_1:[issue],$survey_response_2:response.comment}:response,true,this.submission);
 }
}
