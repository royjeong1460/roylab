import {STEP1_SITES,STEP1_BOSS,chooseStep1Site} from '../free-step1/sites.js';
import {widenSite} from './presentation.js';
export const BLAST_SITES=STEP1_SITES.map(widenSite);
export const BLAST_BOSS=widenSite(STEP1_BOSS);
export function chooseBlastSite(previousId,earned=0,random=Math.random){
 const chosen=chooseStep1Site(previousId,earned,random);
 return BLAST_SITES.find(site=>site.id===chosen.id);
}
