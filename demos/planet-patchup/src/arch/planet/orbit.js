import {orbitPose,SATELLITES} from './orbit-math.mjs';
export function mountSatelliteOrbit(base,layer){
 const doc=base.ownerDocument,view=doc.defaultView,reduced=view.matchMedia('(prefers-reduced-motion: reduce)');
 const sprites=SATELLITES.map((s,i)=>{
  const image=new view.Image();image.src=new URL(`./scenery/${s.asset}`,import.meta.url).href;image.alt='';image.className='orbit-sprite';image.width=s.width;image.height=s.width*s.ratio;image.dataset.satellite=String(i+1);layer.append(image);return image;
 });
 let seconds=0,last=0,frame=0;
 const active=()=>!doc.hidden&&!base.hidden&&!doc.querySelector('dialog[open]')&&!reduced.matches;
 function draw(){sprites.forEach((image,i)=>{const p=orbitPose(seconds,i);image.hidden=p.opacity<=0;image.dataset.side=p.depth>0?'front':'back';image.style.left=`${p.x}px`;image.style.top=`${p.y}px`;image.style.opacity=p.opacity;image.style.transform=`translate(-50%,-50%) rotate(${p.angle}rad) scale(${p.scale})`;});}
 function tick(now){if(!active()){frame=0;last=0;return;}if(last)seconds+=Math.min(now-last,100)/1000;last=now;draw();frame=view.requestAnimationFrame(tick);}
 function resume(){view.cancelAnimationFrame(frame);frame=0;last=0;draw();if(active())frame=view.requestAnimationFrame(tick);}
 const observer=new view.MutationObserver(resume);observer.observe(base,{attributes:true,attributeFilter:['hidden']});doc.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
 reduced.addEventListener('change',resume);doc.addEventListener('visibilitychange',resume);resume();
 // Feedback is mounted later; its non-bubbling close event still reaches capture listeners.
 doc.addEventListener('close',resume,{capture:true});
 return {destroy(){view.cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener('change',resume);doc.removeEventListener('visibilitychange',resume);doc.removeEventListener('close',resume,{capture:true});}};
}
