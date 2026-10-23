import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {IdeaWorld} from '../ideas-lab/world.js';

// Comparison edition only: gravity, collision damage and hinge motion stay unchanged.
export class SupportWorld extends IdeaWorld {
 attachHinge(piece,point,anchorId,supportId){
  super.attachHinge(piece,point,anchorId,supportId);
  const row=Math.floor(supportId/this.width)-1;
  const rows=this.originalSections[this.originalGroup[anchorId]-1];
  const bearings=(rows?.[row]||[]).filter(id=>this.original[id+this.width]);
  const owned=new Set(piece.pixels.map(p=>p.id));
  // Released cells are now in the rigid body, so an empty static cell is not a broken joint.
  piece.supportJoint={original:bearings.length,lower:bearings.filter(id=>owned.has(id)).map(id=>id+this.width)};
 }
 releaseAngle(piece){
  const baseline=this.tune('hingeAngle',.5),joint=piece.supportJoint;
  if(!joint?.original)return baseline;
  const remaining=joint.lower.reduce((n,id)=>n+Number(Boolean(this.cells[id])),0)/joint.original;
  return baseline*(.24+.76*remaining*remaining);
 }
 updateHinges(){
  for(const piece of this.bodies)if(piece.hinge&&Math.abs(piece.body.angle)>this.releaseAngle(piece)){
   Composite.remove(this.engine.world,piece.hinge);piece.hinge=null;
   this.stage='약해진 받침이 찢어져 떨어져요';
   this.note({kind:'tear',x:piece.body.position.x,y:piece.body.position.y,count:piece.pixels.length});
  }
  super.updateHinges();
 }
}
