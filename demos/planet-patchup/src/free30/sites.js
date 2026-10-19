import {BLAST_SITES,BLAST_BOSS,chooseBlastSite} from '../blast-step1/sites.js';
import {packMapCells,validateSite} from '../map-maker-generator.js';
export const FREE_SITES=BLAST_SITES;
export const chooseFreeSite=chooseBlastSite;

export const FREE_TUTORIAL=validateSite({
 ...BLAST_SITES[0],id:'free30-first-cleanup-v1',name:'첫 청소 · 작은 간판',
 description:'기둥을 끊고, 떨어진 쓰레기를 모아 첫 장비를 강화해 보세요.',
 hint:'표시된 기둥을 폭파해 보세요. 민트색 잔해는 흡입 원 가까이에서 자동으로 수집돼요.',
 preview:[{x:42,y:85}],
 data:{width:84,height:106,floorY:94,shapes:[
  {rect:[30,58,24,2],color:2,target:true},
  {rect:[32,60,20,8],color:3,target:true},
  {rect:[40,68,4,26],color:1,target:true},
 ]},
});

// The first-zone tower uses a smaller physical grid; its screen pixels remain 6 CSS px.
// Resample occupancy before packing so beams join without rectangle-rounding gaps.
function firstTower(){
 const scale=.65,old=BLAST_BOSS.data,cells=new Uint8Array(old.width*old.floorY);
 for(const {rect:[x,y,w,h],color} of old.shapes)for(let yy=y;yy<y+h;yy++)cells.fill(color,yy*old.width+x,yy*old.width+x+w);
 const width=Math.round(old.width*scale),floorY=Math.round(old.floorY*scale),out=new Uint8Array(width*floorY);
 for(let y=0;y<floorY;y++)for(let x=0;x<width;x++)out[y*width+x]=cells[Math.floor(y/scale)*old.width+Math.floor(x/scale)];
 return validateSite({...BLAST_BOSS,id:'free30-twin-peaks-v1',hint:'폭파로 아래 받침을 끊고, 떨어진 조각에 폭파와 블랙홀을 함께 써 보세요.',preview:BLAST_BOSS.preview.map(q=>({x:q.x*scale,y:q.y*scale})),data:{width,height:floorY+12,floorY,shapes:packMapCells(out,width,floorY)}});
}
export const FREE_BOSS=firstTower();
