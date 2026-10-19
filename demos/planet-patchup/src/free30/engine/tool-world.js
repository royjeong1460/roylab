import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import { World } from './world.js';
import { WeightedWorld } from './weighted-world.js';

export class ToolWorld extends WeightedWorld {
  constructor(data) {
    super(data);
    this.tool='cutter';this.mods={cutter:false,hammer:false,bomb:false};this.direction=1;
    this.toolCooldowns={cutter:0,hammer:0,bomb:0};this.bombs=[];
  }

  setTool(name) {
    if(!Object.hasOwn(this.toolCooldowns,name))return false;
    this.tool=name;return true;
  }

  // Convert only contact pixels; surviving connected material keeps its rotation and momentum.
  breakContact(x,y,contains,limit=Infinity) {
    const candidates=[];
    for(let i=0;i<this.cells.length;i++)if(this.cells[i]){
      const q={x:i%this.width+.5,y:Math.floor(i/this.width)+.5};
      if(contains(q))candidates.push({i,q});
    }
    for(const piece of this.bodies)for(const p of piece.pixels){
      const q=this.pixelPosition(piece,p);
      if(contains(q))candidates.push({piece,p,q});
    }
    candidates.sort((a,b)=>Math.hypot(a.q.x-x,a.q.y-y)-Math.hypot(b.q.x-x,b.q.y-y));
    const chosen=candidates.slice(0,limit),changed=new Map();let staticCut=false;
    for(const c of chosen){
      if(c.i!==undefined){this.makeSand(c.i);staticCut=true;}
      else {
        if(!changed.has(c.piece))changed.set(c.piece,new Set());
        changed.get(c.piece).add(c.p);this.debris.push({...c.p,...c.q});
      }
    }
    for(const [piece,removed] of changed){
      this.removePiece(piece);this.addConnected(piece.pixels.filter(p=>!removed.has(p)),piece,piece.damage);
    }
    if(staticCut)this.detach();
    else if(changed.size){this.updateHinges();this.rasterize();this.flushDebris();}
    if(chosen.length){this.version++;this.sandMoving=true;}
    return chosen.length;
  }

  pushNearby(x,y,radius,multiple,radial=false) {
    const nearby=this.bodies.map(piece=>({piece,distance:Math.min(...piece.pixels.map(p=>{
      const q=this.pixelPosition(piece,p);return Math.hypot(q.x-x,q.y-y);
    }))})).filter(p=>p.distance<=radius).sort((a,b)=>a.distance-b.distance);
    for(const {piece} of multiple?nearby:nearby.slice(0,1)){
      const body=piece.body,direction=this.direction<0?-1:1;
      let vx=direction*2.2,vy=-.65;
      if(radial){
        const dx=body.position.x-x,dy=body.position.y-y,length=Math.hypot(dx,dy)||1;
        vx=dx/length*2.4;vy=dy/length*2.4-.45;
      }
      Sleeping.set(body,false);
      Body.setVelocity(body,{x:body.velocity.x+vx,y:body.velocity.y+vy});
    }
  }

  blast(bomb) {
    const {x,y,radius}=bomb;
    const count=this.breakContact(x,y,q=>Math.hypot(q.x-x,q.y-y)<=radius);
    this.pushNearby(x,y,18,true,true);
    this.note({kind:'tool-blast',phase:'blast',x,y,radius,count,secondary:bomb.secondary});
    this.stage='국소 폭발 · 남은 구조물이 무너져요';
  }

  work(x,y,dt,multiplier=1,from={x,y}) {
    if(this.settled||!from||![x,y,dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    if(this.tool==='cutter'){
      super.work(x,y,dt,multiplier,from);
      if(this.mods.cutter&&this.toolCooldowns.cutter<=0){
        const count=this.breakContact(x,y,q=>Math.abs(q.y-y)<=.55&&Math.abs(q.x-x)<=8);
        this.toolCooldowns.cutter=.65;
        this.note({kind:'tool-line',x:x-8,y,x2:x+8,y2:y,count});
      }
      return;
    }
    if(this.toolCooldowns[this.tool]<=0){
      if(this.tool==='hammer'){
        const count=this.breakContact(x,y,q=>Math.hypot(q.x-x,q.y-y)<=1.8,10);
        this.pushNearby(x,y,this.mods.hammer?18:12,this.mods.hammer);
        this.toolCooldowns.hammer=.45;
        this.note({kind:'tool-strike',x,y,count,direction:this.direction<0?-1:1});
        this.stage='충격 전달 · 선택한 방향으로 밀어요';
      } else if(this.tool==='bomb'){
        const bomb={x,y,radius:5,delay:.35,secondary:false};
        this.bombs.push(bomb);
        this.note({kind:'tool-blast',phase:'fuse',...bomb});
        if(this.mods.bomb)this.bombs.push({x:x+(this.direction<0?-4:4),y,radius:5,delay:.65,secondary:true});
        this.toolCooldowns.bomb=.9;
      }
    }
    // Reuse the swept nozzle's suction without spending or inheriting a cutter budget.
    const rate=this.cutRate,budget=this.cutBudget;
    this.cutRate=0;this.cutBudget=0;
    try {World.prototype.work.call(this,x,y,dt,multiplier,from);}
    finally {this.cutRate=rate;this.cutBudget=budget;}
  }

  step(dt) {
    if(this.settled||!Number.isFinite(dt)||dt<=0)return;
    const elapsed=Math.min(.1,dt);
    for(const tool of Object.keys(this.toolCooldowns))this.toolCooldowns[tool]=Math.max(0,this.toolCooldowns[tool]-elapsed);
    const pending=[];
    for(const bomb of this.bombs){
      bomb.delay-=elapsed;
      if(bomb.delay<=1e-8)this.blast(bomb);
      else pending.push(bomb);
    }
    this.bombs=pending;
    super.step(dt);
  }
}
