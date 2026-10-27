import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells} from '../map-maker-generator.js';
const width=112,floorY=112;
function house(k,x,y,w,h,bottom,{post=2,inset=3,single=false}={}){
 k.paintAs(2,()=>{k.rect(x,y,w,h,3);if(w>=14&&h>=10)k.rect(x+5,y+3,w-10,h-5,0);});
 k.paintAs(3,()=>{k.rect(x-2,y-3,w+4,2,4);k.rect(x,y-1,w,1,2);});
 if(bottom>y+h)k.paintAs(1,()=>{for(const xx of single?[x+Math.floor((w-post)/2)]:[x+inset,x+w-inset-post])k.rect(xx,y+h,post,bottom-y-h,3);});
}
function make(id,name,hint,aim,paint){
 const k=new YardKit(width,floorY);paint(k);
 return {id:`collapse-${id}`,name,hint,aim,data:{width,height:floorY+8,floorY,shapes:packMapCells(k.cells,width,floorY)},structure:{version:1,roles:packMapCells(k.roles,width,floorY)}};
}
export const COLLAPSE_MAPS=[
 make('stack','01 · 엇갈린 적층','오른쪽 아래 기둥 → 층 사이 미끄러짐과 충돌',{x:48,y:105},k=>{
  house(k,17,79,36,12,112);
  house(k,22,53,32,12,75);
  house(k,27,27,32,12,49);
  house(k,73,91,25,11,112);
 }),
 make('bridge','02 · 걸친 다리','오른쪽 교각 → 다리 회전 → 아래 집 충돌',{x:87,y:103},k=>{
  house(k,15,46,16,12,112,{inset:2});
  house(k,79,46,16,12,112,{single:true});
  k.paintAs(2,()=>k.rect(24,37,62,4,3));k.paintAs(3,()=>k.rect(23,35,64,2,4));
  house(k,44,83,19,14,111);
  house(k,67,94,15,9,111);
 }),
 make('domino','03 · 타워 도미노','타워 오른쪽 발 → 낮은 건물 연쇄 충돌',{x:28,y:105},k=>{
  house(k,14,24,20,78,112,{inset:3});
  house(k,47,76,12,12,111,{single:true});
  house(k,65,88,10,9,111,{single:true});
  house(k,82,98,8,7,111,{single:true});
 }),
];
