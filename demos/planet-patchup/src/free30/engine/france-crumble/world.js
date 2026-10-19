import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import {FractureWorld} from '../france-impact/world.js';
import {DEFAULT_TUNING,normalizeTuning} from './tuning.js';

export class CrumbleWorld extends FractureWorld {
  constructor(data,options={}){super(data,options);this.mode='france-crumble';this.tuning={...DEFAULT_TUNING};}

  setTuning(patch){this.tuning=normalizeTuning(patch,this.tuning||DEFAULT_TUNING);return {...this.tuning};}

  applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
    const hit=source==='collision'&&this.contactEnergy.get(point);
    if(hit)hit.energy*=1+Math.min(1.5,Math.max(0,(hit.energy-24)/170))*(this.tuning||DEFAULT_TUNING).collision;
    return super.applyImpact(piece,point,direction,strength,source,radius);
  }

  blast(bomb){
    super.blast(bomb);
    const force=Math.max(0,Math.min(this.tune('crackForceCap',5),(bomb.power-1)*4||0));
    const tuning=this.tuning||DEFAULT_TUNING;
    const reach=(bomb.radius+2+force*1.6)*tuning.crackRange,strength=(.65+force*.28)*tuning.crackStrength;
    let changed=0,staticChanged=false;
    for(const piece of [null,...this.bodies]){
      const material=this.material(piece),byId=new Map(material.map(v=>[v.p.id,v.q]));
      let local=0;
      for(const {p,q} of material)for(const id of this.neighbors(p.id)){
        if(id<p.id||!byId.has(id))continue;
        const other=byId.get(id),distance=Math.hypot((q.x+other.x)/2-bomb.x,(q.y+other.y)/2-bomb.y);
        if(distance>=reach)continue;
        const key=`${p.id}:${id}`,old=this.bonds.get(key)||0;
        const toughness=.85+((Math.imul(p.id+1,31)^id)&15)/50;
        const added=Math.min(1-old,strength*(1-distance/reach)/toughness);
        if(added<=0)continue;
        this.bonds.set(key,old+added);local++;
      }
      if(!local)continue;
      changed+=local;
      if(piece){
        Sleeping.set(piece.body,false);
        if(this.groups(piece.pixels).length>1){this.removePiece(piece);this.addConnected(piece.pixels,piece,piece.damage);}
      }else staticChanged=true;
    }
    if(!changed)return;
    if(staticChanged)this.detach();
    this.enforceBodyBudget();this.rasterize();this.version++;this.sandMoving=true;
    this.note({kind:'impact',source:'blast-halo',x:bomb.x,y:bomb.y,damage:strength,reach,count:changed});
  }
}
