import {installTestEdition} from '../free30/edition.js';
import {RAMP_MAPS} from './maps.js';
import {createYardSurface,createYardBackdrop} from '../paid-lab/culture/art.js';
import {mountCulturePreview} from '../paid-lab/culture/preview-ui.js';
import {applySettings} from '../paid-lab/settings.js';
import {mountSettings} from '../paid-lab/settings-ui.js';
import {loadOptions,optionsLabel,loadIdeaTuning,createTuningStorage} from '../ideas-lab/options.js';
import {mountIdeas} from '../ideas-lab/ui.js';
import {mountDesktopPanels} from '../ideas-lab/desktop.js';
import {RampWorld} from './world.js';
import {IdeaOverlay} from '../ideas-lab/overlay.js';
import {extendWorksite,frameWorksite} from '../ideas-lab/space.js';
import '../paid-lab/culture/style.css';
import '../paid-lab/style.css';
import '../ideas-lab/style.css';
import {rampStorage} from './storage.js';
import {loadMotion,applyRampMotion} from './settings.js';
import {mountMotion} from './ui.js';
import '../motion-lab/style.css';
import '../bearing-lab/style.css';

const FREE_URL='/games/planet-patchup-free/';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
storage=rampStorage(storage);
const physicsStorage=storage,motion=loadMotion(storage);
let activeWorld,readout,startButton;
const initialText=world=>world.bearingReadings().map((r,i)=>`${['왼쪽','가운데','오른쪽'][i]}: 받침 ${r.width.toFixed(1)}칸 · 위 ${r.load}픽셀 · 부담 ${Math.round(r.utilization*100)}%`).join(' / ');
const loaded=loadOptions(storage),options=loaded.options,tuning=loadIdeaTuning(storage),settings=tuning.settings;
const label=`${optionsLabel(options)} · ${settings.unlimited?'배터리 무제한':`배터리 ${settings.capacity}`}`;
installTestEdition({
 runLabel:'1·3·5칸 · 점진 회전 비교',
 findMap:key=>RAMP_MAPS.find(map=>map.key===key)||RAMP_MAPS[0],surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.ideas-dialog[open]:not(.ideas-docked),.paid-settings[open]:not(.ideas-docked),.culture-map-picker[open],.motion-dialog[open]')),
 label:`1·3·5칸 · 점진 회전 비교 · ${label} · 실제 진행 저장 없음`,
 configure(_world,run){
  const {site,bounds}=extendWorksite(run.site);
  run.site=site;run.aim={...site.preview[0]};run.previous={...run.aim};
  run.world=new RampWorld(site,run.profile,options);run.world.worksiteBounds=bounds;applySettings(run.world,settings);applyRampMotion(run.world,motion.settings);
  activeWorld=run.world;readout.textContent='초기 하중 · '+initialText(activeWorld)+' · 100% 초과 시 받침 변형';
 },
 initialView:(viewport,run)=>frameWorksite(viewport,run.world.worksiteBounds),
 createOverlay:(scene,view)=>new IdeaOverlay(scene,view),
 status:world=>`현재 회전 반응 ${Math.max(1,...world.bodies.map(p=>p.rotationGain||1)).toFixed(2)}배 · 조각 최대 이동 ${Math.max(0,...world.bodies.map(p=>Math.hypot(p.body.velocity.x,p.body.velocity.y)*60)).toFixed(0)}칸/s · 속도 제한 ${world.motionLimits||0}회`,
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label:`${label} · 중력 ${motion.settings.gravity}배 / 회전 1→${motion.settings.rotation}배 (5초) / 최고 속도 ${motion.settings.speed}배`,backURL:FREE_URL,maps:RAMP_MAPS,pickerTitle:'기둥 두께 · 무게 · 무게중심 비교',pickerNote:'첫 맵은 같은 건물을 왼쪽 1칸·가운데 3칸·오른쪽 5칸 기둥에 올렸어요. 하중 비교 시작으로 외력 없이 관찰하고, 폭파로 남은 두께를 줄여 보세요. 중앙 하중과 무거운 중앙 하중도 비교할 수 있어요.'});
  const original=document.createElement('a');original.className='culture-back';original.textContent='기존 고정 3배 비교';original.href='/games/planet-patchup-bearing/';banner.append(original);
  startButton=document.createElement('button');startButton.className='bearing-start';startButton.textContent='하중 비교 시작';
  startButton.onclick=()=>{if(!activeWorld)return;activeWorld.detach();startButton.disabled=true;startButton.textContent='관찰 중 · 폭파도 가능';};
  readout=document.createElement('p');readout.className='bearing-readout';
  banner.prepend(startButton,readout);
  mountSettings(banner,settings,createTuningStorage(storage),hooks,tuning.warning);
  mountIdeas(banner,options,storage,hooks,loaded.warning);
  mountMotion(banner,motion.settings,physicsStorage,hooks,motion.warning);
  document.getElementById('ideas-title').textContent='1·3·5칸 · 점진 회전 비교';
  const title=document.getElementById('paid-settings-title');if(title)title.textContent='실험 세부 화력';
  const note=document.querySelector('.paid-settings header + p');if(note)note.textContent='현재 실험 조합의 직접 파괴·흡입 값을 바꿔요. 저장하면 같은 맵을 다시 시작하며, 이 실험실에서만 유지돼요.';

 },
});
await import('../free30/main.js');
mountDesktopPanels();
document.title='Planet Patchup · 1·3·5칸 · 점진 회전 비교';
document.getElementById('run-mode').textContent='1·3·5칸 · 점진 회전 비교';
