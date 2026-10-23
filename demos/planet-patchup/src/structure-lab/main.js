import {installTestEdition} from '../free30/edition.js';
import {STRUCTURE_MAPS as TILT_MAPS} from '../structure/maps.js';
import {createYardSurface,createYardBackdrop} from '../paid-lab/culture/art.js';
import {mountCulturePreview} from '../paid-lab/culture/preview-ui.js';
import {applySettings} from '../paid-lab/settings.js';
import {mountSettings} from '../paid-lab/settings-ui.js';
import {loadOptions,optionsLabel,loadIdeaTuning,createTuningStorage} from '../ideas-lab/options.js';
import {mountIdeas} from '../ideas-lab/ui.js';
import {mountDesktopPanels} from '../ideas-lab/desktop.js';
import {StructuralIdeaWorld as StructureWorld} from '../structure/idea-world.js';
import {StructureOverlay} from './overlay.js';
import {extendWorksite,frameWorksite} from '../ideas-lab/space.js';
import '../paid-lab/culture/style.css';
import '../paid-lab/style.css';
import '../ideas-lab/style.css';
import {structureStorage} from './storage.js';
import {loadMotion,applyTiltMotion} from '../tilt-lab/settings.js';
import {mountMotion} from '../tilt-lab/ui.js';
import '../motion-lab/style.css';
import '../bearing-lab/style.css';

const FREE_URL='/games/planet-patchup-free/';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
storage=structureStorage(storage);
const physicsStorage=storage,motion=loadMotion(storage);
let activeWorld,readout,startButton;
const loaded=loadOptions(storage),options=loaded.options,tuning=loadIdeaTuning(storage),settings=tuning.settings;
const label=`${optionsLabel(options)} · ${settings.unlimited?'배터리 무제한':`배터리 ${settings.capacity}`}`;
installTestEdition({
 runLabel:'전체 맵 · 구조 파단',
 findMap:key=>TILT_MAPS.find(map=>map.key===key)||TILT_MAPS[0],surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.ideas-dialog[open]:not(.ideas-docked),.paid-settings[open]:not(.ideas-docked),.culture-map-picker[open],.motion-dialog[open]')),
 label:`전체 맵 · 구조 파단 · ${label} · 실제 진행 저장 없음`,
 configure(_world,run){
  const {site,bounds}=extendWorksite(run.site);
  run.site=site;run.aim={...site.preview[0]};run.previous={...run.aim};
  run.world=new StructureWorld(site,run.profile,options);run.world.worksiteBounds=bounds;applySettings(run.world,settings);applyTiltMotion(run.world,motion.settings);
  activeWorld=run.world;startButton.textContent='구조 구분 켜기';readout.textContent=`기둥 ${activeWorld.modules.filter(m=>m.type==='pillar').length}개 · 몸체 ${activeWorld.modules.filter(m=>m.type==='body').length}개 · 지붕 ${activeWorld.modules.filter(m=>m.type==='roof').length}개 / 노랑: 기둥 · 주황: 몸체 · 파랑: 지붕`;
 },
 initialView:(viewport,run)=>frameWorksite(viewport,run.world.worksiteBounds),
 createOverlay:(scene,view)=>new StructureOverlay(scene,view),
 status:world=>`기둥 파단 ${world.snapCount}회 · 독립 조각 ${world.bodies.length}개 · 최근 받침 ${world.lastLoad?.width.toFixed(1)??'—'}칸 / 부담 ${world.lastLoad?Math.round(world.lastLoad.utilization*100)+'%':'—'} · ${world.stage}`,
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label:`${label} · 중력 ${motion.settings.gravity}배 / 받침 보정 1→${motion.settings.rotation}배 (10초) / 최고 속도 ${motion.settings.speed}배`,backURL:FREE_URL,maps:TILT_MAPS,pickerTitle:'무료·유료·실험 맵 구조 비교',pickerNote:'모든 맵에 기둥·몸체·지붕과 하중 파단을 적용했어요. 기둥 하나를 폭파해 남은 연결부로 하중이 몰리는 과정을 비교하세요. 맵 모양·픽셀 수와 진행 기록은 유지해요. 자유낙하 중에는 무게만으로 파단하지 않아요.'});
  const original=document.createElement('a');original.className='culture-back';original.textContent='기존 기울어짐 버전';original.href='/games/planet-patchup-tilt/?artMap=layout-tall';banner.append(original);
  startButton=document.createElement('button');startButton.className='bearing-start';startButton.textContent='구조 구분 켜기';
  startButton.onclick=()=>{if(!activeWorld)return;activeWorld.showStructure=!activeWorld.showStructure;startButton.textContent=activeWorld.showStructure?'구조 구분 끄기':'구조 구분 켜기';};
  readout=document.createElement('p');readout.className='bearing-readout';
  banner.prepend(startButton,readout);
  mountSettings(banner,settings,createTuningStorage(storage),hooks,tuning.warning);
  mountIdeas(banner,options,storage,hooks,loaded.warning);
  mountMotion(banner,motion.settings,physicsStorage,hooks,motion.warning);
  document.getElementById('ideas-title').textContent='전체 맵 · 구조 파단';
  const title=document.getElementById('paid-settings-title');if(title)title.textContent='실험 세부 화력';
  const note=document.querySelector('.paid-settings header + p');if(note)note.textContent='현재 실험 조합의 직접 파괴·흡입 값을 바꿔요. 저장하면 같은 맵을 다시 시작하며, 이 실험실에서만 유지돼요.';

 },
});
await import('../free30/main.js');
mountDesktopPanels();
document.title='Planet Patchup · 전체 맵 · 구조 파단';
document.getElementById('run-mode').textContent='전체 맵 · 구조 파단';
