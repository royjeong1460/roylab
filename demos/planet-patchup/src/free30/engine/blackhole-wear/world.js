import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import {BlackHoleLabWorld} from '../blackhole-lab/world.js';
import {normalizeBH} from './settings.js';

export class BlackHoleWearWorld extends BlackHoleLabWorld {
 constructor(data,settings={}){
  super(data,{coreMix:2,...settings});
  this.wear=new Map();this.wornPixels=0;
  // Sample after contact resolution; apply erosion only after the engine has finished.
  Events.on(this.engine,'afterUpdate',event=>this.sampleWear(this.engine.pairs.list,event.delta/1000));
 }
 configureLab(patch){
  const next=normalizeBH(patch,this.wearSettings);
  super.configureLab(next);this.wearSettings=next;
  return {...next};
 }
 addPiece(pixels,parent=null,damage=0){
  const piece=super.addPiece(pixels,parent,damage);
  if(piece)piece.rubbingTime=parent?.rubbingTime||0;
  return piece;
 }
 wearMultiplier(piece){
  const maximum=this.wearSettings.wearSpeed,start=Math.min(1,maximum);
  return start+(maximum-start)*Math.min(1,piece.rubbingTime||0);
 }
 activate(x,y){
  const ok=super.activate(x,y);
  if(ok&&this.tool==='blackhole')for(const piece of this.bodies)piece.rubbingTime=0;
  return ok;
 }
 sampleWear(pairs,dt){
  if(!Number.isFinite(dt)||dt<=0)return;
  const speed=this.wearSettings.wearSpeed;
  if(speed===0){for(const p of this.bodies)p.rubbingTime=0;return;}
  const wells=this.wells.filter(w=>w.remaining>0&&w.power>0);
  if(!wells.length){for(const p of this.bodies)p.rubbingTime=0;return;}
  const additions=new Map(),surfaces=new Map(),touching=new Set();
  const velocity=(body,point)=>({x:body.velocity.x-body.angularVelocity*(point.y-body.position.y),y:body.velocity.y+body.angularVelocity*(point.x-body.position.x)});
  const surface=piece=>{
   if(!surfaces.has(piece)){
    const ids=new Set(piece.pixels.map(p=>p.id));
    surfaces.set(piece,this.material(piece).filter(({p})=>this.neighbors(p.id).some(id=>!ids.has(id))));
   }
   return surfaces.get(piece);
  };
  for(const pair of pairs){
   if(!pair.isActive||pair.isSensor||!(pair.friction>0))continue;
   const a=pair.bodyA.parent,b=pair.bodyB.parent,pa=a.plugin.piece,pb=b.plugin.piece;
   if(a===b||!pa||!pb||!this.bodies.includes(pa)||!this.bodies.includes(pb))continue;
   const normal=pair.collision.normal,points=pair.collision.supports.slice(0,pair.collision.supportCount).filter(Boolean);
   const impulse=pair.contacts.slice(0,pair.contactCount).reduce((sum,c)=>sum+Math.max(0,-c.normalImpulse),0);
   const reducedMass=1/(a.inverseMass+b.inverseMass);
   const pressure=Math.min(2,impulse/(reducedMass*.08));
   for(const point of points){
    const well=wells.find(w=>Math.hypot(point.x-w.x,point.y-w.y)<w.radius*.4);if(!well)continue;
    touching.add(pa);touching.add(pb);
    if(!(pressure>0))continue;
    const av=velocity(a,point),bv=velocity(b,point);
    const slip=Math.abs((av.x-bv.x)*-normal.y+(av.y-bv.y)*normal.x)*60;
    // Ignore solver jitter and static/common motion. Only actual sliding does work.
    if(slip<=3)continue;
    const amount=Math.min(48,(slip-3)*pressure*8*Math.min(1,pair.friction/.7))*Math.min(dt,1/30);
    for(const piece of [pa,pb]){
     let closest=null,distance=2.25;
     for(const cell of surface(piece)){
      const d=Math.hypot(cell.q.x-point.x,cell.q.y-point.y);
      if(d<distance&&Math.hypot(cell.q.x-well.x,cell.q.y-well.y)<well.radius*.4){distance=d;closest=cell.p;}
     }
     if(!closest)continue;
     if(!additions.has(piece))additions.set(piece,new Map());
     const pixels=additions.get(piece);
     // Compound collider contacts must not multiply the same abrasion work.
     pixels.set(closest.id,Math.max(pixels.get(closest.id)||0,amount));
    }
   }
  }
  if(additions.size)this.wearDirty=true;
  for(const piece of this.bodies){
   const pixels=additions.get(piece);
   if(pixels){
    const multiplier=this.wearMultiplier(piece);
    const sum=[...pixels.values()].reduce((a,b)=>a+b,0),scale=Math.min(1,48*dt/sum)*multiplier;
    for(const [id,amount] of pixels)this.wear.set(id,Math.min(1.5,(this.wear.get(id)||0)+amount*scale));
    // Count time once per body/step, not once per compound contact or surface pixel.
    piece.rubbingTime=Math.min(1,(piece.rubbingTime||0)+Math.min(dt,1/30));
   }else if(!touching.has(piece))piece.rubbingTime=Math.max(0,(piece.rubbingTime||0)-dt);
  }
 }
 flushWear(){
  if(!this.wearDirty)return;
  this.wearDirty=false;
  let removed=0;
  for(const piece of [...this.bodies]){
   const eroded=piece.pixels.filter(p=>(this.wear.get(p.id)||0)>=1);
   if(!eroded.length)continue;
   const ids=new Set(eroded.map(p=>p.id)),remaining=piece.pixels.filter(p=>!ids.has(p.id));
   this.removePiece(piece);
   for(const p of eroded)this.emitPixel(p,piece);
   this.addConnected(remaining,piece,piece.damage);
   removed+=eroded.length;
  }
  // IDs survive fragment rebuilding, but already emitted pixels must not carry stale work.
  const live=new Set(this.bodies.flatMap(p=>p.pixels.map(v=>v.id)));
  for(const id of this.wear.keys())if(!live.has(id))this.wear.delete(id);
  if(removed){
   this.wornPixels+=removed;this.enforceBodyBudget();this.rasterize();this.sandMoving=true;this.version++;
   this.note({kind:'contact-wear',count:removed,total:this.wornPixels});
  }
 }
 step(dt){super.step(dt);if(this.wear)this.flushWear();}
 diagnostics(){return {...super.diagnostics(),abrasion:{pixels:this.wornPixels||0,speed:this.wearSettings.wearSpeed,ramp:Math.max(Math.min(1,this.wearSettings.wearSpeed),...this.bodies.map(p=>this.wearMultiplier(p)))}};}
}
