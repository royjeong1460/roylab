import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {compileStructure} from './model.js';
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;


// Structural labels stay attached to pixel IDs through attacks, rotation and fracture.
// Intact module interfaces are welds, not separately wobbling rigid bodies.
export const withStructure=Base=>class extends Base {
 constructor(site,...args){
  super(site,...args);this.snapCount=0;this.structureClock=0;this.staticCheckClock=0;
  const model=compileStructure(site.data,site.structure);Object.assign(this,{moduleOf:model.moduleOf,modules:model.modules,moduleLinks:model.moduleLinks,roles:model.roles});
  this.lastLoad=null;this.supportReserve=new Map();
  // Preserve authored pristine structures. The reserve is fixed at construction,
  // never recalibrated after damage, so losing a post cannot restore its strength.
  const idsByGroup=new Map();
  for(let id=0;id<this.original.length;id++)if(this.original[id]){const group=this.originalGroup[id];if(!idsByGroup.has(group))idsByGroup.set(group,[]);idsByGroup.get(group).push(id);}
  for(const [group,ids] of idsByGroup){const peak=this.sections(ids)[0]?.utilization||0;this.supportReserve.set(group,Math.max(1,peak/.65));}
 }
 addPiece(pixels,parent=null,damage=0){
  const piece=super.addPiece(pixels,parent,damage);
  // Attacks rebuild compounds. Preserve a still-attached joint's fatigue, but
  // never transfer it to detached children.
  if(piece?.hinge&&parent?.structuralHinge)piece.structuralHinge={...parent.structuralHinge};
  return piece;
 }
 pillarLengths(ids){
  const owned=new Set(ids),lengths=new Map();
  for(const id of ids){
   if(this.roles[id]!==1||lengths.has(id))continue;
   let top=id;
   while(owned.has(top-this.width)&&this.roles[top-this.width]===1&&(this.bonds.get(key(top,top-this.width))||0)<1)top-=this.width;
   const run=[top];
   while(owned.has(run.at(-1)+this.width)&&this.roles[run.at(-1)+this.width]===1&&(this.bonds.get(key(run.at(-1),run.at(-1)+this.width))||0)<1)run.push(run.at(-1)+this.width);
   for(const n of run)lengths.set(n,run.length);
  }
  return lengths;
 }
 columnLoad(bearings,lengths,load,lever,angle,gravity){
  if(!lengths||!bearings.every(b=>b.pillar))return 0;
  const posts=[];
  for(const b of bearings){
   const length=Math.max(lengths.get(b.id)||0,lengths.get(b.id+this.width)||0);
   if(!length)return 0;
   let post=posts.at(-1);
   if(!post||b.x-post.right>1){post={width:0,length:0,right:b.x};posts.push(post);}
   post.width+=b.strength;post.length=Math.max(post.length,length);post.right=b.x;
  }
  // Game-scale column capacity: axial buckling falls with length squared;
  // bending strength grows with thickness squared. Separate posts share load.
  const axial=180000*posts.reduce((n,p)=>n+p.width**3/p.length**2,0);
  const bending=1200*posts.reduce((n,p)=>n+p.width**2,0);
  return gravity*load*(Math.abs(Math.cos(angle))/axial+lever/bending);
 }
 liveHingeSection(piece){
  const previous=piece.structuralHinge.section,owned=new Set(piece.pixels.map(p=>p.id));
  const bearings=previous.bearings.filter(b=>owned.has(b.id)&&this.cells[b.id+this.width]).map(b=>({...b,strength:Math.max(0,1-(this.bonds.get(key(b.id,b.id+this.width))||0))})).filter(b=>b.strength>0);
  const width=bearings.reduce((s,b)=>s+b.strength,0);
  const pivot=piece.hinge?.pointA;
  const lever=pivot?Math.abs(piece.body.position.x-pivot.x):Math.abs(previous.center-previous.pivot);
  const gravity=Math.hypot(this.engine.gravity.x,this.engine.gravity.y)*this.engine.gravity.scale/.00007;
  let utilization=width?gravity*(piece.pixels.length/(1800*width)+piece.pixels.length*lever/(7000*width**2))/(previous.reserve||1):Infinity;
  if(this.columnFailure&&width){
   const ids=[...owned];
   for(const b of bearings)for(let id=b.id+this.width;this.cells[id]&&this.roles[id]===1;id+=this.width)ids.push(id);
   utilization=Math.max(utilization,this.columnLoad(bearings,this.pillarLengths(ids),piece.pixels.length,lever,piece.body.angle,gravity)/(previous.reserve||1));
  }
  return {...previous,bearings,width,load:piece.pixels.length,utilization};
 }
 sections(ids,angle=0,cutLimit=Infinity,supportIds=null){
  const owned=new Set(ids),rows=new Map(),candidates=[];
  const lengths=this.columnFailure?this.pillarLengths(ids):null;
  for(const id of ids){
   const next=id+this.width,y=Math.floor(id/this.width);if(y+1>cutLimit||!owned.has(next))continue;
   const strength=Math.max(0,1-(this.bonds.get(key(id,next))||0));if(!strength)continue;
   if(!rows.has(y))rows.set(y,[]);rows.get(y).push({id,x:id%this.width+.5,strength,pillar:this.roles[id]===1||this.roles[next]===1});
  }
  // Equal successive cross-sections share a load path; keep the lowest one.
  // Damaged rows have a different strength signature and remain candidates.
  const cuts=[];let previous=null;
  for(const [y,bearings] of [...rows].sort((a,b)=>a[0]-b[0])){
   if(!bearings.some(b=>b.pillar)){previous=null;continue;}
   bearings.sort((a,b)=>a.x-b.x);
   const signature=bearings.map(b=>`${b.x}:${b.strength.toFixed(4)}`).join(',');
   const row={y,bearings,signature};
   if(previous&&previous.y===y-1&&previous.signature===signature)cuts[cuts.length-1]=row;else cuts.push(row);
   previous=row;
  }
  for(const cut of cuts){
   // A dangling leg cannot share the load. Trace the lower material to real supports.
   let supportedBelow=null;
   if(supportIds){
    supportedBelow=new Set(supportIds.filter(id=>owned.has(id)&&Math.floor(id/this.width)>cut.y));
    const queue=[...supportedBelow];
    for(let n=0;n<queue.length;n++)for(const next of this.neighbors(queue[n])){
     if(!owned.has(next)||supportedBelow.has(next)||Math.floor(next/this.width)<=cut.y||(this.bonds.get(key(queue[n],next))||0)>=1)continue;
     supportedBelow.add(next);queue.push(next);
    }
   }
   const upper=ids.filter(id=>Math.floor(id/this.width)<=cut.y).map(id=>({id}));
   // Houses linked by a lower deck must not be welded across empty space when
   // released. Evaluate and release each connected upper load independently.
   for(const group of this.groups(upper)){
    if(group.length<40)continue;
    const above=group.map(p=>p.id),upperSet=new Set(above),bearings=cut.bearings.filter(b=>upperSet.has(b.id)&&(!supportedBelow||supportedBelow.has(b.id+this.width)));
    if(!bearings.length)continue;
    const width=bearings.reduce((s,b)=>s+b.strength,0),center=above.reduce((s,id)=>s+id%this.width+.5,0)/above.length;
    const cy=above.reduce((s,id)=>s+Math.floor(id/this.width)+.5,0)/above.length;
    const pivot=Math.min(bearings.at(-1).x+.5,Math.max(bearings[0].x-.5,center));
    const lever=Math.abs((center-pivot)*Math.cos(angle)+(cut.y+1-cy)*Math.sin(angle));
    const reserve=this.supportReserve?.get(this.originalGroup[bearings[0].id])||1;
    const gravity=Math.hypot(this.engine.gravity.x,this.engine.gravity.y)*this.engine.gravity.scale/.00007;
    const utilization=Math.max(gravity*(above.length/(1800*width)+above.length*lever/(7000*width**2)),this.columnLoad(bearings,lengths,above.length,lever,angle,gravity))/reserve;
    candidates.push({y:cut.y,bearings,width,above,center,pivot,load:above.length,utilization,reserve});
   }
  }
  return candidates.sort((a,b)=>b.utilization-a.utilization);
 }
 // Only support from below transmits sustained gravity load. Side contact and
 // two free-falling chunks touching do not count as an anchored load path.
 supportBodies(){
  const supported=new Set(this.staticBodies);
  for(const body of Composite.allBodies(this.engine.world))if(body.isStatic&&body.position.y>=this.floorY)supported.add(body);
  const pairs=this.engine.pairs.list.filter(p=>p.isActive);
  for(let pass=0;pass<=this.bodies.length;pass++){
   let changed=false;
   for(const pair of pairs){
    const a=pair.bodyA.parent||pair.bodyA,b=pair.bodyB.parent||pair.bodyB,n=pair.collision.normal;
    for(const [body,base,sign] of [[a,b,1],[b,a,-1]]){
     if(supported.has(body)||!supported.has(base)||n.y*sign>-.7)continue;
     const points=pair.collision.supports.slice(0,pair.collision.supportCount);
     if(!points.some(p=>p&&p.y>=body.position.y-.5))continue;
     supported.add(body);changed=true;
    }
   }
   if(!changed)break;
  }
  return supported;
 }
 isSupported(piece){return Boolean(piece.hinge&&this.cells[piece.supportId])||this.supportBodies().has(piece.body);}
 supportPixels(piece,supported){
  const ids=new Set(piece.hinge&&this.cells[piece.supportId]?[piece.anchorId]:[]),body=piece.body;
  const pixels=piece.pixels.map(p=>({id:p.id,q:this.pixelPosition(piece,p)}));
  for(const pair of this.engine.pairs.list){
   if(!pair.isActive)continue;
   const a=pair.bodyA.parent||pair.bodyA,b=pair.bodyB.parent||pair.bodyB;
   const sign=a===body?1:b===body?-1:0,base=sign===1?b:a;
   if(!sign||!supported.has(base)||pair.collision.normal.y*sign>-.7)continue;
   for(const q of pair.collision.supports.slice(0,pair.collision.supportCount))if(q&&q.y>=body.position.y-.5){
    const nearest=pixels.reduce((best,p)=>!best||Math.hypot(p.q.x-q.x,p.q.y-q.y)<Math.hypot(best.q.x-q.x,best.q.y-q.y)?p:best,null);
    if(nearest)ids.add(nearest.id);
   }
  }
  return [...ids];
 }
 supportCutLimit(piece,supported){
  if(piece.hinge&&this.cells[piece.supportId])return Math.floor(piece.anchorId/this.width)+1;
  const b=piece.body,cy=piece.pixels.reduce((sum,p)=>sum+Math.floor(p.id/this.width)+.5,0)/piece.pixels.length;
  let limit=Infinity;
  for(const pair of this.engine.pairs.list){
   if(!pair.isActive)continue;
   const a=pair.bodyA.parent||pair.bodyA,c=pair.bodyB.parent||pair.bodyB;
   const sign=a===b?1:c===b?-1:0,base=sign===1?c:a;
   if(!sign||!supported.has(base)||pair.collision.normal.y*sign>-.7)continue;
   for(const q of pair.collision.supports.slice(0,pair.collision.supportCount))if(q&&q.y>=b.position.y-.5){
    const localY=-(q.x-b.position.x)*Math.sin(b.angle)+(q.y-b.position.y)*Math.cos(b.angle);
    limit=Math.min(limit,cy+localY+.5);
   }
  }
  return limit;
 }
 bearingReadings(){return this.lastLoad?[this.lastLoad]:[];}
 detach(){
  if(!this.modules)return; // base constructors may call virtual methods
  this.releaseUnsupported();this.checkStatic();this.finishStructureChange();
 }
 checkStatic(){
  let changed=false;
  const pixels=[];for(let id=0;id<this.cells.length;id++)if(this.cells[id])pixels.push({id});
  for(const group of this.groups(pixels)){
   const ids=group.map(p=>p.id);if(!ids.some(id=>Math.floor(id/this.width)===this.floorY-1))continue;
   const sections=this.sections(ids,0,Infinity,this.columnFailure?ids.filter(id=>Math.floor(id/this.width)===this.floorY-1):null);
   // Losing balance starts tipping even before the remaining post overloads.
   const section=sections.find(s=>s.utilization>1||(this.balanceSupports&&Math.abs(s.center-s.pivot)>this.tune('supportMargin',.1)));
   this.lastLoad=section||sections[0]||this.lastLoad;if(!section)continue;
   const piece=this.releaseBody(section.above);if(!piece)continue;
   const anchor=section.bearings.reduce((a,b)=>Math.abs(a.x-section.pivot)<Math.abs(b.x-section.pivot)?a:b);
   this.attachHinge(piece,{x:section.pivot,y:section.y+1},anchor.id,anchor.id+this.width);
   piece.structuralHinge={section,age:0};changed=true;
   this.note({kind:'pillar-strain',x:section.pivot,y:section.y+1,width:section.width,utilization:section.utilization});
  }
  return changed;
 }
 finishStructureChange(){this.updateHinges();this.syncStatic();this.rasterize();this.flushDebris();this.enforceBodyBudget();}
 snapHinge(piece,section){
  if(piece.hinge)Composite.remove(this.engine.world,piece.hinge);piece.hinge=null;piece.structuralHinge=null;
  piece.tiltStopped=true;piece.rotationGain=1;
  // Remove only the failing contact row. The rest keeps its mass and momentum.
  for(const b of section.bearings){const id=b.id+this.width;if(!this.cells[id])continue;
   this.emitPixel({id,x:id%this.width+.5,y:Math.floor(id/this.width)+.5,color:this.cells[id]});this.cells[id]=0;this.targetReleased+=this.target[id];
  }
  this.recordSnap(section);this.releaseUnsupported();this.finishStructureChange();
 }
 recordSnap(section){this.snapCount++;this.stage='기둥 연결부가 하중을 못 버티고 끊어졌어요';this.note({kind:'pillar-snap',x:section.pivot,y:section.y+1,width:section.width,utilization:section.utilization});}
 columnBreaks(piece,section){
  const owned=new Set(piece.pixels.map(p=>p.id));
  return section.bearings.map(b=>{
   let top=this.roles[b.id]===1?b.id:b.id+this.width,bottom=top;
   if(!owned.has(top)||this.roles[top]!==1)return b;
   while(owned.has(top-this.width)&&this.roles[top-this.width]===1&&(this.bonds.get(key(top,top-this.width))||0)<1)top-=this.width;
   while(owned.has(bottom+this.width)&&this.roles[bottom+this.width]===1&&(this.bonds.get(key(bottom,bottom+this.width))||0)<1)bottom+=this.width;
   // Buckle through the shaft rather than shaving one cell off its grounded tip.
   const length=(bottom-top)/this.width+1;
   return length>=6?{...b,id:top+Math.floor((length-1)/2)*this.width}:b;
  });
 }
 checkStructure(dt){
  let changed=false;const supported=this.supportBodies();
  for(const piece of [...this.bodies]){
   if(!this.bodies.includes(piece))continue;
   if(piece.structuralHinge){
    const state=piece.structuralHinge;
    const live=this.liveHingeSection(piece);this.lastLoad=live;
    // Even if the existing hinge angle limit releases it first, count the joint failure.
    state.age=live.utilization>1?state.age+dt*Math.min(3,live.utilization-1):0;
    if(!piece.hinge||state.age>=.65){this.snapHinge(piece,live);return;}
    if(!this.columnFailure)continue;
   }
   if(!piece.hinge&&!supported.has(piece.body)){piece.structureStrain=0;continue;}
   const section=this.sections(piece.pixels.map(p=>p.id),piece.body.angle,this.supportCutLimit(piece,supported),this.columnFailure?this.supportPixels(piece,supported):null)[0];
   if(!section||section.utilization<=1){piece.structureStrain=0;continue;}
   this.lastLoad=section;piece.structureStrain=(piece.structureStrain||0)+dt*Math.min(4,section.utilization-1);
   if(piece.structureStrain<.35)continue;
   // Cut the actual live pillar bonds, then let the existing splitter preserve
   // rotation/translation and independently simulate the resulting modules.
   const breaks=this.columnFailure?this.columnBreaks(piece,section):section.bearings;
   for(const b of breaks)this.bonds.set(key(b.id,b.id+this.width),1);
   if(this.groups(piece.pixels).length>1){
    this.removePiece(piece);this.addConnected(piece.pixels,piece,piece.damage);this.recordSnap(section);changed=true;
   }else piece.structureStrain=0;
   break;
  }
  if(changed)this.finishStructureChange();
 }
 step(dt){
  const before=this.elapsed;super.step(dt);if(!this.modules||this.settled)return;
  this.structureClock+=this.elapsed-before;if(this.structureClock<.1)return;
  const h=this.structureClock;this.structureClock=0;this.checkStructure(h);
  this.staticCheckClock+=h;if(this.staticCheckClock>=.5){this.staticCheckClock=0;if(this.checkStatic())this.finishStructureChange();}
 }
};
