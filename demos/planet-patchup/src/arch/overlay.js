import {ActiveOverlay} from '../ideas-lab/active/overlay.js';
import {ChainView} from './chain-view.js';

export class ArchOverlay extends ActiveOverlay {
 constructor(scene,view){super(scene,view);this.chainView=new ChainView(scene,view.viewport,view.reducedMotion);}
 draw(dt,world,events=[]){
  super.draw(dt,world);
  for(const event of events)if(event.kind==='chain-impact')this.chainView.add(event);
  this.chainView.draw(dt);
 }
 destroy(){this.chainView.destroy();this.graphics.destroy();}
}
