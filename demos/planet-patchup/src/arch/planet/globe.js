import Projection from './projection.js';
import Territories from './territories.js';
import {HOME_REGIONS} from './regions.js';

// Approved desert artwork and billboard landmarks; campaign state stays read-only.
export function createPlanetGlobe(canvas,pin,markers=[]){
 const doc=canvas.ownerDocument,view=doc.defaultView,ctx=canvas.getContext('2d');
 const anchors=HOME_REGIONS.map(r=>Projection.anchors[r.art]);
 const size=192,center=95.5,radius=85,frame=ctx.createImageData(size,size),pixels=[];
 let texture,dirtyTexture,cleanTexture,width,height,masks,selected=0,yaw=0,pitch=0,raf=0,destroyed=false;
 let restoration=HOME_REGIONS.map(()=>0),available=new Set([0]);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x-center)/radius,ny=-(y-center)/radius,rr=nx*nx+ny*ny;if(rr>1)continue;
  const z=Math.sqrt(1-rr);pixels.push({i:(y*size+x)*4,v:[nx,ny,z],light:.56+.44*Math.max(0,-nx*.38+ny*.42+z*.82),rim:Math.max(0,(rr-.95)/.05)});
 }
 const artwork=Array.from({length:7},(_,i)=>{
  const image=new view.Image(),asset={image,ready:false};
  image.onload=()=>{if(!destroyed){asset.ready=true;draw();}};
  image.src=i<6?new URL(`./assets/desert/landmark-${i+1}.png`,import.meta.url).href:new URL('./assets/desert/rubble.png',import.meta.url).href;
  return asset;
 });
 function draw(){
  if(!texture||destroyed)return;frame.data.fill(0);
  for(const pixel of pixels){
   const [u,v]=Projection.uv(Projection.world(pixel.v,yaw,pitch)),x=u*width,y=Math.min(height-1,v*(height-1)),x0=Math.floor(x)%width,y0=Math.floor(y),x1=(x0+1)%width,y1=Math.min(height-1,y0+1),fx=x-Math.floor(x),fy=y-y0;
   const a=(y0*width+x0)*4,b=(y0*width+x1)*4,c=(y1*width+x0)*4,d=(y1*width+x1)*4;
   for(let k=0;k<3;k++){
    const top=texture[a+k]*(1-fx)+texture[b+k]*fx,bottom=texture[c+k]*(1-fx)+texture[d+k]*fx;
    frame.data[pixel.i+k]=(top*(1-fy)+bottom*fy)*pixel.light*(1-pixel.rim*.18)+[116,110,112][k]*pixel.rim*.18;
   }frame.data[pixel.i+3]=255;
  }
  ctx.putImageData(frame,0,0);ctx.imageSmoothingEnabled=false;
  const sites=anchors.map((a,i)=>({i,p:Projection.view(Projection.vector(a),yaw,pitch)})).sort((a,b)=>a.p[2]-b.p[2]);
  for(const {i,p} of sites){
   const visible=p[2]>.18,left=((center+p[0]*radius)/size*100)+'%',top=((center-p[1]*radius)/size*100)+'%';
   if(markers[i]){markers[i].hidden=!visible||i===selected;markers[i].style.left=left;markers[i].style.top=top;markers[i].dataset.locked=String(!available.has(i));}
   if(i===selected){pin.dataset.hidden=String(!available.has(i));pin.style.opacity=visible?'1':'0';pin.style.left=left;pin.style.top=top;}
   if(!visible)continue;
   const depth=Math.min(1,(p[2]-.18)/.4),scale=.48+.52*p[2],w=Math.round(44*scale),x=Math.round(center+p[0]*radius),y=Math.round(center-p[1]*radius);
   if(artwork[6].ready&&restoration[i]<1){
    ctx.globalAlpha=depth*(1-restoration[i]);ctx.save();ctx.beginPath();ctx.arc(center,center,radius,0,Math.PI*2);ctx.clip();
    for(const [dx,dy,s] of [[-23,9,14],[22,11,12],[-18,-11,9]]){const n=Math.round(s*scale);ctx.drawImage(artwork[6].image,Math.round(x+dx*scale-n/2),Math.round(y+dy*scale-n*.65),n,n);}
    ctx.restore();
   }
   if(artwork[i].ready){ctx.globalAlpha=depth;ctx.drawImage(artwork[i].image,x-Math.round(w/2),y-w+3,w,w);}
   ctx.globalAlpha=1;
  }
 }
 function select(i){
  selected=i;view.cancelAnimationFrame(raf);const to=Projection.target(HOME_REGIONS[i].art,yaw);
  if(!texture||view.matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=to.yaw;pitch=to.pitch;draw();return;}
  const fromYaw=yaw,fromPitch=pitch,start=view.performance.now(),duration=Projection.duration(yaw,to.yaw,pitch,to.pitch);
  function tick(now){const t=Math.min(1,(now-start)/duration),e=t*t*t*(t*(t*6-15)+10);yaw=fromYaw+(to.yaw-fromYaw)*e;pitch=fromPitch+(to.pitch-fromPitch)*e;draw();if(t<1)raf=view.requestAnimationFrame(tick);}
  raf=view.requestAnimationFrame(tick);
 }
 const image=new view.Image();
 image.onload=()=>{
  if(destroyed)return;width=image.naturalWidth||512;height=image.naturalHeight||256;
  const buffer=doc.createElement('canvas');buffer.width=width;buffer.height=height;const b=buffer.getContext('2d',{willReadFrequently:true});b.drawImage(image,0,0,width,height);
  dirtyTexture=new Uint8ClampedArray(b.getImageData(0,0,width,height).data);
  // Match the approved preview's seam feathering without changing the source file.
  for(let y=0;y<height;y++)for(let x=0;x<48;x++)for(let k=0;k<3;k++){const a=(y*width+x)*4+k,z=(y*width+width-1-x)*4+k,mean=(dirtyTexture[a]+dirtyTexture[z])/2,f=(48-x)/48,t=f*f*(3-2*f);dirtyTexture[a]=dirtyTexture[a]*(1-t)+mean*t;dirtyTexture[z]=dirtyTexture[z]*(1-t)+mean*t;}
  cleanTexture=new Uint8ClampedArray(dirtyTexture);
  // Keep saved region brightening on the same geography. Separate fully restored terrain art is not authored yet.
  for(let i=0;i<cleanTexture.length;i+=4)for(let c=0;c<3;c++)cleanTexture[i+c]=Math.min(255,dirtyTexture[i+c]*[1.08,1.15,1.12][c]+7);
  masks=Territories.build(width,height,anchors);rebuild();draw();
 };
 image.onerror=()=>{canvas.setAttribute('aria-label','Planet image could not be loaded');pin.hidden=true;const message=doc.createElement('p');message.textContent='Planet image unavailable. You can still enter a map.';message.className='load-error';canvas.parentNode.append(message);};
 image.src=new URL('./assets/desert/worldmap.png',import.meta.url).href;
 function rebuild(){if(masks)texture=Territories.compose(cleanTexture,dirtyTexture,masks,restoration);}
 function update(regions){
  const nextAvailable=new Set(),nextRestoration=regions.map(r=>r.available?r.restoration:0);regions.forEach((r,i)=>{if(r.available)nextAvailable.add(i);});
  if(available.size===nextAvailable.size&&[...available].every(i=>nextAvailable.has(i))&&restoration.every((v,i)=>v===nextRestoration[i]))return;
  available=nextAvailable;restoration=nextRestoration;rebuild();draw();
 }
 select(0);
 return {select,update,destroy(){destroyed=true;view.cancelAnimationFrame(raf);image.onload=null;image.onerror=null;artwork.forEach(a=>{a.image.onload=null;});}};
}
