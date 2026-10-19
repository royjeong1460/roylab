import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import {SettlingWorld} from '../free-step1/settling-world.js';
import {normalize,valuesFor} from './parameters.js';

export class LabWorld extends SettlingWorld{
 constructor(data,multipliers={}){
  super(data,{capacity:60});this.samples=[];this.motionLimits=0;this.budgetPixels=0;
  this.unlimited=true;this.autoCollect=false;this.setTool('bomb');this.configureLab(multipliers);this.charge=this.capacity;
 }
 setTool(tool){return ['bomb','blackhole'].includes(tool)&&super.setTool(tool);}
 stats(){const s=super.stats();if(!this.labParameters)return s;const p=this.labParameters;return {...s,bombRadius:p.bombRadius,bombPower:p.bombPower,bombCost:p.bombCost,gravityRadius:p.gravityRadius,gravityPower:p.gravityPower,gravityDuration:p.gravityDuration,gravityCost:p.gravityCost};}
 configureLab(patch){
  this.multipliers=normalize(patch,this.multipliers);this.labParameters=valuesFor(this.multipliers);const p=this.labParameters;
  this.tuning={collision:p.collision,crackStrength:p.crackStrength,crackRange:p.crackRange};
  this.capacity=p.capacity;this.charge=Math.min(this.charge,this.capacity);this.suctionRate=p.suctionRate;this.suctionRadius=p.suctionRadius;
  this.engine.gravity.scale=p.gravity;this.engine.positionIterations=p.positionIterations;this.engine.velocityIterations=p.velocityIterations;this.engine.constraintIterations=p.constraintIterations;
  for(const body of Composite.allBodies(this.engine.world)){
   if(body.plugin.piece)this.applyMaterial(body.plugin.piece);
   else {body.friction=p.groundFriction;body.frictionStatic=p.staticFriction;if(!this.staticBodies.includes(body))body.restitution=p.wallRestitution;}
  }
  for(const piece of this.bodies){Sleeping.set(piece.body,false);if(piece.hinge){piece.hinge.stiffness=p.hingeStiffness;piece.hinge.damping=p.hingeDamping;}}
  this.version++;return {...this.multipliers};
 }
 applyMaterial(piece){
  if(!this.labParameters)return;const p=this.labParameters,b=piece.body;
  // Set parent and collision parts together, including newly fractured children.
  for(const part of b.parts){part.friction=p.friction;part.frictionStatic=p.staticFriction;part.frictionAir=p.airFriction;part.restitution=p.restitution;part.slop=p.slop;Body.setDensity(part,p.density);}
  Body.setDensity(b,p.density);Body.setInertia(b,piece.pixels.reduce((s,v)=>s+p.inertia*(v.x*v.x+v.y*v.y+1/6),0));
 }
 addPiece(...args){const piece=super.addPiece(...args);if(piece)this.applyMaterial(piece);return piece;}
 syncStatic(){super.syncStatic();if(this.labParameters)for(const body of this.staticBodies){body.friction=this.labParameters.groundFriction;body.frictionStatic=this.labParameters.staticFriction;}}
 canUseTool(){return this.toolEnabled&&!this.settled&&(this.unlimited||this.charge>1e-8)&&(this.tool!=='blackhole'||this.wells.length===0);}
 activate(x,y){if(this.unlimited)this.charge=this.capacity;const ok=super.activate(x,y);if(this.unlimited)this.charge=this.capacity;return ok;}
 limitMotion(piece){
  const b=piece.body,r=piece.motionRadius??Math.max(...piece.pixels.map(p=>Math.hypot(p.x,p.y)))+.75;
  if(Math.hypot(b.velocity.x,b.velocity.y)+Math.abs(b.angularVelocity)*r>this.tune('motionCap',3))this.motionLimits=(this.motionLimits||0)+1;
  return super.limitMotion(piece);
 }
 enforceBodyBudget(){const before=this.bodies.reduce((n,p)=>n+p.pixels.length,0);super.enforceBodyBudget();this.budgetPixels=(this.budgetPixels||0)+before-this.bodies.reduce((n,p)=>n+p.pixels.length,0);}
 recordCollisions(pairs){
  const from=this.contacts?.length||0;super.recordCollisions(pairs);if(!this.samples)return;
  for(const h of this.contacts.slice(from))this.samples.push({time:this.elapsed,kind:'collision',speed:h.speed,energy:h.energy,pixels:h.piece?.pixels.length??null,x:h.point.x,y:h.point.y});
  this.samples=this.samples.slice(-100);
 }
 advance(dt,aim){this.step(dt);if(this.autoCollect)this.work(aim.x,aim.y,dt,1,aim,false);}
 diagnostics(){
  const l=this.ledger(),total=Object.values(l).reduce((a,b)=>a+b,0),speeds=this.bodies.map(p=>Math.hypot(p.body.velocity.x,p.body.velocity.y)*60);
  const finite=this.bodies.every(p=>[p.body.position.x,p.body.position.y,p.body.velocity.x,p.body.velocity.y,p.body.angle,p.body.angularVelocity,p.body.mass,p.body.inertia].every(Number.isFinite))&&this.flying.every(p=>[p.x,p.y,p.vx,p.vy].every(Number.isFinite));
  return {seconds:this.elapsed,ledger:l,total,initial:this.initial,balanced:total===this.initial,finite,bodies:this.bodies.length,sleeping:this.bodies.filter(p=>p.body.isSleeping).length,hinges:this.bodies.filter(p=>p.hinge).length,maxSpeed:Math.max(0,...speeds),maxGrainSpeed:Math.max(0,...this.flying.map(p=>Math.hypot(p.vx,p.vy))),motionLimits:this.motionLimits,budgetPixels:this.budgetPixels,lastCollision:this.samples.at(-1)||null};
 }
}
