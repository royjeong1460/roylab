import {SpeedLabWorld} from '../physics-speed/world.js';

export class OverflowLabWorld extends SpeedLabWorld {
 // Split first; the existing post-impact budget converts excess small pieces to moving pixels.
 // Keep the per-impact work bound, independent of how many bodies the scene already contains.
 fractureGroupLimit(beforeGroups){return Math.max(beforeGroups,10);}
}
