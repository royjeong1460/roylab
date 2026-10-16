import Phaser from 'phaser';
import {Step1Journey} from './journey.js';
import {bossAdvice} from './balance.js';
import {clampToolAim} from '../three-tool-run.js';
import {crossPattern} from './cutter.js';
import {MapViewport} from '../map-viewport.js';
import {bindBatteryInput} from '../battery-input.js';
import {WorldRenderer} from '../design/world-renderer.js';
import {createTrashSurface} from '../design/trash-surface.js';
import {createDustBackdrop} from '../design/dust-backdrop.js';
import {ThreeToolsOverlay,TOOL_LABELS,drawPatternPreview} from '../three-tools-view.js';
import '../france/style.css';
import './style.css';

export function bindSceneTeardown(events,cleanup){
  let cleaned=false;
  const teardown=()=>{
    if(cleaned)return;
    cleaned=true;
    events.off('shutdown',teardown);events.off('destroy',teardown);
    cleanup();
  };
  events.once('shutdown',teardown);events.once('destroy',teardown);
  return teardown;
}
const $=id=>document.getElementById(id),tools=[...document.querySelectorAll('[data-tool]')];
let storage;try{storage=globalThis.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('저장소 접근 불가');}};}
const qa=new URLSearchParams(location.search).get('qa')==='1';
const scopedStorage=qa?{getItem:k=>storage.getItem('qa:'+k),setItem:(k,v)=>storage.setItem('qa:'+k,v)}:storage;
const journey=new Step1Journey(scopedStorage);
const duration=ms=>`${Math.floor(ms/60000)}분 ${Math.floor(ms/1000)%60}초`;
if(qa)$('test-label').textContent='검증용 별도 진행 · 실제 체험 저장과 분리';
let game,scene,operating=false;
export function failureMessage(reason){
  return ({busy:'다른 작업을 마치는 중이에요. 잠시 후 다시 눌러 주세요.',storage:'진행을 저장하지 못했어요. 현재 화면에서 다시 시도해 주세요.',stale:'다른 탭에서 진행이 바뀌었어요. 최신 진행을 확인한 후 다시 시도해 주세요.',active:'진행 중인 청소를 먼저 마쳐 주세요.',mode:'출동할 현장을 확인하지 못했어요. 기지에서 다시 선택해 주세요.','no-previous-site':'아직 다시 도전할 현장이 없어요. 새 동네 청소를 선택해 주세요.','no-run':'저장할 청소가 없어요. 현재 결과를 확인해 주세요.','invalid-recovery':'수집 결과를 확인하지 못했어요. 현재 화면을 유지하고 다시 시도해 주세요.',unknown:'선택한 장비를 확인하지 못했어요.',unavailable:'이미 보유했거나 아직 구매할 수 없는 장비예요.',insufficient:'부품이 부족해요. 동네 청소에서 조금 더 모아 주세요.'})[reason]||'작업을 완료하지 못했어요. 현재 화면에서 다시 시도해 주세요.';
}
export function showStep1Notice(doc,message){
  doc.getElementById('notice').textContent=message||'';
  for(const dialog of doc.querySelectorAll('dialog')){
    const status=dialog.querySelector('[data-dialog-notice]');
    if(status)status.textContent=dialog.open?message||'':'';
  }
}
const notice=message=>showStep1Notice(document,message);
function release(){scene?.pointer?.release();scene?.run?.release();if(scene)scene.working=false;}
function closeDialogs(){for(const id of ['pause-dialog','result-dialog'])if($(id).open)$(id).close();}
function dispose(){release();if(game){scene?.teardown();game.destroy(true);game=null;scene=null;}}
function screen(id){release();for(const key of ['base','workshop','expedition'])$(key).hidden=key!==id;}
function profile(){
  const p=journey.profile,stats=journey.stats();$('parts').textContent=p.parts.toLocaleString();
  $('country-status').textContent=p.bossCleared?'✓ 고물 바람골 · 청소 완료':'● 고물 바람골 · 무료 1단계';
  $('boss-advice').textContent=bossAdvice(p);
  $('milestone').textContent=p.bossCleared?'첫 구역 완료 → 다음 행성 구역은 본편에서':p.upgrades.cutter||p.owned.includes('bomb')?'절단기 성장 · 다른 도구도 시험 → 쌍봉 철탑':p.earned?'절단 픽셀 +1 강화 → 더 넓게 자르기':'첫 출동 → 부품 수집 → 절단기 강화';
  $('playtest-report').textContent=`출동 ${p.runCount}회 · 누적 작업 ${duration(p.workMs)} · 보스 ${p.bossAttempts}회${p.firstClearMs!==null?` · 첫 완료 작업 ${duration(p.firstClearMs)}`:''} (정산한 출동만 · 메뉴·일시정지 제외)`;
  $('stats').replaceChildren(...[['절단',`${stats.cutPixels} / 21픽셀`],['배터리',`${stats.capacity}`],['흡입량',`${stats.suctionRate}/초`],['흡입 반경',`${stats.suctionRadius}칸`]].map(([name,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;div.append(dt,dd);return div;}));
}
async function guarded(action){
  if(operating)return;operating=true;document.body.setAttribute('aria-busy','true');
  try{await action();}catch(error){release();scene?.run?.pause(true);notice(failureMessage('storage'));if(scene?.run&&!$('result-dialog').open&&!$('pause-dialog').open)$('pause-dialog').showModal();}
  finally{operating=false;document.body.removeAttribute('aria-busy');profile();}
}
function home(){closeDialogs();dispose();screen('base');profile();}
function workshop(){closeDialogs();dispose();screen('workshop');profile();renderOffers();}
function renderOffers(){
  $('offers').replaceChildren(...journey.offers().map(offer=>{
    const card=document.createElement('article');card.className='offer';
    const title=document.createElement('h3');title.textContent=offer.name;
    const description=document.createElement('p');description.textContent=offer.description;
    const button=document.createElement('button');button.textContent=offer.available?`${offer.cost.toLocaleString()} 부품 · 구매`:offer.max&&offer.level>=offer.max?'최대 성장 / 보유 중':'보유 중 / 잠김';
    button.disabled=!offer.available||journey.profile.parts<offer.cost;
    button.onclick=()=>guarded(async()=>{const result=await journey.buy(offer.id,{level:offer.level,cost:offer.cost});if(!result.ok)notice(failureMessage(result.reason));else notice(`${offer.name} 구매 완료`);profile();renderOffers();});
    card.append(title,description);
    if(offer.id==='cutter'){
      card.classList.add('cutter-offer');const preview=document.createElement('div');preview.className='cutter-preview';
      for(const level of [offer.level,Math.min(offer.max,offer.level+1)]){const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=78;canvas.height=78;canvas.setAttribute('aria-hidden','true');caption.textContent=`${level+1} 픽셀`;drawPatternPreview(canvas,crossPattern(level));figure.append(canvas,caption);preview.append(figure);}
      card.append(preview);
    }
    card.append(button);return card;
  }));
}
async function dispatch(mode){
  const result=await journey.start(mode);if(!result.ok){notice(failureMessage(result.reason));return;}
  closeDialogs();dispose();screen('expedition');notice('');profile();
  game=new Phaser.Game({type:Phaser.AUTO,parent:'playfield',width:$('playfield').clientWidth,height:$('playfield').clientHeight,backgroundColor:document.documentElement.dataset.demo==='planet'?'#d8c59a':'#e4ebdc',pixelArt:true,antialias:false,scene:Step1Scene,scale:{mode:Phaser.Scale.NONE}});
}
async function settle(){
  release();scene?.run.pause(true);if($('pause-dialog').open)$('pause-dialog').close();
  const result=await journey.finish();
  if(!result.ok){notice(failureMessage(result.reason));return;}
  profile();if(scene)scene.settled=true;
  $('result-title').textContent=result.mode==='boss'&&result.qualified?'무료 1단계 완료!':result.qualified?'70% 회수 목표 달성!':'조금씩, 더 깨끗하게.';
  $('result-copy').textContent=`${result.siteName}에서 ${result.recovered.toLocaleString()} 부품을 모았어요. ${result.qualified?'장비를 정비하고 다음 도전을 골라 보세요.':'장비를 키우거나 같은 현장에 다시 도전해 보세요.'}`;
  $('result-bonus').textContent=result.firstClear?`쌍봉 철탑 첫 성공 +${result.bonus} 부품! 다음 구역은 본편 구매 후 이어져요. 현재 체험판에서는 결제 없이 여기까지예요.`:`이번 작업 ${duration(result.workMs)} · 모은 부품은 작업장에서 사용할 수 있어요.`;
  $('result-dialog').showModal();
}
class Step1Scene extends Phaser.Scene{
  create(){
    scene=this;this.run=journey.currentRun;const r=this.run,w=r.world,f=$('playfield');this.aim={...r.aim};this.working=false;this.settled=false;this.settling=false;this.lastHUD=0;this.lastClock=performance.now();
    this.viewport=new MapViewport({worldWidth:w.width,worldHeight:w.height,viewWidth:f.clientWidth,viewHeight:f.clientHeight});this.viewport.fit();
    this.view=new WorldRenderer(this,w,this.viewport,$('minimap'),true,document.documentElement.dataset.demo==='planet'?{surface:createTrashSurface(w.width,w.cells,'earth'),createBackdrop:createDustBackdrop}:{});this.view.transform();this.overlay=new ThreeToolsOverlay(this,this.view);
    this.pointer=bindBatteryInput($('touch-surface')||f,this.game.canvas,this.viewport,{touchMargin:{right:32,bottom:64},canStart:()=>!r.paused&&!r.finishReady&&!operating,start:q=>{r.release();this.working=true;this.aim=clampToolAim(w,q);},move:q=>{this.aim=clampToolAim(w,q);},press:q=>{this.aim=clampToolAim(w,q);return this.attack();},end:()=>{this.working=false;r.release();},touchPressOnRelease:()=>w.tool!=='cutter',onViewChange:()=>this.view.transform()});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','청소 현장. 방향키로 조준, 스페이스로 도구 사용. 터치는 누른 채 절단, 폭파와 블랙홀은 한 번 누르기.');this.game.canvas.onpointerdown=()=>this.game.canvas.focus({preventScroll:true});
    $('site-name').textContent=r.site.name;$('site-hint').textContent=r.site.hint;$('run-mode').textContent=r.mode==='boss'?'무료 1단계 · 쌍봉 철탑 보스':'무료 1단계 · 랜덤 현장';
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(f);
    this.teardown=bindSceneTeardown(this.events,()=>{this.observer.disconnect();this.pointer.destroy();this.view.destroy();});this.hud();
  }
  resize(){const f=$('playfield');if(!f.clientWidth||!f.clientHeight)return;release();const fit=Math.abs(this.viewport.zoom-this.viewport.minZoom)<.001;this.scale.resize(f.clientWidth,f.clientHeight);this.viewport.setSize(f.clientWidth,f.clientHeight);if(fit)this.viewport.fit();this.view.transform();}
  attack(){const accepted=this.run.press(this.aim);if(!accepted)$('feedback').textContent='건물 위를 조준하거나 남은 배터리를 확인해 주세요.';this.hud();return accepted;}
  hud(){
    const r=this.run,w=r.world,s=w.stats();$('charge').textContent=`${Math.ceil(w.charge)} / ${w.capacity}`;$('energy').max=w.capacity;$('energy').value=w.charge;
    $('recovered').textContent=`${(r.ratio*100).toFixed(1)}% · ${w.collected.toLocaleString()}개`;$('recovery').value=r.ratio*100;
    $('target-status').textContent=r.qualified?'✓ 70% 달성 · 더 모아도 좋아요':'초록 원 안에서 무료 자동 흡입';
    $('cutter-shape').textContent=`절단 범위 ${w.cutPattern().cells.length} / 21 픽셀 · 강화 자동 적용`;
    for(const b of tools){b.disabled=!journey.profile.owned.includes(b.dataset.tool)||r.paused||r.finishReady;b.setAttribute('aria-pressed',String(w.tool===b.dataset.tool));b.title=journey.profile.owned.includes(b.dataset.tool)?TOOL_LABELS[b.dataset.tool]:'작업장에서 구매하세요';}
    $('tool-detail').textContent=w.tool==='cutter'?`누르고 긋기 · ${w.cutPattern().cells.length}픽셀 · ${s.cutCost} 에너지 / 회`:w.tool==='bomb'?`한 번 누르기 · 반경 ${s.bombRadius} · ${s.bombCost} 에너지`:`한 번 누르기 · ${s.gravityDuration}초 인력 · ${s.gravityCost} 에너지`;
    $('feedback').textContent=r.paused?'청소가 잠시 멈췄어요.':r.phase==='finishing'?`배터리 소진 · 무료 마무리 수집 ${Math.ceil(r.finishRemaining)}초`:r.qualified?'목표 달성! 수집 마치기를 누르면 부품을 저장해요.':w.canUseTool()&&w.charge<w.cost()?'남은 배터리로 마지막 1회 사용할 수 있어요.':'잔해 가까이 이동하면 초록 원에서 자동으로 모아요.';
  }
  update(time,delta){
    const r=this.run;if(!r)return;const now=performance.now(),elapsed=Math.max(0,(now-this.lastClock)/1000);this.lastClock=now;const dt=r.paused||r.finishReady?0:Math.min(.1,elapsed);r.update(r.paused||r.finishReady?0:elapsed,{working:this.working,...this.aim});
    for(const event of r.world.events.splice(0))this.view.addEffect(event);
    this.view.render(dt,{aim:this.aim,working:this.working,selectedTool:r.world.tool,direction:0,suctionOnly:r.phase==='finishing'});this.overlay.draw(this.view.reducedMotion.matches?0:dt,r.world,this.aim);
    if(time-this.lastHUD>100){this.hud();this.lastHUD=time;}
    if(r.finishReady&&!this.settled&&!this.settling){this.settling=true;guarded(async()=>{await settle();});}
  }
}
function pause(){if(!scene||scene.settled||scene.run.finishReady)return;release();scene.run.pause(true);scene.hud();if(!$('pause-dialog').open)$('pause-dialog').showModal();}
$('dispatch').onclick=()=>guarded(()=>dispatch('random'));$('boss').onclick=()=>guarded(()=>dispatch('boss'));$('workshop-open').onclick=workshop;$('workshop-back').onclick=home;
$('return').onclick=$('pause-return').onclick=()=>guarded(settle);$('pause').onclick=pause;
$('resume').onclick=()=>{if(document.hidden)return;$('pause-dialog').close();release();if(scene)scene.lastClock=performance.now();scene?.run.pause(false);};
$('pause-dialog').addEventListener('cancel',event=>event.preventDefault());$('result-dialog').addEventListener('cancel',event=>event.preventDefault());
$('result-retry').onclick=()=>guarded(()=>dispatch('retry'));$('result-random').onclick=()=>guarded(()=>dispatch('random'));$('result-workshop').onclick=workshop;$('result-base').onclick=home;
$('fit').onclick=()=>{release();scene?.viewport.fit();scene?.view.transform();};
for(const b of tools)b.onclick=()=>{release();scene?.run.selectTool(b.dataset.tool);scene?.hud();};
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
export function handleStep1PageHide(event,pauseRun,disposeRun){
  if(event.persisted)pauseRun();else disposeRun();
}
window.addEventListener('pagehide',event=>handleStep1PageHide(event,pause,dispose));
document.addEventListener('keydown',event=>{
  if(!scene||scene.run.paused||scene.run.finishReady||operating)return;if(event.key==='Escape'){event.preventDefault();pause();return;}
  if(document.activeElement!==game.canvas&&document.activeElement!==$('playfield'))return;
  if(event.code==='Space'){event.preventDefault();if(!event.repeat){scene.working=scene.run.world.tool==='cutter';scene.attack();if(!scene.working)scene.run.release();}}
  const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
  if(dx||dy){event.preventDefault();scene.aim=clampToolAim(scene.run.world,{x:scene.aim.x+dx,y:scene.aim.y+dy});}
});
document.addEventListener('keyup',event=>{if(event.code==='Space')release();});
profile();notice(journey.notice||(!journey.persistent?'저장소를 사용할 수 없어요. 저장 안내를 확인해 주세요.':''));

$('export-report').onclick=()=>{const blob=new Blob([JSON.stringify({campaign:'free-step1',exportedAt:new Date().toISOString(),profile:journey.profile},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='free-step1-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
