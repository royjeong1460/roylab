import {SupportWorld} from '../support-lab/world.js';
import {bearingStrength} from './strength.js';
const bondKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;

export class BearingWorld extends SupportWorld {
 // Only static support failure changes. Existing collision/fragment motion stays shared.
 supportSections(ids){
  const rows=Array.from({length:this.floorY},()=>[]);
  for(const id of ids)rows[Math.floor(id/this.width)].push(id);
  const sections=[];
  for(let y=this.floorY-2;y>0;y--){
   if(!rows[y].length)continue;
   const upper=ids.filter(id=>Math.floor(id/this.width)<=y);
   if(upper.length<60)continue;
   for(const part of this.groups(upper.map(id=>({id})))){
    if(part.length<60)continue;
    const above=part.map(p=>p.id),bearings=[];
    for(const id of above)if(Math.floor(id/this.width)===y&&this.cells[id+this.width]){
     const strength=1-(this.bonds.get(bondKey(id,id+this.width))||0);
     if(strength>0)bearings.push({x:id%this.width,strength,id});
    }
    if(!bearings.length)continue;
    const center=above.reduce((s,id)=>s+id%this.width+.5,0)/above.length;
    const strength=bearingStrength(above.length,center,bearings);
    // Reference gravity is the unchanged 1x world value; load follows the test slider.
    strength.utilization*=Math.max(0,this.engine.gravity.y*this.engine.gravity.scale/.00007);
    sections.push({...strength,y,above,bearings});
   }
  }
  return sections.sort((a,b)=>b.utilization-a.utilization);
 }
 bearingReadings(){
  const pixels=[];for(let id=0;id<this.cells.length;id++)if(this.cells[id])pixels.push({id});
  return this.groups(pixels).filter(g=>g.some(p=>Math.floor(p.id/this.width)===this.floorY-1))
   .map(g=>this.supportSections(g.map(p=>p.id))[0]).filter(Boolean).sort((a,b)=>a.center-b.center);
 }
 detach(){
  if(!this.bonds)return;
  this.releaseUnsupported();
  const pixels=[];for(let id=0;id<this.cells.length;id++)if(this.cells[id])pixels.push({id});
  for(const component of this.groups(pixels)){
   const ids=component.map(p=>p.id).filter(id=>this.cells[id]);
   if(!ids.some(id=>Math.floor(id/this.width)===this.floorY-1))continue;
   const section=this.supportSections(ids)[0];if(!section||section.utilization<=1)continue;
   const {above,bearings,y,center,pivot,eccentricity}=section;
   if(eccentricity>.05){
    const piece=this.releaseBody(above);
    if(piece){
     const point={x:pivot,y:y+1};
     const anchor=bearings.reduce((best,p)=>Math.abs(p.x+.5-pivot)<Math.abs(best.x+.5-pivot)?p:best);
     this.attachHinge(piece,point,anchor.id,anchor.id+this.width);
    }
    this.stage='얇은 받침이 무게중심 쪽으로 기울어요';
    this.note({kind:'bearing-tilt',x:pivot,y:y+1,count:above.length,width:section.width,utilization:section.utilization});
   }else{
    // Open a real short fall gap; converting to dynamic alone would leave the load perched.
    const footprint=new Set(bearings.map(p=>p.x)),depth=Math.min(6,Math.max(3,Math.ceil(section.utilization*2)));
    for(const id of ids){
     const yy=Math.floor(id/this.width);
     if(yy<=y||yy>y+depth||!footprint.has(id%this.width)||!this.cells[id])continue;
     this.emitPixel({id,x:id%this.width+.5,y:yy+.5,color:this.cells[id]});
     this.cells[id]=0;this.targetReleased+=this.target[id];
    }
    this.releaseBody(above);
    this.stage='기둥이 위쪽 무게를 못 버티고 주저앉아요';
    this.note({kind:'bearing-crush',x:center,y:y+1,count:above.length,width:section.width,utilization:section.utilization});
   }
  }
  this.releaseUnsupported();this.updateHinges();this.syncStatic();this.rasterize();this.flushDebris();this.enforceBodyBudget();
 }
}
