import {ChainArchWorld} from '../arch/chain-world.js';
import {buildGraph,graphDistances} from '../free30/engine/physics-fracture/graph.js';
import {releaseCompression} from '../free30/engine/physics-fracture/motion.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distanceToSegment=(p,{a,b})=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};

// Local comparison only: all chain, tool, gravity and yielding-joint code is inherited.
export class FallFractureWorld extends ChainArchWorld {
 constructor(...args){super(...args);this.physicsVersion='arch-fall-fracture-local-v1';this.fallHits=new WeakSet();this.fallSummary={impacts:0,pixels:0,last:null};}
 recordCollisions(pairs){
  const from=this.contacts?.length||0;super.recordCollisions(pairs);
  for(const hit of this.contacts.slice(from)){
   const b=hit.piece?.body;if(!b)continue;
   const downward=(b.velocity.y+b.angularVelocity*(hit.point.x-b.position.x))*60;
   // Require a downward moving contact opposed by a supporting surface, not side scrapes.
   if(hit.direction.y<-.35&&downward>14&&hit.speed>14)this.fallHits.add(hit.point);
  }
 }
 applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
  const hit=this.contactEnergy.get(point);
  if(source!=='collision'||!piece||!hit||!this.fallHits.has(point)||this.chainHits.has(point))return super.applyImpact(piece,point,direction,strength,source,radius);
  if(!this.bodies.includes(piece))return 0;
  this.fallHits.delete(point);this.contactEnergy.delete(point);piece.lastImpact=this.elapsed;
  const start=performance.now(),material=this.material(piece),count=material.length;
  const activation=1-Math.exp(-Math.max(0,hit.speed-14)/20);
  const severity=clamp((hit.speed-30)/45,0,1),energy=Math.min(hit.energy,count*6);
  const budget=energy*.42*activation,motionBudget=budget*.04*severity,fractureBudget=budget-motionBudget;
  // Strong falls spend most of their fracture work inside the body, not on a contact crater.
  const contactAllowance=fractureBudget*(.8-.65*severity),pixelLimit=Math.max(1,Math.floor(count*.12));
  let contactBudget=contactAllowance;
  const segments=hit.segments?.length?hit.segments:[{a:point,b:point}];
  const nearby=material.map(v=>({...v,d:Math.min(...segments.map(s=>distanceToSegment(v.q,s)))})).sort((a,b)=>a.d-b.d||a.p.id-b.p.id);
  const reach=1.5+Math.sqrt(energy)*.35,crushed=new Set();
  for(const v of nearby){
   if(v.d>=reach||crushed.size>=pixelLimit)break;
   const cost=1+3*(v.d/reach)**2;if(contactBudget<cost)break;
   contactBudget-=cost;crushed.add(v.p.id);
  }
  const contactSpent=contactAllowance-contactBudget,remaining=material.filter(v=>!crushed.has(v.p.id));
  const graph=buildGraph(remaining,this.width,id=>this.neighbors(id),this.bonds);
  const nearest=nearby.find(v=>!crushed.has(v.p.id))?.d??0;
  const contactIds=nearby.filter(v=>!crushed.has(v.p.id)&&v.d<=nearest+1.25).map(v=>v.p.id);
  const distances=graphDistances(graph,contactIds),waveReach=reach*(1+severity*5);
  let crackBudget=(fractureBudget-contactSpent)*severity,crackSpent=0,bonds=0,crackDepth=0;
  const edges=graph.edges.map(e=>({...e,distance:(distances[e.a]+distances[e.b])/2})).filter(e=>e.distance<=waveReach).sort((a,b)=>a.distance-b.distance||a.cost-b.cost);
  const pixels=remaining.map(v=>v.p),groupLimit=this.fractureGroupLimit(this.groups(pixels).length,piece);
  for(const edge of edges){
   if(crackBudget<=0)break;
   const cost=.65*edge.cost,amount=Math.min(1,crackBudget/cost);
   for(const b of edge.bonds)this.bonds.set(b.key,b.old+(1-b.old)*amount);
   if(amount===1&&this.groups(pixels).filter(g=>g.length>=4).length>groupLimit){for(const b of edge.bonds)this.bonds.set(b.key,b.old);continue;}
   crackBudget-=cost*amount;crackSpent+=cost*amount;bonds+=edge.bonds.length;crackDepth=Math.max(crackDepth,edge.distance);
  }
  if(!crushed.size&&!bonds)return 0;
  const groups=this.groups(pixels);
  this.removePiece(piece);for(const p of piece.pixels)if(crushed.has(p.id))this.emitPixel(p,piece);
  const old=new Set(this.bodies);this.addConnected(pixels,piece,Math.min(1,piece.damage+energy/800));
  const children=this.bodies.filter(p=>!old.has(p));
  const motionSpent=releaseCompression(children,point,motionBudget);for(const child of children)this.limitMotion(child);
  this.version++;this.sandMoving=true;this.fractureCount++;
  const event={kind:'fall-fracture',source,x:point.x,y:point.y,count:crushed.size,bodyPixels:count,speed:hit.speed,energy,severity,
   fragments:groups.filter(g=>g.length>=4).length,largest:Math.max(0,...groups.map(g=>g.length)),bonds,crackDepth,spent:contactSpent+crackSpent+motionSpent,budget,motionSpent};
  this.lastFracture=event;this.fractureMs=performance.now()-start;this.fallSummary.impacts++;this.fallSummary.pixels+=crushed.size;this.fallSummary.last=event;this.note(event);
  return crushed.size+bonds;
 }
 diagnostics(){return {...super.diagnostics(),fall:this.fallSummary};}
}
