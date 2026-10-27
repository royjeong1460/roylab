import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import {COLLAPSE_MAPS,createExperiment,readMetrics} from '../src/collapse-lab/model.js';
import {DEFAULT_CHAIN_POWER} from '../src/arch/chain-world.js';
const records=[],response=process.argv.includes('--chain')?'chain':'original';
const powerArgument=process.argv.find(a=>a.startsWith('--power=')),power=powerArgument?Number(powerArgument.slice(8)):DEFAULT_CHAIN_POWER;
for(const preset of ['base','player'])for(const map of COLLAPSE_MAPS){
 const {world:w}=createExperiment(map.id,preset,true,response,power);const contacts=new Set();let peakAngle=0,fractures=0,direct=0;
 Events.on(w.engine,'collisionStart',({pairs})=>{for(const pair of pairs){
  const a=(pair.bodyA.parent||pair.bodyA).plugin.piece,b=(pair.bodyB.parent||pair.bodyB).plugin.piece;if(!a||!b)continue;
  for(const x of new Set(a.pixels.map(p=>w.originalGroup[p.id])))for(const y of new Set(b.pixels.map(p=>w.originalGroup[p.id])))if(x!==y)contacts.add([x,y].sort((a,b)=>a-b).join(':'));
 }});
 const snapshots=[];w.activate(map.aim.x,map.aim.y);
 for(let n=1;n<=1200;n++){
  w.step(1/60);
  for(const p of w.bodies)if(p.pixels.length>40)peakAngle=Math.max(peakAngle,Math.abs(p.body.angle));
  for(const event of w.events){if(event.kind==='speed-fracture')fractures++;if(event.kind==='tool-blast'&&event.phase==='blast')direct+=event.count||0;}w.events=[];
  if(n===600||n===1200)snapshots.push({seconds:n/60,...readMetrics(w),chain:w.chainSummary?{...w.chainSummary}:null,peakRotationDegrees:peakAngle*180/Math.PI,collisionFractures:fractures,structureContacts:[...contacts].sort(),balanced:w.diagnostics().balanced,finite:w.diagnostics().finite});
 }
 records.push({mapId:map.id,preset,physicsVersion:w.physicsVersion,chainPower:w.chainPower??null,attack:{tool:'bomb',...map.aim,count:1},stats:{radius:w.stats().bombRadius,power:w.stats().bombPower,reach:w.stats().blastReach,autoCollectRate:w.stats().autoCollectRate},directPixels:direct,snapshots});
}
console.log(JSON.stringify({schemaVersion:2,localOnly:true,response,note:'Fixed 1/60s steps after 3s gravity seating. One aimed Blast; no cursor suction. Player preset retains campaign Auto Collect. Chain mode amplifies fracture work during attack-linked impacts; original mode preserves campaign physics.',records},null,2));
