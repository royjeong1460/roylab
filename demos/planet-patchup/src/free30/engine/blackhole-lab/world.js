import {OverflowLabWorld} from '../physics-overflow/world.js';
import {LabWorld} from '../physics-lab/world.js';
import {normalizeBH} from './settings.js';

export class BlackHoleLabWorld extends OverflowLabWorld {
 configureLab(patch){
  this.blackholeSettings=normalizeBH(patch,this.blackholeSettings);
  LabWorld.prototype.configureLab.call(this,this.blackholeSettings);
  this.speedSettings={startSpeed:40,growth:10,maxPercent:95};
  return {...this.blackholeSettings};
 }
 activate(x,y){
  const ok=super.activate(x,y);
  if(ok&&this.tool==='blackhole')this.wells.at(-1).coreMix=this.blackholeSettings.coreMix;
  return ok;
 }
 pull(well,dt){
  super.pull(well,dt);
  if(!well.coreMix)return;
  const radius=well.radius*.4,cycle=Math.sin((well.duration-well.remaining)*8);
  for(const piece of this.bodies){
   const b=piece.body,dx=b.position.x-well.x,dy=b.position.y-well.y,d=Math.hypot(dx,dy);
   if(d<.25||d>=well.radius)continue;
   const nx=dx/d,ny=dy/d,edge=Math.min(1,(well.radius-d)/Math.max(1,well.radius-radius));
   const strength=well.power*well.coreMix;
   // Damp the outward component, not all motion: incoming fragments still collide.
   // Extend the return force beyond the core so stirring cannot eject bodies at its edge.
   const outward=Math.max(0,b.velocity.x*nx+b.velocity.y*ny);
   const brake=outward*(1-Math.exp(-50*strength*edge*dt));
   const acceleration=.18*strength/(.5+b.mass);
   const inward=acceleration*5*Math.min(1,d/radius)*edge*dt*60+brake;
   const stir=acceleration*.8*Math.max(0,1-d/radius)*cycle*dt*60;
   this.impulse(piece,b.position,{x:(-nx*inward-ny*stir)*b.mass,y:(-ny*inward+nx*stir)*b.mass});
  }
 }
 diagnostics(){const d=super.diagnostics(),well=this.wells[0];return {...d,blackhole:{remaining:well?.remaining||0,power:well?.power||0,radius:well?.radius||0,mix:well?.coreMix||0}};}
}
