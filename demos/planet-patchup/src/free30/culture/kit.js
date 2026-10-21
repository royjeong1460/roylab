// Grid-native reusable pieces: these cells ARE the destructible art, not a picture overlay.
export class YardKit {
 constructor(width,floorY){this.width=width;this.floorY=floorY;this.cells=new Uint8Array(width*floorY);}
 rect(x,y,w,h,color){
  if(![x,y,w,h].every(Number.isInteger)||w<1||h<1||x<0||y<0||x+w>this.width||y+h>this.floorY)throw Error('Yard piece outside grid');
  for(let yy=y;yy<y+h;yy++)this.cells.fill(color,yy*this.width+x,yy*this.width+x+w);
 }
 post(x,top,bottom){this.rect(x,top,3,bottom-top,1);this.rect(x-1,bottom-4,5,4,5);}
 roof(x,y,width){
  // Stepped overhanging eaves; each tier overlaps so the silhouette is physically connected.
  this.rect(x+Math.floor(width*.3),y,width-2*Math.floor(width*.3),2,5);
  for(let t=0;t<5;t++){const inset=10-t*2;this.rect(x+inset,y+2+t*2,width-inset*2,2,2);}
  this.rect(x,y+12,width,3,2);this.rect(x,y+11,3,1,2);this.rect(x+width-3,y+11,3,1,2);
  this.rect(x+4,y+15,width-8,3,1);
 }
 jointedRoof(x,y,width){
  this.roof(x,y,width);
  // Separated tile packs share a one-cell wooden lintel, so impact can break the joins.
  for(let offset=9;offset<width-7;offset+=9)this.rect(x+offset,y,1,17,0);
 }
 wall(x,y,w,h){
  this.rect(x,y,w,h,3);
  if(w>=12&&h>=12){this.rect(x+3,y+4,w-6,7,0);this.rect(x+Math.floor(w/2),y+4,1,7,1);this.rect(x+2,y+11,w-4,2,1);}
 }
 masonry(x,y,w,h){this.rect(x,y,w,h,5);this.rect(x-1,y-2,w+2,2,2);}
 crate(x,y,w=9,h=8){this.rect(x,y,w,h,4);this.rect(x,y,w,1,1);this.rect(x,y+h-1,w,1,1);this.rect(x,y,1,h,1);this.rect(x+w-1,y,1,h,1);}
 rubble(x,bottom,w=20){
  this.rect(x,bottom-3,w,3,5);this.rect(x+2,bottom-6,w-5,3,5);this.rect(x+5,bottom-9,w-10,3,4);
 }
}
