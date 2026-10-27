import {JointedArchWorld} from '../arch/jointed-world.js';
import {ChainCollapseWorld,DEFAULT_CHAIN_POWER} from './chain-world.js';
import {freshProfile} from '../arch/journey.js';
export {COLLAPSE_MAPS} from './maps.js';
import {COLLAPSE_MAPS} from './maps.js';
export const PRESETS={base:{label:'기본 화력',upgrades:{}},player:{label:'플레이 기록 레벨',upgrades:{blastForce:10,blastRadius:7,blastReach:12,battery:11,suction:5,range:7,collectBatch:6}}};
export function createExperiment(mapId=COLLAPSE_MAPS[0].id,preset='base',unlimited=true,response='original',chainPower=DEFAULT_CHAIN_POWER){
 const map=COLLAPSE_MAPS.find(m=>m.id===mapId);if(!map||!PRESETS[preset])throw Error('Unknown collapse experiment');
 const profile=freshProfile();Object.assign(profile.upgrades,PRESETS[preset].upgrades);profile.owned.push('blackhole');
 if(!['original','chain'].includes(response))throw Error('Unknown collapse response');
 const World=response==='chain'?ChainCollapseWorld:JointedArchWorld;
 const world=new World(map,profile);world.unlimited=unlimited;world.setChainPower?.(chainPower);
 // One-cell authored gaps keep upper bodies separate; gravity seats them on the lower structures.
 world.detach();for(let i=0;i<180;i++){world.step(1/60);world.events=[];}
 return {map,world,preset,response,startedAt:world.elapsed};
}
export function readMetrics(world){
 const l=world.ledger(),pixelized=l.sand+l.pending+l.collected;
 return {total:world.initial,pixelized,percent:100*pixelized/world.initial,rigid:world.bodies.length,attacks:world.attackCounts.bomb+world.attackCounts.blackhole,collected:l.collected};
}
