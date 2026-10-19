import { ImpactWorld } from './impact-world.js';

export class CascadeWorld extends ImpactWorld {
  constructor(data) {super(data);this.mode='cascade';}

  collisionCrush(piece,material,energy,strength) {
    return {reach:Math.min(12,2+energy*4),budget:Math.min(96,Math.floor(material.length*.22),Math.floor(energy*35))};
  }

  applyImpact(piece,point,direction,strength=1,source='hammer',radius=5) {
    if(source!=='collision')return super.applyImpact(piece,point,direction,strength,source,radius);
    if(piece&&!this.bodies.includes(piece))return 0;
    const energy=Math.min(3,strength*(1+(piece?.damage||0)*.65));
    const material=this.material(piece),{reach,budget}=this.collisionCrush(piece,material,energy,strength);
    const candidates=material.filter(({p,q})=>{
      const edge=.82+((Math.imul(p.id+1,31)>>>0)%19)/100;
      return Math.hypot(q.x-point.x,q.y-point.y)<reach*edge;
    }).sort((a,b)=>Math.hypot(a.q.x-point.x,a.q.y-point.y)-Math.hypot(b.q.x-point.x,b.q.y-point.y));
    // Crush from the contact inward; each mode sets how much survives as chunks.
    const crushed=new Set(candidates.slice(0,budget).map(v=>v.p.id));
    const changed=super.applyImpact(piece,point,direction,energy,source,radius);
    if(!crushed.size)return changed;
    const length=Math.hypot(direction.x,direction.y)||1,nx=direction.x/length,ny=direction.y/length;
    let count=0;
    const emit=(pixel,parent)=>{
      this.emitPixel(pixel,parent);
      const p=this.flying.at(-1),spread=(((Math.imul(pixel.id+1,47)>>>0)%23)/11-1)*5;
      const push=4+energy*3;
      p.vx+=nx*push-ny*spread;p.vy+=ny*push+nx*spread;count++;
    };
    // Shared fracture may already have rebuilt the target; remove each surviving id exactly once.
    for(const child of [...this.bodies]){
      const removed=child.pixels.filter(p=>crushed.has(p.id));
      if(!removed.length)continue;
      for(const p of removed)emit(p,child);
      child.lastImpact=this.elapsed;
      this.removePiece(child);
      this.addConnected(child.pixels.filter(p=>!crushed.has(p.id)),child,child.damage);
    }
    let staticCut=false;
    for(const {p,q} of candidates)if(crushed.has(p.id)&&this.cells[p.id]){
      emit({...p,...q},null);this.cells[p.id]=0;this.targetReleased+=this.target[p.id];staticCut=true;
    }
    if(staticCut)this.detach();
    if(count){
      this.note({kind:'fracture',source,x:point.x,y:point.y,count,strong:energy>=1});
      this.stage='충돌점이 부서져요 · 조각과 픽셀이 함께 떨어져요';this.version++;this.sandMoving=true;
    }
    return changed+count;
  }
}
