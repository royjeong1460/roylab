import {SensitiveFallWorld} from '../collapse-fall/sensitive-world.js';

// Reuse the accepted comparison response without changing its preserved variants.
export class FallArchWorld extends SensitiveFallWorld {
 constructor(...args){super(...args);this.physicsVersion='arch-fall-sensitive-v1';}
}
