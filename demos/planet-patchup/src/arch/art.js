import {drawArchEnvironment,environmentStyle} from './art-background.js';
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
export function createArchBackdrop(scene,world,layer,images={},restoration=0){
 const scale=4,w=world.width*scale,h=world.height*scale,f=world.floorY*scale;
 const key='arch-salvage-backdrop',texture=scene.textures.createCanvas(key,w,h);
 drawArchEnvironment(texture.context,images,{width:w,height:h,floor:f,restoration});texture.refresh();
 const image=scene.add.image(0,0,key).setOrigin(0).setScale(1/scale);layer.addAt(image,1);
 const surround=scene.add.graphics().setDepth(-1),style=environmentStyle(restoration);
 // The completed record is captured on entry; live recovery never changes scenery.
 return {setMode(){},transform(viewport){
  const sw=scene.scale.width,sh=scene.scale.height,floor=(world.floorY-viewport.y)*viewport.zoom;
  surround.clear();surround.fillStyle(parseInt(style.sky.slice(1),16));surround.fillRect(0,0,sw,sh);
  surround.fillStyle(parseInt(style.ground.slice(1),16));surround.fillRect(0,Math.max(0,floor),sw,Math.max(0,sh-floor));
 },destroy(){surround.destroy();image.destroy();if(scene.textures.exists(key))scene.textures.remove(key);}};
}
