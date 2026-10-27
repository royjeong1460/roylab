import {ChainArchWorld} from '../arch/chain-world.js';
import {FallFractureWorld,DEFAULT_FALL_SETTINGS} from './world.js';
import {SensitiveFallWorld} from './sensitive-world.js';
import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells} from '../map-maker-generator.js';
import {freshProfile} from '../arch/journey.js';
import {ARCH_SITES} from '../arch/maps.js';
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
// Reuse campaign data and roles verbatim; only the local label/aim is added.
const archMap1={...ARCH_SITES[0],name:'무료판 맵 1 · Arch Lane',aim:ARCH_SITES[0].preview[0],
 hint:'무료판에서 플레이한 실제 1번 맵이에요. 왼쪽 건물의 표시된 다리를 끊어 몸통의 낙하를 비교하세요.'};
export const FALL_MAPS=[archMap1,dropMap(4),dropMap(10),dropMap(20),dropMap(70),...COLLAPSE_MAPS.map(m=>({...m,name:`실험용 · ${m.name}`}))];
export function createExperiment(mapId='drop-70',preset='base',unlimited=true,response='fall'){
 const map=FALL_MAPS.find(m=>m.id===mapId);
 if(!map||!PRESETS[preset]||!['fall','chain','sensitive'].includes(response))throw Error('Unknown fall experiment');
 const profile=freshProfile();Object.assign(profile.upgrades,PRESETS[preset].upgrades);profile.owned.push('blackhole');
 const World={fall:FallFractureWorld,chain:ChainArchWorld,sensitive:SensitiveFallWorld}[response];
 const world=new World(map,profile);world.unlimited=unlimited;
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
 if(!map.dropHeight){
  // Seat authored one-cell gaps identically before either response is compared.
  const settings=world.fallSettings;if(response==='sensitive')world.fallSettings=DEFAULT_FALL_SETTINGS;
  for(let i=0;i<180;i++){world.step(1/60);world.events=[];}
  if(response==='sensitive')world.fallSettings=settings;
 }
 return {map,world,preset,response,startedAt:world.elapsed};
}
