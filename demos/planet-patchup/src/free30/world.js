import {BlackHoleWearWorld} from './engine/blackhole-wear/world.js';
import {statsForProfile} from './balance.js';

// Freeze tested physics, but keep debug battery/settings out of the playable campaign.
export class FreeWorld extends BlackHoleWearWorld {
 constructor(site,profile){
  const stats=statsForProfile(profile);
  super(site.data,{coreMix:stats.coreMix,wearSpeed:stats.wearSpeed});
  this.gameStats=stats;this.unlimited=false;this.capacity=stats.capacity;this.charge=this.capacity;
  this.suctionRate=stats.suctionRate;this.suctionRadius=stats.suctionRadius;
  this.allowedTools=[...profile.owned];this.usedTools=new Set();this.setTool('bomb');
 }
 stats(){return {...super.stats(),...this.gameStats};}
 setTool(id){return (!this.allowedTools||this.allowedTools.includes(id))&&super.setTool(id);}
 activate(x,y){const ok=super.activate(x,y);if(ok)this.usedTools.add(this.tool);return ok;}
}
