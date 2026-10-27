import Phaser from 'phaser';
import {COLLAPSE_MAPS,createExperiment,readMetrics} from './model.js';
import {WorldRenderer} from '../design/world-renderer.js';
import {createArchSurface,createArchBackdrop} from '../arch/art.js';
import {MapViewport} from '../map-viewport.js';
import {bindBatteryInput} from '../battery-input.js';
import {ThreeToolsOverlay} from '../three-tools-view.js';
import {COLLECTIBLE_STYLE} from '../blast-step1/presentation.js';
import {DEFAULT_CHAIN_POWER} from './chain-world.js';
import {ChainView} from './chain-view.js';
import './style.css';
const $=id=>document.getElementById(id);
const CHAIN_STORAGE='planet-patchup-collapse-chain-power-v2';
let chainPower=DEFAULT_CHAIN_POWER;
try{const saved=JSON.parse(localStorage.getItem(CHAIN_STORAGE));if(typeof saved==='number'&&Number.isFinite(saved))chainPower=Math.round(Math.max(0,Math.min(30,saved))*2)/2;}catch{}
$('chain-power').value=$('chain-power-value').value=chainPower;
$('map').replaceChildren(...COLLAPSE_MAPS.map(map=>new Option(map.name,map.id)));
class CollapseScene extends Phaser.Scene{
 create(){
  this.resetExperiment();this.bindUI();
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe($('playfield'));
 }
 resetExperiment(){
  this.pointer?.destroy();this.overlay?.graphics.destroy();this.chainView?.destroy();this.view?.destroy();this.targetMarker?.destroy();
  this.experiment=createExperiment($('map').value,$('preset').value,$('unlimited').checked,$('response').value,chainPower);
  const {world:w,map}=this.experiment;this.world=w;this.paused=false;this.accumulator=0;this.attacks=[];this.events=[];this.aim={...map.aim};
  this.powerChanges=[{t:0,value:chainPower}];$('chain-controls').disabled=this.experiment.response!=='chain';
  const f=$('playfield');this.viewport=new MapViewport({worldWidth:w.width,worldHeight:w.height,viewWidth:f.clientWidth,viewHeight:f.clientHeight});this.viewport.fit();
  this.view=new WorldRenderer(this,w,this.viewport,$('minimap'),false,{surface:createArchSurface(w.width,w.original),createBackdrop:createArchBackdrop,collectibleStyle:COLLECTIBLE_STYLE});this.view.transform();this.overlay=new ThreeToolsOverlay(this,this.view);this.targetMarker=this.add.graphics().setDepth(40);
  this.chainView=new ChainView(this,this.viewport);
  this.pointer=bindBatteryInput(f,this.game.canvas,this.viewport,{touchAtContact:true,touchPressOnRelease:()=>true,canStart:()=>!this.paused,start:q=>{this.aim=q;},move:q=>{this.aim=q;},end:()=>{},press:q=>this.fire(q),onViewChange:()=>this.view.transform()});
  this.game.canvas.setAttribute('aria-label',`${map.name}. 클릭 또는 탭으로 폭파. 두 손가락으로 지도 이동.`);
  $('hint').textContent=map.hint;$('pause').textContent='일시정지';this.setTool('bomb');this.renderUI();
 }
 fire(q){if(this.paused)return false;this.aim=q;const ok=this.world.activate(q.x,q.y);if(ok)this.attacks.push({t:this.elapsed(),tool:this.world.tool,...q});return ok;}
 elapsed(){return this.world.elapsed-this.experiment.startedAt;}
 setTool(tool){this.world.setTool(tool);$('blast').setAttribute('aria-pressed',String(tool==='bomb'));$('blackhole').setAttribute('aria-pressed',String(tool==='blackhole'));}
 changeChainPower(value){
  if(this.experiment.response!=='chain'||!Number.isFinite(value))return;
  const next=this.world.setChainPower(value);
  if(next!==chainPower)this.powerChanges.push({t:this.elapsed(),value:next});
  chainPower=next;$('chain-power').value=$('chain-power-value').value=next;
  try{localStorage.setItem(CHAIN_STORAGE,JSON.stringify(next));}catch{}
  this.renderUI();
 }
 bindUI(){
  for(const id of ['map','preset','response'])$(id).onchange=()=>this.resetExperiment();$('reset').onclick=()=>this.resetExperiment();
  $('blast').onclick=()=>this.setTool('bomb');$('blackhole').onclick=()=>this.setTool('blackhole');
  $('aimed-shot').onclick=()=>{this.setTool('bomb');this.fire({...this.experiment.map.aim});};
  $('pause').onclick=()=>{this.paused=!this.paused;this.accumulator=0;$('pause').textContent=this.paused?'계속':'일시정지';this.renderUI();};
  $('fit').onclick=()=>{this.viewport.fit();this.view.transform();};
  $('unlimited').onchange=()=>{this.world.unlimited=$('unlimited').checked;this.renderUI();};
  $('chain-power').oninput=e=>this.changeChainPower(e.target.valueAsNumber);
  const commitPower=e=>{this.changeChainPower(e.target.valueAsNumber);e.target.value=chainPower;};
  $('chain-power-value').onchange=$('chain-power-value').onblur=commitPower;
  $('chain-power-value').onkeydown=e=>{if(e.key==='Enter')commitPower(e);};
  for(const button of document.querySelectorAll('[data-chain-power]'))button.onclick=()=>this.changeChainPower(Number(button.dataset.chainPower));
  $('export').onclick=()=>{const data={schemaVersion:3,localOnly:true,mapId:this.experiment.map.id,response:this.experiment.response,physicsVersion:this.world.physicsVersion,preset:this.experiment.preset,stats:this.world.stats(),unlimited:this.world.unlimited,seconds:this.elapsed(),metrics:readMetrics(this.world),chain:this.world.chainSummary||null,chainPower:this.world.chainPower??null,powerChanges:this.powerChanges,attacks:this.attacks,events:this.events,diagnostics:this.world.diagnostics()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${data.mapId}-${data.preset}-${Date.now()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){this.paused=true;this.accumulator=0;$('pause').textContent='계속';}});
 }
 resize(){const f=$('playfield');if(!this.viewport||!f.clientWidth||!f.clientHeight)return;const fit=Math.abs(this.viewport.zoom-this.viewport.minZoom)<.001;this.scale.resize(f.clientWidth,f.clientHeight);this.viewport.setSize(f.clientWidth,f.clientHeight);if(fit)this.viewport.fit();this.view.transform();}
 advance(dt){const w=this.world;w.step(dt);if($('suction').checked)w.work(this.aim.x,this.aim.y,dt,1,this.aim,false);for(const e of w.events.splice(0)){this.view.addEffect(e);if(e.kind==='chain-impact')this.chainView.add(e);if(['chain-impact','speed-fracture','joint-yield','joint-release','pillar-snap'].includes(e.kind)){this.events.push({t:this.elapsed(),...e});if(this.events.length>500)this.events.shift();}}}
 update(time,delta){
  if(!this.world)return;const dt=this.paused?0:Math.min(.1,delta/1000);this.pointer.update(dt);this.accumulator+=dt;while(this.accumulator>=1/60){this.advance(1/60);this.accumulator-=1/60;}
  this.view.automaticSuction=$('suction').checked;this.view.render(dt,{aim:this.aim,working:false,selectedTool:this.world.tool,direction:0,suctionOnly:false});this.overlay.draw(dt,this.world,this.aim);
  this.chainView.draw(dt);
  this.targetMarker.clear();if(!this.attacks.length){const p=this.viewport.worldToScreen(this.experiment.map.aim.x,this.experiment.map.aim.y);this.targetMarker.lineStyle(2,0xa64c35,.9).strokeCircle(p.x,p.y,10);this.targetMarker.lineBetween(p.x-14,p.y,p.x+14,p.y);this.targetMarker.lineBetween(p.x,p.y-14,p.x,p.y+14);}
  if(time-(this.lastUI||0)>150){this.lastUI=time;this.renderUI();}
 }
 renderUI(){const w=this.world,m=readMetrics(w),stats=w.stats();$('metrics').replaceChildren(...[['총 픽셀',m.total.toLocaleString()],['픽셀화',`${m.percent.toFixed(1)}% · ${m.pixelized}`],['회수',`${(m.collected/m.total*100).toFixed(1)}% · ${m.collected}`],['독립 강체',m.rigid],['공격 횟수',m.attacks],['경과',`${this.elapsed().toFixed(1)}초${this.paused?' · 정지':''}`],['배터리',w.unlimited?'∞':`${Math.ceil(w.charge)} / ${w.capacity}`]].flatMap(([label,value])=>{const a=document.createElement('span'),b=document.createElement('b');a.textContent=label;b.textContent=value;return[a,b];}));$('power').textContent=`Blast 반경 ${stats.bombRadius.toFixed(1)} · 힘 ${stats.bombPower.toFixed(2)} · 전달 ${stats.blastReach} | 자동 회수 ${stats.autoCollectRate.toFixed(2)}/초`;
  const chain=w.chainSummary,active=chain&&w.elapsed-chain.lastAt<2;
  $('chain-status').classList.toggle('active',!!active);
  $('chain-stage').textContent=chain?(chain.best?`${chain.best} CHAIN`:'READY'):'ORIGINAL';
  $('chain-detail').textContent=chain?(chain.best?`${active?'연쇄 진행 중':'최고 연쇄'} · 충돌로 +${chain.pixels} 픽셀`:w.chainPower?'큰 조각이 다음 구조물에 부딪히게 노려보세요.':'파괴 보정 꺼짐 · 일반 충돌만 적용'):'같은 화력으로 기존 반응과 비교해 보세요.';
 }
}
new Phaser.Game({type:Phaser.CANVAS,parent:'playfield',width:$('playfield').clientWidth,height:$('playfield').clientHeight,backgroundColor:'#e5dbc6',pixelArt:true,antialias:false,scene:CollapseScene,audio:{noAudio:true},banner:false,fps:{target:60}});
