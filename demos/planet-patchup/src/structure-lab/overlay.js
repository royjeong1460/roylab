import {IdeaOverlay} from '../ideas-lab/overlay.js';
const COLORS={pillar:0xd6a028,body:0xd06c38,roof:0x428da9};
export class StructureOverlay extends IdeaOverlay {
 draw(dt,world){
  super.draw(dt,world);if(!world.showStructure)return;
  const boxes=new Map(),g=this.graphics;
  const add=(id,x,y,part=null)=>{
   const module=world.moduleOf[id];if(module<0)return;
   const key=`${part?.body.id??'static'}:${module}`;
   if(!boxes.has(key))boxes.set(key,{part,module,l:x,r:x,t:y,b:y});
   const box=boxes.get(key);box.l=Math.min(box.l,x);box.r=Math.max(box.r,x);box.t=Math.min(box.t,y);box.b=Math.max(box.b,y);
  };
  for(let id=0;id<world.cells.length;id++)if(world.cells[id])add(id,id%world.width+.5,Math.floor(id/world.width)+.5);
  for(const part of world.bodies)for(const pixel of part.pixels)add(pixel.id,pixel.x,pixel.y,part);
  for(const box of boxes.values()){
   const color=COLORS[world.modules[box.module].type];g.lineStyle(.45,color,.85);g.fillStyle(color,.09);
   const points=[[box.l-.5,box.t-.5],[box.r+.5,box.t-.5],[box.r+.5,box.b+.5],[box.l-.5,box.b+.5]].map(([x,y])=>box.part?world.pixelPosition(box.part,{x,y}):{x,y});
   g.fillPoints(points,true);g.strokePoints(points,true);
  }
 }
}
