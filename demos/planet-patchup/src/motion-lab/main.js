import {installTestEdition} from '../free30/edition.js';
import {findIdeaMap,IDEA_MAPS,LAYOUT_MAPS} from '../ideas-lab/maps.js';
import {createYardSurface,createYardBackdrop} from '../paid-lab/culture/art.js';
import {mountCulturePreview} from '../paid-lab/culture/preview-ui.js';
import {applySettings} from '../paid-lab/settings.js';
import {mountSettings} from '../paid-lab/settings-ui.js';
import {loadOptions,optionsLabel,loadIdeaTuning,createTuningStorage} from '../ideas-lab/options.js';
import {mountIdeas} from '../ideas-lab/ui.js';
import {mountDesktopPanels} from '../ideas-lab/desktop.js';
import {SupportWorld} from '../support-lab/world.js';
import {IdeaOverlay} from '../ideas-lab/overlay.js';
import {extendWorksite,frameWorksite} from '../ideas-lab/space.js';
import '../paid-lab/culture/style.css';
import '../paid-lab/style.css';
import '../ideas-lab/style.css';
import {motionStorage} from './storage.js';
import {loadMotion,applyMotion} from './settings.js';
import {mountMotion} from './ui.js';
import './style.css';

const FREE_URL='/games/planet-patchup-free/';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
const physicsStorage=storage,motion=loadMotion(storage);
storage=motionStorage(storage);
const loaded=loadOptions(storage),options=loaded.options,tuning=loadIdeaTuning(storage),settings=tuning.settings;
const label=`${optionsLabel(options)} · ${settings.unlimited?'배터리 무제한':`배터리 ${settings.capacity}`}`;
installTestEdition({
 runLabel:'낙하·회전 속도 실험실',
 findMap:key=>findIdeaMap(key)||LAYOUT_MAPS.find(map=>map.key==='layout-tall'),surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.ideas-dialog[open]:not(.ideas-docked),.paid-settings[open]:not(.ideas-docked),.culture-map-picker[open],.motion-dialog[open]')),
 label:`낙하·회전 속도 실험실 · ${label} · 실제 진행 저장 없음`,
 configure(_world,run){
  const {site,bounds}=extendWorksite(run.site);
  run.site=site;run.aim={...site.preview[0]};run.previous={...run.aim};
  run.world=new SupportWorld(site,run.profile,options);run.world.worksiteBounds=bounds;applySettings(run.world,settings);applyMotion(run.world,motion.settings);
 },
 initialView:(viewport,run)=>frameWorksite(viewport,run.world.worksiteBounds),
 createOverlay:(scene,view)=>new IdeaOverlay(scene,view),
 status:world=>`조각 최대 이동 ${Math.max(0,...world.bodies.map(p=>Math.hypot(p.body.velocity.x,p.body.velocity.y)*60)).toFixed(0)}칸/s · 속도 제한 ${world.motionLimits||0}회`,
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label:`${label} · 중력 ${motion.settings.gravity}배 / 회전 ${motion.settings.rotation}배 / 최고 속도 ${motion.settings.speed}배`,backURL:FREE_URL,maps:IDEA_MAPS,pickerTitle:'맵 구조 비교 · 가로 / 세로 / 확장',pickerNote:'손상된 받침일수록 적게 기울어도 연결이 끊어져요. 낙하·회전 테스트 버튼으로 물리 배수를 조절해요. 기존 받침 실험실의 설정을 처음 불러오며 이후 저장은 따로 유지돼요.'});
  const original=document.createElement('a');original.className='culture-back';original.textContent='받침 버전 비교';original.href=`/games/planet-patchup-support/?artMap=${encodeURIComponent(map.key)}`;banner.append(original);
  mountSettings(banner,settings,createTuningStorage(storage),hooks,tuning.warning);
  mountIdeas(banner,options,storage,hooks,loaded.warning);
  mountMotion(banner,motion.settings,physicsStorage,hooks,motion.warning);
  document.getElementById('ideas-title').textContent='낙하·회전 속도 실험실';
  const title=document.getElementById('paid-settings-title');if(title)title.textContent='실험 세부 화력';
  const note=document.querySelector('.paid-settings header + p');if(note)note.textContent='현재 실험 조합의 직접 파괴·흡입 값을 바꿔요. 저장하면 같은 맵을 다시 시작하며, 이 실험실에서만 유지돼요.';

 },
});
await import('../free30/main.js');
mountDesktopPanels();
document.title='Planet Patchup · 낙하·회전 속도 실험실';
document.getElementById('run-mode').textContent='낙하·회전 속도 실험실';
