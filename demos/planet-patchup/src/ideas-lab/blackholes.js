const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const EXTRA_WELLS=['pulse','twin','travel','hold'];
export function prepareWell(world,well){
 well.originX=well.x;well.originY=well.y;well.held=new Map();
 const distance=Math.min(well.radius*.8,12+6*world.ideas.level);
 well.endX=clamp(well.x+(well.x>world.width/2?-distance:distance),1,world.width-1);
}
export function wellFrame(world,well){
 const t=clamp(1-well.remaining/well.duration,0,1),gain=world.ideaGain,x=well.originX??well.x,y=well.originY??well.y;
 if(well.ideaMode==='pulse'){
  const final=t>=.8,beat=Math.floor(t/.8*(world.ideas.level+1)),on=final||(t/.8*(world.ideas.level+1))%1<.55;
  return {power:on?(final?1.6:.75)*gain:0,phase:final?'마지막 압축':on?`${beat+1}번째 당김`:'힘을 풀고 낙하',cores:[{x,y}]};
 }
 if(well.ideaMode==='twin'){
  const spread=t<.25?t/.25:t<.65?1:Math.max(0,(1-t)/.35),gap=(11+3*world.ideas.level)*spread;
  return {power:.75*gain,phase:t<.65?'양쪽으로 벌리기':'두 중심 합치기',cores:[{x:clamp(x-gap,1,world.width-1),y},{x:clamp(x+gap,1,world.width-1),y}]};
 }
 if(well.ideaMode==='travel'){
  const distance=Math.min(well.radius*.8,12+6*world.ideas.level),end=well.endX??clamp(x+(x>world.width/2?-distance:distance),1,world.width-1);
  return {power:.7*gain,phase:'잔해를 끌고 이동',cores:[{x:x+(end-x)*t,y}]};
 }
 return {power:1,phase:'공중에서 붙잡기',cores:[{x:well.x,y:well.y}]};
}
// One target per piece avoids two opposite core forces cancelling each other.
export function pullTwin(world,well,frame,dt){
 const mid=(frame.cores[0].x+frame.cores[1].x)/2,radius=well.radius*.65;
 for(const piece of world.bodies){
  const material=world.material(piece),available=frame.cores.filter(c=>material.some(v=>Math.hypot(v.q.x-c.x,v.q.y-c.y)<=radius));
  if(!available.length)continue;
  const b=piece.body,target=available.length===2?frame.cores[b.position.x<mid?0:1]:available[0];
  const dx=target.x-b.position.x,dy=target.y-b.position.y,d=Math.hypot(dx,dy);if(d<.25)continue;
  const speed=world.tune('gravityBodyPull',.18)*well.power*frame.power/(.5+b.mass)*dt*60;
  world.impulse(piece,b.position,{x:dx/d*speed*b.mass,y:dy/d*speed*b.mass});
 }
 const cap=world.tune('grainSpeedCap',240);
 for(const p of world.flying){
  const available=frame.cores.filter(c=>Math.hypot(p.x-c.x,p.y-c.y)<=radius);if(!available.length)continue;
  const target=available.length===2?frame.cores[p.x<mid?0:1]:available[0],dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);if(d<.25)continue;
  const speed=world.tune('gravityGrainPull',55)*well.power*frame.power*dt;
  p.vx=clamp(p.vx+dx/d*speed,-cap,cap);p.vy=clamp(p.vy+dy/d*speed,-cap,cap);
 }
}
export function holdPieces(world,well,dt){
 const capacity=Math.floor(220*world.ideaGain*clamp(well.power/.15,0,3));
 for(const piece of well.held.keys())if(!world.bodies.includes(piece))well.held.delete(piece);
 let used=[...well.held.keys()].reduce((n,p)=>n+p.pixels.length,0);
 for(const p of world.nearPieces(well.x,well.y,well.radius).sort((a,b)=>b.pixels.length-a.pixels.length)){
  if(well.held.size>=3)break;
  if(well.held.has(p)||used+p.pixels.length>capacity)continue;
  well.held.set(p,{...p.body.position});used+=p.pixels.length;
 }
 for(const [p,target] of well.held){
  const b=p.body,g=world.engine.gravity,limit=.1*well.power/.15*world.ideaGain/(.5+b.mass);
  // Counter gravity with a capped spring; bodies remain dynamic and can collide/fracture.
  const vx=(target.x-b.position.x)*.035-b.velocity.x*.24-g.x*g.scale*(1000/60)**2;
  const vy=(target.y-b.position.y)*.035-b.velocity.y*.24-g.y*g.scale*(1000/60)**2;
  world.impulse(p,b.position,{x:clamp(vx,-limit,limit)*dt*60*b.mass,y:clamp(vy,-limit,limit)*dt*60*b.mass});
 }
 return well.held.size;
}
