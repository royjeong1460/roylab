import Projection from './projection.js';
import Pollution from './pollution.js';
import Territories from './territories.js';
import DistrictArt from './district-art.js';
import {HOME_REGIONS} from './regions.js';

// Approved V10 renderer. Campaign state is read-only; no preview unlock controls.
export function createPlanetGlobe(canvas,pin){
const doc=canvas.ownerDocument,view=doc.defaultView,ctx=canvas.getContext('2d');
const cancelAnimationFrame=id=>view.cancelAnimationFrame(id),requestAnimationFrame=fn=>view.requestAnimationFrame(fn),performance=view.performance,matchMedia=q=>view.matchMedia(q);
const anchors=HOME_REGIONS.map(region=>Projection.anchors[region.art]);
let texture,cleanTexture,dirtyTexture,width,height,selected=0,yaw=0,pitch=0,raf=0;
let completed=new Set(),available=new Set([0]),masks,destroyed=false;
const size=192,center=95.5,radius=85,frame=ctx.createImageData(size,size),pixels=[];
// Projection and screen lighting are fixed; UV lookup changes only when a district is selected.
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const nx=(x-center)/radius,ny=-(y-center)/radius,rr=nx*nx+ny*ny;if(rr>1)continue;const z=Math.sqrt(1-rr);pixels.push({i:(y*size+x)*4,v:[nx,ny,z],light:.61+.39*Math.max(0,-nx*.38+ny*.42+z*.82),rim:Math.max(0,(rr-.94)/.06)})}
function draw(){if(!texture)return;frame.data.fill(0);for(const pixel of pixels){const [u,v]=Projection.uv(Projection.world(pixel.v,yaw,pitch)),x=u*width,y=Math.min(height-1,v*(height-1)),x0=Math.floor(x)%width,y0=Math.floor(y),x1=(x0+1)%width,y1=Math.min(height-1,y0+1),fx=x-Math.floor(x),fy=y-y0,a=(y0*width+x0)*4,b=(y0*width+x1)*4,c0=(y1*width+x0)*4,d=(y1*width+x1)*4,out=pixel.i;for(let c=0;c<3;c++){const top=texture[a+c]*(1-fx)+texture[b+c]*fx,bottom=texture[c0+c]*(1-fx)+texture[d+c]*fx,terrain=(top*(1-fy)+bottom*fy)*pixel.light;frame.data[out+c]=terrain*(1-pixel.rim*.38)+[177,157,100][c]*pixel.rim*.38}frame.data[out+3]=255}ctx.putImageData(frame,0,0);
const point=Projection.view(Projection.vector(anchors[selected]),yaw,pitch);pin.dataset.hidden=String(!available.has(selected));pin.style.opacity=point[2]>.08?'1':'0';pin.style.left=((center+point[0]*radius)/size*100)+'%';pin.style.top=((center-point[1]*radius)/size*100)+'%'}
// Center the selected hub with synchronized axes; vertical turns have their own speed cap.
function select(i){selected=i;cancelAnimationFrame(raf);const to=Projection.target(HOME_REGIONS[i].art,yaw);if(!texture||matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=to.yaw;pitch=to.pitch;draw();return}const fromYaw=yaw,fromPitch=pitch,start=performance.now(),duration=Projection.duration(yaw,to.yaw,pitch,to.pitch);
function tick(now){const t=Math.min(1,(now-start)/duration),e=t*t*t*(t*(t*6-15)+10);yaw=fromYaw+(to.yaw-fromYaw)*e;pitch=fromPitch+(to.pitch-fromPitch)*e;draw();if(t<1)raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick)}
const image=new view.Image();image.onload=()=>{if(destroyed)return;width=512;height=256;const buffer=doc.createElement('canvas');buffer.width=width;buffer.height=height;const b=buffer.getContext('2d',{willReadFrequently:true});b.imageSmoothingEnabled=true;b.imageSmoothingQuality='high';b.drawImage(image,0,0,width,height);cleanTexture=b.getImageData(0,0,width,height).data;dirtyTexture=Pollution.build(cleanTexture,width,height,anchors,false);masks=Territories.build(width,height,anchors);rebuild();draw()};image.onerror=()=>{canvas.setAttribute('aria-label','Planet image could not be loaded');pin.hidden=true;const message=doc.createElement('p');message.textContent='Planet image unavailable. You can still enter a map.';message.className='load-error';canvas.parentNode.append(message)};image.src=new URL('./worldmap.png',import.meta.url).href;function rebuild(){if(!masks)return;texture=Territories.compose(cleanTexture,dirtyTexture,masks,completed);anchors.forEach((site,i)=>{DistrictArt.paint(texture,width,height,site,HOME_REGIONS[i].art,completed.has(i))});texture=Pollution.conceal(texture,width,height,masks,available)}
function update(regions){
 const nextAvailable=new Set(),nextCompleted=new Set();
 regions.forEach((region,i)=>{if(region.available){nextAvailable.add(i);if(region.cleared)nextCompleted.add(i);}});
 const same=(a,b)=>a.size===b.size&&[...a].every(i=>b.has(i));
 if(same(available,nextAvailable)&&same(completed,nextCompleted))return;
 available=nextAvailable;completed=nextCompleted;rebuild();draw();
}
select(0);
return {select,update,destroy(){destroyed=true;cancelAnimationFrame(raf);image.onload=null;image.onerror=null;}};
}
