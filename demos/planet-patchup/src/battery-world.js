import {ToolWorld} from './tool-world.js';
import {World} from './world.js';

export const BASE_COSTS={cutter:8,hammer:8,bomb:14};
export const toolCost=(tool,efficiency)=>BASE_COSTS[tool]/(1+.2*(efficiency[tool]||0));

export class BatteryWorld extends ToolWorld{
  constructor(data,{capacity=30,efficiency={cutter:0,hammer:0,bomb:0}}={}){
    super(data);this.capacity=capacity;this.charge=capacity;this.efficiency={...efficiency};this.toolEnabled=true;
  }
  cost(){return toolCost(this.tool,this.efficiency);}
  canUseTool(){return this.toolEnabled&&(this.tool==='cutter'?this.charge>1e-8:this.charge+1e-8>=this.cost());}
  suctionOnly(x,y,dt,multiplier,from){
    const rate=this.cutRate,budget=this.cutBudget;this.cutRate=0;this.cutBudget=0;
    try{World.prototype.work.call(this,x,y,dt,multiplier,from);}
    finally{this.cutRate=rate;this.cutBudget=budget;}
  }
  touchingMaterial(x,y,from){
    const vx=x-from.x,vy=y-from.y,len=vx*vx+vy*vy;
    const near=(px,py)=>{const t=len?Math.max(0,Math.min(1,((px-from.x)*vx+(py-from.y)*vy)/len)):0;return (px-from.x-t*vx)**2+(py-from.y-t*vy)**2<=9;};
    for(let yy=Math.max(0,Math.floor(Math.min(y,from.y)-3));yy<Math.min(this.floorY,Math.ceil(Math.max(y,from.y)+3));yy++)
      for(let xx=Math.max(0,Math.floor(Math.min(x,from.x)-3));xx<Math.min(this.width,Math.ceil(Math.max(x,from.x)+3));xx++)
        if(this.cells[yy*this.width+xx]&&near(xx+.5,yy+.5))return true;
    return this.bodies.some(piece=>piece.pixels.some(p=>{const q=this.pixelPosition(piece,p);return near(q.x,q.y);}));
  }
  work(x,y,dt,multiplier=1,from={x,y}){
    if(this.settled||!from||![x,y,dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    if(x<0||x>this.width||y<0||y>this.floorY)return;
    if(!this.canUseTool()||this.tool==='cutter'&&!this.touchingMaterial(x,y,from)){
      this.suctionOnly(x,y,dt,multiplier,from);return;
    }
    if(this.tool==='cutter'){
      const paid=Math.min(dt,this.charge/this.cost());
      this.charge=Math.max(0,this.charge-paid*this.cost());
      if(paid>0)super.work(x,y,paid,multiplier,from);
      if(dt-paid>1e-8)this.suctionOnly(x,y,dt-paid,multiplier,from);
    }else{
      if(this.toolCooldowns[this.tool]<=0)this.charge=Math.max(0,this.charge-this.cost());
      super.work(x,y,dt,multiplier,from);
    }
  }
}
