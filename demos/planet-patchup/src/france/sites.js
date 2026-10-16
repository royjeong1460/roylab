import originals from './sites.json' with {type:'json'};
import {validateSite} from '../map-maker-generator.js';
import {createEiffelSite} from '../map-maker-eiffel.js';
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const FRANCE_SITES=freeze(originals.map(validateSite));
export const FRANCE_BOSS=freeze(createEiffelSite());
export function chooseFranceSite(previousId,random=Math.random){
 const available=FRANCE_SITES.filter(site=>site.id!==previousId);
 const value=random();
 return available[Math.min(available.length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*available.length)))];
}
