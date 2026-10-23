import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {BearingWorld} from '../bearing-lab/world.js';

export class RampWorld extends BearingWorld {
 constructor(...args){super(...args);this.rotationLimit=5;}
 applyMaterial(piece){
  super.applyMaterial(piece);
  // Cache the unchanged 1x inertia; updates never multiply the previous frame's value.
  piece.rampInertia=piece.body.inertia;this.updateRotation(piece);
 }
 addPiece(pixels,parent=null,damage=0){
  const piece=super.addPiece(pixels,parent,damage);
  if(piece&&parent?.rampStart!==undefined){piece.rampStart=parent.rampStart;this.updateRotation(piece);}
  return piece;
 }
 updateRotation(piece){
  if(!piece.rampInertia)return;
  if(piece.rampStart===undefined&&(Math.abs(piece.body.angle)>.002||Math.abs(piece.body.angularVelocity)>.0001))piece.rampStart=this.elapsed;
  const progress=piece.rampStart===undefined?0:Math.max(0,Math.min(1,(this.elapsed-piece.rampStart)/5));
  piece.rotationGain=1+((this.rotationLimit??5)-1)*progress;
  Body.setInertia(piece.body,piece.rampInertia/piece.rotationGain);
 }
 limitMotion(piece){this.updateRotation(piece);return super.limitMotion(piece);}
}
