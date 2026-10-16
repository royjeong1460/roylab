import {BatteryJourney} from './battery-journey.js';
import {AttackBatteryWorld} from './attack-battery-world.js';
import {EXPEDITION_BALANCE,EXPEDITION_COLLECTION_UPGRADES,expeditionCapacity,expeditionToolCost,expeditionSuctionRate,expeditionSuctionRadius} from './expedition-balance.js';

export const EXPEDITION_SAVE_KEYS=['pixel-demolition-expedition-v2-a','pixel-demolition-expedition-v2-b'];
export const EXPEDITION_LEGACY_SAVE_KEYS=['pixel-demolition-expedition-v1-a','pixel-demolition-expedition-v1-b'];
export const EXPEDITION_STORAGE_KEYS=[...EXPEDITION_SAVE_KEYS,...EXPEDITION_LEGACY_SAVE_KEYS];
const STEP=1/30;

export class ExpeditionRun{
  constructor(site,profile,id=globalThis.crypto.randomUUID()){
    this.site=site;this.profile=profile;this.id=id;
    this.world=new AttackBatteryWorld(site.data,{capacity:expeditionCapacity(profile),efficiency:profile.upgrades});
    this.state='active';this.paused=false;this.accumulator=0;this.working=false;
    this.phase='working';this.finishReady=false;this.finishRemaining=10;this.finishReason=null;this.automaticSuction=true;this.quietElapsed=0;
    this.aim={...(site.preview?.[0]||{x:this.world.width/2,y:this.world.floorY})};this.previous={...this.aim};this.dropSweep=false;
  }
  get ratio(){return this.world.collected/this.world.initial;}
  get qualified(){return this.world.collected>=Math.ceil(this.world.initial*.7);}
  release(){this.working=false;this.previous={...this.aim};this.dropSweep=true;}
  pause(value){this.paused=!!value;this.accumulator=0;this.release();}
  exhaust(){if(this.world.charge<=1e-8){this.phase='finishing';this.world.toolEnabled=false;}}
  get looseCount(){return this.world.sand.reduce((n,p)=>n+!!p,0)+this.world.flying.length+this.world.debris.length+this.world.pending.reduce((n,p)=>n+!!p,0);}
  debrisDrained(){
    if(this.looseCount||this.world.bombs.length)return false;
    return this.world.bodies.every(({body})=>{
      if(body.isSleeping)return true;
      const radius=Math.max(...body.vertices.map(v=>Math.hypot(v.x-body.position.x,v.y-body.position.y)));
      return Math.hypot(body.velocity.x,body.velocity.y)+Math.abs(body.angularVelocity)*radius<=.02;
    });
  }
  press(point){
    this.exhaust();
    if(this.paused||this.state!=='active'||this.phase!=='working'||this.finishReady||this.working||!point||!this.world.validPoint(point.x,point.y)||!this.profile.owned.includes(this.world.tool)||!this.world.canUseTool())return false;
    this.aim={...point};this.previous={...point};this.dropSweep=false;this.working=true;
    if(this.world.tool==='cutter')return this.world.canUseTool();
    const accepted=this.world.activate(point.x,point.y);this.exhaust();return accepted;
  }
  update(dt,input={working:false}){
    if(this.paused||this.state!=='active'||this.finishReady||!Number.isFinite(dt)||dt<=0)return;
    this.exhaust();this.accumulator+=Math.min(.1,dt);
    if(this.world.validPoint(input.x,input.y))this.aim={x:input.x,y:input.y};
    // Keep the last simulated point when render frames arrive between physics ticks.
    let from=this.dropSweep?this.aim:this.previous;
    if(!from||![from.x,from.y].every(Number.isFinite))from=this.aim;
    while(this.accumulator+1e-8>=STEP&&!this.finishReady){
      const attacking=!!input.working&&this.world.validPoint(input.x,input.y)&&this.phase==='working'&&this.profile.owned.includes(this.world.tool);
      this.world.work(this.aim.x,this.aim.y,STEP,1,from,attacking);this.exhaust();this.world.step(STEP);
      this.accumulator=Math.max(0,this.accumulator-STEP);from=this.aim;this.previous={...this.aim};this.dropSweep=false;
      if(this.phase==='finishing'){
        this.finishRemaining=Math.max(0,this.finishRemaining-STEP);
        this.quietElapsed=this.debrisDrained()?this.quietElapsed+STEP:0;
        if(this.quietElapsed+1e-8>=.5||this.finishRemaining<=1e-8){
          this.finishReason=this.quietElapsed+1e-8>=.5?'drained':'timeout';
          this.finishRemaining=0;this.finishReady=true;this.release();this.accumulator=0;
        }
      }
    }
  }
}

export class ExpeditionJourney extends BatteryJourney{
  capacity(profile=this.profile){return expeditionCapacity(profile);}
  energyCost(tool,profile=this.profile){return expeditionToolCost(tool,profile.upgrades);}
  offer(id){
    if(!Object.hasOwn(EXPEDITION_COLLECTION_UPGRADES,id))return super.offer(id);
    const level=this.profile.upgrades[id],max=EXPEDITION_COLLECTION_UPGRADES[id].max;
    const next={...this.profile.upgrades,[id]:level+1},rate=id==='suction',stat=rate?expeditionSuctionRate:expeditionSuctionRadius;
    return {id,name:rate?`흡입량 +${EXPEDITION_BALANCE.suctionRateStep}/초`:`흡입 범위 +${EXPEDITION_BALANCE.suctionRadiusStep}칸`,level,max,cost:this.upgradeCost(id,level),available:level<max,
      description:`${rate?'흡입량':'흡입 반경'} ${stat(this.profile.upgrades)} → ${stat(next)} ${rate?'픽셀/초':'칸'}`};
  }
  offers(){return [...super.offers(),this.offer('suction'),this.offer('range')];}
  constructor(storage,locks=globalThis.navigator?.locks){
    super(storage,locks,{runClass:ExpeditionRun,saveKeys:EXPEDITION_SAVE_KEYS,legacySaveKeys:EXPEDITION_LEGACY_SAVE_KEYS,lockName:'pixel-demolition-expedition-v1',capacityLimit:EXPEDITION_BALANCE.capacityLevels,efficiencyLimit:EXPEDITION_BALANCE.efficiencyLevels,extraUpgrades:EXPEDITION_COLLECTION_UPGRADES});
  }
}
