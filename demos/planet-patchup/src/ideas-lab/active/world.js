import {StructuralIdeaWorld} from '../../structure/idea-world.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
export const DEVICES=[
 {id:'orbital',name:'Orbital Drop',hint:'Deorbit satellite hardware. Sequential impacts, then one heavy payload.'},
 {id:'seismic',name:'Seismic Driver',hint:'Ground-mounted impactors strike foundations across the site.'},
 {id:'gravity',name:'Gravity Press',hint:'Build downward pressure. Weak supports buckle and stacked bodies crush at their contacts.'},
 {id:'sonic',name:'Sonic Sweep',hint:'Clap two pressure fronts inward. Push loose structures together at the center.'},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class ActiveIdeaWorld extends StructuralIdeaWorld{
 constructor(site,profile,options={}){
  super(site,profile,options);this.activeDevice=null;this.activeHistory=[];this.deviceVisuals=[];this.deviceStatus='Choose a device. No energy cost in this lab.';
  this.pressContacts=new Map();
  Events.on(this.engine,'collisionStart collisionActive',({pairs})=>this.capturePressureContacts(pairs));
  if(options.looseBodies)this.detach();
 }
 structureMaterial(){return [null,...this.bodies].flatMap(piece=>this.material(piece).map(v=>({...v,piece})));}
 activateDevice(id,level=1){
  if(this.settled||this.activeDevice||!DEVICES.some(d=>d.id===id)||![1,2,3].includes(level))return false;
  const material=this.structureMaterial();if(!material.length){this.deviceStatus='No structures remain. Restart the map to compare.';return false;}
  const xs=material.map(v=>v.q.x).sort((a,b)=>a-b),left=xs[0],right=xs.at(-1),count=id==='orbital'?5+(level-1)*2:12;
  const targets=Array.from({length:count},(_,i)=>({x:id==='orbital'?xs[Math.floor(i*(xs.length-1)/Math.max(1,count-1))]:left+(right-left)*i/Math.max(1,count-1)}));
  const top=Math.min(...material.map(v=>v.q.y));
  this.activeDevice={id,level,age:0,next:0,left,right,top,targets,projectiles:[],duration:id==='gravity'?4.2:5,pressure:0,nextPress:.6,hitGroups:new Set()};
  this.activeHistory=[];this.deviceVisuals=[];this.deviceStatus=`${DEVICES.find(d=>d.id===id).name} · deploying`;
  return true;
 }
 deviceVisual(kind,x,y,radius=8){this.deviceVisuals.push({kind,x,y,radius,life:.6,remaining:.6});this.deviceVisuals=this.deviceVisuals.slice(-30);}
 hitSatellite(p,y){
  // External equipment is an attack, not collectible map material. No extra pixels enter the ledger.
  super.blast({x:p.x,y:Math.min(this.floorY-1,y),radius:p.radius,power:p.power,secondary:true,ideaSecondary:true});
  this.activeHistory.push({kind:'impact',x:p.x,y});this.deviceVisual('impact',p.x,y,p.radius*3);
 }
 sonicClap(a){
  const center=(a.left+a.right)/2,half=(a.right-a.left)/2,span=Math.max(3,half/12);
  while(a.next<12&&a.age>=.4+a.next*.15){
   const progress=a.next++/11;
   for(const side of [-1,1]){
    const x=center+side*half*(1-progress),contacts=new Map();
    for(const v of this.structureMaterial()){
     if(Math.abs(v.q.x-x)>span||side*(v.q.x-center)<0)continue;
     const group=this.originalGroup[v.p.id],key=`${side}:${group}`;
     if(a.hitGroups.has(key))continue;
     const previous=contacts.get(key);
     if(!previous||Math.abs(v.q.x-x)<Math.abs(previous.q.x-x))contacts.set(key,v);
    }
    for(const [key,{piece,q}] of contacts){
     a.hitGroups.add(key);const direction={x:-side,y:0};
     // Each original assembly is struck once per side, including its later fragments.
     // Most of the effect is an inward shove; collision physics supplies the smash.
     this.applyImpact(piece,q,direction,.6*a.level,'pressure',4+a.level);
     const group=Number(key.split(':')[1]);
     for(const p of this.bodies)if(side*(p.body.position.x-center)>=0&&p.pixels.some(v=>this.originalGroup[v.id]===group))
      this.impulse(p,p.body.position,{x:direction.x*p.body.mass*1.2*a.level,y:0});
    }
    this.activeHistory.push({kind:'sonic',x,direction:-side,contacts:contacts.size});
   }
  }
  this.deviceStatus='Sonic Sweep · both fronts closing toward center';
  if(a.age>=2.05&&!a.clapped){a.clapped=true;this.deviceVisual('clap',center,this.floorY/2,12);}
  if(a.age>2.8)this.finishDevice();
 }
 capturePressureContacts(pairs){
  const a=this.activeDevice;if(a?.id!=='gravity'||a.pressure<=0)return;
  const supported=this.supportBodies();
  for(const pair of pairs){
   if(!pair.isActive||Math.abs(pair.collision.normal.y)<.65)continue;
   const first=pair.bodyA.parent||pair.bodyA,second=pair.bodyB.parent||pair.bodyB;
   for(const [body,base] of [[first,second],[second,first]]){
    const piece=body.plugin?.piece;
    if(!piece||base.position.y<=body.position.y||!supported.has(base))continue;
    const points=pair.collision.supports.slice(0,pair.collision.supportCount).filter(p=>p&&p.y>=body.position.y);
    if(!points.length)continue;
    const q=points.reduce((s,p)=>({x:s.x+p.x/points.length,y:s.y+p.y/points.length}),{x:0,y:0});
    this.pressContacts.set(piece,{q,base:base.plugin?.piece,staticMaterial:this.staticBodies.includes(base)});
   }
  }
 }
 compressContacts(a){
  if(a.age<a.nextPress||!this.pressContacts.size)return;
  a.nextPress=a.age+.25;
  for(const [piece,{q,base,staticMaterial}] of this.pressContacts){
   if(!this.bodies.includes(piece))continue;
   const strength=.18*a.level*a.pressure*Math.min(2,Math.sqrt(piece.pixels.length/200)),radius=2+a.level*.5;
   // Bounded fatigue at real load-bearing contacts, not damage to free-falling bodies.
   this.applyImpact(piece,q,{x:0,y:-1},strength,'pressure',radius);
   if(base&&this.bodies.includes(base))this.applyImpact(base,q,{x:0,y:1},strength,'pressure',radius);
   else if(staticMaterial)this.applyImpact(null,q,{x:0,y:1},strength,'pressure',radius);
   this.activeHistory.push({kind:'compression',x:q.x,y:q.y,strength});this.deviceVisual('compression',q.x,q.y,radius*2);
  }
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
  }else if(a.id==='sonic'){
   this.sonicClap(a);
  }else if(a.id==='seismic'){
   while(a.next<a.targets.length&&a.age>=.4+a.next*.15){
    const x=a.targets[a.next++].x,span=Math.max(5,(a.right-a.left)/a.targets.length);
    const material=this.structureMaterial(),contacts=new Map();
    for(const v of material){
     if(Math.abs(v.q.x-x)>span||v.q.y<this.floorY-10)continue;
     const old=contacts.get(v.piece);
     if(!old||v.q.y>old.q.y)contacts.set(v.piece,v);
    }
    for(const {piece,q} of contacts.values()){
     const direction={x:0,y:-1};
     this.applyImpact(piece,q,direction,4*gain,'pressure',7+gain*2);
     // Fracture may replace the old body. Transfer force to surviving/new pieces near contact.
     for(const p of this.nearPieces(q.x,q.y,10+gain*2))this.impulse(p,q,{x:direction.x*p.body.mass*.4*gain,y:direction.y*p.body.mass*.4*gain});
    }
    this.activeHistory.push({kind:a.id,x,contacts:contacts.size});this.deviceVisual(a.id,x,this.floorY,span*2);
   }
   this.deviceStatus='Seismic Driver · foundation impulses';
   if(a.age>2.8)this.finishDevice();
  }else{
   a.pressure=clamp((a.age-.6),0,1)*clamp((a.duration-a.age)/.5,0,1);
   for(const p of this.bodies)Sleeping.set(p.body,false);
   this.deviceStatus=a.age<.6?'Gravity Press · charging overhead array':a.age<1.6?'Gravity Press · pressure building':a.age>3.7?'Gravity Press · releasing pressure':'Gravity Press · crushing supported structures';
   if(a.age>=a.duration){this.activeHistory.push({kind:'gravity'});this.finishDevice();}
  }
 }
 finishDevice(){this.deviceStatus=`${DEVICES.find(d=>d.id===this.activeDevice.id).name} · complete. Ready again.`;this.activeDevice=null;}
 step(dt){
  if(this.settled||!Number.isFinite(dt)||dt<=0)return;
  let left=Math.min(.1,dt);
  while(left>1e-8){
   const h=Math.min(1/60,left);left-=h;this.deviceTick(h);
   const a=this.activeDevice,g=this.engine.gravity,base=g.scale;
   const extra=a?.id==='gravity'?1+4*a.level*a.pressure:1;
   try{
    g.scale=base*extra;
    // Loose grains use their own integrator, so give them the same extra downward acceleration.
    if(extra>1)for(const p of this.flying)p.vy=clamp(p.vy+60*(extra-1)*h,-this.tune('grainSpeedCap',240),this.tune('grainSpeedCap',240));
    this.pressContacts.clear();super.step(h);
    if(a?.id==='gravity'&&a.pressure>0)this.compressContacts(a);
   }finally{g.scale=base;}
  }
 }
}
