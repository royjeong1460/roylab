// Vite emits these local assets into the free build; no design-server dependency.
const urls=import.meta.glob('./assets/salvage/*.png',{eager:true,query:'?url',import:'default'});
export async function loadArchArt(){
 const images={};
 await Promise.all(Object.entries(urls).map(async([path,url])=>{
  const image=new Image();image.src=url;await image.decode();
  images[path.split('/').pop().replace('.png','')]=image;
 }));
 return images;
}
