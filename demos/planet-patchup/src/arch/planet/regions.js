import {distinctClears} from '../balance.js';
// Art indices preserve V10's cultural landmarks; the existing free campaign starts in Arch.
export const HOME_REGIONS=Object.freeze([
 {name:'Arch Quarter',art:1},{name:'Eave Alley',art:0},{name:'Amber Bazaar',art:2},
 {name:'Canal Works',art:3},{name:'Terrace Heights',art:4},{name:'Mosaic Basin',art:5},
]);
export function homeRegions(profile){
 const restoration=profile.bossCleared?1:distinctClears(profile)/7;
 return HOME_REGIONS.map((region,i)=>({...region,available:i===0,cleared:i===0&&!!profile.bossCleared,restoration:i===0?restoration:0}));
}
