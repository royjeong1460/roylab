import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import Constraint from 'phaser/src/physics/matter-js/lib/constraint/Constraint.js';
import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import {ArchWorld} from './world.js';
export const JOINT_PHYSICS_VERSION='arch-yielding-joints-v1';
const SETTINGS={frequency:3,damping:.85,creep:.06,fatigue:.22,breakAngle:Math.PI/6};
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// The accepted local #4–#8 experiment remains frozen; campaign seams use roles,
// not debug numbers, and survive reconstruction while their material survives.
export class JointedArchWorld extends ArchWorld {
 constructor(...args){
  super(...args);this.physicsVersion=JOINT_PHYSICS_VERSION;
  this.yieldJoints=[];this.jointYields=0;this.jointBreaks=0;this.pendingYield=null;
  this.poseBefore=new WeakMap();this.poseMotion=new WeakMap();this.jointFilters=new Map();
  Events.on(this.engine,'beforeUpdate',e=>{
   this.reconcileJoints();
   for(const p of this.bodies)this.poseBefore.set(p.body,{...p.body.position,angle:p.body.angle});
   this.advanceJoints(e.delta/1000);
  });
  Events.on(this.engine,'afterUpdate',e=>{
   for(const p of this.bodies){const b=p.body,previous=this.poseBefore.get(b);if(!previous)continue;
    const scale=(1000/60)/e.delta;
    this.poseMotion.set(b,{x:(b.position.x-previous.x)*scale,y:(b.position.y-previous.y)*scale,angular:(b.angle-previous.angle)*scale});
   }
  });
 }
 columnBreaks(piece,section){
  const cuts=super.columnBreaks(piece,section);
  // A damaged neck still snaps there. Only intact head/column seams articulate.
  if(cuts.length&&cuts.every(b=>this.roles[b.id]!==1&&this.roles[b.id+this.width]===1)){
   this.pendingYield={piece,section,cuts};return [];
  }
  return cuts;
 }
 checkStructure(dt){
  this.reconcileJoints();super.checkStructure(dt);
  if(this.pendingYield){const pending=this.pendingYield;this.pendingYield=null;if(this.bodies.includes(pending.piece))this.beginYield(pending);}
  this.reconcileJoints();
 }
 beginYield({piece,section,cuts}){
  const previous=cuts.map(b=>this.bonds.get(key(b.id,b.id+this.width)));
  for(const b of cuts)this.bonds.set(key(b.id,b.id+this.width),1);
  const groups=this.groups(piece.pixels);
  if(groups.length<2){
   cuts.forEach((b,i)=>{const k=key(b.id,b.id+this.width);if(previous[i]===undefined)this.bonds.delete(k);else this.bonds.set(k,previous[i]);});return;
  }
  const oldCenter={...piece.body.position},motion=this.poseMotion.get(piece.body)||{...piece.body.velocity,angular:piece.body.angularVelocity};
  this.removePiece(piece);const children=[];
  for(const group of groups){const child=this.addPiece(group,piece,piece.damage);if(child)children.push(child);}
  // Continue the actual constrained pose motion, not a large solver recoil
  // velocity that had been cancelled by the old rigid connection.
  for(const p of children){const dx=p.body.position.x-oldCenter.x,dy=p.body.position.y-oldCenter.y;
   Body.setVelocity(p.body,{x:motion.x-motion.angular*dy,y:motion.y+motion.angular*dx});Body.setAngularVelocity(p.body,motion.angular);
  }
  const owners=new Map();for(const p of children)for(const v of p.pixels)owners.set(v.id,p);
  const seams=new Map();
  for(const b of cuts){
   const upper=owners.get(b.id),lower=owners.get(b.id+this.width);if(!upper||!lower||upper===lower)continue;
   const id=`${upper.body.id}:${lower.body.id}`;
   if(!seams.has(id))seams.set(id,{upper,lower,cuts:[]});seams.get(id).cuts.push(b);
  }
  for(const seam of seams.values()){
   const j={...seam,id:++this.jointYields,section,phase:'yielding',damage:0,age:0,rest:0,initialAngle:seam.upper.body.angle-seam.lower.body.angle,utilization:section.utilization};
   this.yieldJoints.push(j);this.connectJoint(j);this.jointEvent('joint-yield',j);
  }
  this.refreshJointFilters();this.finishStructureChange();this.reconcileJoints();
 }
 endpoint(piece,ids,side){
  const pixels=piece.pixels.filter(p=>ids.has(p.id)),points=pixels.map(p=>this.pixelPosition(piece,p));
  if(!points.length)return null;
  return {x:points.reduce((n,p)=>n+p.x,0)/points.length-Math.sin(piece.body.angle)*side*.5,y:points.reduce((n,p)=>n+p.y,0)/points.length+Math.cos(piece.body.angle)*side*.5};
 }
 connectJoint(j){
  const a=j.lower.body,b=j.upper.body;
  const pa=this.endpoint(j.lower,new Set(j.cuts.map(v=>v.id+this.width)),-1),pb=this.endpoint(j.upper,new Set(j.cuts.map(v=>v.id)),1);
  if(!pa||!pb)return false;
  j.constraint=Constraint.create({bodyA:a,bodyB:b,pointA:{x:pa.x-a.position.x,y:pa.y-a.position.y},pointB:{x:pb.x-b.position.x,y:pb.y-b.position.y},length:0,stiffness:.8,damping:.15});
  Composite.add(this.engine.world,j.constraint);j.pending=false;return true;
 }
 removePiece(piece){
  for(const j of this.yieldJoints||[])if(j.phase==='yielding'&&(j.upper===piece||j.lower===piece)){
   if(j.constraint)Composite.remove(this.engine.world,j.constraint);j.pending=true;
  }
  super.removePiece(piece);
 }
 reconcileJoints(){
  if(!this.yieldJoints?.some(j=>j.pending&&j.phase==='yielding'))return;
  const owners=new Map();for(const p of this.bodies)for(const v of p.pixels)owners.set(v.id,p);
  for(const j of this.yieldJoints)if(j.phase==='yielding'&&j.pending){
   const seams=new Map();
   for(const cut of j.cuts){const upper=owners.get(cut.id),lower=owners.get(cut.id+this.width);if(!upper||!lower||upper===lower)continue;
    const id=`${upper.body.id}:${lower.body.id}`;if(!seams.has(id))seams.set(id,{upper,lower,cuts:[]});seams.get(id).cuts.push(cut);
   }
   // Keep the largest surviving contact patch; independently broken fragments
   // do not get welded back together merely because they shared a former joint.
   const seam=[...seams.values()].sort((a,b)=>b.cuts.length-a.cuts.length)[0];
   if(!seam){this.releaseJoint(j,'material-destroyed');continue;}
   Object.assign(j,seam);this.connectJoint(j);
  }
  this.refreshJointFilters();
 }
 refreshJointFilters(){
  for(const [part,group] of this.jointFilters)part.collisionFilter.group=group;
  this.jointFilters.clear();const links=new Map();
  for(const j of this.yieldJoints)if(j.phase==='yielding'&&!j.pending){
   for(const [a,b] of [[j.upper.body,j.lower.body],[j.lower.body,j.upper.body]]){if(!links.has(a))links.set(a,[]);links.get(a).push(b);}
  }
  const seen=new Set();for(const first of links.keys())if(!seen.has(first)){
   const group=Body.nextGroup(true),queue=[first];seen.add(first);
   for(let n=0;n<queue.length;n++){
    const b=queue[n];for(const part of b.parts){this.jointFilters.set(part,part.collisionFilter.group);part.collisionFilter.group=group;}
    for(const other of links.get(b)||[])if(!seen.has(other)){seen.add(other);queue.push(other);}
   }
  }
 }
 groundedJoints(){
  const supported=this.supportBodies();
  for(const p of this.bodies)if(p.hinge&&this.cells[p.supportId])supported.add(p.body);
  for(let pass=0;pass<this.yieldJoints.length;pass++){
   let changed=false;for(const j of this.yieldJoints)if(j.phase==='yielding'&&!j.pending&&supported.has(j.lower.body)&&!supported.has(j.upper.body)){supported.add(j.upper.body);changed=true;}
   if(!changed)break;
  }
  return supported;
 }
 jointLoad(j,supported){
  if(!supported.has(j.lower.body))return 0;
  const a=j.lower.body,b=j.upper.body,mass=a.mass+b.mass,center=(a.position.x*a.mass+b.position.x*b.mass)/mass;
  const foot=j.lower.hinge?.pointA.x??a.position.x,lever=Math.abs(center-foot),s=j.section;
  const ratio=(j.upper.pixels.length+j.lower.pixels.length)/s.load;
  const axial=s.axialUtilization*ratio*Math.abs(Math.cos(a.angle));
  const bending=Math.max(0,s.utilization-s.axialUtilization)*ratio*lever/Math.max(.5,Math.abs(s.signedLever));
  return axial+bending;
 }
 advanceJoints(dt){
  const active=this.yieldJoints.filter(j=>j.phase==='yielding');if(!active.length)return;
  const supported=this.groundedJoints();
  for(const j of active){
   const a=j.lower.body,b=j.upper.body,angle=b.angle-a.angle-j.initialAngle,omega=(b.angularVelocity-a.angularVelocity)*60;
   j.age+=dt;j.utilization=this.jointLoad(j,supported);
   const overload=Math.max(0,j.utilization-1);
   j.damage=Math.min(1,j.damage+dt*(SETTINGS.fatigue*overload+.2*Math.max(0,(Math.abs(angle)-.04)/.45)));
   if(j.damage>=1||Math.abs(angle)>=SETTINGS.breakAngle){this.releaseJoint(j,j.damage>=1?'load-fatigue':'bend-limit');continue;}
   const creep=SETTINGS.creep*overload*dt;j.rest+=clamp(angle-j.rest,-creep,creep);
   const inertia=1/(a.inverseInertia+b.inverseInertia),frequency=SETTINGS.frequency;
   const spring=inertia*frequency**2/1e6*(1-.75*j.damage),damping=2*SETTINGS.damping*inertia*frequency/1e6;
   const torque=-spring*(angle-j.rest)-damping*omega;
   a.torque-=torque;b.torque+=torque;Sleeping.set(a,false);Sleeping.set(b,false);
  }
  // Released joints need no body references once their event has been recorded.
  this.yieldJoints=this.yieldJoints.filter(j=>j.phase==='yielding');
 }
 jointEvent(kind,j,reason){
  const point=j.constraint?{x:j.lower.body.position.x+j.constraint.pointA.x,y:j.lower.body.position.y+j.constraint.pointA.y}:j.lower.body.position;
  this.note({kind,...point,joint:j.id,reason,age:j.age,angle:j.upper.body.angle-j.lower.body.angle-j.initialAngle,damage:j.damage,utilization:j.utilization,
   modules:[...new Set(j.cuts.flatMap(b=>[this.moduleOf[b.id],this.moduleOf[b.id+this.width]]))]});
 }
 releaseJoint(j,reason){
  if(j.phase!=='yielding')return;
  if(j.constraint)Composite.remove(this.engine.world,j.constraint);
  j.phase='separated';j.pending=false;this.jointBreaks++;this.jointEvent('joint-release',j,reason);this.refreshJointFilters();
 }
}
