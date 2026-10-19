import {CrumbleWorld} from '../france-crumble/world.js';

export class GravityWorld extends CrumbleWorld {
  constructor(data,options={}){
    super(data,options);
    this.mode='france-gravity';
    // The existing 18-chunk cap bounds the cost of solving even resting bodies.
    // Speed-only sleep can freeze a slowly tipping, unsupported wall contact.
    this.engine.enableSleeping=false;
  }
}
