import {AttackWorld} from './attack-world.js';
import {EXPEDITION_BALANCE,expeditionToolCost,expeditionSuctionRate,expeditionSuctionRadius} from './expedition-balance.js';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export class AttackBatteryWorld extends AttackWorld{
  constructor(data,{capacity=EXPEDITION_BALANCE.baseCapacity,efficiency={}}={}){
    super(data);this.capacity=capacity;this.charge=capacity;this.efficiency={...efficiency};this.toolEnabled=true;this.independentFragments=true;
    this.suctionRate=expeditionSuctionRate(efficiency);this.suctionRadius=expeditionSuctionRadius(efficiency);
  }
  collisionStrength(speed,piece){
    return piece?.pixels.length>=64?Math.min(20,(speed/26)**2*1.2):super.collisionStrength(speed);
  }
  collisionCrush(piece,material,energy,strength){
    const base=super.collisionCrush(piece,material,energy,strength);
    if(!piece||material.length<64||strength<=3)return base;
    const severity=clamp((strength-3)/12,0,1),budget=base.budget+(material.length*.8-base.budget)*severity*(2-severity);
    // Keep the original motion and strain crack; only energetic contact sheds a wider pixel shower.
    return {reach:Infinity,budget:Math.min(2048,Math.floor(budget))};
  }
  cost(){return expeditionToolCost(this.tool,this.efficiency);}
  canUseTool(){return this.toolEnabled&&(this.tool==='cutter'?this.charge>1e-8:this.charge+1e-8>=this.cost());}
  validPoint(x,y){return [x,y].every(Number.isFinite)&&x>=0&&x<=this.width&&y>=0&&y<=this.floorY;}
  activate(x,y){
    if(this.settled||!this.validPoint(x,y)||this.tool==='cutter'||!this.canUseTool())return false;
    this.charge=Math.max(0,this.charge-this.cost());super.activate(x,y);this.enforceBodyBudget();return true;
  }
  work(x,y,dt,multiplier=1,from={x,y},attacking=true){
    if(this.settled||!from||![dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0||!this.validPoint(x,y))return;
    const vx=x-from.x,vy=y-from.y,length=vx*vx+vy*vy;
    const distance=q=>{const t=length?clamp(((q.x-from.x)*vx+(q.y-from.y)*vy)/length,0,1):0;return (q.x-from.x-t*vx)**2+(q.y-from.y-t*vy)**2;};
    if(this.tool==='cutter'&&attacking&&this.canUseTool()&&
      [null,...this.bodies].some(piece=>this.material(piece).some(({q})=>distance(q)<=1))){
      const paid=Math.min(dt,this.charge/this.cost());
      this.charge=Math.max(0,this.charge-paid*this.cost());this.cutBudget+=this.cutRate*paid;
      const count=this.breakContact(x,y,q=>distance(q)<=1,Math.floor(this.cutBudget+1e-8));
      this.cutBudget=clamp(this.cutBudget-count,0,.999999);
      if(count)this.note({kind:'cut',x,y,count});
    }
    this.enforceBodyBudget();this.collectAlong(distance,dt,multiplier);
  }
}
