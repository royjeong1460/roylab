import {FreeWorld} from '../free30/world.js';
import {withStructure} from './physics.js';
import {withTiltMotion} from './tilt-motion.js';
export class StructuralFreeWorld extends withStructure(withTiltMotion(FreeWorld)) {}
