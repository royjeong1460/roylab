export const TOOL_LABELS={cutter:'절단',bomb:'폭파',blackhole:'블랙홀'};
export function drawPatternPreview(canvas,pattern){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const size=6;ctx.fillStyle='#5a7e65';
  for(const [x,y] of pattern.cells)ctx.fillRect(canvas.width/2+x*size-size/2,canvas.height/2+y*size-size/2,size-1,size-1);
}
export class ThreeToolsOverlay{
  constructor(scene,renderer){this.graphics=scene.add.graphics();renderer.layer.add(this.graphics);this.time=0;}
  draw(dt,world,aim){
    this.time+=dt;const g=this.graphics;g.clear();const stats=world.stats();
    for(const well of world.wells){
      g.fillStyle(0x705387,.04);g.fillCircle(well.x,well.y,well.radius);
      g.lineStyle(.35,0x8b6ca2,.4);g.strokeCircle(well.x,well.y,well.radius);
      g.fillStyle(0x48364f,.85);g.fillCircle(well.x,well.y,1.3);
      g.lineStyle(.65,0xa482b8,.7);g.beginPath();g.arc(well.x,well.y,3,-Math.PI/2,-Math.PI/2+Math.PI*2*well.remaining/well.duration);g.strokePath();
      for(let i=0;i<8;i++){
        const angle=i*Math.PI/4,phase=(this.time*.7+i/8)%1,radius=4+(well.radius-5)*(1-phase),tail=radius+2;
        g.lineStyle(.4,0x876396,.25+.35*phase);g.lineBetween(well.x+Math.cos(angle)*tail,well.y+Math.sin(angle)*tail,well.x+Math.cos(angle)*radius,well.y+Math.sin(angle)*radius);
      }
    }
    if(!world.toolEnabled)return;
    if(world.tool==='cutter'){
      const pattern=world.cutPattern();
      g.fillStyle(0x256346,.3);g.lineStyle(.12,0x22513b,.8);
      for(const [dx,dy] of pattern.cells){const x=Math.floor(aim.x)+dx,y=Math.floor(aim.y)+dy;g.fillRect(x,y,1,1);g.strokeRect(x,y,1,1);}
    }else if(world.tool==='bomb'){
      g.fillStyle(0xc77b3e,.09);g.fillCircle(aim.x,aim.y,stats.bombRadius);g.lineStyle(.5,0xb46839,.8);g.strokeCircle(aim.x,aim.y,stats.bombRadius);
      for(let i=0;i<4;i++){const a=i*Math.PI/2,r=stats.bombRadius+1;g.lineBetween(aim.x+Math.cos(a)*r,aim.y+Math.sin(a)*r,aim.x+Math.cos(a)*(r+stats.bombPower*2),aim.y+Math.sin(a)*(r+stats.bombPower*2));}
    }else{
      g.lineStyle(.25,0x82628f,.3);g.strokeCircle(aim.x,aim.y,stats.gravityRadius);
      g.lineStyle(.65,0x765283,.85);g.strokeCircle(aim.x,aim.y,1.5);
    }
  }
}
