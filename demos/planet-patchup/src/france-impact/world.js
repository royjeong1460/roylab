import {ThreeToolWorld} from '../three-tool-world.js';

const bondKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;

// Authored fracture model: normalized original bearing capacity, reduced contact
// mass, and a finite shared work budget. Matter remains responsible for motion.
export class FractureWorld extends ThreeToolWorld {
  constructor(data,options={}){super(data,options);this.contactEnergy=new WeakMap();this.mode='france-impact';}

  detach(){
    super.detach(); // Keep eccentric-load hinges and disconnected-component release.
    if(!this.bonds)return;
    let changed=false;
    const remaining=[];
    for(let id=0;id<this.cells.length;id++)if(this.cells[id])remaining.push({id});
    for(const component of this.groups(remaining)){
      const ids=component.map(p=>p.id),originalRows=this.originalSections[this.originalGroup[ids[0]]-1];
      if(!originalRows)continue;
      for(let y=this.floorY-2;y>0;y--){
        const row=ids.filter(id=>Math.floor(id/this.width)===y&&this.cells[id]);
        const width=originalRows[y].length;if(!row.length||!width)continue;
        let bearing=0;
        for(const id of row){
          const below=id+this.width;
          if(this.cells[below])bearing+=1-(this.bonds.get(bondKey(id,below))||0);
        }
        // Original gaps in a shape are not damage. Compare with its original
        // vertically connected bearing width, including partially strained bonds.
        const originalBearing=originalRows[y].filter(id=>this.original[id+this.width]).length;
        if(!originalBearing||bearing>=originalBearing*.999)continue;
        const above=ids.filter(id=>Math.floor(id/this.width)<=y&&this.cells[id]);
        const originalLoad=originalRows.slice(0,y+1).reduce((s,r)=>s+r.length,0);
        if(above.length<60||above.length<=originalLoad*1.5*bearing/originalBearing)continue;
        // A dynamic conversion alone leaves the upper mass perched on the
        // next rigid row. Crush a bounded bearing zone beneath the failed row
        // so gravity has real travel before the next contact. Only this
        // component and the original support footprint can lose material.
        const overload=above.length/(originalLoad*1.5*Math.max(bearing,.1)/originalBearing);
        const crushDepth=Math.min(8,Math.max(3,Math.ceil((overload-1)*2)));
        const footprint=new Set(originalRows[y].map(id=>id%this.width));
        let supportCrushed=0;
        for(const id of ids){
          const rowY=Math.floor(id/this.width);
          if(!this.cells[id]||rowY<=y||rowY>y+crushDepth||!footprint.has(id%this.width))continue;
          this.emitPixel({id,x:id%this.width+.5,y:rowY+.5,color:this.cells[id]});
          this.cells[id]=0;this.targetReleased+=this.target[id];supportCrushed++;
        }
        // Yielding retains the upper structure as connected moving pieces.
        for(const group of this.groups(above.map(id=>({id}))))this.releaseBody(group.map(p=>p.id));
        this.note({kind:'support-overload',x:row.reduce((s,id)=>s+id%this.width+.5,0)/row.length,y:y+1,count:above.length,bearing,originalBearing,crushDepth,supportCrushed});
        changed=true;break;
      }
    }
    if(changed){this.releaseUnsupported();this.updateHinges();this.syncStatic();this.rasterize();this.flushDebris();this.enforceBodyBudget();}
  }

