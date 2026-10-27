import {FallFractureWorld} from './world.js';

export class SensitiveFallWorld extends FallFractureWorld {
 constructor(...args){
  super(...args);this.physicsVersion='arch-fall-sensitive-local-v1';
  // Weaken the fall fracture threshold, not the incoming physical impulse.
  this.fallSettings={...this.fallSettings,activationSpan:10,crackStart:14,crackSpan:18,bondResistance:.02,waveScale:3,spreadWidth:3};
 }
}
