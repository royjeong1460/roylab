import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import {BearingWorld} from '../bearing-lab/world.js';

// Extra toppling torque is local to a live hinge; collision inertia never changes.
export class TiltWorld extends BearingWorld {
 constructor(...args){
  super(...args);this.rotationLimit=10;
  Events.on(this.engine,'beforeUpdate',event=>{
   this.stopContactAssist(this.engine.pairs.list);
   this.assistTilt(event.delta/1000);
  });
  Events.on(this.engine,'collisionStart collisionActive',event=>this.stopContactAssist(event.pairs));
 }
 addPiece(pixels,parent=null,damage=0){
  const piece=super.addPiece(pixels,parent,damage);
  if(piece){piece.rotationGain=1;piece.tiltSeconds=0;piece.tiltStopped=Boolean(parent);}
  return piece;
 }
 stopContactAssist(pairs){
  for(const pair of pairs){
   if(pair.isActive===false)continue;
   const a=pair.bodyA.parent||pair.bodyA,b=pair.bodyB.parent||pair.bodyB;
   for(const [body,other] of [[a,b],[b,a]]){
    const piece=body.plugin?.piece;if(!piece?.hinge||piece.tiltStopped)continue;
    const pivot=piece.hinge.pointA,points=pair.collision.supports.slice(0,pair.collision.supportCount).filter(Boolean);
    // The hinge's own static bearing must remain in contact while tipping.
    const pivotOnly=this.staticBodies.includes(other)&&points.length>0&&
     points.every(p=>Math.hypot(p.x-pivot.x,p.y-pivot.y)<=2);
    if(!pivotOnly){piece.tiltStopped=true;piece.rotationGain=1;}
   }
  }
 }
 assistTilt(dt){
  const g=this.engine.gravity;
  for(const piece of this.bodies){
   piece.rotationGain=1;
   if(!piece.hinge||!this.cells[piece.supportId]){
    if(piece.tiltSeconds>0)piece.tiltStopped=true;
    continue;
   }
   if(piece.tiltStopped||piece.body.isSleeping)continue;
   const b=piece.body,pivot=piece.hinge.pointA;
   const torque=b.mass*g.scale*((b.position.x-pivot.x)*g.y-(b.position.y-pivot.y)*g.x);
   // No motor-like drive through rest or the upward half of a rebound.
   if(Math.abs(b.angularVelocity)<.00001||b.angularVelocity*torque<=0)continue;
   piece.tiltSeconds=Math.min(10,piece.tiltSeconds+dt);
   piece.rotationGain=1+(this.rotationLimit-1)*piece.tiltSeconds/10;
   b.torque+=(piece.rotationGain-1)*torque;
  }
 }
 updateHinges(){
  super.updateHinges();
  for(const piece of this.bodies)if(!piece.hinge){piece.rotationGain=1;if(piece.tiltSeconds>0)piece.tiltStopped=true;}
 }
}
