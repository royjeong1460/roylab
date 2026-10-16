import {AttackBatteryWorld} from './attack-battery-world.js';

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const mask=rows=>rows.flatMap(([dy,xs])=>xs.map(dx=>[dx,dy]));
export const CUT_PATTERNS=[
  {id:'dot',name:'점',cost:1,cells:[[0,0]]},
  {id:'claw',name:'발톱',cost:6,cells:mask([[-3,[-3,0,3]],[-2,[-3,0,3]],[-1,[-3,0,3]],[0,[-2,-1,0,1,2]],[1,[-1,0,1]]])},
  {id:'ring',name:'고리',cost:10,cells:mask([[-3,[-1,0,1]],[-2,[-2,2]],[-1,[-3,3]],[0,[-3,3]],[1,[-3,3]],[2,[-2,2]],[3,[-1,0,1]]])},
  {id:'foot',name:'발자국',cost:14,cells:mask([[-4,[-1,0,1]],[-3,[-2,-1,0,1,2]],[-2,[-2,-1,0,1,2]],[-1,[-2,-1,0,1,2]],[0,[-1,0,1]],[1,[0,1]],[2,[0,1,2]],[3,[0,1,2]]])},
];

export class ThreeToolWorld extends AttackBatteryWorld{
  constructor(data,{capacity=180,efficiency={}}={}){
    super(data,{capacity,efficiency});
    this.settings={pattern:'dot',bombRange:0,bombForce:0,gravityForce:0};this.wells=[];this.cutDelay=0;
  }

  configure(patch){
    if(!patch||typeof patch!=='object'||Array.isArray(patch))return false;
    for(const [key,value] of Object.entries(patch)){
      if(key==='pattern'){if(!CUT_PATTERNS.some(p=>p.id===value))return false;}
      else if(!['bombRange','bombForce','gravityForce'].includes(key)||!Number.isInteger(value)||value<0||value>5)return false;
    }
    Object.assign(this.settings,patch);return true;
  }

  cutPattern(){return CUT_PATTERNS.find(p=>p.id===this.settings.pattern);}

  stats(){
    const {pattern,bombRange,bombForce,gravityForce}=this.settings;
    return {cutCost:this.cutPattern().cost,bombRadius:3+bombRange,bombPower:1+.25*bombForce,bombCost:12,
      gravityRadius:44,gravityPower:.2+.06*gravityForce,gravityDuration:3,gravityCost:18};
  }

  setTool(tool){if(!['cutter','bomb','blackhole'].includes(tool))return false;this.tool=tool;return true;}
  cost(){const s=this.stats();return this.tool==='cutter'?s.cutCost:this.tool==='bomb'?s.bombCost:s.gravityCost;}
  validPoint(x,y){return [x,y].every(Number.isFinite)&&x>=0&&x<this.width&&y>=0&&y<this.floorY;}
  canUseTool(){return this.toolEnabled&&!this.settled&&this.charge+1e-8>=this.cost()&&(this.tool!=='blackhole'||this.wells.length===0);}

  activate(x,y){
    if(!this.validPoint(x,y)||!this.canUseTool())return false;
    const s=this.stats();
    if(this.tool==='cutter'){
      this.cutDelay=.1;
      const pattern=this.cutPattern(),cx=Math.floor(x),cy=Math.floor(y);
      const cells=new Set(pattern.cells.map(([dx,dy])=>`${cx+dx}:${cy+dy}`));
      const count=this.breakContact(x,y,q=>cells.has(`${Math.floor(q.x)}:${Math.floor(q.y)}`));
      if(!count)return false;
      this.note({kind:'cut',x,y,count,pattern:pattern.id});
    }else if(this.tool==='bomb'){
      const bomb={x,y,radius:s.bombRadius,power:s.bombPower,delay:.35,secondary:false};
      this.bombs.push(bomb);this.note({kind:'tool-blast',phase:'fuse',...bomb});
    }else{
      const well={x,y,radius:s.gravityRadius,power:s.gravityPower,remaining:s.gravityDuration,duration:s.gravityDuration,strainDelay:.2};
      this.wells.push(well);this.strainSupported(well,1.4);
      this.note({kind:'tool-gravity',phase:'start',x,y,radius:well.radius,power:well.power,duration:well.duration});
    }
    this.charge=Math.max(0,this.charge-this.cost());this.enforceBodyBudget();return true;
  }

