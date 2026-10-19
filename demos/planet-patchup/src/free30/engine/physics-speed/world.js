import {releaseCompression} from '../physics-fracture/motion.js';
import {ConnectedLabWorld} from '../physics-fracture/world.js';
import {normalizeSpeed} from './settings.js';
import {buildGraph,graphDistances} from '../physics-fracture/graph.js';

const distanceToSegment=(p,{a,b})=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
// Deliberately isolated comparison: the previous fracture algorithm remains unchanged.
export class SpeedLabWorld extends ConnectedLabWorld{
 configureLab(settings){super.configureLab({});this.speedSettings=normalizeSpeed(settings,this.speedSettings);return {...this.speedSettings};}
 fractureGroupLimit(beforeGroups,piece){return Math.max(beforeGroups,Math.min(10,this.tune('bodyCap',18)-this.bodies.length+(piece?1:0)));}
 applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
  const hit=source==='collision'&&this.contactEnergy.get(point);
  let material=hit?this.material(piece):null;
  if(hit&&!piece&&material.length){
   const nearest=material.reduce((a,b)=>Math.hypot(a.q.x-point.x,a.q.y-point.y)<Math.hypot(b.q.x-point.x,b.q.y-point.y)?a:b);
   const ids=new Set(this.groups(material.map(v=>v.p)).find(g=>g.some(p=>p.id===nearest.p.id)).map(p=>p.id));
   material=material.filter(v=>ids.has(v.p.id));
  }
  const count=material?.length||0;
  if(source!=='collision')return super.applyImpact(piece,point,direction,strength,source,radius);
  if(!hit||!count||(piece&&!this.bodies.includes(piece)))return 0;
  this.contactEnergy.delete(point);
  if(piece)piece.lastImpact=this.elapsed;
  const {startSpeed,growth,maxPercent}=this.speedSettings;
  const activation=1-Math.exp(-Math.max(0,hit.speed-startSpeed)/startSpeed*growth);
  if(!activation||!(hit.energy>0))return 0;
  const start=performance.now();
  // Speed opens a continuous allowance; actual work still comes from measured effective mass.
  const fraction=maxPercent/100*activation/(1+count/256);
  const pixelLimit=Math.floor(count*fraction);
  const energy=Math.min(hit.energy,count*6),total=energy*.42*activation;
  const motionBudget=piece?total*.12:0,fractureBudget=total-motionBudget;
  const initialContactBudget=fractureBudget*.8;
  let contactBudget=initialContactBudget,crackBudget=0;
  const reach=Math.min(52,1.5+Math.sqrt(energy)*.65);
  const graph=buildGraph(material,this.width,id=>this.neighbors(id),this.bonds);
  const segments=hit.segments?.length?hit.segments:[{a:point,b:point}];
  const nearby=material.map(v=>({...v,d:Math.min(...segments.map(s=>distanceToSegment(v.q,s)))})).sort((a,b)=>a.d-b.d||a.p.id-b.p.id);
  // Transmission starts only at a real connected receiver near the contact.
  const nearest=nearby[0].d,contactIds=nearby.filter(v=>v.d<=nearest+1.25).map(v=>v.p.id);
  const dist=graphDistances(graph,contactIds),waveReach=reach*3,crushed=new Set();
  for(const v of nearby){if(v.d>=reach||crushed.size>=pixelLimit)break;const cost=1+3*(v.d/reach)**2;if(contactBudget<cost)break;contactBudget-=cost;crushed.add(v.p.id);}
  // Unspent crushing work remains available to split the surviving connected mass.
  crackBudget=fractureBudget-(initialContactBudget-contactBudget);
  const magnitude=Math.hypot(direction.x,direction.y)||1;
  const edges=graph.edges.map(edge=>{
   const a=graph.nodes[edge.a],b=graph.nodes[edge.b],distance=(dist[edge.a]+dist[edge.b])/2;
   const dx=b.x-a.x,dy=b.y-a.y,alignment=Math.abs((dx*direction.x+dy*direction.y)/((Math.hypot(dx,dy)||1)*magnitude));
   const attenuation=Math.max(0,1-distance/waveReach);
   // Thin, already damaged interfaces fail before broad intact sections.
   const score=attenuation*(.65+.35*alignment)/Math.sqrt(edge.cost);
   return {...edge,distance,score};
  }).filter(e=>e.score>0).sort((a,b)=>b.score-a.score||a.a-b.a||a.b-b.b);
  const remaining=material.filter(v=>!crushed.has(v.p.id)).map(v=>v.p);
  const beforeGroups=this.groups(remaining).filter(g=>g.length>=4).length;
  const available=this.fractureGroupLimit(beforeGroups,piece);
  let crackDepth=0,spent=0,bondChanges=0;
  for(const edge of edges){
   if(crackBudget<=0)break;
   const active=edge.bonds.filter(b=>!crushed.has(b.id)&&!crushed.has(b.other));if(!active.length)continue;
   const cost=.65*edge.cost/Math.max(.001,this.tune('collisionBond',.65)/.65),amount=Math.min(1,crackBudget/cost);
   if(this.tune('collisionBond',.65)<=0)break;
   for(const b of active)this.bonds.set(b.key,b.old+(1-b.old)*amount);
   if(amount===1&&this.groups(remaining).filter(g=>g.length>=4).length>available){for(const b of active)this.bonds.set(b.key,b.old);continue;}
   const used=cost*amount;crackBudget-=used;spent+=used;bondChanges+=active.length;crackDepth=Math.max(crackDepth,edge.distance);
  }
  let motionSpent=0;
  if(piece){
   piece.lastImpact=this.elapsed;
   if(crushed.size||bondChanges){this.removePiece(piece);for(const p of piece.pixels)if(crushed.has(p.id))this.emitPixel(p,piece);const old=new Set(this.bodies);this.addConnected(remaining,piece,Math.min(1,piece.damage+energy/800));const children=this.bodies.filter(p=>!old.has(p));motionSpent=releaseCompression(children,point,motionBudget);for(const child of children)this.limitMotion(child);}
  }else if(crushed.size||bondChanges){
   for(const {p,q} of nearby)if(crushed.has(p.id)&&this.cells[p.id]){this.emitPixel({...p,...q});this.cells[p.id]=0;this.targetReleased+=this.target[p.id];}
   this.detach();
  }
  if(crushed.size||bondChanges){
   this.fractureCount++;this.version++;this.sandMoving=true;
   this.lastFracture={kind:'speed-fracture',source,x:point.x,y:point.y,count:crushed.size,pixelLimit,fraction,energy,speed:hit.speed,contactSpan:Math.max(...segments.map(s=>Math.hypot(s.a.x-s.b.x,s.a.y-s.b.y))),crackDepth,bonds:bondChanges,fragments:this.groups(remaining).length,nodes:graph.nodes.length,motionBudget,motionSpent,spent:initialContactBudget-contactBudget+spent+motionSpent,budget:total};this.note(this.lastFracture);
  }
  this.fractureMs=performance.now()-start;
  return crushed.size+bondChanges;
 }
 diagnostics(){return {...super.diagnostics(),fractureCount:this.fractureCount||0,fractureMs:this.fractureMs||0,lastFracture:this.lastFracture||null};}
}
