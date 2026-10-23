import {YardKit} from '../paid-lab/culture/kit.js';
import {CULTURE_MAPS,ORIGINAL_YARD} from '../paid-lab/culture/maps.js';
import {packMapCells,pixelCount,validateSite} from '../map-maker-generator.js';

function make(key,title,hint,width,height,paint,preview){
 const floorY=height-16,k=new YardKit(width,floorY);paint(k,floorY);
 const site=validateSite({id:`ideas-${key}-v1`,name:title,description:'같은 화력으로 화면 방향과 붕괴 구조를 비교하는 실험 맵. 시멘트·돌 바닥과 실제로 부서지는 기와·고물.',hint,preview,
  generator:{version:1,seed:key,family:'cascade',size:'large',index:0},
  data:{width,height,floorY,shapes:packMapCells(k.cells,width,floorY)},
 });
 site.structure={version:1,roles:packMapCells(k.roles,k.width,k.floorY)};
 return {key,title:`${title} · ${width}×${height}`,site,pixels:pixelCount(site.data)};
}
// Narrow exposed supports carry broad roof loads; infill stops above the cut line.
function hut(k,x,y,width,bottom,right=false){
 k.jointedRoof(x,y,width);
 const post=x+(right?width-9:7);k.rect(post,y+18,2,bottom-y-18,1);
 k.rect(post-1,bottom-3,4,3,5);
 k.rect(x+5,y+18,width-10,2,1);
 k.wall(x+9,y+20,width-18,15);
}

export const LAYOUT_MAPS=[
 make('layout-wide','가로형 · 도미노 골목','첫 기둥을 잘라 옆집을 향해 넘어뜨려 보세요. 가까이 보기에서 좌우로 이동하며 연쇄 붕괴를 비교해요.',256,128,(k,f)=>{
  for(let i=0;i<6;i++)hut(k,7+i*41,24+(i%3)*10,36,f,i%2===1);
  for(const x of [43,125,207])k.crate(x,f-9,8,9);
 },[{x:15,y:99},{x:76,y:99},{x:179,y:99}]),
 make('layout-tall','세로형 · 겹처마 적재탑','아래 기둥을 끊으면 위층이 아래층으로 떨어져요. 중간층을 먼저 폭파했을 때와 비교해 보세요.',112,256,(k,f)=>{
  k.rect(33,38,2,f-38,1);k.rect(77,38,2,f-38,1);
  for(const [x,y,w] of [[26,20,60],[20,87,72],[14,154,84]]){
   k.jointedRoof(x,y,w);k.rect(33,y+18,46,2,1);
   k.crate(40,y+20,12,12);k.rect(33,y+32,46,2,1);
  }
  k.paintAs(1,()=>{k.rect(31,f-3,6,3,5);k.rect(75,f-3,6,3,5);});
 },[{x:34,y:221},{x:78,y:221},{x:34,y:133}]),
 make('layout-open','확장형 · 높낮이 고물 마당','높은 공방과 낮은 가판대 중 먼저 부술 곳을 골라 보세요. 확대 후 두 손가락으로 가로·세로를 이동할 수 있어요.',240,240,(k,f)=>{
  hut(k,12,40,44,f);hut(k,65,120,44,f,true);
  hut(k,121,78,44,f);hut(k,176,24,48,f,true);
  for(const [x,y] of [[20,145],[129,167],[184,130]]){
   k.rect(x,y,31,2,1);k.crate(x+4,y-10,10,10);
  }
  k.rubble(74,f,27);k.rubble(139,f,24);
 },[{x:20,y:209},{x:216,y:209},{x:129,y:209}]),
];
export const IDEA_MAPS=[...LAYOUT_MAPS,...CULTURE_MAPS,ORIGINAL_YARD];
export const findIdeaMap=key=>IDEA_MAPS.find(map=>map.key===key);
