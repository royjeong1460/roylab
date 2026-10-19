import { CascadeWorld } from './cascade-world.js';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export class AttackWorld extends CascadeWorld {
  constructor(data) {super(data);this.mode='attacks';}

  activate(x,y) {
    if(this.settled||![x,y].every(Number.isFinite))return;
    if(this.tool==='hammer')this.hammer(x,y);
    else if(this.tool==='bomb'){
      const bomb={x,y,radius:5,delay:.35,secondary:false};
      this.bombs.push(bomb);this.note({kind:'tool-blast',phase:'fuse',...bomb});
    }
  }

  hammer(x,y) {
    const contact=this.contact(x,y);
    super.hammer(x,y);
    if(contact){
      const {q}=contact,count=this.breakContact(q.x,q.y,p=>Math.hypot(p.x-q.x,p.y-q.y)<=1.5,6);
      if(count)this.note({kind:'chip',source:'hammer',x:q.x,y:q.y,count});
    }
  }

  blast(bomb) {
    super.blast(bomb);
    const {x,y}=bomb,count=this.breakContact(x,y,q=>Math.hypot(q.x-x,q.y-y)<=2.5,24);
    if(count)this.note({kind:'chip',source:'blast',x,y,count});
  }

  work(x,y,dt,multiplier=1,from={x,y},attacking=true) {
    if(this.settled||!from||![x,y,dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    const vx=x-from.x,vy=y-from.y,length=vx*vx+vy*vy;
    const distance=q=>{const t=length?clamp(((q.x-from.x)*vx+(q.y-from.y)*vy)/length,0,1):0;return (q.x-from.x-t*vx)**2+(q.y-from.y-t*vy)**2;};
    if(this.tool==='cutter'&&attacking){
      this.cutBudget+=this.cutRate*dt;
      const count=this.breakContact(x,y,q=>distance(q)<=1,Math.floor(this.cutBudget+1e-8));
      this.cutBudget=clamp(this.cutBudget-count,0,.999999);
      if(count)this.note({kind:'cut',x,y,count});
    }
    this.collectAlong(distance,dt,multiplier);
  }
}
