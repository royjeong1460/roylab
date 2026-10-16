import {ExpeditionRun} from './expedition-journey.js';
import {ThreeToolWorld} from './three-tool-world.js';

// Keep the drawn nozzle inside the same bounds used by attack and collection.
export const clampToolAim=(world,point)=>({
  x:Math.max(.5,Math.min(world.width-.5,point.x)),
  y:Math.max(.5,Math.min(world.floorY-.5,point.y)),
});

// Ephemeral lab: reuses expedition timing/cleanup but never creates a Journey or a save.
export class ThreeToolRun extends ExpeditionRun{
  constructor(site,{settings={},capacity=180}={}){
    super(site,{owned:['cutter','bomb','blackhole'],upgrades:{capacity:0}});
    this.world=new ThreeToolWorld(site.data,{capacity});
    this.world.configure(settings);
  }
  press(point){
    this.exhaust();
    if(this.paused||this.state!=='active'||this.phase!=='working'||this.finishReady||this.working||!point||!this.world.validPoint(point.x,point.y)||!this.world.canUseTool())return false;
    this.aim={...point};this.previous={...point};this.dropSweep=false;this.working=true;
    const accepted=this.world.activate(point.x,point.y);this.exhaust();return accepted;
  }
  debrisDrained(){return this.world.wells.length===0&&super.debrisDrained();}
}
