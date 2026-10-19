import {drawPixelAlley} from './pixel-alley.js';

export function initHome(doc=document){
  for(const name of ['options','zones']){
    const dialog=doc.getElementById(`home-${name}-dialog`);
    doc.getElementById(`home-${name}`).onclick=()=>dialog.showModal();
    dialog.querySelector('[data-home-close]').onclick=()=>dialog.close();
  }
  const home=doc.getElementById('base'),canvas=doc.getElementById('home-alley');
  // ResizeObserver also redraws after returning from the workshop or a run.
  const observer=new ResizeObserver(()=>{
    const top=doc.getElementById('dispatch').getBoundingClientRect().top-home.getBoundingClientRect().top;
    drawPixelAlley(canvas,top);
  });
  observer.observe(home);
  return ()=>observer.disconnect();
}