  recordCollisions(pairs){
    if(!this.contactEnergy)return;
    const hits=new Map();
    for(const pair of pairs){
      const a=pair.bodyA.parent,b=pair.bodyB.parent,normal=pair.collision.normal;
      if(a===b)continue;
      // A tessellated pair may report many vertices. One averaged manifold
      // point and maximum energy per recipient prevent multiplying the budget.
      const supports=pair.collision.supports.filter(Boolean);if(!supports.length)continue;
      const point=supports.reduce((p,q)=>({x:p.x+q.x/supports.length,y:p.y+q.y/supports.length}),{x:0,y:0});
      const velocity=body=>body.isStatic?{x:0,y:0}:{x:body.velocity.x-body.angularVelocity*(point.y-body.position.y),y:body.velocity.y+body.angularVelocity*(point.x-body.position.x)};
      const av=velocity(a),bv=velocity(b);
      const speed=Math.max(0,-((av.x-bv.x)*normal.x+(av.y-bv.y)*normal.y))*60;if(speed<4)continue;
      const inverse=body=>{
        if(body.isStatic)return 0;
        const arm=(point.x-body.position.x)*normal.y-(point.y-body.position.y)*normal.x;
        return body.inverseMass+arm*arm*body.inverseInertia;
      };
      const inv=inverse(a)+inverse(b);if(!(inv>0))continue;
      // Density .002 converts Matter mass back to pixel-equivalent mass.
      const energy=.5/(inv*.002)*(Math.min(speed,180)/60)**2;
      const recipients=[[a,1],[b,-1]].filter(([body])=>body.plugin.piece||this.staticBodies.includes(body));
      for(const [body,sign] of recipients){
        const piece=body.plugin.piece||null;if(piece&&this.elapsed-piece.lastImpact<.15)continue;
        const target=piece||'static',previous=hits.get(target);
        const hit={piece,point:{...point},direction:{x:normal.x*sign,y:normal.y*sign},speed,energy:energy/recipients.length};
        if(!previous||hit.energy>previous.energy)hits.set(target,hit);
      }
    }
    for(const hit of hits.values()){this.contactEnergy.set(hit.point,hit);this.contacts.push(hit);}
  }

  applyImpact(piece,point,direction,strength=1,source='hammer',radius=5){
    if(source!=='collision')return super.applyImpact(piece,point,direction,strength,source,radius);
    const hit=this.contactEnergy.get(point);
    // Collision callers must supply recorded mass context; never synthesize
    // energy from the receiving body's size alone.
    if(!hit||(piece&&!this.bodies.includes(piece)))return 0;
    this.contactEnergy.delete(point);
    const energy=hit.energy,reach=Math.min(26,1.5+Math.sqrt(energy)*.65);
    let budget=energy*.42;
    const material=this.material(piece),byId=new Map(material.map(v=>[v.p.id,v]));
    const nearby=material.map(v=>({...v,d:Math.hypot(v.q.x-point.x,v.q.y-point.y)})).filter(v=>v.d<reach).sort((a,b)=>a.d-b.d||a.p.id-b.p.id);
    const crushed=new Set();
    // Each more distant pixel costs more work: no unlimited radius or fraction.
    for(const v of nearby){const cost=1+3*(v.d/reach)**2;if(budget<cost)break;budget-=cost;crushed.add(v.p.id);}
    let changed=0;
    for(const {p,q,d} of nearby)for(const id of this.neighbors(p.id)){
      if(id<p.id||!byId.has(id)||crushed.has(p.id)||crushed.has(id)||budget<=0)continue;
      const other=byId.get(id);if(Math.hypot(other.q.x-point.x,other.q.y-point.y)>=reach)continue;
      const key=bondKey(p.id,id),old=this.bonds.get(key)||0;
      const added=Math.min(1-old,budget,.65*(1-d/reach));
      if(added>0){this.bonds.set(key,old+added);budget-=added;changed++;}
    }
    if(piece){
      piece.lastImpact=this.elapsed;
      if(crushed.size||changed){this.removePiece(piece);for(const p of piece.pixels)if(crushed.has(p.id))this.emitPixel(p,piece);this.addConnected(piece.pixels.filter(p=>!crushed.has(p.id)),piece,Math.min(1,piece.damage+energy/800));}
    }else if(crushed.size||changed){
      for(const {p,q} of nearby)if(crushed.has(p.id)&&this.cells[p.id]){this.emitPixel({...p,...q});this.cells[p.id]=0;this.targetReleased+=this.target[p.id];}
      this.detach();
    }
    if(crushed.size||changed){this.note({kind:'fracture',source,x:point.x,y:point.y,count:crushed.size,energy,reach,speed:hit.speed});this.version++;this.sandMoving=true;}
    return crushed.size+changed;
  }
}