  // The removed core is independent of force; only physical impulse scales with power.
  blast({x,y,radius,power=1,secondary=false}){
    const count=this.breakContact(x,y,q=>Math.hypot(q.x-x,q.y-y)<=radius);
    for(const piece of this.bodies){
      const nearby=this.material(piece).some(({q})=>Math.hypot(q.x-x,q.y-y)<=18);
      if(!nearby)continue;
      let dx=piece.body.position.x-x,dy=piece.body.position.y-y;
      if(Math.hypot(dx,dy)<.01){dx=0;dy=-1;}
      const d=Math.hypot(dx,dy);this.impulse(piece,{x,y},{x:dx/d*.45*power,y:dy/d*.45*power});
    }
    for(const p of this.flying){
      let dx=p.x-x,dy=p.y-y;const distance=Math.hypot(dx,dy);if(distance>18)continue;
      if(distance<.01){dx=0;dy=-1;}
      const d=Math.hypot(dx,dy),push=32*power*(1-.5*distance/18);
      p.vx=clamp(p.vx+dx/d*push,-240,240);p.vy=clamp(p.vy+dy/d*push,-240,240);
    }
    this.note({kind:'tool-blast',phase:'blast',x,y,radius,power,count,secondary});this.enforceBodyBudget();
  }

  strainSupported(well,strength){
    const structures=new Map();
    for(let id=0;id<this.cells.length;id++)if(this.cells[id]){
      const group=this.originalGroup[id],y=Math.floor(id/this.width);
      if(!structures.has(group))structures.set(group,new Map());
      const rows=structures.get(group);if(!rows.has(y))rows.set(y,[]);rows.get(y).push(id%this.width);
    }
    for(const rows of structures.values()){
      let support=null;
      for(const [y,xs] of rows){
        const points=[];
        for(let n=0;n<xs.length;){const start=xs[n++];let end=start;while(n<xs.length&&xs[n]===end+1)end=xs[n++];points.push({x:(start+end+1)/2,y:y+.5});}
        const within=points.filter(p=>Math.hypot(p.x-well.x,p.y-well.y)<well.radius);
        if(!within.length)continue;
        const distance=Math.min(...within.map(p=>Math.hypot(p.x-well.x,p.y-well.y)));
        if(!support||xs.length<support.width||(xs.length===support.width&&distance<support.distance))support={width:xs.length,distance,points:within};
      }
      if(!support)continue;
      for(const point of support.points){
        const direction={x:well.x-point.x,y:well.y-point.y};if(Math.hypot(direction.x,direction.y)<.01)direction.y=-1;
        // shortcut: transmit field load to each structure's narrowest nearby support row; no elastic solver.
        this.applyImpact(null,point,direction,strength*well.power,'gravity',6);
      }
    }
    this.enforceBodyBudget();
  }

  pull(well,dt){
    for(const piece of this.bodies){
      let point=null,near=well.radius;
      for(const {q} of this.material(piece)){const d=Math.hypot(q.x-well.x,q.y-well.y);if(d<near){near=d;point=q;}}
      if(!point)continue;
      const b=piece.body,dx=well.x-b.position.x,dy=well.y-b.position.y,distance=Math.hypot(dx,dy);
      if(distance<.25)continue;
      const acceleration=.18*well.power*(1-.5*near/well.radius)/(.5+b.mass);
      const impulse=acceleration*dt*60*b.mass;
      this.impulse(piece,point,{x:dx/distance*impulse,y:dy/distance*impulse});
    }
    for(const p of this.flying){
      const dx=well.x-p.x,dy=well.y-p.y,distance=Math.hypot(dx,dy);
      if(distance<.25||distance>well.radius)continue;
      const speed=55*well.power*(1-.5*distance/well.radius)*dt;
      p.vx=clamp(p.vx+dx/distance*speed,-240,240);p.vy=clamp(p.vy+dy/distance*speed,-240,240);
    }
  }

  work(x,y,dt,multiplier=1,from={x,y},attacking=false){
    if(this.settled||!from||![dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    if(attacking&&this.tool==='cutter'&&this.validPoint(x,y)&&this.canUseTool()){
      this.cutDelay=Math.max(0,this.cutDelay-dt);
      if(this.cutDelay<=1e-8)this.activate(x,y);
    }else this.cutDelay=0;
    super.work(x,y,dt,multiplier,from,false);
  }

  step(dt){
    if(this.settled||!Number.isFinite(dt)||dt<=0)return;
    let left=Math.min(.1,dt);
    while(left>1e-8){
      const h=Math.min(1/60,left);left-=h;
      for(const well of this.wells){
        this.pull(well,Math.min(h,well.remaining));well.strainDelay-=h;
        if(well.strainDelay<=1e-8){this.strainSupported(well,.6);well.strainDelay+=.2;}
        well.remaining=Math.max(0,well.remaining-h);
      }
      this.wells=this.wells.filter(well=>well.remaining>1e-8);
      super.step(h);
      for(const piece of this.bodies)this.limitMotion(piece);
    }
  }

  settle(){
    if(!this.ready()||this.bombs.length||this.wells.length)return false;
    // This comparison route keeps measured recovery; legacy settlement grants the remainder.
    this.settled=true;return true;
  }
}
