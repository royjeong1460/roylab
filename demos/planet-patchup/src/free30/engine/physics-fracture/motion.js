import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';

// Release only energy reserved from this impact; remove net translation and torque.
export function releaseCompression(pieces,point,budget){
 if(pieces.length<2||budget<=0)return 0;
 const bodies=pieces.map(p=>p.body),mass=bodies.reduce((s,b)=>s+b.mass,0);
 const center=bodies.reduce((s,b)=>({x:s.x+b.position.x*b.mass/mass,y:s.y+b.position.y*b.mass/mass}),{x:0,y:0});
 const rows=bodies.map(b=>{const dx=b.position.x-point.x,dy=b.position.y-point.y,d=Math.hypot(dx,dy)||1;return {b,x:b.position.x-center.x,y:b.position.y-center.y,ax:dx/d,ay:dy/d};});
 const mean=rows.reduce((s,r)=>({x:s.x+r.ax*r.b.mass/mass,y:s.y+r.ay*r.b.mass/mass}),{x:0,y:0});
 for(const r of rows){r.ax-=mean.x;r.ay-=mean.y;}
 const torque=rows.reduce((s,r)=>s+r.b.mass*(r.x*r.ay-r.y*r.ax),0),inertia=rows.reduce((s,r)=>s+r.b.mass*(r.x*r.x+r.y*r.y),0),rotation=inertia?torque/inertia:0;
 for(const r of rows){r.ax+=rotation*r.y;r.ay-=rotation*r.x;}
 const a=rows.reduce((s,r)=>s+.5*r.b.mass*(r.ax*r.ax+r.ay*r.ay),0),b=rows.reduce((s,r)=>s+r.b.mass*(r.b.velocity.x*r.ax+r.b.velocity.y*r.ay),0);
 if(a<1e-12)return 0;
 const work=budget*.002,scale=(-b+Math.sqrt(b*b+4*a*work))/(2*a);
 for(const r of rows)Body.setVelocity(r.b,{x:r.b.velocity.x+r.ax*scale,y:r.b.velocity.y+r.ay*scale});
 return budget;
}
