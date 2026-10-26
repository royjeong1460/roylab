import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells,validateSite} from '../map-maker-generator.js';
export const ARCH_MAP_VERSION='arch-quarter-v1';

// A stepped voussoir opening is cut from actual stone cells. The exposed lower
// shafts alone own the column role; neither the infill nor the cornice bypass it.
function arcade(k,x,top,width,bottom,crown=0){
 const spring=top+22;
 k.paintAs(2,()=>{
  k.rect(x,top,width,22,3);
  for(let row=0;row<15;row++){
   const inset=row<3?10-row*2:4;
   k.rect(x+inset,top+7+row,width-inset*2,1,0);
  }
  k.rect(x,top+19,4,3,4);k.rect(x+width-4,top+19,4,3,4);
  k.rect(x+Math.floor(width/2)-2,top+3,4,5,5);
 });
 k.paintAs(1,()=>{for(const xx of [x+1,x+width-4]){
  k.rect(xx,spring,3,bottom-spring,3);
  k.rect(xx-1,bottom-3,5,3,5);
 }});
 k.paintAs(3,()=>{
  k.rect(x-2,top-5,width+4,3,4);k.rect(x,top-2,width,2,2);
  if(crown){k.rect(x+4,top-9,width-8,4,3);k.rect(x+7+crown,top-12,6,3,2);}
 });
}
function count(k){return k.cells.reduce((a,c)=>a+Boolean(c),0);}
function build(index,name,target,bays,{boss=false,tutorial=false}={}){
 const width=tutorial?80:boss?224:112+bays*20,floorY=tutorial?96:boss?180:128+bays*8;
 const k=new YardKit(width,floorY),preview=[];
 const span=tutorial?32:boss?54:34,spacing=tutorial?0:Math.floor((width-24-bays*span)/Math.max(1,bays-1));
 for(let n=0;n<bays;n++){
  const x=tutorial?24:12+n*(span+spacing);
  const top=tutorial?45:boss?(n===0?31:45):floorY-46-(n%2)*8;
  arcade(k,x,top,span,floorY,boss?n+1:index>2?1:0);
  preview.push({x:x+2,y:floorY-13});
 }
 if(boss){
  // A low third arcade joins the two towers without filling their bell openings.
  arcade(k,86,112,52,floorY,0);
  k.paintAs(3,()=>k.rect(64,107,96,3,4));
  k.paintAs(2,()=>{k.rect(12,49,3,4,2);k.rect(209,63,3,4,4);});
 }
 if(!tutorial){
  // Grounded, stepped salvage stock: whole masonry courses plus one shorter
  // upper course. This is real destructible courtyard material, not floating
  // filler. Keep it below the open arch targets and out of the column joints.
  let remaining=target-count(k);if(remaining<0)throw Error(name+' architecture exceeds budget');
  const stockX=boss?20:8,stockWidth=width-stockX*2;
  for(let y=floorY-1;remaining>0;y--){
   if(y<floorY-42)throw Error(name+' salvage exceeds courtyard');
   for(let x=stockX;x<stockX+stockWidth&&remaining>0;x++){
    if(k.cells[y*width+x])continue;
    // Each stock pixel rests on a course or the floor; columns may interrupt it.
    if(y<floorY-1&&!k.cells[(y+1)*width+x])continue;
    k.paintAs(2,()=>k.rect(x,y,1,1,(Math.floor((floorY-y)/4)%2)?4:5));remaining--;
   }
  }
 }
 const site={id:`arch-${index}-${ARCH_MAP_VERSION}`,name,
  description:boss?'Two uneven bell towers and a low connecting arcade above a dry stone salvage court.':'Cream stone arches, blue cornices and terracotta salvage in a dry masonry courtyard.',
  hint:'Break the narrow columns beneath the arch. Collect the loose stone after the roof falls.',preview,
  generator:{version:1,seed:`arch-${index}`,family:'bridge',size:width>192?'large':'medium',index},
  data:{width,height:floorY+12,floorY,shapes:packMapCells(k.cells,width,floorY)},
  structure:{version:1,roles:packMapCells(k.roles,width,floorY)}};
 return validateSite(site);
}
export const ARCH_SITES=[
 build(1,'Arch Lane',2000,2),build(2,'Salvage Court',2400,2),
 build(3,'Broken Arcade',2800,3),build(4,'Kiln Terrace',3200,3),
 build(5,'Stacked Forum',3600,4),build(6,'Grand Arcade',4000,4),
];
export const ARCH_BOSS=build(7,'Crooked Bell Twins',6000,2,{boss:true});
export const ARCH_TUTORIAL=build(0,'First Arch',0,1,{tutorial:true});
