import {installTestEdition} from '../free30/edition.js';
import {findCultureMap,CULTURE_MAPS} from '../paid-lab/culture/maps.js';
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
 findMap:key=>findCultureMap(key)||findCultureMap('yard-02')||CULTURE_MAPS[0],surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.ideas-dialog[open]:not(.ideas-docked),.paid-settings[open]:not(.ideas-docked),.culture-map-picker[open]')),
 label:`파괴 아이디어 실험실 · ${label} · 실제 진행 저장 없음`,
 configure(_world,run){run.world=new IdeaWorld(run.site,run.profile,options);applySettings(run.world,settings);},
 createOverlay:(scene,view)=>new IdeaOverlay(scene,view),
 status:world=>world.ideaStatus||`${optionsLabel(options)} · 조준 후 손을 떼면 사용해요.`,
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label,backURL:FREE_URL});
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
