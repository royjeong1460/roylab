import {ChainArchWorld} from '../arch/chain-world.js';
import {FallFractureWorld} from './world.js';
import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells} from '../map-maker-generator.js';
import {freshProfile} from '../arch/journey.js';
import {COLLAPSE_MAPS,PRESETS} from '../collapse-lab/model.js';
export {readMetrics} from '../collapse-lab/model.js';

export function dropMap(height){
 const width=100,floorY=112,k=new YardKit(width,floorY);
 k.paintAs(2,()=>k.rect(35,floorY-height-12,30,12,3));
 return {id:`drop-${height}`,name:`낙하 ${height}칸 · 같은 360픽셀 몸통`,dropHeight:height,
  hint:'자유 낙하를 눌러 같은 몸통을 떨어뜨리세요. 반응을 바꾸면 같은 높이로 돌아갑니다.',aim:{x:50,y:floorY-height-6},
  data:{width,height:120,floorY,shapes:packMapCells(k.cells,width,floorY)},
  structure:{version:1,roles:packMapCells(k.roles,width,floorY)}};
}
export const FALL_MAPS=[dropMap(4),dropMap(20),dropMap(70),...COLLAPSE_MAPS];
export function createExperiment(mapId=FALL_MAPS[2].id,preset='base',unlimited=true,response='fall'){
 const map=FALL_MAPS.find(m=>m.id===mapId);
 if(!map||!PRESETS[preset]||!['fall','chain'].includes(response))throw Error('Unknown fall experiment');
 const profile=freshProfile();Object.assign(profile.upgrades,PRESETS[preset].upgrades);profile.owned.push('blackhole');
 const world=new (response==='fall'?FallFractureWorld:ChainArchWorld)(map,profile);world.unlimited=unlimited;
 // Read-only observation also reports the old algorithm's zero-damage landings.
 if(map.dropHeight){
  const applyImpact=world.applyImpact.bind(world);
  world.applyImpact=(piece,point,direction,strength,source,radius)=>{
   const hit=world.contactEnergy.get(point),observe=source==='collision'&&piece&&hit&&direction.y<-.35&&!world.firstLanding;
   const before=observe?world.looseCount():0,speed=hit?.speed;
   const changed=applyImpact(piece,point,direction,strength,source,radius);
   if(observe)world.firstLanding={speed,count:world.looseCount()-before,fragments:world.bodies.length,largest:Math.max(0,...world.bodies.map(p=>p.pixels.length))};
   return changed;
  };
 }
 world.detach();
 if(!map.dropHeight)for(let i=0;i<180;i++){world.step(1/60);world.events=[];}
 return {map,world,preset,response,startedAt:world.elapsed};
}
