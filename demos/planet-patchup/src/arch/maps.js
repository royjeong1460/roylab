import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells,validateSite} from '../map-maker-generator.js';
export const ARCH_MAP_VERSION='arch-quarter-v2';

// The facade itself is destructible cream masonry. Small stepped arch openings
// leave substantial spandrels and piers, unlike an empty rectangular goalpost.
function window(k,x,y,w=8,h=10){
 k.rect(x+2,y,w-4,2,0);k.rect(x+1,y+2,w-2,2,0);k.rect(x,y+4,w,h-4,0);
 k.rect(x-1,y+h,w+2,1,2);
}
function facade(k,x,y,w,h,bottom,{crown=0,windows=true,legs=true}={},targets=[]){
 k.paintAs(2,()=>{
  k.rect(x,y,w,h,3);
  if(windows)for(let xx=x+6;xx+9<x+w-3;xx+=15)window(k,xx,y+5,8,Math.min(10,h-8));
  k.rect(x,y+h-3,w,2,4);
 });
 k.paintAs(3,()=>{
  k.rect(x-2,y-4,w+4,3,4);k.rect(x,y-1,w,1,2);
  if(crown===1){k.rect(x+4,y-8,w-8,4,3);for(let xx=x+4;xx<x+w-4;xx+=9)k.rect(xx,y-11,4,3,2);}
  if(crown===2){k.rect(x+3,y-7,w-6,3,2);k.rect(x+8,y-11,w-16,4,4);k.rect(x+13,y-15,w-26,4,3);}
 });
 if(legs)k.paintAs(1,()=>{for(const xx of [x+3,x+w-6]){
  k.rect(xx,y+h,3,bottom-y-h,3);k.rect(xx-1,bottom-3,5,3,5);
  if(bottom===k.floorY)targets.push({x:xx+1,y:Math.floor((y+h+bottom-3)/2)});
 }});
}
const count=k=>k.cells.reduce((n,c)=>n+Boolean(c),0);
function architecture(index,k,targets){
 const f=k.floorY;
 const house=(x,y,w,h,bottom,opts={})=>facade(k,x,y,w,h,bottom,opts,targets);
 if(index===0){house(25,48,30,20,f);return;}
 if(index===1){house(12,72,30,20,f);house(82,61,32,21,f,{crown:2});}
 if(index===2){house(13,48,49,30,f,{crown:1});house(104,85,33,21,f);k.crate(76,f-12,16,12);k.crate(79,f-22,10,10);}
 if(index===3){
  // The real bridge deck links both banks; the three lower arches stay open.
  house(14,56,35,25,f);house(113,56,35,25,f);
  house(49,74,64,14,f);k.paintAs(3,()=>k.rect(47,70,68,4,2));
 }
 if(index===4){
  house(12,48,43,28,f,{crown:2});house(61,73,47,27,f);house(114,98,41,24,f);
  // Short terrace ledges touch the neighbouring body and transmit a fall.
  k.paintAs(2,()=>{k.rect(55,73,6,3,5);k.rect(108,98,6,3,5);});
 }
 if(index===5){
  house(22,82,70,25,f);house(29,39,52,23,78,{crown:1});
  house(121,66,39,30,f,{crown:2});
 }
 if(index===6){
  house(14,96,142,20,f);house(26,51,51,26,92,{crown:1});house(94,35,49,29,92,{crown:2});
 }
 if(index===7){
  // Two separate multi-tier belfries; the right tower has an offset upper
  // storey and a stepped crown. Their lower arcade is a genuine shared deck.
  house(18,109,48,27,f);house(23,64,38,28,105);house(20,22,44,26,60,{crown:1});
  house(155,109,48,27,f);house(157,68,40,25,105);house(162,30,39,22,64,{crown:2});
  house(66,121,89,13,f);
 }
}
function build(index,name,target,width,floorY){
 let k=new YardKit(width,floorY),preview=[];architecture(index,k,preview);
 // Pack each authored elevation onto its campaign grid before computing the
 // budget. Occupancy and roles sample the same source cell, preserving joins.
 if(index){
  const sx=.8,sy=[0,1.1,.82,.82,.77,.77,.70,.70][index];
  const old=k,nw=Math.round(width*sx),nf=Math.round(floorY*sy);
  k=new YardKit(nw,nf);
  for(let y=0;y<nf;y++)for(let x=0;x<nw;x++){
   const source=Math.min(floorY-1,Math.floor(y/sy))*width+Math.min(width-1,Math.floor(x/sx));
   k.cells[y*nw+x]=old.cells[source];k.roles[y*nw+x]=old.roles[source];
  }
  preview=preview.map(p=>({x:Math.floor(p.x*sx),y:Math.floor(p.y*sy)}));
  width=nw;floorY=nf;
 }
 if(target){
  let remaining=target-count(k);
  if(remaining<0)throw Error(`${name}: architecture exceeds target by ${-remaining}`);
  // Separate ground-level salvage stacks occupy free courtyards only. Never
  // connect posts with a ground blanket, and never cover a marked weak point.
  const columns=[];for(let x=0;x<width;x++)if(k.roles[(floorY-5)*width+x]===1)columns.push(x);
  const zones=[];
  for(let x=8;x<width-8;x++)if(!columns.some(c=>Math.abs(c-x)<6))zones.push(x);
  const capacity=zones.length*24;
  if(remaining>capacity)throw Error(`${name}: ${remaining} exceeds discrete salvage capacity ${capacity}`);
  for(let row=0;row<24&&remaining;row++)for(const x of zones){
   if(!remaining)break;const y=floorY-1-row;
   if(k.cells[y*width+x])continue;
   if(row&&!k.cells[(y+1)*width+x])continue;
   k.paintAs(2,()=>k.rect(x,y,1,1,row%7===0?4:5));remaining--;
  }
  if(remaining)throw Error(`${name}: salvage budget cannot fit the grounded zones`);
 }
 return validateSite({id:`arch-${index}-${ARCH_MAP_VERSION}`,name,
  description:index===7?'Unequal multi-tier bell towers joined by a low stone arcade.':'Cream stone facades with arched windows, terracotta roofs and separate salvage piles.',
  hint:'Sever the exposed narrow columns to topple the heavy stone facades and roofs.',preview,
  generator:{version:1,seed:`arch-${index}`,family:'bridge',size:width>192?'large':'medium',index},
  data:{width,height:floorY+12,floorY,shapes:packMapCells(k.cells,width,floorY)},
  structure:{version:1,roles:packMapCells(k.roles,width,floorY)}});
}
export const ARCH_SITES=[
 build(1,'Arch Lane',2000,144,132),build(2,'Salvage Court',2400,152,144),
 build(3,'Broken Arcade',2800,164,144),build(4,'Kiln Terrace',3200,172,156),
 build(5,'Stacked Forum',3600,180,160),build(6,'Grand Arcade',4000,176,172),
];
export const ARCH_BOSS=build(7,'Crooked Bell Twins',6000,224,192);
export const ARCH_TUTORIAL=build(0,'First Arch',0,80,104);
