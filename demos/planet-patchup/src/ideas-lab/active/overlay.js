import {StructureOverlay} from '../../structure-lab/overlay.js';
export class ActiveOverlay extends StructureOverlay{
 constructor(scene,view,update=()=>{}){super(scene,view);this.update=update;this.reduced=Boolean(view.reducedMotion?.matches);}
 draw(dt,world){
  super.draw(dt,world);this.update();const a=world.activeDevice,g=this.graphics;
  if(a){
   const t=a.age;
   if(a.id==='orbital'){
    for(let i=a.next;i<Math.min(a.next+2,a.targets.length);i++){const x=a.targets[i].x;g.lineStyle(.5,0xd36b31,.65);g.lineBetween(x,0,x,10);g.strokeCircle(x,4,2);}
    for(const p of a.projectiles){
     const y=Math.max(0,p.y),r=p.heavy?3:2;
     if(!this.reduced){g.lineStyle(1.2,0xe09e56,.75);g.lineBetween(p.x,y-12,p.x,y-3);}
     // Bus and paired solar panels distinguish orbital hardware from meteors.
     g.fillStyle(0x4d798c,1);g.fillRect(p.x-r*3,y-r,r*2,r*2);g.fillRect(p.x+r,y-r,r*2,r*2);
     g.fillStyle(0xc0c6bf,1);g.fillRect(p.x-r,y-r*1.6,r*2,r*3.2);g.lineStyle(.5,0x35444b,1);g.strokeRect(p.x-r,y-r*1.6,r*2,r*3.2);
    }
   }else if(a.id==='seismic'){
    for(const target of a.targets){g.fillStyle(0x607e75,.8);g.fillRect(target.x-2,world.floorY-2,4,3);}
   }else if(a.id==='gravity'){
    const on=t>=.5;g.fillStyle(0x547b9c,on?.08:.025);g.fillRect(a.left,0,Math.max(1,a.right-a.left),world.floorY);
    g.lineStyle(.65,0x47799a,on?.85:.35);
    for(let x=a.left;x<=a.right;x+=Math.max(12,(a.right-a.left)/10))for(let y=12;y<world.floorY;y+=30){const py=y+(this.reduced?0:(t*22)%20);g.lineBetween(x,py,x,py+7);g.lineBetween(x,py+7,x-2,py+4);g.lineBetween(x,py+7,x+2,py+4);}
   }else{
    const x=a.left+(a.right-a.left)*Math.min(1,Math.max(0,(t-.4)/1.65));g.fillStyle(0x6d9e9c,.12);g.fillRect(x-5,0,10,world.floorY);
    for(const offset of [-3,0,3]){g.lineStyle(.6,0x397879,.7);g.lineBetween(x+offset,0,x+offset,world.floorY);}
   }
  }
  for(const f of world.deviceVisuals){
   const t=1-f.remaining/f.life,r=f.radius*(.3+.7*t);g.lineStyle(.8,f.kind==='impact'?0xc47b40:0x4d8c87,1-t);
   if(f.kind==='seismic'){g.beginPath();g.arc(f.x,f.y,r,Math.PI,Math.PI*2);g.strokePath();}
   else if(f.kind==='impact'){g.strokeCircle(f.x,f.y,r);g.lineBetween(f.x-r,f.y,f.x+r,f.y);}
  }
 }
}
