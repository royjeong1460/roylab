import {installTestEdition} from '../free30/edition.js';
import {findIdeaMap,IDEA_MAPS,LAYOUT_MAPS} from './maps.js';
import {createYardSurface,createYardBackdrop} from '../paid-lab/culture/art.js';
import {mountCulturePreview} from '../paid-lab/culture/preview-ui.js';
import {applySettings} from '../paid-lab/settings.js';
import {mountSettings} from '../paid-lab/settings-ui.js';
import {loadOptions,optionsLabel,loadIdeaTuning,createTuningStorage} from './options.js';
import {mountIdeas} from './ui.js';
import {mountDesktopPanels} from './desktop.js';
import {IdeaWorld} from './world.js';
import {IdeaOverlay} from './overlay.js';
import '../paid-lab/culture/style.css';
import '../paid-lab/style.css';
import './style.css';

const FREE_URL='/games/planet-patchup-free/';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
const loaded=loadOptions(storage),options=loaded.options,tuning=loadIdeaTuning(storage),settings=tuning.settings;
const label=`${optionsLabel(options)} · ${settings.unlimited?'배터리 무제한':`배터리 ${settings.capacity}`}`;
installTestEdition({
 runLabel:'파괴 아이디어 실험실',
 findMap:key=>findIdeaMap(key)||LAYOUT_MAPS[0],surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.ideas-dialog[open]:not(.ideas-docked),.paid-settings[open]:not(.ideas-docked),.culture-map-picker[open]')),
 label:`파괴 아이디어 실험실 · ${label} · 실제 진행 저장 없음`,
 configure(_world,run){run.world=new IdeaWorld(run.site,run.profile,options);applySettings(run.world,settings);},
 createOverlay:(scene,view)=>new IdeaOverlay(scene,view),
 status:world=>world.ideaStatus||`${optionsLabel(options)} · 조준 후 손을 떼면 사용해요.`,
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label,backURL:FREE_URL,maps:IDEA_MAPS,pickerTitle:'맵 구조 비교 · 가로 / 세로 / 확장',pickerNote:'위의 새 맵 3개를 같은 화력으로 비교해 보세요. 아래 기존 맵도 그대로 남아 있어요. 맵 변경 시 현장만 리셋되고 실험 화력은 유지돼요.'});
  mountSettings(banner,settings,createTuningStorage(storage),hooks,tuning.warning);
  mountIdeas(banner,options,storage,hooks,loaded.warning);
  const title=document.getElementById('paid-settings-title');if(title)title.textContent='실험 세부 화력';
  const note=document.querySelector('.paid-settings header + p');if(note)note.textContent='현재 실험 조합의 직접 파괴·흡입 값을 바꿔요. 저장하면 같은 맵을 다시 시작하며, 이 실험실에서만 유지돼요.';

 },
});
await import('../free30/main.js');
mountDesktopPanels();
document.title='Planet Patchup · 파괴 아이디어 실험실';
document.getElementById('run-mode').textContent='파괴 아이디어 실험실';
