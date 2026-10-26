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
    const pressure=a.pressure,width=Math.max(1,a.right-a.left),barY=Math.max(3,a.top-12)+pressure*5;
    g.fillStyle(0x547b9c,.025+.08*pressure);g.fillRect(a.left,barY,width,world.floorY-barY);
    // A visible overhead emitter drives a pressure field, not a solid collision ceiling.
    g.fillStyle(0x40586c,.9);g.fillRect(a.left-3,barY-3,width+6,4);
    g.lineStyle(1.4,0x87c2cd,.5+.5*pressure);g.lineBetween(a.left,barY+2,a.right,barY+2);
    for(let x=a.left;x<=a.right;x+=Math.max(12,width/10)){
     g.fillStyle(0xd8b86a,.5+.5*pressure);g.fillRect(x-1,barY-2,2,1);
     g.lineStyle(.65+pressure*.6,0x47799a,.25+.6*pressure);
     for(let y=barY+8;y<world.floorY-8;y+=23){
      const py=y+(this.reduced?0:(t*(12+pressure*25))%15),length=4+pressure*5;
      g.lineBetween(x,py,x,py+length);g.lineBetween(x,py+length,x-2.5,py+length-3);g.lineBetween(x,py+length,x+2.5,py+length-3);
     }
    }
    g.lineStyle(1+pressure,0x47799a,.15+.5*pressure);g.lineBetween(a.left,world.floorY-1,a.right,world.floorY-1);
   }else{
    const center=(a.left+a.right)/2,half=(a.right-a.left)/2,progress=Math.min(1,Math.max(0,(t-.4)/1.65)),alpha=t<2.05?1:Math.max(0,1-(t-2.05)/.75);
    for(const side of [-1,1]){
     const x=center+side*half*(1-progress);g.fillStyle(0x6d9e9c,.12*alpha);g.fillRect(x-5,0,10,world.floorY);
     for(const offset of [-3,0,3]){g.lineStyle(.6,0x397879,.7*alpha);g.lineBetween(x+offset,0,x+offset,world.floorY);}
     for(let y=18;y<world.floorY;y+=24){g.lineBetween(x,y,x+side*3,y-3);g.lineBetween(x,y,x+side*3,y+3);}
    }
   }
  }
  for(const f of world.deviceVisuals){
   const t=1-f.remaining/f.life,r=f.radius*(.3+.7*t);g.lineStyle(.8,f.kind==='impact'?0xc47b40:0x4d8c87,1-t);
   if(f.kind==='seismic'){g.beginPath();g.arc(f.x,f.y,r,Math.PI,Math.PI*2);g.strokePath();}
   else if(f.kind==='impact'){g.strokeCircle(f.x,f.y,r);g.lineBetween(f.x-r,f.y,f.x+r,f.y);}
   else if(f.kind==='clap'){g.lineStyle(1,0x397879,1-t);g.strokeEllipse(f.x,f.y,Math.max(2,r*.4),r*2);}
   else if(f.kind==='compression'){
    g.lineStyle(.8,0xc47b40,1-t);g.lineBetween(f.x-r,f.y,f.x+r,f.y);
    g.lineBetween(f.x-r*.6,f.y-2,f.x-r,f.y-4);g.lineBetween(f.x+r*.6,f.y-2,f.x+r,f.y-4);
   }
  }
 }
}
