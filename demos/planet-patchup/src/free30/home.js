import {drawPixelAlley} from './pixel-alley.js';

export function initHome(doc=document,draw=drawPixelAlley){
  for(const name of ['options','zones']){
    const dialog=doc.getElementById(`home-${name}-dialog`);
    doc.getElementById(`home-${name}`).onclick=()=>dialog.showModal();
    dialog.querySelector('[data-home-close]').onclick=()=>dialog.close();
  }
  doc.getElementById('home-zone-link').onclick=()=>doc.getElementById('home-zones-dialog').showModal();
  const home=doc.getElementById('base'),canvas=doc.getElementById('home-alley');
  // ResizeObserver also redraws after returning from the workshop or a run.
  const observer=new ResizeObserver(()=>{
    draw(canvas);
  });
  observer.observe(home);
  return ()=>observer.disconnect();
}
