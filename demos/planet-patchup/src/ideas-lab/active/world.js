import {StructuralIdeaWorld} from '../../structure/idea-world.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
export const DEVICES=[
 {id:'orbital',name:'Orbital Drop',hint:'Deorbit satellite hardware. Sequential impacts, then one heavy payload.'},
 {id:'seismic',name:'Seismic Driver',hint:'Ground-mounted impactors strike foundations across the site.'},
 {id:'gravity',name:'Gravity Press',hint:'A fictional gravity array increases downward load for three seconds.'},
 {id:'sonic',name:'Sonic Sweep',hint:'A directional pressure front pushes structures from left to right.'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class ActiveIdeaWorld extends StructuralIdeaWorld{
 constructor(site,profile,options={}){
  super(site,profile,options);this.activeDevice=null;this.activeHistory=[];this.deviceVisuals=[];this.deviceStatus='Choose a device. No energy cost in this lab.';
  if(options.looseBodies)this.detach();
 }
 structureMaterial(){return [null,...this.bodies].flatMap(piece=>this.material(piece).map(v=>({...v,piece})));}
 activateDevice(id,level=1){
  if(this.settled||this.activeDevice||!DEVICES.some(d=>d.id===id)||![1,2,3].includes(level))return false;
  const material=this.structureMaterial();if(!material.length){this.deviceStatus='No structures remain. Restart the map to compare.';return false;}
  const xs=material.map(v=>v.q.x).sort((a,b)=>a-b),left=xs[0],right=xs.at(-1),count=id==='orbital'?5+(level-1)*2:12;
  const targets=Array.from({length:count},(_,i)=>({x:id==='orbital'?xs[Math.floor(i*(xs.length-1)/Math.max(1,count-1))]:left+(right-left)*i/Math.max(1,count-1)}));
  this.activeDevice={id,level,age:0,next:0,left,right,targets,projectiles:[],duration:id==='gravity'?3.5:5};
  this.activeHistory=[];this.deviceVisuals=[];this.deviceStatus=`${DEVICES.find(d=>d.id===id).name} · deploying`;
  return true;
 }
 deviceVisual(kind,x,y,radius=8){this.deviceVisuals.push({kind,x,y,radius,life:.6,remaining:.6});this.deviceVisuals=this.deviceVisuals.slice(-30);}
 hitSatellite(p,y){
  // External equipment is an attack, not collectible map material. No extra pixels enter the ledger.
  super.blast({x:p.x,y:Math.min(this.floorY-1,y),radius:p.radius,power:p.power,secondary:true,ideaSecondary:true});
  this.activeHistory.push({kind:'impact',x:p.x,y});this.deviceVisual('impact',p.x,y,p.radius*3);
 }
 deviceTick(dt){
  for(const f of this.deviceVisuals)f.remaining-=dt;this.deviceVisuals=this.deviceVisuals.filter(f=>f.remaining>0);
  const a=this.activeDevice;if(!a)return;
  a.age+=dt;const gain=a.level;
  if(a.id==='orbital'){
   while(a.next<a.targets.length&&a.age>=.45+a.next*.42){
    const heavy=a.next===a.targets.length-1,x=a.targets[a.next++].x;
    a.projectiles.push({x,y:-8,vy:15,radius:(heavy?4:2)+gain,power:(heavy?2:1)*gain,heavy});
   }
   if(a.projectiles.length){
    let material=this.structureMaterial();
    for(const p of a.projectiles){
     const previous=p.y;p.vy=Math.min(230,p.vy+130*dt);p.y+=p.vy*dt;
     let hit=this.floorY;
     for(const {q} of material)if(Math.abs(q.x-p.x)<=p.radius&&q.y>=previous-p.radius&&q.y<=p.y+p.radius)hit=Math.min(hit,q.y);
     if(hit<=p.y+p.radius){this.hitSatellite(p,hit);p.done=true;material=this.structureMaterial();}
    }
    a.projectiles=a.projectiles.filter(p=>!p.done);
   }
   this.deviceStatus=`Orbital Drop · ${a.next}/${a.targets.length} payloads deployed`;
   if(a.next===a.targets.length&&!a.projectiles.length)this.finishDevice();
  }else if(a.id==='seismic'||a.id==='sonic'){
   while(a.next<a.targets.length&&a.age>=.4+a.next*.15){
    const x=a.targets[a.next++].x,span=Math.max(5,(a.right-a.left)/a.targets.length);
    const material=this.structureMaterial(),contacts=new Map();
    for(const v of material){
     if(Math.abs(v.q.x-x)>span||a.id==='seismic'&&v.q.y<this.floorY-10)continue;
     const old=contacts.get(v.piece);
     if(!old||(a.id==='seismic'?v.q.y>old.q.y:Math.abs(v.q.x-x)<Math.abs(old.q.x-x)))contacts.set(v.piece,v);
    }
    for(const {piece,q} of contacts.values()){
     const direction=a.id==='seismic'?{x:0,y:-1}:{x:1,y:0};
     this.applyImpact(piece,q,direction,(a.id==='seismic'?4:2)*gain,'pressure',7+gain*2);
     // Fracture may replace the old body. Transfer force to surviving/new pieces near contact.
     for(const p of this.nearPieces(q.x,q.y,10+gain*2))this.impulse(p,q,{x:direction.x*p.body.mass*.4*gain,y:direction.y*p.body.mass*.4*gain});
    }
    this.activeHistory.push({kind:a.id,x,contacts:contacts.size});this.deviceVisual(a.id,x,this.floorY,span*2);
   }
   this.deviceStatus=a.id==='seismic'?'Seismic Driver · foundation impulses':'Sonic Sweep · pressure front moving right';
   if(a.age>2.8)this.finishDevice();
  }else{
   // A temporary gravity multiplier lets the shared load/hinge/collision rules do the work.
   for(const p of this.bodies)Sleeping.set(p.body,false);
   this.deviceStatus=a.age<.5?'Gravity Press · array charging':'Gravity Press · downward load amplified';
   if(a.age>=3.5){this.activeHistory.push({kind:'gravity'});this.finishDevice();}
  }
 }
 finishDevice(){this.deviceStatus=`${DEVICES.find(d=>d.id===this.activeDevice.id).name} · complete. Ready again.`;this.activeDevice=null;}
 step(dt){
  if(this.settled||!Number.isFinite(dt)||dt<=0)return;
  let left=Math.min(.1,dt);
  while(left>1e-8){
   const h=Math.min(1/60,left);left-=h;this.deviceTick(h);
   const a=this.activeDevice,g=this.engine.gravity,base=g.scale;
   const extra=a?.id==='gravity'&&a.age>=.5?1+2*a.level:1;
   try{
    g.scale=base*extra;
    // Loose grains use their own integrator, so give them the same extra downward acceleration.
    if(extra>1)for(const p of this.flying)p.vy=clamp(p.vy+60*(extra-1)*h,-this.tune('grainSpeedCap',240),this.tune('grainSpeedCap',240));
    super.step(h);
   }finally{g.scale=base;}
  }
 }
}
