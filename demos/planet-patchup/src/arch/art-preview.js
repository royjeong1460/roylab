import {loadArchArt} from './art-assets.js';
import {drawArchEnvironment} from './art-background.js';
import {createArchSurface} from './art.js';
import {ARCH_SITES} from './maps.js';
import {compileStructure} from '../structure/model.js';
const images=await loadArchArt(),site=ARCH_SITES[0],model=compileStructure(site.data,site.structure),surface=createArchSurface(site.data.width,model.cells);
function draw(){for(const canvas of document.querySelectorAll('canvas[data-ratio]')){
 const c=canvas.getContext('2d'),ratio=Number(canvas.dataset.ratio);
 drawArchEnvironment(c,images,{width:576,height:576,floor:528,restoration:ratio});
 if(document.getElementById('targets').checked){
  const scale=Math.min(576/site.data.width,500/site.data.floorY),ox=(576-site.data.width*scale)/2,oy=528-site.data.floorY*scale;
  c.save();c.translate(ox,oy);c.scale(scale,scale);
  for(let id=0;id<model.cells.length;id++)if(model.cells[id]){c.fillStyle=surface.css(id,model.cells[id]);c.fillRect(id%site.data.width,Math.floor(id/site.data.width),1,1);}c.restore();
 }
}}
document.getElementById('targets').onchange=draw;draw();
