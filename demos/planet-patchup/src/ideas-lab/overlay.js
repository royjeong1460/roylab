import {wellFrame} from './blackholes.js';
export class IdeaOverlay {
 constructor(scene,view){this.graphics=scene.add.graphics();view.layer.add(this.graphics);}
 draw(_dt,world){
  const g=this.graphics;g.clear();
  for(const w of world.wells){
   const f=wellFrame(world,w);g.lineStyle(.65,0x8b66b1,.8);
   if(w.ideaMode==='twin'){
    const [a,b]=f.cores;g.lineBetween(a.x,a.y,b.x,b.y);
    const inward=(1-w.remaining/w.duration)>=.65;
    for(const [q,side] of [[a,-1],[b,1]]){const dir=inward?-side:side;g.lineBetween(q.x,q.y-5,q.x+dir*4,q.y-5);g.lineBetween(q.x+dir*4,q.y-5,q.x+dir*2,q.y-7);}
   }else if(w.ideaMode==='pulse'){
    const on=f.power>0;g.lineStyle(on?1:.35,on?0xb08acd:0xa398a6,on?.9:.35);g.strokeCircle(w.x,w.y,on?5+3*Math.sin((w.duration-w.remaining)*12):w.radius*.6);
   }else if(w.ideaMode==='travel'){
    g.lineStyle(.5,0x8b66b1,.6);g.lineBetween(w.originX,w.originY,w.endX,w.originY);
    const dir=Math.sign(w.endX-w.originX);g.lineBetween(w.endX,w.originY,w.endX-dir*3,w.originY-2);g.lineBetween(w.endX,w.originY,w.endX-dir*3,w.originY+2);
   }else if(w.ideaMode==='hold'){
    for(const [p,target] of w.held||[]){const q=p.body.position;g.lineBetween(w.x,w.y,q.x,q.y);g.strokeCircle(q.x,q.y,3);g.lineBetween(target.x-3,target.y-4,target.x+3,target.y-4);}
   }
  }
  for(const field of world.ideaFields||[]){g.fillStyle(0x5ba5a2,.2);g.fillCircle(field.x,field.y,field.radius);g.lineStyle(.7,0x367c83,.9);g.strokeCircle(field.x,field.y,field.radius);
   const r=field.radius;g.lineBetween(field.x-r*.6,field.y,field.x+r*.6,field.y);g.lineBetween(field.x,field.y-r*.6,field.x,field.y+r*.6);}
  for(const mark of world.ideaMarks||[]){
   g.lineStyle(.65,mark.kind==='wave'?0x268a7f:0xe47a31,.95);
   for(const p of world.bodies){if(!p.pixels.some(v=>mark.ids.has(v.id)))continue;
    const q=p.body.position,r=Math.min(8,3+Math.sqrt(p.pixels.length)*.12);g.strokeCircle(q.x,q.y,r);g.lineBetween(q.x-r,q.y,q.x+r,q.y);}
  }
  for(const f of world.ideaVisuals||[]){
   const t=1-f.remaining/f.life;g.lineStyle(.6,f.kind==='echo'?0xe7783e:0x428b8b,.8*(1-t));
   if(f.kind==='up'||f.kind==='down'){
    const sign=f.kind==='up'?-1:1;
    for(const dx of [-5,0,5]){const x=f.x+dx,y=f.y+sign*t*8;g.lineBetween(x,y-sign*5,x,y+sign*5);g.lineBetween(x,y+sign*5,x-2,y+sign*2);g.lineBetween(x,y+sign*5,x+2,y+sign*2);}
   }else if(f.kind==='wave'){
    g.beginPath();g.arc(f.x,f.y,f.radius*(.2+t*.8),Math.PI,Math.PI*2);g.strokePath();
   }else g.strokeCircle(f.x,f.y,f.kind==='echo'?f.radius:f.radius*(.2+t*.8));
  }
 }
}
