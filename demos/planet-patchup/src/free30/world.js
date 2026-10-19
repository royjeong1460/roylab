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
 recordCollisions(pairs){
  const from=this.contacts?.length||0;super.recordCollisions(pairs);
  let strongest=null;
  for(const hit of this.contacts?.slice(from)||[])if(hit.speed>=8&&(!strongest||hit.energy>strongest.energy))strongest=hit;
  if(strongest)this.events.push({kind:'sound-impact',speed:strongest.speed,energy:strongest.energy});
 }
 stats(){return {...super.stats(),...this.gameStats};}
 setTool(id){return (!this.allowedTools||this.allowedTools.includes(id))&&super.setTool(id);}
 activate(x,y){const ok=super.activate(x,y);if(ok)this.usedTools.add(this.tool);return ok;}
}
