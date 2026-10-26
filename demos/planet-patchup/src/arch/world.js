import {ActiveIdeaWorld} from '../ideas-lab/active/world.js';
import {freeStats,SKILLS} from './balance.js';
const legacy=()=>({owned:['bomb'],upgrades:{capacity:0,suction:0,range:0,bombRange:0,bombForce:0,gravityForce:0,coreMix:0,wearSpeed:0}});
export class ArchWorld extends ActiveIdeaWorld{
 constructor(site,profile){
  super(site,legacy(),{blast:'normal',well:'grind',level:1});
  this.archStats=freeStats(profile);this.gameStats=this.archStats;this.unlimited=false;
  this.suctionRate=this.archStats.suctionRate;this.suctionRadius=this.archStats.suctionRadius;
  this.capacity=this.archStats.capacity;this.charge=this.capacity;this.allowedTools=[...profile.owned];this.usedTools=new Set();
  this.blackholeSettings.coreMix=this.archStats.coreMix;this.wearSettings.wearSpeed=this.archStats.wearSpeed;
  this.skills={...profile.skills};this.equipped={...profile.equipped};this.passiveCount=0;this.passiveTriggers=0;this.effectiveAttacks=0;this.effectiveBlasts=0;this.effectiveBlackHoles=0;this.simulatedMs=0;this.attackCounts={bomb:0,blackhole:0};this.energyUsed=0;this.collectedPixelIds=new Set();this.collectionClock=0;this.collectionBatches=0;
 }
 get ideaGain(){return 1+.1*Math.min(3,Math.max(0,(this.skills?.[this.equipped?.passive]||1)-1));}
 stats(){return {...super.stats(),...this.archStats};}
 tune(id,fallback){return id==='blastReach'&&this.archStats?this.archStats.blastReach:super.tune(id,fallback);}
 // Keep the original proximity suction; optional global collection uses a separate clock.
 note(event){if(event.kind==='collect'&&Number.isInteger(event.id))this.collectedPixelIds?.add(event.id);super.note(event);}
 canUseTool(){return super.canUseTool()&&(!this.allowedTools||this.allowedTools.includes(this.tool));}
 effectiveAt(x,y,radius){return [null,...this.bodies].some(piece=>this.material(piece).some(({q})=>Math.hypot(q.x-x,q.y-y)<=radius));}
 activate(x,y){const before=this.charge,tool=this.tool;const effective=tool==='blackhole'&&this.validPoint(x,y)&&this.effectiveAt(x,y,this.stats().gravityRadius);const ok=super.activate(x,y);if(ok){this.energyUsed+=before-this.charge;this.attackCounts[tool]++;if(effective)this.effectiveBlackHoles++;}return ok;}
 passiveAttack(bomb){
  this.effectiveAttacks++;this.effectiveBlasts++;const id=this.equipped?.passive,level=this.skills?.[id]||0,s=SKILLS[id];
  if(!level||!s)return;
  const threshold=s.trigger-(level===5?1:0);this.passiveCount++;
  if(this.passiveCount<threshold)return;
  this.passiveCount=0;this.passiveTriggers++;
  if(id==='aftershock')for(let i=0;i<2;i++){const x=Math.max(1,Math.min(this.width-1,bomb.x+(i?1:-1)*8));this.schedule('echo',.4+i*.3,{x,y:Math.max(1,bomb.y-2),radius:2.5,power:.55*this.ideaGain});}
  else if(id==='relay'){
   const chosen=this.nearPieces(bomb.x,bomb.y,this.tune('blastReach',18)).filter(p=>p.pixels.length>=8).sort((a,b)=>b.pixels.length-a.pixels.length)[0];
   if(chosen)this.ideaMarks.push({kind:'relay',ids:new Set(chosen.pixels.map(p=>p.id)),remaining:12,armedAt:this.ideaClock+.18});
  }
 }
 breakContact(...args){const count=super.breakContact(...args);if(this.blastOutcome&&count>0)this.blastOutcome.direct=true;return count;}
 impulse(piece,point,vector){super.impulse(piece,point,vector);if(this.blastOutcome&&Math.hypot(vector.x,vector.y)>0)this.blastOutcome.impulse=true;}
 blast(bomb){
  const primary=!bomb.secondary&&!bomb.ideaSecondary,previous=this.blastOutcome,outcome=primary?{direct:false,impulse:false}:null;
  this.blastOutcome=outcome;
  try{super.blast({...bomb,ideaSecondary:true});}finally{this.blastOutcome=previous;}
  if(primary&&(outcome.direct||outcome.impulse))this.passiveAttack(bomb);
 }
 activateDevice(id,level=1){
  if(id!=='orbital'||!Number.isInteger(level)||level<1||level>5||!super.activateDevice('orbital',1))return false;
  const a=this.activeDevice,xs=this.structureMaterial().map(v=>v.q.x).sort((a,b)=>a-b),count=5+(level>=3?1:0)+(level>=5?1:0);
  a.targets=Array.from({length:count},(_,i)=>({x:xs[Math.floor(i*(xs.length-1)/(count-1))]}));a.archForce=1+.1*(level-1);return true;
 }
 hitSatellite(p,y){super.hitSatellite({...p,power:p.power*(this.activeDevice?.archForce||1)},y);}
 collectLoose(limit=Infinity){
  let count=0,x=0,y=0;const ids=[],samples=[];const take=p=>{if(samples.length<8)samples.push({x:p.x,y:p.y,color:p.color||1});count++;x+=p.x||0;y+=p.y||0;ids.push(p.id);this.collectedPixelIds.add(p.id);};
  for(let i=0;i<this.sand.length&&count<limit;i++)if(this.sand[i]){take({id:this.sandOrigins[i]-1,color:this.sand[i],x:i%this.width+.5,y:Math.floor(i/this.width)+.5});this.sand[i]=0;this.sandOrigins[i]=0;this.speed[i]=0;}
  for(const key of ['flying','debris']){let n=0;while(n<this[key].length&&count<limit)take(this[key][n++]);if(n)this[key].splice(0,n);}
  for(let i=0;i<this.pending.length&&count<limit;i++)if(this.pending[i]){take({id:i,color:this.pending[i],x:i%this.width+.5,y:Math.floor(i/this.width)+.5});this.pending[i]=0;}
  if(count){this.collected+=count;this.version++;this.collectionBatches++;this.note({kind:'collect',mode:'rise',x:x/count,y:y/count,count,ids,samples,color:samples[0]?.color||1});}return count;
 }
 secureLoose(){return this.collectLoose();}
 step(dt){if(this.settled||!Number.isFinite(dt)||dt<=0)return;const h=Math.min(.1,dt);super.step(h);this.simulatedMs+=h*1000;const s=this.stats();if(!s.autoCollect){this.collectionClock=0;return;}this.collectionClock+=h;while(this.collectionClock+1e-8>=s.collectInterval){this.collectionClock-=s.collectInterval;this.collectLoose(s.collectBatch);}}
}
