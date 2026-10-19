import Phaser from 'phaser';
import {FreeJourney} from './journey.js';
import {BALANCE_VERSION,bossAdvice,upgradeGuide} from './balance.js';
import {FREE_TUTORIAL} from './sites.js';
import {FirstRunGuide,TutorialOverlay,gameTip} from './tutorial.js';
import {clampToolAim} from '../three-tool-run.js';
import {MapViewport} from '../map-viewport.js';
import {closeView,COLLECTIBLE_STYLE} from '../blast-step1/presentation.js';
import {bindBatteryInput} from '../battery-input.js';
import {WorldRenderer} from '../design/world-renderer.js';
import {createTrashSurface} from '../design/trash-surface.js';
import {createDustBackdrop} from '../design/dust-backdrop.js';
import {ThreeToolsOverlay,TOOL_LABELS} from '../three-tools-view.js';
import '../france/style.css';
import '../demo/style.css';
import '../blast-step1/style.css';
import './tutorial.css';

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
$('original-version').href=import.meta.env.DEV?'./blast-step1.html':'../planet-patchup-blast/';
const qa=new URLSearchParams(location.search).get('qa')==='1';
const scopedStorage=qa?{getItem:k=>storage.getItem('qa:'+k),setItem:(k,v)=>storage.setItem('qa:'+k,v)}:storage;
const journey=new FreeJourney(scopedStorage);
const duration=ms=>`${Math.floor(ms/60000)}분 ${Math.floor(ms/1000)%60}초`;
if(qa)$('test-label').textContent='검증용 별도 진행 · 실제 체험 저장과 분리';
let game,scene,operating=false;
let inputDevice=matchMedia('(pointer:coarse)').matches?'touch':'mouse';
document.addEventListener('pointerdown',e=>{inputDevice=e.pointerType==='touch'?'touch':'mouse';},{capture:true,passive:true});
export function failureMessage(reason){
  if(reason==='tutorial-next')return '첫 강화 완료! 다음 현장으로 출동해 달라진 장비를 써 보세요.';
  if(reason==='tutorial-upgrade')return '모은 부품으로 장비를 한 번 강화한 뒤 출동해 보세요. 안내는 건너뛸 수도 있어요.';
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
function closeDialogs(){for(const id of ['pause-dialog'])if($(id).open)$(id).close();}
function dispose(){release();if(game){scene?.teardown();game.destroy(true);game=null;scene=null;}}
function screen(id){release();for(const key of ['base','workshop','expedition'])$(key).hidden=key!==id;}
function profile(){
  const p=journey.profile,stats=journey.stats();$('parts').textContent=p.parts.toLocaleString();
  $('dispatch').textContent=p.tutorial==='intro'?'첫 청소 시작 · 조작 배우기 →':['upgrade','next'].includes(p.tutorial)?'첫 강화 이어서 하기 →':'랜덤 현장 출동 →';
  $('country-status').textContent=p.bossCleared?'✓ 고물 바람골 · 청소 완료':'● 고물 바람골 · 무료 1단계';
  $('boss-advice').textContent=bossAdvice(p);
  $('milestone').textContent=p.bossCleared?'첫 구역 완료 → 다음 행성 구역은 본편에서':p.owned.includes('blackhole')?'폭파 + 블랙홀 → 쌍봉 철탑 도전':p.earned?'폭파 강화 · 블랙홀 해금 600부품':'첫 폭파 → 부품 수집 → 장비 강화';
  $('playtest-report').textContent=`출동 ${p.runCount}회 · 누적 작업 ${duration(p.workMs)} · 보스 ${p.bossAttempts}회${p.firstClearMs!==null?` · 첫 완료 작업 ${duration(p.firstClearMs)}`:''} (정산한 출동만 · 메뉴·일시정지 제외)`;
  $('stats').replaceChildren(...[['폭파 반경',`${stats.bombRadius}칸`],['배터리',`${stats.capacity}`],['흡입량',`${stats.suctionRate}/초`],['흡입 반경',`${stats.suctionRadius}칸`]].map(([name,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;div.append(dt,dd);return div;}));
}
async function guarded(action){
  if(operating)return;operating=true;document.body.setAttribute('aria-busy','true');
  try{await action();}catch{release();scene?.run?.pause(true);notice(failureMessage('storage'));if(scene?.run&&!$('pause-dialog').open)$('pause-dialog').showModal();}
  finally{operating=false;document.body.removeAttribute('aria-busy');profile();}
}
function home(){closeDialogs();dispose();screen('base');profile();}
function workshop(){closeDialogs();dispose();screen('workshop');profile();renderOffers();}
function renderOffers(){
  $('upgrade-guide').textContent=upgradeGuide(journey.profile);$('workshop-retry').hidden=!journey.lastRunSite;
  const phase=journey.profile.tutorial,first=phase==='upgrade',next=phase==='next';
  $('upgrade-guide').hidden=first||next;
  $('workshop-note').textContent=first||next?'강화는 다음 출동부터 적용돼요.':'강화는 다음 출동부터 적용돼요. 지금 구매하지 않고 부품을 모아도 좋아요.';
  $('tutorial-workshop').hidden=phase==='done';
  $('tutorial-workshop').textContent=first?'수거한 쓰레기가 강화에 쓰는 부품이에요. 폭파 반경을 한 번 키워 보세요.':next?'첫 강화 완료! 폭파 반경이 넓어졌어요. 다음 현장에서 사용해 보세요.':'첫 강화에는 80부품이 필요해요. 연습 현장에서 조금 더 모아 보세요. 모은 부품은 그대로 남아요.';
  $('workshop-skip').hidden=phase==='done';
  $('workshop-random').disabled=first;$('workshop-random').classList.toggle('next-map',next);
  $('workshop-random').textContent=next?'다음 현장 · 강화한 폭파기 써 보기 →':phase==='intro'?'연습 현장에서 더 모으기 →':'강화 마치고 새 현장 →';
  $('workshop-retry').hidden||=first||next;$('workshop-boss').hidden=first||next;
  const visible=next?[]:first?journey.offers().filter(o=>o.id==='bombRange'):journey.offers();
  $('offers').replaceChildren(...visible.map(offer=>{
    const card=document.createElement('article');card.className='offer';
    if(first)card.classList.add('first-upgrade');
    const title=document.createElement('h3');title.textContent=`${offer.name} · ${offer.level}/${offer.max}`;
    const description=document.createElement('p');description.textContent=offer.description;
    const help=document.createElement('p');help.className='offer-help';help.textContent=offer.help||'새 도구를 해금한 뒤 Ⅱ 메뉴에서 선택할 수 있어요.';
    const button=document.createElement('button');button.textContent=offer.available?`${offer.cost.toLocaleString()} 부품 · ${journey.profile.parts>=offer.cost?'구매':`${offer.cost-journey.profile.parts} 부족`}`:offer.max&&offer.level>=offer.max?'최대 성장 / 보유 중':'도구 해금 후 강화 가능';
    button.disabled=!offer.available||journey.profile.parts<offer.cost;
    button.onclick=()=>guarded(async()=>{const result=await journey.buy(offer.id,{level:offer.level,cost:offer.cost});if(!result.ok)notice(failureMessage(result.reason));else notice(`${offer.name} 구매 완료`);profile();renderOffers();});
    card.append(title,description,help);
    card.append(button);return card;
  }));
}
async function dispatch(mode){
  const result=await journey.start(mode);if(!result.ok){notice(failureMessage(result.reason));return;}
  closeDialogs();dispose();screen('expedition');notice('');profile();
  game=new Phaser.Game({type:Phaser.AUTO,parent:'playfield',width:$('playfield').clientWidth,height:$('playfield').clientHeight,backgroundColor:document.documentElement.dataset.demo==='planet'?'#d8c59a':'#e4ebdc',pixelArt:true,antialias:false,scene:FreeScene,scale:{mode:Phaser.Scale.NONE}});
}
async function settle(){
  release();scene?.run.pause(true);if($('pause-dialog').open)$('pause-dialog').close();
  const result=await journey.finish();
  if(!result.ok){
    $('resume').hidden=true;$('pause-return').textContent='정산 저장 다시 시도';
    if(!$('pause-dialog').open)$('pause-dialog').showModal();
    notice(failureMessage(result.reason));return;
  }
  $('resume').hidden=false;$('pause-return').textContent='지금까지 모으고 돌아가기';
  profile();if(scene)scene.settled=true;
  $('result-title').textContent=`쓰레기 ${result.recovered.toLocaleString()}개를 수거했어요!`;
  $('result-copy').textContent=`${result.siteName} · ${result.mode==='boss'&&result.qualified?'무료 1단계 완료!':result.qualified?'70% 회수 목표 달성!':'모은 부품은 그대로 남아요.'} 부품 ${result.recovered.toLocaleString()}개로 장비를 강화해 보세요.`;
  $('result-bonus').textContent=result.firstClear?`쌍봉 철탑 첫 성공 +${result.bonus} 부품! 다음 구역은 본편 구매 후 이어져요. 현재 체험판에서는 결제 없이 여기까지예요.`:`이번 작업 ${duration(result.workMs)} · 모은 부품은 작업장에서 사용할 수 있어요.`;
  $('run-receipt').hidden=false;workshop();
}
class FreeScene extends Phaser.Scene{
  create(){
    scene=this;this.run=journey.currentRun;const r=this.run,w=r.world,f=$('playfield');this.aim={...r.aim};this.working=false;this.settled=false;this.settling=false;this.lastHUD=0;this.lastClock=performance.now();
    this.viewport=new MapViewport({worldWidth:w.width,worldHeight:w.height,viewWidth:f.clientWidth,viewHeight:f.clientHeight});closeView(this.viewport,r.site.preview[0]?.x);this.aim={x:r.site.preview[0]?.x??w.width/2,y:w.floorY-10};
    this.view=new WorldRenderer(this,w,this.viewport,$('minimap'),true,document.documentElement.dataset.demo==='planet'?{surface:createTrashSurface(w.width,w.cells,'earth'),createBackdrop:createDustBackdrop,collectibleStyle:COLLECTIBLE_STYLE}:{});this.view.transform();this.overlay=new ThreeToolsOverlay(this,this.view);
    this.tipSeconds=0;
    if(r.site.id===FREE_TUTORIAL.id){
      this.aim={...r.site.preview[0]};this.guide=new FirstRunGuide(r.site.preview[0]);
      this.guideView=new TutorialOverlay(f,this.guide,()=>guarded(async()=>{const result=await journey.skipTutorial();if(result.ok)this.guide.skip();else notice(failureMessage(result.reason));}));
    }
    this.pointer=bindBatteryInput(f,this.game.canvas,this.viewport,{touchReleaseAtPointer:true,canStart:()=>!r.paused&&!r.finishReady&&!operating,start:q=>{r.release();this.working=true;this.aim=clampToolAim(w,q);},move:q=>{this.aim=clampToolAim(w,q);},press:q=>{this.aim=clampToolAim(w,q);return this.attack();},end:()=>{this.working=false;r.release();},touchPressOnRelease:()=>true,onViewChange:()=>{this.view.transform();this.mapLabel();}});
    this.game.canvas.tabIndex=0;this.game.canvas.setAttribute('aria-label','청소 현장. 방향키로 조준, 스페이스로 도구 사용. 터치는 왼쪽 위 포인터로 조준하다 손을 떼면 그 포인터에 폭파 또는 블랙홀. 두 손가락으로 이동과 확대.');this.game.canvas.onpointerdown=()=>this.game.canvas.focus({preventScroll:true});
    $('site-name').textContent=r.site.name;$('run-mode').textContent=r.mode==='boss'?'쌍봉 철탑 보스':'고물 바람골';
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(f);
    this.teardown=bindSceneTeardown(this.events,()=>{this.observer.disconnect();this.pointer.destroy();this.guideView?.destroy();this.view.destroy();});this.hud();this.mapLabel();
  }
  mapLabel(){$('map-label').textContent=Math.abs(this.viewport.zoom-this.viewport.minZoom)<.001?'가까이 보기':'전체 보기';}
  resize(){const f=$('playfield');if(!f.clientWidth||!f.clientHeight)return;release();const fit=Math.abs(this.viewport.zoom-this.viewport.minZoom)<.001;this.scale.resize(f.clientWidth,f.clientHeight);this.viewport.setSize(f.clientWidth,f.clientHeight);if(fit)this.viewport.fit();this.view.transform();this.mapLabel();}
  attack(){const accepted=this.run.press(this.aim);this.guide?.attack(this.aim,accepted);if(!accepted)$('feedback').textContent='건물 위를 조준하거나 남은 배터리를 확인해 주세요.';this.hud();return accepted;}
  hud(){
    const r=this.run,w=r.world,s=w.stats();$('blackhole-lock').hidden=journey.profile.owned.includes('blackhole');$('charge').textContent=`${Math.ceil(w.charge/w.capacity*100)}%`;$('energy').max=w.capacity;$('energy').value=w.charge;
    $('recovered').textContent=`${(r.ratio*100).toFixed(1)}%`;$('recovery').value=r.ratio*100;
    for(const b of tools){b.disabled=!journey.profile.owned.includes(b.dataset.tool)||r.finishReady;b.setAttribute('aria-pressed',String(w.tool===b.dataset.tool));b.title=journey.profile.owned.includes(b.dataset.tool)?TOOL_LABELS[b.dataset.tool]:'작업장에서 구매하세요';}
    $('tool-detail').textContent=w.tool==='bomb'?`${inputDevice==='touch'?'조준 후 손 떼기':'클릭 즉시 폭파'} · 반경 ${s.bombRadius} · ${s.bombCost} 에너지`:`${s.gravityDuration}초 · ${s.gravityCost} 에너지 · 휘젓기 ${s.coreMix}배 · 마모 1→${s.wearSpeed}배`;
    $('feedback').textContent=r.paused?'청소가 잠시 멈췄어요.':r.phase==='finishing'?`배터리 소진 · 무료 마무리 수집 ${Math.ceil(r.finishRemaining)}초`:r.qualified?'70% 달성 · Ⅱ 메뉴에서 정산하고 강화하세요.':w.canUseTool()&&w.charge<w.cost()?'남은 배터리로 마지막 1회 사용할 수 있어요.':gameTip(this.tipSeconds,inputDevice);
    this.guideView?.render(this.viewport,this.aim,w,inputDevice,r.paused||r.phase==='finishing');
  }
  update(time){
    const r=this.run;if(!r)return;const now=performance.now(),elapsed=Math.max(0,(now-this.lastClock)/1000);this.lastClock=now;const dt=r.paused||r.finishReady?0:Math.min(.1,elapsed);r.update(r.paused||r.finishReady?0:elapsed,{working:this.working,...this.aim});
    this.tipSeconds+=dt;this.guide?.update(dt,r.world.collected,this.guide.pending&&(r.world.bodies.length>0||r.looseCount>0||r.world.collected>0));
    this.guideView?.render(this.viewport,this.aim,r.world,inputDevice,r.paused||r.phase==='finishing');
    for(const event of r.world.events.splice(0))this.view.addEffect(event);
    this.view.render(dt,{aim:this.aim,working:this.working,selectedTool:r.world.tool,direction:0,suctionOnly:r.phase==='finishing'});this.overlay.draw(this.view.reducedMotion.matches?0:dt,r.world,this.aim);
    if(time-this.lastHUD>100){this.hud();this.lastHUD=time;}
    if(r.finishReady&&!this.settled&&!this.settling&&!operating){this.settling=true;guarded(async()=>{await settle();});}
  }
}
function pause(){if(!scene||scene.settled||scene.run.finishReady)return;release();scene.run.pause(true);scene.hud();if(!$('pause-dialog').open)$('pause-dialog').showModal();}
$('dispatch').onclick=()=>['upgrade','next'].includes(journey.profile.tutorial)?workshop():guarded(()=>dispatch('random'));$('boss').onclick=()=>guarded(()=>dispatch('boss'));$('workshop-open').onclick=workshop;$('workshop-back').onclick=home;
$('practice').onclick=()=>guarded(()=>dispatch('tutorial'));
$('workshop-skip').onclick=()=>guarded(async()=>{const result=await journey.skipTutorial();if(!result.ok)notice(failureMessage(result.reason));renderOffers();});
$('pause-return').onclick=()=>guarded(settle);$('pause').onclick=pause;
$('resume').onclick=()=>{if(document.hidden)return;$('pause-dialog').close();release();if(scene)scene.lastClock=performance.now();scene?.run.pause(false);};
$('pause-dialog').addEventListener('cancel',event=>event.preventDefault());
$('workshop-retry').onclick=()=>guarded(()=>dispatch('retry'));$('workshop-random').onclick=()=>guarded(()=>dispatch('random'));$('workshop-boss').onclick=()=>guarded(()=>dispatch('boss'));
$('fit').onclick=()=>{release();scene?.viewport.fit();scene?.view.transform();scene?.mapLabel();};
$('map-overview').onclick=()=>{if(!scene||scene.run.paused)return;release();const v=scene.viewport;if(Math.abs(v.zoom-v.minZoom)<.001)closeView(v,scene.run.site.preview[0]?.x);else v.fit();scene.view.transform();scene.mapLabel();};
for(const b of tools)b.onclick=()=>{release();scene?.run.selectTool(b.dataset.tool);scene?.hud();};
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
export function handleStep1PageHide(event,pauseRun,disposeRun){
  if(event.persisted)pauseRun();else disposeRun();
}
window.addEventListener('pagehide',event=>handleStep1PageHide(event,pause,dispose));
document.addEventListener('keydown',event=>{
  if(!scene||scene.run.paused||scene.run.finishReady||operating)return;if(event.key==='Escape'){event.preventDefault();pause();return;}
  if(document.activeElement!==game.canvas&&document.activeElement!==$('playfield'))return;
  if(event.code==='Space'){event.preventDefault();if(!event.repeat){scene.attack();scene.run.release();}}
  const dx=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,dy=event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0;
  if(dx||dy){event.preventDefault();scene.aim=clampToolAim(scene.run.world,{x:scene.aim.x+dx,y:scene.aim.y+dy});}
});
document.addEventListener('keyup',event=>{if(event.code==='Space')release();});
profile();notice(journey.notice||(!journey.persistent?'저장소를 사용할 수 없어요. 저장 안내를 확인해 주세요.':''));

$('export-report').onclick=()=>{const blob=new Blob([JSON.stringify({campaign:'free30',balanceVersion:BALANCE_VERSION,exportedAt:new Date().toISOString(),profile:journey.profile},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='free30-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
