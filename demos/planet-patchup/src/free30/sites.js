import {BLAST_SITES,BLAST_BOSS,chooseBlastSite} from '../blast-step1/sites.js';
import {packMapCells,validateSite} from '../map-maker-generator.js';
export const FREE_SITES=BLAST_SITES;
export const chooseFreeSite=chooseBlastSite;

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
