import {installTestEdition} from '../free30/edition.js';
import {findCultureMap,CULTURE_MAPS} from './culture/maps.js';
import {createYardSurface,createYardBackdrop} from './culture/art.js';
import {mountCulturePreview} from './culture/preview-ui.js';
import {loadSettings,applySettings,settingsLabel} from './settings.js';
import {mountSettings} from './settings-ui.js';
import './culture/style.css';
import './style.css';
const FREE_URL='/games/planet-patchup-free/';
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}};}
const loaded=loadSettings(storage),settings=loaded.settings;
const label=`${settingsLabel(settings)} · ${settings.unlimited?'배터리 무제한':`배터리 ${settings.capacity}`}`;
installTestEdition({
 findMap:key=>findCultureMap(key)||CULTURE_MAPS[0],surface:createYardSurface,createBackdrop:createYardBackdrop,backURL:FREE_URL,
 modalOpen:()=>Boolean(document.querySelector('.paid-settings[open],.culture-map-picker[open]')),
 label:`유료판 화력 테스트 · ${label} · 실제 진행 저장 없음`,
 configure:world=>applySettings(world,settings),
 mount(banner,map,hooks){
  mountCulturePreview(banner,map,{...hooks,label,backURL:FREE_URL});
  mountSettings(banner,settings,storage,hooks,loaded.warning);
 },
});
await import('../free30/main.js');
