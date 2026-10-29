import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FreeAnalytics,posthogConfig,isTestVisit} from '../src/arch/analytics.js';

const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const config={token:'phc_test',endpoint:'https://us.i.posthog.com/i/v0/e/',surveyId:''};
function fixture(extra={}){
 let time=0;const events=[],saved=storage();
 const analytics=new FreeAnalytics({config,storage:saved,sessionId:'page-1',uuid:()=> 'browser-1',now:()=>time,fetchImpl:async(url,options)=>{events.push({url,...JSON.parse(options.body)});return {ok:true,json:async()=>({status:1})};},...extra});
 return {analytics,events,saved,advance:ms=>time+=ms};
}
const run=()=>({id:'run-1',site:{id:'arch-lane'},mode:'stage',paused:false,finishReady:false,qualified:false,world:{initial:2000,collected:0,charge:60,attackCounts:{bomb:0,blackhole:0}}});
test('only public project tokens and supported ingestion hosts enable collection',()=>{
 assert.equal(posthogConfig({}).token,'');
 assert.equal(posthogConfig({VITE_POSTHOG_PROJECT_TOKEN:'phx_private'}).token,'');
 assert.equal(posthogConfig({VITE_POSTHOG_PROJECT_TOKEN:'phc_test',VITE_POSTHOG_HOST:'https://attacker.example'}).token,'');
 assert.equal(posthogConfig({VITE_POSTHOG_PROJECT_TOKEN:'phc_test',VITE_POSTHOG_HOST:'https://eu.i.posthog.com/'}).endpoint,'https://eu.i.posthog.com/i/v0/e/');
 for(const url of ['http://localhost:8772/','http://127.0.0.1:8772/','https://roylab.pages.dev/planet-patchup/play/?qa=1','https://roylab.pages.dev/planet-patchup/play/?mapPreview=x','https://roylab.pages.dev/planet-patchup/play/?artMap=x'])assert.equal(isTestVisit(new URL(url)),true);
 assert.equal(isTestVisit(new URL('https://roylab.pages.dev/planet-patchup/play/')),false);
});
test('missing configuration and QA perform no network requests or identity writes',async()=>{
 for(const extra of [{config:{token:''}},{excluded:true}]){
  const f=fixture(extra);f.analytics.screen('base');f.analytics.ready();f.advance(20000);f.analytics.flush();
  assert.equal(await f.analytics.feedback({rating:4,issue:'none',comment:''},'submission'),false);
  assert.equal(f.events.length,0);assert.equal(f.saved.getItem('pp-analytics-browser-v1'),null);
 }
});
test('activity deltas exclude hidden time and separate paused menus from active gameplay',()=>{
 const f=fixture(),r=run();f.analytics.screen('base');f.advance(2000);f.analytics.start(r);f.analytics.screen('expedition');
 f.advance(3000);f.analytics.frame(r);r.paused=true;f.analytics.checkpoint(r);f.advance(5000);f.analytics.visibility(false);f.advance(60000);f.analytics.flush();f.analytics.visibility(true);
 f.advance(1000);r.paused=false;f.analytics.frame(r);f.advance(4000);f.analytics.flush();f.analytics.flush();
 const activity=f.events.filter(e=>e.event==='pp_activity').map(e=>e.properties);
 assert.equal(activity.reduce((n,p)=>n+p.active_ms,0),7000);
 assert.equal(activity.reduce((n,p)=>n+p.menu_ms,0),8000);
 assert.equal(activity.at(-1).session_active_ms,7000);
});
test('screen transitions and run milestones fire once; retry is a new run',()=>{
 const f=fixture(),r=run();f.analytics.screen('base');f.analytics.screen('base');f.analytics.start(r);f.analytics.start(r);f.analytics.screen('expedition');
 r.world.attackCounts.bomb=1;f.analytics.frame(r);f.analytics.frame(r);r.qualified=true;f.analytics.frame(r);f.analytics.frame(r);
 f.advance(1000);f.analytics.finish(r,{qualified:true,firstClear:true,recovered:1500,ratio:.75,mode:'boss',reward:5500});f.analytics.finish(r,{qualified:true,firstClear:true,mode:'boss'});
 f.analytics.start({...run(),id:'run-2'});
 assert.equal(f.events.filter(e=>e.event==='pp_first_attack').length,1);
 assert.equal(f.events.filter(e=>e.event==='pp_recovery_70').length,1);
 assert.equal(f.events.filter(e=>e.event==='pp_run_started').length,2);
 assert.equal(f.events.filter(e=>e.event==='pp_run_finished').length,1);
 assert.equal(f.events.filter(e=>e.event==='pp_boss_completed').length,1);
 assert.equal(f.events.filter(e=>e.event==='pp_screen_view'&&e.properties.screen==='base').length,1);
});
test('final collection sweep records 70 percent even when no further frame runs',()=>{
 const f=fixture(),r=run();f.analytics.start(r);f.analytics.screen('expedition');r.world.attackCounts.bomb=1;
 r.world.collected=1500;r.qualified=true;r.finishReady=true;
 f.analytics.finish(r,{qualified:true,recovered:1500,ratio:.75,mode:'stage',reward:1500});
 assert.equal(f.events.filter(e=>e.event==='pp_recovery_70').length,1);
 assert.equal(f.events.filter(e=>e.event==='pp_first_attack').length,1);
});
test('controller checkpoints completed play before completion notice and settlement waits',()=>{
 const main=readFileSync(new URL('../src/free30/main.js',import.meta.url),'utf8');
 const settle=main.slice(main.indexOf('async function settle()'),main.indexOf('class FreeScene'));
 assert.ok(settle.indexOf('campaign?.checkpoint?.(journalRun)')>=0);
 assert.ok(settle.indexOf('campaign?.checkpoint?.(journalRun)')<settle.indexOf('await journey.finish()'));
 const completion=main.slice(main.indexOf('if(r.finishReady&&!this.settled'),main.indexOf('function pause()'));
 assert.ok(completion.indexOf('campaign?.checkpoint?.(r)')>=0);
 assert.ok(completion.indexOf('campaign?.checkpoint?.(r)')<completion.indexOf('this.finishNoticeUntil=now+'));
 const f=fixture(),r=run();f.analytics.start(r);f.analytics.screen('expedition');f.advance(5000);r.finishReady=true;f.analytics.checkpoint(r);f.advance(1000);f.analytics.finish(r,{mode:'stage',qualified:false,recovered:0,reward:0,ratio:0});
 assert.equal(f.analytics.activeMs,5000);assert.equal(f.analytics.menuMs,1000);
});
test('early exit preserves uncompleted progress; hiding is not reported as a completed run',()=>{
 const f=fixture(),r=run();f.analytics.start(r);f.analytics.screen('expedition');f.advance(4321);r.world.collected=125;f.analytics.frame(r);f.analytics.visibility(false);
 const checkpoint=f.events.filter(e=>e.event==='pp_activity').at(-1).properties;
 assert.equal(checkpoint.recovered,125);assert.equal(checkpoint.run_id,'run-1');assert.equal(checkpoint.active_ms,4321);
 assert.equal(f.events.filter(e=>e.event==='pp_run_finished').length,0);
});
test('statistics opt-out persists and still allows deliberate feedback without a persistent browser ID',async()=>{
 const f=fixture();f.analytics.setEnabled(false);f.analytics.ready();f.analytics.start(run());f.advance(20000);f.analytics.flush();
 assert.equal(f.saved.getItem('pp-analytics-enabled-v1'),'off');assert.equal(f.events.length,0);
 assert.equal(await f.analytics.feedback({rating:4,issue:'controls',comment:'Edge aiming'},'submission'),true);
 assert.equal(f.events[0].event,'pp_feedback_submitted');assert.equal(f.events[0].distinct_id,'page-1');assert.equal(f.saved.getItem('pp-analytics-browser-v1'),null);
});
test('survey feedback is bounded, validated and retry-safe; it carries no profile or full URL',async()=>{
 const f=fixture({config:{...config,surveyId:'survey-1'}});
 assert.equal(await f.analytics.feedback({rating:0,issue:'bug',comment:'x'},'submission'),false);
 assert.equal(await f.analytics.feedback({rating:4,issue:'unexpected',comment:'x'},'submission'),false);
 assert.equal(await f.analytics.feedback({rating:5,issue:'none',comment:'a'.repeat(1200)},'submission'),true);
 const e=f.events.at(-1);assert.equal(e.event,'survey sent');assert.equal(e.properties.$survey_id,'survey-1');assert.equal(e.properties.$survey_submission_id,'submission');assert.equal(e.properties.$survey_response,'5');assert.deepEqual(e.properties.$survey_response_1,['none']);assert.equal(e.properties.$survey_response_2.length,1000);
 assert.equal(e.properties.$process_person_profile,false);assert.equal(e.properties.$geoip_disable,true);assert.equal(e.properties.$ip,null);assert.equal(e.properties.profile,undefined);assert.equal(e.properties.$current_url,undefined);
});
test('HTTP failures, ingest rejection and thrown network errors never acknowledge feedback',async()=>{
 for(const fetchImpl of [async()=>({ok:false}),async()=>({ok:true,json:async()=>({status:0})}),async()=>{throw Error('offline');}]){
  const f=fixture({fetchImpl});assert.equal(await f.analytics.feedback({rating:3,issue:'bug',comment:'still here'},'submission'),false);
  f.analytics.ready();f.advance(20000);f.analytics.flush();
 }
});
test('current public ingestion endpoint acknowledges successful captures with status Ok',async()=>{
 const f=fixture({fetchImpl:async()=>({ok:true,json:async()=>({status:'Ok'})})});
 assert.equal(await f.analytics.feedback({rating:4,issue:'none',comment:'Current capture envelope'},crypto.randomUUID()),true);
});
test('a lost feedback acknowledgement and retry reuse the event ID, timestamp and response ID',async()=>{
 let delivered=0;const f=fixture({fetchImpl:async(url,options)=>{f.events.push(JSON.parse(options.body));if(!delivered++)throw Error('response lost');return {ok:true,json:async()=>({status:1})};}});
 const answer={rating:4,issue:'controls',comment:'Retry this response'};
 assert.equal(await f.analytics.feedback(answer,'same-submission'),false);assert.equal(await f.analytics.feedback(answer,'same-submission'),true);
 assert.equal(f.events[0].uuid,'same-submission');assert.equal(f.events[1].uuid,f.events[0].uuid);assert.equal(f.events[1].timestamp,f.events[0].timestamp);assert.equal(f.events[1].distinct_id,f.events[0].distinct_id);assert.equal(f.events[1].properties.submission_id,'same-submission');
});
