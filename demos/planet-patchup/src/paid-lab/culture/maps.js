import {YardKit} from './kit.js';
import {TILE_YARD} from './tile-yard.js';
import {packMapCells,validateSite,pixelCount} from '../../map-maker-generator.js';

// These supports are deliberately exposed: window infill never continues down to the floor.
function leg(k,x,top,bottom,width=2){k.rect(x,top,width,bottom-top,1);k.rect(x-1,bottom-3,width+2,3,5);}
function stall(k,x,y,width,bottom,offset=8){k.jointedRoof(x,y,width);leg(k,x+offset,y+18,bottom);}
function rack(k,x,y,width,bottom,levels=2){
 leg(k,x+3,y,bottom);leg(k,x+width-5,y,bottom);
 for(let i=0;i<levels;i++){
  const yy=y+i*21;k.rect(x,yy,width,2,1);
  for(let xx=x+3;xx+8<x+width;xx+=11)k.crate(xx,yy-9,8,9);
 }
}
function workshop(k,x,y,width,bottom){
 k.jointedRoof(x,y,width);leg(k,x+7,y+18,bottom);leg(k,x+width-9,y+18,bottom);
 k.rect(x+5,y+45,width-10,3,1);k.wall(x+10,y+18,width-20,27);
}
function map(key,title,hint,width,floorY,paint,preview,family='cascade'){
 const k=new YardKit(width,floorY);paint(k);
 const shapes=packMapCells(k.cells,width,floorY);
 if(shapes.length>240)throw Error(`${key}: ${shapes.length} packed rectangles exceeds editor limit`);
 const site=validateSite({id:`culture-${key}-v1`,name:`기와 바람땅 · ${title}`,description:'물과 풀 없이 시멘트·돌 바닥에 남은 폐공방과 고물을 회수하는 문화권 맵.',hint,preview,
  generator:{version:1,seed:key,family,size:width<=128?'small':width<=192?'medium':'large',index:0},
  data:{width,height:floorY+16,floorY,shapes},
 });
 return {key,title,site,pixels:pixelCount(site.data)};
}
export const CULTURE_MAPS=[
 map('yard-01','1 · 처마 골목','지붕 아래 가는 받침을 노려 보세요. 처음부터 작은 지붕이 통째로 떨어져요.',96,104,k=>{
  stall(k,9,30,32,104,8);stall(k,53,48,32,104,23);
  k.crate(39,96,8,8);k.rubble(55,104,20);
 },[{x:18,y:92},{x:77,y:92}]),
 map('yard-02','2 · 고철 장터','좌우로 치우친 가판대와 쌓인 상자. 받침을 끊고 짐이 쏟아지는 방향을 보세요.',128,120,k=>{
  stall(k,7,35,34,120,9);stall(k,47,56,34,120,23);stall(k,88,43,34,120,8);
  k.rect(12,79,26,2,1);k.crate(25,70,9,9);k.crate(25,62,9,8);
  k.rect(89,88,29,2,1);k.crate(104,79,10,9);
  k.rubble(41,120,23);k.crate(79,112,8,8);
 },[{x:17,y:106},{x:71,y:108},{x:97,y:108}]),
 map('yard-03','3 · 마른 수로 다리','마른 수로 위의 낡은 다리예요. 가운데 받침을 끊으면 다리 위 짐이 아래로 쏟아져요.',144,136,k=>{
  stall(k,5,47,34,136,8);stall(k,105,55,34,136,24);
  for(const x of [39,66,93]){k.rect(x,77,25,4,5);leg(k,x+4,81,136);k.crate(x+12,68,9,9);}
  k.rect(39,73,79,2,1);for(const x of [39,64,91,115])k.rect(x,66,2,11,1);
  k.rubble(52,136,22);k.rubble(91,136,26);
 },[{x:71,y:121},{x:14,y:123},{x:130,y:123}], 'bridge'),
 map('yard-04','4 · 기와 적재소','높은 선반에 폐기와와 상자가 쌓여 있어요. 바깥 받침을 무너뜨려 옆 적재대에 부딪쳐 보세요.',160,152,k=>{
  stall(k,8,24,44,152,10);rack(k,10,79,40,152,3);
  rack(k,62,58,40,152,4);rack(k,111,89,39,152,3);
  k.rubble(55,152,22);k.rubble(119,152,29);
 },[{x:15,y:140},{x:66,y:139},{x:145,y:140}]),
 map('yard-05','5 · 맞붙은 공방','좁은 틈을 사이에 둔 세 공방. 바깥 기둥을 먼저 깨서 이웃 건물 쪽으로 기울여 보세요.',192,168,k=>{
  workshop(k,7,40,51,168);workshop(k,65,61,51,168);workshop(k,123,28,59,168);
  rack(k,76,125,30,168,2);k.rubble(16,168,24);k.rubble(145,168,29);
  k.crate(56,160,8,8);k.crate(116,160,8,8);
 },[{x:15,y:153},{x:73,y:155},{x:174,y:154}]),
 map('yard-06','6 · 바람 문루','두 문루 사이에 낡은 회랑이 있어요. 낮은 회랑과 높은 지붕의 충돌을 유도하세요.',192,192,k=>{
  workshop(k,8,30,58,192);workshop(k,125,47,58,192);
  k.jointedRoof(67,98,57);k.rect(70,140,51,3,1);leg(k,73,116,143);leg(k,116,116,143);
  leg(k,92,143,192);k.wall(77,116,16,24);k.wall(98,116,16,24);
  rack(k,15,126,40,192,2);rack(k,138,135,36,192,2);k.rubble(86,192,27);
 },[{x:16,y:178},{x:93,y:179},{x:175,y:179}]),
 map('yard-boss','Boss · 쌍처마 대공방','가운데와 양쪽 공방을 받치는 기둥을 공략하세요. 큰 지붕을 떨어뜨린 뒤 블랙홀로 조각을 모아 보세요.',224,216,k=>{
  workshop(k,9,35,67,216);workshop(k,149,35,67,216);
  k.jointedRoof(80,91,64);leg(k,87,109,216,3);leg(k,135,109,216,3);
  k.rect(85,147,55,4,1);k.wall(92,109,19,38);k.wall(114,109,19,38);
  rack(k,23,117,38,216,2);rack(k,164,117,40,216,2);
  k.masonry(93,196,40,20);k.crate(99,186,12,10);k.crate(115,186,12,10);
  k.rubble(22,216,28);k.rubble(169,216,28);
 },[{x:17,y:200},{x:136,y:180},{x:88,y:180},{x:208,y:201}]),
];
export const ORIGINAL_YARD={key:'tile-yard',title:'원본 · 마른 고물 마당',site:TILE_YARD,pixels:pixelCount(TILE_YARD.data)};
export const findCultureMap=key=>key===ORIGINAL_YARD.key?ORIGINAL_YARD:CULTURE_MAPS.find(map=>map.key===key);
