export class IdeaOverlay {
 constructor(scene,view){this.graphics=scene.add.graphics();view.layer.add(this.graphics);}
 draw(_dt,world){
  const g=this.graphics;g.clear();
  for(const field of world.ideaFields||[]){g.fillStyle(0x5ba5a2,.2);g.fillCircle(field.x,field.y,field.radius);g.lineStyle(.7,0x367c83,.9);g.strokeCircle(field.x,field.y,field.radius);
   const r=field.radius;g.lineBetween(field.x-r*.6,field.y,field.x+r*.6,field.y);g.lineBetween(field.x,field.y-r*.6,field.x,field.y+r*.6);}
  for(const mark of world.ideaMarks||[]){
   g.lineStyle(.65,mark.kind==='wave'?0x268a7f:0xe47a31,.95);
   for(const p of world.bodies){if(!p.pixels.some(v=>mark.ids.has(v.id)))continue;
    const q=p.body.position,r=Math.min(8,3+Math.sqrt(p.pixels.length)*.12);g.strokeCircle(q.x,q.y,r);g.lineBetween(q.x-r,q.y,q.x+r,q.y);}
  }
  for(const f of world.ideaVisuals||[]){
   const t=1-f.remaining/f.life;g.lineStyle(.6,f.kind==='echo'?0xe7783e:f.kind==='spin'?0x9a67b5:0x428b8b,.8*(1-t));
   if(f.kind==='up'||f.kind==='down'){
    const sign=f.kind==='up'?-1:1;
    for(const dx of [-5,0,5]){const x=f.x+dx,y=f.y+sign*t*8;g.lineBetween(x,y-sign*5,x,y+sign*5);g.lineBetween(x,y+sign*5,x-2,y+sign*2);g.lineBetween(x,y+sign*5,x+2,y+sign*2);}
   }else if(f.kind==='spin'){
    g.beginPath();g.arc(f.x,f.y,Math.min(10,f.radius),t*3,t*3+Math.PI*1.5);g.strokePath();
   }else if(f.kind==='wave'){
    g.beginPath();g.arc(f.x,f.y,f.radius*(.2+t*.8),Math.PI,Math.PI*2);g.strokePath();
   }else g.strokeCircle(f.x,f.y,f.kind==='echo'?f.radius:f.radius*(.2+t*.8));
  }
 }
}
