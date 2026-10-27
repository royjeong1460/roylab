import {JointedArchWorld} from './jointed-world.js';

export const DEFAULT_CHAIN_POWER=10;
// Attack-linked arcade fracture assistance; motion stays in Matter.
export class ChainArchWorld extends JointedArchWorld {
 constructor(...args){
  super(...args);
  this.physicsVersion='arch-chain-v1';this.chainPower=DEFAULT_CHAIN_POWER;
  this.chainSequence=0;this.chains=new Map();this.chainTags=new Map();this.chainHits=new WeakMap();
  this.chainSummary={stage:0,best:0,pixels:0,impacts:0,lastAt:-Infinity};
 }
 setChainPower(value){
  if(Number.isFinite(value))this.chainPower=Math.round(Math.max(0,Math.min(30,value))*2)/2;
  return this.chainPower;
 }
 blast(bomb){
  const seeds=new Set();
  if(!bomb.secondary&&!bomb.ideaSecondary)for(const piece of [null,...this.bodies])for(const {p,q} of this.material(piece)){
   if(Math.hypot(q.x-bomb.x,q.y-bomb.y)<=bomb.radius+1)seeds.add(this.originalGroup[p.id]);
  }
  super.blast(bomb);
  this.armGroups(seeds);
 }
 activate(x,y){
  const ok=super.activate(x,y);
  if(ok&&this.tool==='blackhole'){
   const seeds=new Set();
   for(const piece of [null,...this.bodies])for(const {p,q} of this.material(piece))if(Math.hypot(q.x-x,q.y-y)<=this.stats().gravityRadius)seeds.add(this.originalGroup[p.id]);
   this.armGroups(seeds);
  }
  return ok;
 }
 armGroups(seeds){
  if(!seeds.size)return;
  const chain={id:++this.chainSequence,expires:this.elapsed+12,started:this.elapsed,edges:new Map(),used:new Set(),reached:new Set(seeds)};
  this.chains.set(chain.id,chain);
  for(const group of seeds)this.chainTags.set(group,{id:chain.id,stage:0});
  while(this.chains.size>16)this.chains.delete(this.chains.keys().next().value);
 }
 collisionGroup(body,point){
  const piece=body.plugin.piece;
  if(piece)return this.originalGroup[piece.pixels[0]?.id]||-1;
  if(!this.staticBodies.includes(body))return body.isStatic&&body.position.y>=this.floorY?0:-1;
  let closest=Infinity,group=-1;
  for(const {p,q} of this.material(null)){
   if(q.x<body.bounds.min.x-.5||q.x>body.bounds.max.x+.5||q.y<body.bounds.min.y-.5||q.y>body.bounds.max.y+.5)continue;
   const distance=Math.hypot(q.x-point.x,q.y-point.y);
   if(distance<closest){closest=distance;group=this.originalGroup[p.id];}
  }
  return group;
 }
 recordCollisions(pairs){
  const start=this.contacts?.length||0;
  super.recordCollisions(pairs);
  if(!this.chainTags?.size||!this.chainPower)return;
  const contexts=[];
  for(const pair of pairs){
   const a=pair.bodyA.parent,b=pair.bodyB.parent,supports=pair.collision.supports.filter(Boolean);
   if(a===b||!supports.length)continue;
   const point=supports.reduce((p,q)=>({x:p.x+q.x/supports.length,y:p.y+q.y/supports.length}),{x:0,y:0});
   const ga=this.collisionGroup(a,point),gb=this.collisionGroup(b,point);
   // Ordinary floor/self impacts retain normal physics; only a new structure
   // reached by a substantial moving source can advance the cascade.
   if(ga<=0||gb<=0||ga===gb)continue;
   const edge=[ga,gb].sort((a,b)=>a-b).join(':'),normal=pair.collision.normal;
   const candidates=[[a,ga,gb,-1],[b,gb,ga,1]].map(([body,sourceGroup,targetGroup,sign])=>{
    const tag=this.chainTags.get(sourceGroup),chain=tag&&this.chains.get(tag.id),piece=body.plugin.piece;
    if(!piece||piece.pixels.length<64||!chain||chain.expires<this.elapsed)return null;
    const vx=body.velocity.x-body.angularVelocity*(point.y-body.position.y),vy=body.velocity.y+body.angularVelocity*(point.x-body.position.x);
    const sourceApproach=sign*(vx*normal.x+vy*normal.y)*60;
    if(sourceApproach<4)return null;
    const previous=chain.edges.get(edge);
    if(previous&&(previous.sourceGroup!==sourceGroup))return null;
    if(!previous&&chain.reached.has(targetGroup))return null;
    return {chain,sourceGroup,targetGroup,sourcePixels:piece.pixels.length,sourceApproach,stage:previous?.stage??Math.min(8,tag.stage+1)};
   }).filter(Boolean).sort((a,b)=>b.chain.id-a.chain.id||b.stage-a.stage);
   if(candidates.length)contexts.push({a,b,ga,gb,point,edge,...candidates[0]});
  }
  for(const hit of this.contacts.slice(start)){
   if(hit.speed<12||hit.energy<1.2)continue;
   const context=contexts.find(c=>Math.hypot(c.point.x-hit.point.x,c.point.y-hit.point.y)<.01&&[c.a,c.b].some(b=>hit.piece?b.plugin.piece===hit.piece:this.staticBodies.includes(b)));
   if(!context)continue;
   const recipient=hit.piece?this.originalGroup[hit.piece.pixels[0].id]:context.a.plugin.piece?context.gb:context.ga;
   if(!context.chain.used.has(`${context.edge}:${recipient}`))this.chainHits.set(hit.point,{...context,recipient});
  }
 }
 applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
  const context=source==='collision'&&this.chainHits?.get(point),hit=this.contactEnergy?.get(point);
  if(!context||!hit||!this.chainPower||(piece&&!this.bodies.includes(piece)))return super.applyImpact(piece,point,direction,strength,source,radius);
  this.chainHits.delete(point);
  const {chain,edge,recipient,stage}=context,key=`${edge}:${recipient}`;
  if(chain.used.has(key)||chain.expires<this.elapsed)return super.applyImpact(piece,point,direction,strength,source,radius);
  const before=this.looseCount(),oldSettings=this.speedSettings,energy=hit.energy;
  // Lower the contact threshold only for a causal attack chain. Extra fracture work
  // is gameplay assistance; gravity and the initial tool impulse are unchanged.
  // The shared fracture model may spend part of this budget on separation motion.
  const boost=this.chainPower*(1+.25*(stage-1));
  hit.energy*=boost;
  this.speedSettings={...oldSettings,startSpeed:8,growth:10,maxPercent:95};
  let changed;
  try{changed=super.applyImpact(piece,point,direction,strength,source,radius);}finally{this.speedSettings=oldSettings;hit.energy=energy;}
  if(!changed)return changed;
  chain.used.add(key);chain.edges.set(edge,{stage,sourceGroup:context.sourceGroup,targetGroup:context.targetGroup});chain.expires=Math.min(chain.started+24,this.elapsed+7);
  chain.reached.add(context.targetGroup);
  // Keep the source's depth: A hitting B and C is two first-stage branches,
  // not A→B→C. Only a subsequent moving B can carry stage 2 to C.
  this.chainTags.set(context.targetGroup,{id:chain.id,stage});
  const count=Math.max(0,this.looseCount()-before),s=this.chainSummary;
  s.stage=stage;s.best=Math.max(s.best,stage);s.pixels+=count;s.impacts++;s.lastAt=this.elapsed;
  this.note({kind:'chain-impact',chainId:chain.id,edge,recipient,stage,x:point.x,y:point.y,count,speed:hit.speed,energy,boost,sourceGroup:context.sourceGroup,targetGroup:context.targetGroup,sourcePixels:context.sourcePixels,sourceApproach:context.sourceApproach});
  return changed;
 }
 looseCount(){const l=this.ledger();return l.sand+l.pending+l.collected;}
}
