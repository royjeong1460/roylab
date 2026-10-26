// Texture is keyed to the original cell ID, keeping mortar and tiles attached
// to the destructible geometry even while its fragments rotate and fall.
const tones=[[],[0x9c7059,0xc59a76,0xe2c5a0],[0x345a70,0x54849b,0x86adba],[0xc9af88,0xead8b5,0xffedcc],[0x99523d,0xc17855,0xe3a078],[0x8e8b7d,0xb3ad98,0xd2cab3]];
export function createArchSurface(width,cells){
 const pixels=new Uint32Array(cells.length),inks=new Array(cells.length);
 for(let id=0;id<cells.length;id++){
  const c=cells[id];if(!c)continue;const x=id%width,y=Math.floor(id/width);
  const joint=y%5===0||(x+Math.floor(y/5)%2*5)%11===0;
  const tone=c===2?(y%3===0?0:x%7===0?2:1):joint?0:(x*13+y*7)%29===0?2:1;
  pixels[id]=tones[c][tone];inks[id]='#'+pixels[id].toString(16).padStart(6,'0');
 }
 return {pixels,color:(id,c)=>pixels[id]||tones[c]?.[1]||0xb3ad98,css:(id,c)=>inks[id]||'#'+(tones[c]?.[1]||0xb3ad98).toString(16).padStart(6,'0')};
}
export function createArchBackdrop(scene,world,layer){
 const g=scene.add.graphics();layer.addAt(g,1);
 function draw(){
  const w=world.width,f=world.floorY;g.clear();g.fillStyle(0xf2e6cd);g.fillRect(0,0,w,world.height);
  g.fillStyle(0xffefd1);g.fillRect(w*.73,f*.13,12,12);
  // Low-contrast distant masonry stays visually distinct from the physical art.
  g.fillStyle(0xdfd1b7);
  for(let x=-12;x<w;x+=48){g.fillRect(x,f*.58,35,f*.42);g.fillRect(x-2,f*.58-3,39,3);}
  g.fillStyle(0xe7d8bb);g.fillRect(0,f-19,w,19);
  g.lineStyle(.4,0xc7bba2,.6);for(let y=f-15;y<f;y+=6)g.lineBetween(0,y,w,y);
  for(let x=0;x<w;x+=22)g.lineBetween(x,f-19,x+8,f);
  g.fillStyle(0x77796f);g.fillRect(0,f,w,2);g.fillStyle(0xb8af99);g.fillRect(0,f+2,w,world.height-f-2);
  for(let y=f+3;y<world.height;y+=4){g.fillStyle(0xd8cbb0);g.fillRect(0,y,w,1);}
 }
 draw();return {setMode:draw,destroy:()=>g.destroy()};
}
