import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {TiltWorld} from '../tilt-lab/world.js';
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const BANDS=[[54,86],[121,153],[188,237]];

// Structural labels stay attached to pixel IDs through attacks, rotation and fracture.
// Intact module interfaces are welds, not separately wobbling rigid bodies.
export class StructureWorld extends TiltWorld {
 constructor(site,profile,options={},offset=0){
  super(site,profile,options);this.structureOffset=offset;this.snapCount=0;this.structureClock=0;this.staticCheckClock=0;
  this.moduleOf=new Int16Array(this.cells.length).fill(-1);this.modules=[];this.moduleLinks=[];this.lastLoad=null;
  for(let floor=0;floor<3;floor++)this.modules.push({type:'roof',floor},{type:'body',floor});
  for(let floor=0;floor<3;floor++)for(let side=0;side<2;side++)this.modules.push({type:'pillar',floor,side});
  for(let id=0;id<this.original.length;id++)if(this.original[id]){
   const y=Math.floor(id/this.width),x=id%this.width-offset;
   const floor=y<87?0:y<154?1:2,base=[20,87,154][floor];
   this.moduleOf[id]=y<base+18?floor*2:y<base+34?floor*2+1:6+floor*2+Number(x>55);
  }
  const links=new Map();
  for(let id=0;id<this.original.length;id++)if(this.original[id])for(const next of [id+1,id+this.width]){
   if(!this.original[next]||this.moduleOf[id]===this.moduleOf[next])continue;
   const k=key(this.moduleOf[id],this.moduleOf[next]);if(!links.has(k))links.set(k,[]);links.get(k).push([id,next]);
  }
  this.moduleLinks=[...links.values()];
 }
 addPiece(pixels,parent=null,damage=0){
  const piece=super.addPiece(pixels,parent,damage);
  // Attacks rebuild compounds. Preserve a still-attached joint's fatigue, but
  // never transfer it to detached children.
  if(piece?.hinge&&parent?.structuralHinge)piece.structuralHinge={...parent.structuralHinge};
  return piece;
 }
 liveHingeSection(piece){
  const previous=piece.structuralHinge.section,owned=new Set(piece.pixels.map(p=>p.id));
  const bearings=previous.bearings.filter(b=>owned.has(b.id)&&this.cells[b.id+this.width]).map(b=>({...b,strength:Math.max(0,1-(this.bonds.get(key(b.id,b.id+this.width))||0))})).filter(b=>b.strength>0);
  const width=bearings.reduce((s,b)=>s+b.strength,0);
  const pivot=piece.hinge?.pointA;
  const lever=pivot?Math.abs(piece.body.position.x-pivot.x):Math.abs(previous.center-previous.pivot);
  const gravity=Math.hypot(this.engine.gravity.x,this.engine.gravity.y)*this.engine.gravity.scale/.00007;
  const utilization=width?gravity*(piece.pixels.length/(1800*width)+piece.pixels.length*lever/(7000*width**2)):Infinity;
  return {...previous,bearings,width,load:piece.pixels.length,utilization};
 }
 sections(ids,angle=0,cutLimit=Infinity){
  const owned=new Set(ids),candidates=[];
  for(let floor=0;floor<3;floor++){
   let weakest=null;
   // A notch anywhere in a pillar reduces the live load-bearing cross-section.
   for(let y=BANDS[floor][0]-1;y<BANDS[floor][1];y++){
    if(y+1>cutLimit)continue;
    const bearings=[];
    for(const x of [33,34,77,78]){
     const id=y*this.width+this.structureOffset+x,next=id+this.width;
     if(!owned.has(id)||!owned.has(next))continue;
     const strength=Math.max(0,1-(this.bonds.get(key(id,next))||0));
     if(strength>0)bearings.push({id,x:id%this.width+.5,strength});
    }
    if(!bearings.length)continue;
    const width=bearings.reduce((s,b)=>s+b.strength,0);
    if(!weakest||width<=weakest.width)weakest={y,bearings,width,floor};
   }
   if(!weakest)continue;
   const above=ids.filter(id=>Math.floor(id/this.width)<=weakest.y);if(above.length<40)continue;
   const center=above.reduce((s,id)=>s+id%this.width+.5,0)/above.length;
   const cy=above.reduce((s,id)=>s+Math.floor(id/this.width)+.5,0)/above.length;
   const xs=weakest.bearings.map(b=>b.x),left=Math.min(...xs)-.5,right=Math.max(...xs)+.5;
   const pivot=Math.min(right,Math.max(left,center));
   const height=weakest.y+1-cy;
   // Game-scale axial + bending budget. Width squared makes a notch consequential.
   const lever=Math.abs((center-pivot)*Math.cos(angle)+height*Math.sin(angle));
   const gravity=Math.hypot(this.engine.gravity.x,this.engine.gravity.y)*this.engine.gravity.scale/.00007;
   const utilization=gravity*(above.length/(1800*weakest.width)+above.length*lever/(7000*weakest.width**2));
   candidates.push({...weakest,above,center,pivot,load:above.length,utilization});
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
   const section=this.sections(ids)[0];if(!section)continue;
   this.lastLoad=section;if(section.utilization<=1)continue;
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
    continue;
   }
   if(!piece.hinge&&!supported.has(piece.body)){piece.structureStrain=0;continue;}
   const section=this.sections(piece.pixels.map(p=>p.id),piece.body.angle,this.supportCutLimit(piece,supported))[0];
   if(!section||section.utilization<=1){piece.structureStrain=0;continue;}
   this.lastLoad=section;piece.structureStrain=(piece.structureStrain||0)+dt*Math.min(4,section.utilization-1);
   if(piece.structureStrain<.35)continue;
   // Cut the actual live pillar bonds, then let the existing splitter preserve
   // rotation/translation and independently simulate the resulting modules.
   for(const b of section.bearings)this.bonds.set(key(b.id,b.id+this.width),1);
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
}
