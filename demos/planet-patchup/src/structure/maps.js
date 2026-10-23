import {IDEA_MAPS} from '../ideas-lab/maps.js';
import {FREE_STAGES} from '../free30/stages.js';
import {FREE_TUTORIAL} from '../free30/sites.js';
import {pixelCount} from '../map-maker-generator.js';
export const STRUCTURE_MAPS=[...IDEA_MAPS,...[FREE_TUTORIAL,...FREE_STAGES].map((site,index)=>({key:`free-${index}`,title:`무료 · ${site.name}`,site,pixels:pixelCount(site.data)}))];
