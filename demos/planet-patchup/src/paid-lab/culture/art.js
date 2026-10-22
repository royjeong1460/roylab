// Stable origin IDs keep tiles, grain and mortar attached to moving physical fragments.
const swatches=[[],[0x775247,0x9e7052,0xbd936c],[0x354d5a,0x526b76,0x84969b],[0xbca98c,0xddc9a7,0xeee0bf],[0x8f4839,0xb76b4b,0xd69364],[0x797b77,0x969b92,0xb6b8aa]];
export function createYardSurface(width,cells){
 const pixels=new Uint32Array(cells.length),inks=new Array(cells.length);
 for(let id=0;id<cells.length;id++){
  const c=cells[id];if(!c)continue;const x=id%width,y=Math.floor(id/width),p=swatches[c];
  let tone=1;
  if(c===2)tone=y%2===0?0:(x+Math.floor(y/2)*2)%5===0?2:1;
  else if(c===1)tone=x%3===0?0:(x*11+y*3)%19===0?2:1;
  else if(c===5)tone=y%5===0||(x+(Math.floor(y/5)%2)*4)%9===0?0:(x*3+y*7)%17===0?2:1;
  else if(c===3)tone=(x*17+y*13)%43===0?0:(x+y)%13===0?2:1;
  else tone=(x+y*3)%11===0?2:x%7===0?0:1;
  pixels[id]=p[tone];inks[id]='#'+pixels[id].toString(16).padStart(6,'0');
 }
 return {pixels,color:(id,c)=>pixels[id]||swatches[c]?.[1]||0x969b92,css:(id,c)=>inks[id]||'#'+(swatches[c]?.[1]||0x969b92).toString(16)};
}
export function createYardBackdrop(scene,world,layer){
 const g=scene.add.graphics();layer.addAt(g,1);const w=world.width,f=world.floorY;
 function draw(){
  g.clear();g.fillStyle(0xe9dfc9);g.fillRect(0,0,w,world.height);
  // Flat, dusty skyline; the distant roofs have much less contrast than physical tiles.
  g.fillStyle(0xf4ebd5);g.fillRect(0,0,w,f*.3);
  g.fillStyle(0xf8efd8);g.fillRect(w*143/192,f*17/140,14,14);
  g.fillStyle(0xd6cbb5);
  for(const [x,y,ww] of [[-8,71,42],[34,91,38],[125,64,47],[169,86,34]]){
   const xx=x*w/192,yy=y*f/140;g.fillRect(xx+6,yy,ww-12,f-yy);g.fillRect(xx,yy,ww,3);g.fillRect(xx+5,yy-3,ww-10,3);g.fillRect(xx+11,yy-6,ww-22,3);
  }
  const courtyard=f-23;g.fillStyle(0xded1b8);g.fillRect(0,courtyard,w,23);
  // Quiet background courtyard joints terminate at the true fixed collision floor.
  g.lineStyle(.35,0xc9c0af,.5);
  for(let y=courtyard+4;y<f;y+=6)g.lineBetween(0,y,w,y);
  for(let x=0;x<w;x+=24)g.lineBetween(x,courtyard,x,f);
  g.fillStyle(0x666d69);g.fillRect(0,f,w,2);
  g.fillStyle(0xb2b2a5);g.fillRect(0,f+2,w,world.height-f-2);
  g.fillStyle(0xd8d2bf);g.fillRect(0,f+2,w,1);
  for(let row=0;row<3;row++)for(let x=-10+row%2*9;x<w;x+=19){
   g.fillStyle(row%2?0x999f97:0xa0a59c);g.fillRect(x,f+4+row*4,17,3);
   g.fillStyle(0xc1c1b3);g.fillRect(x+1,f+4+row*4,15,1);
  }
  g.lineStyle(.5,0x777f78);g.lineBetween(40,f+2,45,f+7);g.lineBetween(45,f+7,43,f+10);
 }
 draw();return {setMode:draw,destroy:()=>g.destroy()};
}
