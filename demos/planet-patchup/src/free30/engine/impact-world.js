import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Engine from 'phaser/src/physics/matter-js/lib/core/Engine.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import { WeightedWorld } from './weighted-world.js';
import { ToolWorld } from './tool-world.js';

const CAP=18;
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export class ImpactWorld extends ToolWorld {
  constructor(data) {
    super(data);this.mode='impact';this.bonds=new Map();this.flying=[];this.contacts=[];this.suctionRate=80;this.suctionRadius=12;
    this.stage='연결된 구조물 · 접촉점에 힘이 전달돼요';
  }

  groups(pixels) {
    const remaining=new Map(pixels.map(p=>[p.id,p])),groups=[];
    while(remaining.size){
      const first=remaining.values().next().value,group=[first];remaining.delete(first.id);
      for(let n=0;n<group.length;n++)for(const id of this.neighbors(group[n].id)){
        if(!remaining.has(id)||(this.bonds.get(key(group[n].id,id))||0)>=1)continue;
        group.push(remaining.get(id));remaining.delete(id);
      }
      groups.push(group);
    }
    return groups.sort((a,b)=>b.length-a.length);
  }

  addConnected(pixels,parent=null,damage=0) {
    const groups=this.groups(pixels),large=groups.filter(g=>g.length>=4);
    for(const group of groups)if(group.length<4)for(const p of group)this.emitPixel(p,parent);
    const slots=this.tune('bodyCap',CAP)-this.bodies.length;
    // shortcut: excess disconnected components share one compound until a slot frees; never dust for capacity.
    if(!this.independentFragments&&large.length>slots&&slots>0)large.splice(slots-1,large.length,...[large.slice(slots-1).flat()]);
    for(const group of large)this.addPiece(group,parent,damage);
  }

  addPiece(pixels,parent=null,damage=0) {
    if(pixels.length<4){for(const p of pixels)this.emitPixel(p,parent);return null;}
    if(!this.independentFragments&&this.bodies.length>=this.tune('bodyCap',CAP))return null;
    const piece=super.addPiece(pixels,parent,damage);
    if(parent)piece.lastImpact=parent.lastImpact;
    this.limitMotion(piece);return piece;
  }

  releaseBody(indices) {
    if(!this.independentFragments&&this.bodies.length>=this.tune('bodyCap',CAP)&&indices.length>=4)return null;
    return super.releaseBody(indices);
  }

  loadGroups(indices) {
    return this.independentFragments?this.groups(indices.map(id=>({id}))).map(group=>group.map(p=>p.id)):super.loadGroups(indices);
  }

  releaseUnsupported() {
    const pixels=[];
    for(let i=0;i<this.cells.length;i++)if(this.cells[i])pixels.push({id:i,x:i%this.width+.5,y:Math.floor(i/this.width)+.5,color:this.cells[i]});
    const released=this.groups(pixels).filter(group=>!group.some(p=>Math.floor(p.id/this.width)===this.floorY-1));
    const slots=this.tune('bodyCap',CAP)-this.bodies.length;
    if(this.independentFragments||slots>0){
      const large=released.filter(g=>g.length>=4),tiny=released.filter(g=>g.length<4);
      if(!this.independentFragments&&large.length>slots)large.splice(slots-1,large.length,...[large.slice(slots-1).flat()]);
      for(const group of [...large,...tiny])this.releaseBody(group.map(p=>p.id));
      return released.length>0;
    }
    return false;
  }

  detach() {
    if(!this.bonds)return;
    this.releaseUnsupported();
    // Retain the existing eccentric-load support heuristic, including its hinge behavior.
    WeightedWorld.prototype.detach.call(this);
    // A yielding upper section can leave a hanging tail below the chosen support row.
    if(this.independentFragments&&this.releaseUnsupported()){
      this.updateHinges();this.syncStatic();this.rasterize();this.flushDebris();
    }
  }

  enforceBodyBudget() {
    if(!this.independentFragments||this.bodies.length<=this.tune('bodyCap',CAP))return;
    // Finish nested fractures first: retiring their material mid-operation could emit it twice.
    const excess=[...this.bodies].sort((a,b)=>b.pixels.length-a.pixels.length).slice(this.tune('bodyCap',CAP));
    for(const piece of excess){
      for(const pixel of piece.pixels)this.emitPixel(pixel,piece);
      this.removePiece(piece);
    }
    this.rasterize();this.version++;this.sandMoving=true;
  }

  emitPixel(pixel,parent=null) {
    const q=parent?this.pixelPosition(parent,pixel):pixel,body=parent?.body;
    this.flying.push({id:pixel.id,color:pixel.color,x:q.x,y:q.y,
      vx:body?(body.velocity.x-body.angularVelocity*(q.y-body.position.y))*60:0,
      vy:body?(body.velocity.y+body.angularVelocity*(q.x-body.position.x))*60:0});
    this.sandMoving=true;
  }

  limitMotion(piece) {
    const b=piece.body,radius=piece.motionRadius??=Math.max(...piece.pixels.map(p=>Math.hypot(p.x,p.y)))+.75;
    const travel=Math.hypot(b.velocity.x,b.velocity.y)+Math.abs(b.angularVelocity)*radius;
    // Matter is discrete: cap maximum point travel per 60 Hz step below the wall/floor thickness.
    const cap=this.tune('motionCap',3);
    if(travel>cap){const scale=cap/travel;Body.setVelocity(b,{x:b.velocity.x*scale,y:b.velocity.y*scale});Body.setAngularVelocity(b,b.angularVelocity*scale);}
  }

  impulse(piece,point,vector) {
    const b=piece.body;
    Sleeping.set(b,false);
    Body.setVelocity(b,{x:b.velocity.x+vector.x/b.mass,y:b.velocity.y+vector.y/b.mass});
    Body.setAngularVelocity(b,b.angularVelocity+((point.x-b.position.x)*vector.y-(point.y-b.position.y)*vector.x)/b.inertia);
    this.limitMotion(piece);
  }

  material(piece) {
    if(piece)return piece.pixels.map(p=>({p,q:this.pixelPosition(piece,p)}));
    const out=[];
    for(let i=0;i<this.cells.length;i++)if(this.cells[i])out.push({p:{id:i,color:this.cells[i]},q:{x:i%this.width+.5,y:Math.floor(i/this.width)+.5}});
    return out;
  }

  applyImpact(piece,point,direction,strength=1,source='hammer',radius=5) {
    if(piece&&!this.bodies.includes(piece))return 0;
    const length=Math.hypot(direction.x,direction.y)||1,dx=direction.x/length,dy=direction.y/length;
    const material=this.material(piece),byId=new Map(material.map(v=>[v.p.id,v]));let changed=0;
    // shortcut: energetic contact propagates one strain crack toward the interior; this is not an elastic solver.
    const propagates=piece&&strength>=1.25;
    let ux=0,uy=0,reach=1;
    if(propagates){
      ux=piece.body.position.x-point.x;uy=piece.body.position.y-point.y;
      if(Math.hypot(ux,uy)<1){ux=dx;uy=dy;}
      const length=Math.hypot(ux,uy);ux/=length;uy/=length;
      reach=Math.max(1,...material.map(v=>(v.q.x-point.x)*ux+(v.q.y-point.y)*uy));
    }
    const side=q=>{const along=(q.x-point.x)*ux+(q.y-point.y)*uy;return -(q.x-point.x)*uy+(q.y-point.y)*ux-Math.sin(along*.45)*.3;};
    for(const {p,q} of material)for(const id of this.neighbors(p.id)){
      if(id<p.id||!byId.has(id))continue;
      const other=byId.get(id).q,mx=(q.x+other.x)/2,my=(q.y+other.y)/2;
      const along=(mx-point.x)*dx+(my-point.y)*dy,across=-(mx-point.x)*dy+(my-point.y)*dx;
      const distance=Math.hypot(along*.8,across*1.25);
      const depth=(mx-point.x)*ux+(my-point.y)*uy;
      const onCrack=propagates&&depth>=-.75&&side(q)*side(other)<=0;
      if(distance>=radius&&!onCrack)continue;
      const k=key(p.id,id),old=this.bonds.get(k)||0;
      if(old>=1)continue;
      // Directional strain and stable local bond strength make cracks follow contact, not global axes.
      const alignment=Math.abs((other.x-q.x)*dx+(other.y-q.y)*dy);
      const toughness=.85+((Math.imul(p.id+1,31)^id)&15)/50;
      const local=strength*.58*Math.max(0,1-distance/radius)*(.55+.45*alignment);
      const propagated=onCrack?strength*1.1*(1-.3*clamp(depth/reach,0,1)):0;
      const added=Math.max(local,propagated)/toughness;
      this.bonds.set(k,Math.min(1,old+added));changed++;
    }
    if(!changed)return 0;
    if(piece){
      piece.lastImpact=this.elapsed;piece.damage=Math.min(1,piece.damage+strength*.1);
      const groups=this.groups(piece.pixels);
      if(groups.length>1){this.removePiece(piece);this.addConnected(piece.pixels,piece,piece.damage);}
    } else this.detach();
    this.note({kind:'impact',source,x:point.x,y:point.y,damage:strength,count:changed});
    this.stage='접촉점의 연결 손상 · 남은 연결이 하중을 버텨요';this.version++;this.sandMoving=true;
    return changed;
  }

  crackSegments() {
    const positions=new Map();
    for(let i=0;i<this.cells.length;i++)if(this.cells[i])positions.set(i,{x:i%this.width+.5,y:Math.floor(i/this.width)+.5,owner:null});
    for(const piece of this.bodies)for(const p of piece.pixels)positions.set(p.id,{...this.pixelPosition(piece,p),owner:piece});
    const lines=[];
    for(const [k,damage] of this.bonds){
      if(damage<.08)continue;
      const [a,b]=k.split(':').map(Number),p=positions.get(a),q=positions.get(b);
      if(!p||!q||p.owner!==q.owner)continue;
      const dx=(q.y-p.y)*.45,dy=-(q.x-p.x)*.45,x=(p.x+q.x)/2,y=(p.y+q.y)/2;
      lines.push({x:x-dx,y:y-dy,x2:x+dx,y2:y+dy,damage,broken:damage>=1});
    }
    return lines;
  }

  contact(x,y,radius=2) {
    let best=null,distance=radius;
    for(const piece of [null,...this.bodies])for(const {p,q} of this.material(piece)){
      const d=Math.hypot(q.x-x,q.y-y);
      if(d<distance){distance=d;best={piece,p,q};}
    }
    return best;
  }

  hammer(x,y) {
    const contact=this.contact(x,y),direction={x:this.direction<0?-1:1,y:0};let count=0;
    if(contact){
      const before=new Set(this.bodies),power=this.mods.hammer?1.35:1;
      if(contact.piece)this.impulse(contact.piece,contact.q,{x:direction.x*.18*power,y:0});
      count=this.applyImpact(contact.piece,contact.q,direction,power);
      const released=this.bodies.filter(p=>!before.has(p));
      if(!contact.piece&&released.length){
        const mass=released.reduce((sum,p)=>sum+p.body.mass,0);
        for(const p of released)this.impulse(p,contact.q,{x:direction.x*.18*power*p.body.mass/mass,y:0});
      }
    }
    this.note({kind:'tool-strike',x:contact?.q.x??x,y:contact?.q.y??y,count,direction:direction.x});
  }

  blast(bomb) {
    const {x,y,radius}=bomb;let count=0;
    const targets=[null,...this.bodies],before=new Set(this.bodies);
    for(const piece of targets){
      if(piece&&!this.bodies.includes(piece))continue;
      const nearby=this.material(piece).filter(v=>Math.hypot(v.q.x-x,v.q.y-y)<=radius);
      if(!nearby.length)continue;
      const center=piece?.body.position||nearby.reduce((a,v)=>({x:a.x+v.q.x/nearby.length,y:a.y+v.q.y/nearby.length}),{x:0,y:0});
      const direction={x:center.x-x,y:center.y-y};if(Math.hypot(direction.x,direction.y)<.1)direction.y=-1;
      const length=Math.hypot(direction.x,direction.y);
      if(piece)this.impulse(piece,{x,y},{x:direction.x/length*.28,y:direction.y/length*.28});
      count+=this.applyImpact(piece,{x,y},direction,2.8,'blast',radius);
    }
    for(const p of this.bodies)if(!before.has(p)){
      const dx=p.body.position.x-x,dy=p.body.position.y-y,len=Math.hypot(dx,dy)||1;
      this.impulse(p,{x,y},{x:dx/len*.06,y:dy/len*.06});
    }
    this.note({kind:'tool-blast',phase:'blast',x,y,radius,count,secondary:bomb.secondary});
  }

  breakContact(x,y,contains,limit=Infinity) {
    const candidates=[];
    for(const piece of [null,...this.bodies])for(const v of this.material(piece))if(contains(v.q))candidates.push({...v,piece});
    candidates.sort((a,b)=>Math.hypot(a.q.x-x,a.q.y-y)-Math.hypot(b.q.x-x,b.q.y-y));
    const chosen=candidates.slice(0,limit),changed=new Map();let staticCut=false;
    for(const {p,piece,q} of chosen){
      this.emitPixel(piece?p:{...p,...q},piece);
      if(piece){if(!changed.has(piece))changed.set(piece,new Set());changed.get(piece).add(p.id);}
      else {this.cells[p.id]=0;this.targetReleased+=this.target[p.id];staticCut=true;}
    }
    for(const [piece,ids] of changed){this.removePiece(piece);this.addConnected(piece.pixels.filter(p=>!ids.has(p.id)),piece,piece.damage);}
    if(staticCut)this.detach();
    if(chosen.length){this.rasterize();this.version++;}
    return chosen.length;
  }

  work(x,y,dt,multiplier=1,from={x,y}) {
    if(this.settled||!from||![x,y,dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    const vx=x-from.x,vy=y-from.y,length=vx*vx+vy*vy;
    const distance=q=>{const t=length?clamp(((q.x-from.x)*vx+(q.y-from.y)*vy)/length,0,1):0;return (q.x-from.x-t*vx)**2+(q.y-from.y-t*vy)**2;};
    if(this.tool==='cutter'){
      this.cutBudget+=this.cutRate*dt;
      const count=this.breakContact(x,y,q=>distance(q)<=9,Math.floor(this.cutBudget+1e-8));
      this.cutBudget=clamp(this.cutBudget-count,0,.999999);
      if(count)this.note({kind:'cut',x,y,count});
      if(this.mods.cutter&&this.toolCooldowns.cutter<=0){
        const count=this.breakContact(x,y,q=>Math.abs(q.y-y)<=.55&&Math.abs(q.x-x)<=8);
        this.toolCooldowns.cutter=.65;this.note({kind:'tool-line',x:x-8,y,x2:x+8,y2:y,count});
      }
    } else if(this.toolCooldowns[this.tool]<=0){
      if(this.tool==='hammer'){this.hammer(x,y);this.toolCooldowns.hammer=.45;}
      else {
        const bomb={x,y,radius:5,delay:.35,secondary:false};this.bombs.push(bomb);this.note({kind:'tool-blast',phase:'fuse',...bomb});
        if(this.mods.bomb)this.bombs.push({x:x+(this.direction<0?-4:4),y,radius:5,delay:.65,secondary:true});
        this.toolCooldowns.bomb=.9;
      }
    }
    this.collectAlong(distance,dt,multiplier);
  }

  collectAlong(distance,dt,multiplier=1) {
    this.suctionBudget+=this.suctionRate*multiplier*dt;
    const nearby=[],radiusSquared=this.suctionRadius**2;
    for(let i=0;i<this.sand.length;i++)if(this.sand[i]){const q={x:i%this.width+.5,y:Math.floor(i/this.width)+.5};if(distance(q)<=radiusSquared)nearby.push({i,q,color:this.sand[i],id:this.sandOrigins[i]-1});}
    for(const p of this.flying)if(distance(p)<=radiusSquared)nearby.push({p,q:p,color:p.color,id:p.id});
    nearby.sort((a,b)=>distance(a.q)-distance(b.q));
    const selected=nearby.slice(0,Math.floor(this.suctionBudget+1e-8)),removed=new Set();
    for(const v of selected){
      if(v.p)removed.add(v.p);else {this.sand[v.i]=0;this.sandOrigins[v.i]=0;this.speed[v.i]=0;}
      this.note({kind:'collect',x:v.q.x,y:v.q.y,color:v.color,id:v.id,count:1});
    }
    this.flying=this.flying.filter(p=>!removed.has(p));this.collected+=selected.length;
    this.suctionBudget=clamp(this.suctionBudget-selected.length,0,.999999);
    if(selected.length){this.version++;this.sandMoving=true;}
  }

  collisionStrength(speed) {return Math.min(3,(speed/26)**2*1.2);}

  recordCollisions(pairs) {
    if(!this.contacts)return;
    for(const pair of pairs){
      const a=pair.bodyA.parent,b=pair.bodyB.parent,point=pair.collision.supports[0];if(!point)continue;
      const at=body=>({x:body.velocity.x-body.angularVelocity*(point.y-body.position.y),y:body.velocity.y+body.angularVelocity*(point.x-body.position.x)});
      const av=at(a),bv=at(b),normal=pair.collision.normal;
      const speed=Math.max(0,-((av.x-bv.x)*normal.x+(av.y-bv.y)*normal.y))*60;
      if(speed<4)continue;
      for(const [body,sign] of [[a,1],[b,-1]]){
        const piece=body.plugin.piece;
        if(piece&&this.elapsed-piece.lastImpact>=.15)this.contacts.push({piece,point:{x:point.x,y:point.y},direction:{x:normal.x*sign,y:normal.y*sign},speed});
        else if(!piece&&this.staticBodies.includes(body))this.contacts.push({piece:null,point:{x:point.x,y:point.y},direction:{x:normal.x*sign,y:normal.y*sign},speed});
      }
    }
  }

  rasterize() {
    this.chunkCells.fill(0);this.chunkOwners.fill(0);
    for(let n=0;n<this.bodies.length;n++)for(const p of this.bodies[n].pixels){
      const q=this.pixelPosition(this.bodies[n],p),x=Math.floor(q.x),y=Math.floor(q.y);
      if(x<0||x>=this.width||y<0||y>=this.floorY)continue;
      const i=y*this.width+x;this.chunkCells[i]=p.color;this.chunkOwners[i]=n+1;
      if(this.sand[i]){this.emitPixel({id:this.sandOrigins[i]-1,x:x+.5,y:y+.5,color:this.sand[i]});this.sand[i]=0;this.sandOrigins[i]=0;this.speed[i]=0;}
    }
  }

  flushDebris() {for(const p of this.debris)this.emitPixel(p);this.debris=[];}

  stepFlying(dt) {
    const alive=[];
    for(const p of this.flying){
      // Grid units/second; swept substeps prevent high-speed grains crossing the floor or walls.
      const cap=this.tune('grainSpeedCap',240),gravity=this.tune('grainGravity',70);
      p.vx=clamp(p.vx,-cap,cap);p.vy=clamp(p.vy,-cap,cap);
      const steps=Math.min(64,Math.max(1,Math.ceil(Math.max(Math.abs(p.vx),Math.abs(p.vy)+gravity*dt)*dt/.4))),h=dt/steps;
      let deposited=false;
      for(let n=0;n<steps;n++){
        p.vy+=gravity*h;
        let nx=p.x+p.vx*h,ny=p.y+p.vy*h;
        if(nx<.5||nx>this.width-.5){nx=clamp(nx,.5,this.width-.5);p.vx*=-this.tune('grainBounce',.2);}
        if(ny<.5){ny=.5;p.vy=Math.abs(p.vy)*this.tune('grainBounce',.2);}
        const blocked=ny>=this.floorY-.5||this.occupied(Math.floor(ny)*this.width+Math.floor(nx));
        if(blocked){
          const xx=clamp(Math.floor(p.x),0,this.width-1),yy=clamp(Math.floor(p.y),0,this.floorY-1),i=yy*this.width+xx;
          if(!this.occupied(i)){this.sand[i]=p.color;this.sandOrigins[i]=(p.id??-1)+1;this.speed[i]=0;deposited=true;break;}
          // Overlapping conversion grains remain visible and collectable while drifting out locally.
          p.vx=p.vx*.4+(p.x<this.width/2?-.5:.5);p.vy=-Math.min(4,Math.abs(p.vy)*.1);p.x=nx;p.y=clamp(p.y+p.vy*h,.5,this.floorY-.5);
        } else {p.x=nx;p.y=ny;}
      }
      if(!deposited)alive.push(p);
    }
    this.flying=alive;
  }

  step(dt) {
    if(this.settled||!Number.isFinite(dt)||dt<=0)return;
    const elapsed=Math.min(.1,dt);
    for(const name of Object.keys(this.toolCooldowns))this.toolCooldowns[name]=Math.max(0,this.toolCooldowns[name]-elapsed);
    const bombs=this.bombs;this.bombs=[];
    for(const bomb of bombs){bomb.delay-=elapsed;if(bomb.delay<=1e-8)this.blast(bomb);else this.bombs.push(bomb);}
    this.sandElapsed+=elapsed;
    while(this.sandElapsed+1e-8>=1/30){
      const wasMoving=this.sandMoving;
      this.sandElapsed=Math.max(0,this.sandElapsed-1/30);this.tick++;this.elapsed+=1/30;
      for(let n=0;n<2;n++){
        this.enforceBodyBudget();
        for(const piece of this.bodies)this.limitMotion(piece);
        Engine.update(this.engine,1000/60);
        const contacts=this.contacts;this.contacts=[];
        const strongest=new Map();
        for(const hit of contacts){
          const target=hit.piece||hit;
          if(hit.speed>(strongest.get(target)?.speed||0))strongest.set(target,hit);
        }
        for(const hit of strongest.values()){
          if(hit.piece&&this.elapsed-hit.piece.lastImpact<this.tune('impactCooldown',.15))continue;
          this.applyImpact(hit.piece,hit.point,hit.direction,this.collisionStrength(hit.speed,hit.piece),'collision');
        }
        this.enforceBodyBudget();
        this.rasterize();this.stepFlying(1/60);
      }
      this.updateHinges();const moved=this.fastSandTick();
      this.sandMoving=moved||this.flying.length>0||this.bodies.some(p=>!p.body.isSleeping);
      if(wasMoving||this.sandMoving)this.version++;
    }
  }

  ledger() {return {static:this.cells.filter(Boolean).length,sand:this.sand.filter(Boolean).length,chunks:this.bodies.reduce((s,p)=>s+p.pixels.length,0),pending:this.flying.length+this.debris.length,collected:this.collected};}
  settle(profile) {if(!super.settle(profile))return false;this.flying=[];this.bombs=[];return true;}
}
