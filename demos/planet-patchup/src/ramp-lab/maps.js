import {YardKit} from '../paid-lab/culture/kit.js';
import {packMapCells,validateSite} from '../map-maker-generator.js';
function make(key,title,columns,{centered=false,heavy=false}={}){
 const width=80+(columns.length-1)*160,height=128,floorY=112,k=new YardKit(width,floorY);
 for(let i=0;i<columns.length;i++){
  const dx=i*160,roofX=dx+(centered?7:14),roofW=centered?39:40,top=heavy?18:30;
  k.rect(roofX,top,roofW,48-top,2);k.rect(roofX,44,roofW,4,1);
  for(let x=roofX+4;x<roofX+roofW-4;x+=8)k.rect(x,top+4,3,6,3);
  k.rect(dx+27-columns[i],48,columns[i],47,1);
  k.rect(dx+18,95,18,17,5);
 }
 const hint=columns.length===3?'왼쪽 1칸 · 가운데 3칸 · 오른쪽 5칸. 위 건물은 같아요. 회전은 1배에서 5초 동안 5배까지 올라가요.':'하중 비교 시작을 눌러 관찰해요. 맵 선택에서 같은 건물의 다른 기둥 두께와 비교할 수 있어요.';
 const site=validateSite({id:key+'-v1',name:title,description:'남은 기둥 두께 · 위쪽 픽셀 무게 · 무게중심 비교',hint,preview:[{x:26,y:77}],generator:{version:1,seed:key,family:'cascade',size:'large',index:0},data:{width,height,floorY,shapes:packMapCells(k.cells,width,floorY)}},{maxDimension:1024});
 return {key,title,site,pixels:k.cells.filter(Boolean).length};
}
export const RAMP_MAPS=[
 make('ramp-triple','같은 건물 · 1칸 / 3칸 / 5칸',[1,3,5]),
 make('ramp-1','기둥 1칸 · 치우친 하중',[1]),
 make('ramp-3','기둥 3칸 · 같은 치우친 하중',[3]),
 make('ramp-5','기둥 5칸 · 같은 치우친 하중',[5]),
 make('ramp-centered','중앙 하중 · 1칸 / 3칸 / 5칸',[1,3,5],{centered:true}),
 make('ramp-heavy','무거운 중앙 하중 · 1칸 / 3칸 / 5칸',[1,3,5],{centered:true,heavy:true}),
];
