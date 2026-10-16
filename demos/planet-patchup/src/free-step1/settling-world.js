import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {ShatterWorld} from '../france-shatter/world.js';

// Grid cells per 60 Hz step, including the movement at a long piece's tip.
const REST_SPEED=.025,REST_FRAMES=45,SUPPORT_MARGIN=.1;
const quiet=body=>{
 const piece=body.plugin.piece;
 return !piece?.hinge&&Math.hypot(body.velocity.x,body.velocity.y)+Math.abs(body.angularVelocity)*(piece?.motionRadius||1)<REST_SPEED;
};

export class SettlingWorld extends ShatterWorld {
 constructor(data,options={}){
  super(data,options);this.restContacts=new Map();this.engine.enableSleeping=true;
  Events.on(this.engine,'beforeUpdate',()=>this.updateResting());
 }

 updateResting(){
  const live=new Set(Composite.allBodies(this.engine.world)),contacts=new Map();
  // Matter skips sleeping contact pairs. Keep their last manifold only while
  // both bodies remain present and the supporting surface has not moved.
  for(const [body,previous] of this.restContacts)if(live.has(body)&&body.isSleeping){
   contacts.set(body,previous.filter(c=>live.has(c.base)&&
    Math.hypot(c.base.position.x-c.x,c.base.position.y-c.y)+Math.abs(c.base.angle-c.angle)*(c.base.plugin.piece?.motionRadius||1)<.01));
  }
  for(const pair of this.engine.pairs.list){
   if(!pair.isActive)continue;
   const a=pair.bodyA.parent,b=pair.bodyB.parent;
   if(!live.has(a)||!live.has(b)||a===b)continue;
   for(const [body,base,sign] of [[a,b,1],[b,a,-1]]){
    if(body.isStatic||body.isSleeping||pair.collision.normal.y*sign>-.7)continue;
    const points=pair.collision.supports.slice(0,pair.collision.supportCount).filter(p=>p&&p.y>body.position.y);
    if(!points.length)continue;
    if(!contacts.has(body))contacts.set(body,[]);
    contacts.get(body).push({base,x:base.position.x,y:base.position.y,angle:base.angle,
     left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x))});
   }
  }
  const supported=new Set([...live].filter(b=>b.isStatic));
  // Resolve from the ground upward; mutually leaning airborne pieces cannot
  // declare each other supported and freeze in midair.
  for(let n=0;n<this.bodies.length;n++){
   let changed=false;
   for(const {body} of this.bodies){
    if(supported.has(body)||!quiet(body))continue;
    const bases=(contacts.get(body)||[]).filter(c=>supported.has(c.base));
    if(!bases.length)continue;
    const left=Math.min(...bases.map(c=>c.left)),right=Math.max(...bases.map(c=>c.right));
    if(body.position.x<left+SUPPORT_MARGIN||body.position.x>right-SUPPORT_MARGIN)continue;
    supported.add(body);changed=true;
   }
   if(!changed)break;
  }
  for(const {body} of this.bodies){
   body.sleepThreshold=supported.has(body)?REST_FRAMES:0;
   if(!body.sleepThreshold)Sleeping.set(body,false);
  }
  this.restContacts=contacts;
 }
}
