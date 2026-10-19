import {GravityWorld} from '../france-gravity/world.js';
import {FractureWorld} from '../france-impact/world.js';

const SMALL_PIXELS=36,SMALL_SPAN=8,SHATTER_SPEED=80,MIN_ENERGY_PER_PIXEL=.5;
// FractureWorld spends .42 energy per budget unit: direct crushing is capped
// at 25.2% of a large receiver. Detached tiny remnants still become grains.
const LARGE_ENERGY_PER_PIXEL=.6;

export class ShatterWorld extends GravityWorld {
  constructor(data,options={}){super(data,options);this.mode='france-shatter';}

  applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
    const hit=source==='collision'&&this.contactEnergy.get(point);
    if(!hit||!piece||!this.bodies.includes(piece))return super.applyImpact(piece,point,direction,strength,source,radius);
    const count=piece.pixels.length;
    const compact=count<=this.tune('smallPixels',SMALL_PIXELS)&&
      Math.max(...piece.pixels.map(p=>p.x))-Math.min(...piece.pixels.map(p=>p.x))+1<=this.tune('smallSpan',SMALL_SPAN)&&
      Math.max(...piece.pixels.map(p=>p.y))-Math.min(...piece.pixels.map(p=>p.y))+1<=this.tune('smallSpan',SMALL_SPAN);
    if(compact&&hit.speed>=this.tune('shatterSpeed',SHATTER_SPEED)&&hit.energy/count>=this.tune('shatterEnergy',MIN_ENERGY_PER_PIXEL)){
      // Change only this recipient's material. Matter already resolved the
      // physical impulse; the other recipient keeps its original energy budget.
      this.contactEnergy.delete(point);piece.lastImpact=this.elapsed;
      this.removePiece(piece);
      for(const pixel of piece.pixels)this.emitPixel(pixel,piece);
      this.note({kind:'fracture',source,x:point.x,y:point.y,count,energy:hit.energy,speed:hit.speed,shattered:true});
      this.version++;this.sandMoving=true;
      return count;
    }
    if(compact)return super.applyImpact(piece,point,direction,strength,source,radius);
    const multiplier=1+Math.min(1.5,Math.max(0,(hit.energy-24)/170))*this.tuning.collision;
    hit.energy=Math.min(hit.energy*multiplier,count*this.tune('largeEnergy',LARGE_ENERGY_PER_PIXEL));
    // Apply the existing local work budget once, after the crumble multiplier.
    // Calling CrumbleWorld here would amplify the capped budget a second time.
    return FractureWorld.prototype.applyImpact.call(this,piece,point,direction,strength,source,radius);
  }
}
