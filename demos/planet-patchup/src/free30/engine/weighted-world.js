import Engine from 'phaser/src/physics/matter-js/lib/core/Engine.js';
import Events from 'phaser/src/physics/matter-js/lib/core/Events.js';
import Sleeping from 'phaser/src/physics/matter-js/lib/core/Sleeping.js';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import Bodies from 'phaser/src/physics/matter-js/lib/factory/Bodies.js';
import Constraint from 'phaser/src/physics/matter-js/lib/constraint/Constraint.js';
import { World, C01 } from './world.js';

const MAX_BODIES=18;
const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});

// Merge equal row runs into rectangles: one compound per piece, never one body per pixel.
function rectangles(pixels) {
  const rows=new Map(),rects=[],active=new Map();
  for(const p of pixels){if(!rows.has(p.y))rows.set(p.y,[]);rows.get(p.y).push(p.x);}
  for(const [y,xs] of [...rows].sort((a,b)=>a[0]-b[0])) {
    xs.sort((a,b)=>a-b);
    for(let n=0;n<xs.length;){
      const start=xs[n++];let end=start;
      while(n<xs.length&&Math.abs(xs[n]-end-1)<1e-6)end=xs[n++];
      const key=start+':'+end,previous=active.get(key);
      if(previous&&Math.abs(previous.y+previous.h-y)<1e-6)previous.h++;
      else {const rect={x:start,y,w:end-start+1,h:1};rects.push(rect);active.set(key,rect);}
    }
  }
  return rects;
}

export class WeightedWorld extends World {
  constructor(data=C01) {
    super(data,'accelerated');this.mode='weighted';
    this.bodies=[];this.debris=[];this.history=[];this.stage='밑동이 무게를 버티는 중';
    this.original=this.cells.slice();this.staticBodies=[];this.elapsed=0;
    this.originalGroup=new Uint16Array(this.cells.length);this.originalSections=[];
    for(let start=0;start<this.cells.length;start++)if(this.cells[start]&&!this.originalGroup[start]){
      const id=this.originalSections.length+1,queue=[start],rows=Array.from({length:this.height},()=>[]);
      this.originalGroup[start]=id;
      for(let n=0;n<queue.length;n++){
        const i=queue[n];rows[Math.floor(i/this.width)].push(i);
        for(const next of this.neighbors(i))if(this.cells[next]&&!this.originalGroup[next]){this.originalGroup[next]=id;queue.push(next);}
      }
      this.originalSections.push(rows);
    }
    this.engine=Engine.create({enableSleeping:true,gravity:{x:0,y:1,scale:.00007},constraintIterations:4});
    const fixed={isStatic:true,friction:.8,restitution:.05};
    Composite.add(this.engine.world,[
      Bodies.rectangle(this.width/2,this.floorY+5,this.width+20,10,fixed),
      Bodies.rectangle(-5,this.floorY/2,10,this.floorY*3,fixed),
      Bodies.rectangle(this.width+5,this.floorY/2,10,this.floorY*3,fixed),
    ]);
    this.syncStatic();
    Events.on(this.engine,'collisionStart',event=>this.recordCollisions(event.pairs));
    this.impacts=new Map();
  }

  // Optional instance parameters are used only by the local physics lab.
  tune(key,fallback) {return this.labParameters?.[key]??fallback;}

  note(event) {
    this.events.push(event);this.history.push(event);
    if(this.history.length>120)this.history.shift();
  }

  syncStatic() {
    for(const piece of this.bodies)Sleeping.set(piece.body,false);
    for(const b of this.staticBodies)Composite.remove(this.engine.world,b);
    const pixels=[];
    for(let i=0;i<this.cells.length;i++)if(this.cells[i])pixels.push({x:i%this.width+.5,y:Math.floor(i/this.width)+.5});
    this.staticBodies=rectangles(pixels).map(r=>Bodies.rectangle(r.x+(r.w-1)/2,r.y+(r.h-1)/2,r.w,r.h,{isStatic:true,friction:this.tune('groundFriction',.8)}));
    Composite.add(this.engine.world,this.staticBodies);
  }

  loadGroups(indices) {return [indices];}

  detach() {
    const visited=new Uint8Array(this.cells.length),groups=[];
    for(let start=0;start<this.cells.length;start++)if(this.cells[start]&&!visited[start]){
      const group=[start];visited[start]=1;
      for(let n=0;n<group.length;n++)for(const i of this.neighbors(group[n]))if(this.cells[i]&&!visited[i]){visited[i]=1;group.push(i);}
      groups.push(group);
    }
    for(const indices of groups){
      if(!indices.some(i=>Math.floor(i/this.width)===this.floorY-1)){this.releaseBody(indices);continue;}
      // A section only weakens within its original structure, never a neighboring structure.
      const originalRows=this.originalSections[this.originalGroup[indices[0]]-1];
      for(let y=this.floorY-2;y>0;y--){
        const row=indices.filter(i=>Math.floor(i/this.width)===y);
        const original=originalRows[y].length;
        if(!row.length||row.length>=original||row.length>original*this.tune('supportFraction',.5))continue;
        if(originalRows[y].every(i=>this.cells[i]))continue;
        const above=indices.filter(i=>Math.floor(i/this.width)<=y);
        if(above.length<this.tune('minimumLoad',60))continue;
        let yielded=false;
        for(const section of this.loadGroups(above)){
          const supportRow=section.filter(i=>Math.floor(i/this.width)===y);
          if(section.length<this.tune('minimumLoad',60)||!supportRow.length)continue;
          const center=section.reduce((s,i)=>s+i%this.width+.5,0)/section.length;
          const left=Math.min(...supportRow.map(i=>i%this.width)),right=Math.max(...supportRow.map(i=>i%this.width))+1;
          if(center>=left&&center<=right)continue;
          const pivotX=center>right?right:left;
          const load=section.length*Math.abs(center-pivotX)/(supportRow.length*supportRow.length);
          if(load<this.tune('yieldLoad',450))continue;
          yielded=true;
          const piece=this.releaseBody(section);
          if(piece){
            const point={x:pivotX,y:y+1};
            const anchor=piece.pixels.reduce((best,p)=>{
              const a=this.pixelPosition(piece,p),b=this.pixelPosition(piece,best);
              return Math.hypot(a.x-point.x,a.y-point.y)<Math.hypot(b.x-point.x,b.y-point.y)?p:best;
            });
            const supportX=Math.floor(pivotX+(center>pivotX?-.5:.5));
            this.attachHinge(piece,point,anchor.id,(y+1)*this.width+supportX);
            this.stage='밑동 약화 · 무게 중심 쪽으로 기울어요';
            this.note({kind:'yield',x:point.x,y:point.y,count:section.length});
          }
        }
        if(yielded)break;
      }
    }
    this.updateHinges();this.syncStatic();this.rasterize();this.flushDebris();
  }

  releaseBody(indices) {
    const pixels=indices.map(i=>({id:i,x:i%this.width+.5,y:Math.floor(i/this.width)+.5,color:this.cells[i],scar:false}));
    for(const i of indices){this.cells[i]=0;this.targetReleased+=this.target[i];}
    const piece=this.addPiece(pixels);
    this.version++;this.sandMoving=true;
    if(piece)this.note({kind:'detach',x:piece.body.position.x,y:piece.body.position.y,count:pixels.length});
    return piece;
  }

  addPiece(pixels,parent=null,damage=0) {
    if(!pixels.length)return null;
    if((!this.independentFragments&&this.bodies.length>=MAX_BODIES)||pixels.length<4){
      for(const p of pixels)this.debris.push({...p,...(parent?this.pixelPosition(parent,p):{})});
      return null;
    }
    const options={friction:this.tune('friction',.7),frictionAir:this.tune('airFriction',.004),frictionStatic:this.tune('staticFriction',.5),restitution:this.tune('restitution',.08),density:this.tune('density',.002),slop:this.tune('slop',.025),sleepThreshold:45};
    const parts=rectangles(pixels).map(r=>Bodies.rectangle(r.x+(r.w-1)/2,r.y+(r.h-1)/2,r.w,r.h,options));
    const body=parts.length===1?parts[0]:Body.create({...options,parts});
    const center={...body.position};
    Body.setInertia(body,pixels.reduce((sum,p)=>sum+this.tune('inertia',.008)*((p.x-center.x)**2+(p.y-center.y)**2+1/6),0));
    const piece={body,damage,pixels:pixels.map(p=>({...p,x:p.x-center.x,y:p.y-center.y})),hinge:null,lastImpact:-1};
    if(parent){
      const offset=rotate(center.x,center.y,parent.body.angle);
      Body.setAngle(body,parent.body.angle);
      Body.setPosition(body,{x:parent.body.position.x+offset.x,y:parent.body.position.y+offset.y});
      Body.setVelocity(body,{x:parent.body.velocity.x-parent.body.angularVelocity*offset.y,y:parent.body.velocity.y+parent.body.angularVelocity*offset.x});
      Body.setAngularVelocity(body,parent.body.angularVelocity);
    }
    body.plugin.piece=piece;this.bodies.push(piece);Composite.add(this.engine.world,body);
    if(parent?.hinge&&pixels.some(p=>p.id===parent.anchorId)&&this.cells[parent.supportId])
      this.attachHinge(piece,parent.hinge.pointA,parent.anchorId,parent.supportId);
    return piece;
  }

  attachHinge(piece,point,anchorId,supportId) {
    const relative={x:point.x-piece.body.position.x,y:point.y-piece.body.position.y};
    piece.hinge=Constraint.create({pointA:{...point},bodyB:piece.body,pointB:relative,length:0,stiffness:this.tune('hingeStiffness',.35),damping:this.tune('hingeDamping',.02)});
    piece.anchorId=anchorId;piece.supportId=supportId;
    Composite.add(this.engine.world,piece.hinge);
  }

  updateHinges() {
    for(const piece of this.bodies)if(piece.hinge&&(Math.abs(piece.body.angle)>this.tune('hingeAngle',.5)||!this.cells[piece.supportId])){
      Composite.remove(this.engine.world,piece.hinge);piece.hinge=null;this.stage='남은 연결이 찢어져 떨어져요';
      this.note({kind:'tear',x:piece.body.position.x,y:piece.body.position.y,count:piece.pixels.length});
    }
  }

  pixelPosition(piece,pixel) {
    const p=rotate(pixel.x,pixel.y,piece.body.angle);
    return {x:piece.body.position.x+p.x,y:piece.body.position.y+p.y};
  }

  removePiece(piece) {
    if(piece.hinge)Composite.remove(this.engine.world,piece.hinge);
    Composite.remove(this.engine.world,piece.body);
    this.bodies=this.bodies.filter(p=>p!==piece);
    for(const other of this.bodies)Sleeping.set(other.body,false);
  }

  addConnected(pixels,parent,damage) {
    const remaining=new Map(pixels.map(p=>[p.id,p]));
    while(remaining.size){
      const first=remaining.values().next().value,group=[first];remaining.delete(first.id);
      for(let n=0;n<group.length;n++)for(const id of this.neighbors(group[n].id))if(remaining.has(id)){
        group.push(remaining.get(id));remaining.delete(id);
      }
      this.addPiece(group,parent,damage);
    }
  }

  recordCollisions(pairs) {
    for(const pair of pairs){
      const a=pair.bodyA.parent,b=pair.bodyB.parent,point=pair.collision.supports[0];
      if(!point)continue;
      const at=body=>({x:body.velocity.x-body.angularVelocity*(point.y-body.position.y),y:body.velocity.y+body.angularVelocity*(point.x-body.position.x)});
      const av=at(a),bv=at(b),normal=pair.collision.normal;
      const speed=Math.abs((av.x-bv.x)*normal.x+(av.y-bv.y)*normal.y)*60;
      for(const body of [a,b]){
        const piece=body.plugin.piece;
        if(!piece||speed<4||this.elapsed-piece.lastImpact<.15)continue;
        if(speed>(this.impacts.get(piece)?.speed||0))this.impacts.set(piece,{speed,point:{x:point.x,y:point.y}});
      }
    }
  }

  damagePiece(piece,speed,point) {
    if(!this.bodies.includes(piece)||!Number.isFinite(speed)||speed<=0)return;
    piece.lastImpact=this.elapsed;
    const energy=(speed/26)**2*Math.min(1.7,Math.sqrt(piece.pixels.length/180))*.32;
    piece.damage=Math.min(1.5,piece.damage+energy);
    const local=rotate(point.x-piece.body.position.x,point.y-piece.body.position.y,-piece.body.angle);
    // Scar pixels belong to the material, so they rotate and survive later fragmentation.
    for(const p of piece.pixels){
      const dx=p.x-local.x,dy=p.y-local.y;
      if(Math.hypot(dx,dy)<8+piece.damage*35&&Math.abs(dy-dx*.65-Math.sin(dx*.8)*1.6)<.8)p.scar=true;
    }
    this.note({kind:'impact',x:point.x,y:point.y,speed,damage:piece.damage,count:piece.pixels.length});
    this.stage='충격 흡수 · 금이 간 채 모양을 유지해요';this.version++;
    if(piece.damage<.38)return;
    const strong=piece.damage>=.72;
    const radius=strong?Math.min(18,5+speed*.12):0;
    const dust=[],remaining=[];
    for(const p of piece.pixels)(strong&&(piece.pixels.length<=22||Math.hypot(p.x-local.x,p.y-local.y)<radius)?dust:remaining).push(p);
    if(!strong&&piece.pixels.length<=22)return;
    this.removePiece(piece);
    for(const p of dust)this.debris.push({...p,...this.pixelPosition(piece,p)});
    // Divide in the material's local axes; the split inherits velocity, angle and scars.
    if(remaining.length){
      const xs=remaining.map(p=>p.x),ys=remaining.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
      const groups=[[],[],[],[]];
      for(const p of remaining)groups[(p.x>cx?1:0)+(p.y>cy?2:0)].push(p);
      for(const group of groups)this.addConnected(group,piece,Math.min(.32,piece.damage*.45));
    }
    this.stage=strong?'강한 충격 · 조각이 픽셀로 부서져요':'누적된 균열 · 큰 덩어리가 갈라져요';
    this.note({kind:'fracture',x:point.x,y:point.y,count:dust.length,strong});
    this.sandMoving=true;
  }

  rasterize() {
    this.chunkCells.fill(0);this.chunkOwners.fill(0);
    for(let n=0;n<this.bodies.length;n++)for(const p of this.bodies[n].pixels){
      const q=this.pixelPosition(this.bodies[n],p),x=Math.floor(q.x),y=Math.floor(q.y);
      if(x<0||x>=this.width||y<0||y>=this.floorY)continue;
      const i=y*this.width+x;
      this.chunkCells[i]=p.color;this.chunkOwners[i]=n+1;
      if(this.sand[i]){this.debris.push({id:this.sandOrigins[i]-1,x:x+.5,y:y+.5,color:this.sand[i]});this.sand[i]=0;this.sandOrigins[i]=0;this.speed[i]=0;}
    }
  }

  flushDebris() {
    const waiting=[];
    for(const p of this.debris){
      const x=Math.max(0,Math.min(this.width-1,Math.floor(p.x))),y=Math.max(0,Math.min(this.floorY-1,Math.floor(p.y)));
      let chosen=-1;
      // Find vacant cells near contact; never overwrite sand or lose rounded/overlapping pixels.
      for(let r=0;r<Math.max(this.width,this.floorY)&&chosen<0;r++){
        for(let dx=-r;dx<=r&&chosen<0;dx++)for(const dy of r===0?[0]:[-(r-Math.abs(dx)),r-Math.abs(dx)]){
          const xx=x+dx,yy=y+dy,i=yy*this.width+xx;
          if(xx>=0&&xx<this.width&&yy>=0&&yy<this.floorY&&!this.occupied(i)){chosen=i;break;}
        }
      }
      if(chosen<0)waiting.push(p);
      else {this.sand[chosen]=p.color;this.sandOrigins[chosen]=(p.id??-1)+1;this.speed[chosen]=1;this.sandMoving=true;}
    }
    this.debris=waiting;
  }

  work(x,y,dt,multiplier=1,from={x,y}) {
    if(this.settled||![x,y,dt,multiplier,from.x,from.y].every(Number.isFinite)||dt<=0||dt>.1||multiplier<=0)return;
    const budget=this.cutBudget+this.cutRate*dt,allowance=Math.floor(budget+1e-8),eventStart=this.events.length;
    super.work(x,y,dt,multiplier,from);
    // Static work may also detach a large component; use the actual cut event for the shared rate.
    const staticCut=this.events.slice(eventStart).find(e=>e.kind==='cut')?.count||0;
    const vx=x-from.x,vy=y-from.y,len=vx*vx+vy*vy,candidates=[];
    for(const piece of this.bodies)for(const p of piece.pixels){
      const q=this.pixelPosition(piece,p),t=len?Math.max(0,Math.min(1,((q.x-from.x)*vx+(q.y-from.y)*vy)/len)):0;
      const distance=(q.x-from.x-t*vx)**2+(q.y-from.y-t*vy)**2;
      if(distance<=9)candidates.push({piece,p,q,distance});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const chosen=candidates.slice(0,Math.max(0,allowance-staticCut)),changed=new Map();
    for(const c of chosen){if(!changed.has(c.piece))changed.set(c.piece,new Set());changed.get(c.piece).add(c.p);this.debris.push({...c.p,...c.q});}
    for(const [piece,removed] of changed){
      this.removePiece(piece);this.addConnected(piece.pixels.filter(p=>!removed.has(p)),piece,piece.damage);
    }
    this.cutBudget=Math.max(0,Math.min(.999999,budget-staticCut-chosen.length));
    if(chosen.length){this.note({kind:'cut',x,y,count:chosen.length});this.version++;}
    if(chosen.length||staticCut){this.rasterize();this.flushDebris();}
  }

  step(dt) {
    if(this.settled||!Number.isFinite(dt)||dt<=0)return;
    this.sandElapsed+=Math.min(.1,dt);
    while(this.sandElapsed+1e-8>=1/30){
      const wasMoving=this.sandMoving;
      this.sandElapsed=Math.max(0,this.sandElapsed-1/30);this.tick++;this.elapsed+=1/30;
      for(let n=0;n<2;n++){
        Engine.update(this.engine,1000/60);
        for(const [piece,impact] of this.impacts)this.damagePiece(piece,impact.speed,impact.point);
        this.impacts.clear();
      }
      this.updateHinges();
      this.rasterize();this.flushDebris();
      const moved=this.fastSandTick();
      this.sandMoving=moved||this.debris.length>0||this.bodies.some(p=>!p.body.isSleeping);
      if(wasMoving||this.sandMoving)this.version++;
    }
  }

  ledger() {
    return {static:this.cells.filter(Boolean).length,sand:this.sand.filter(Boolean).length,
      chunks:this.bodies.reduce((s,p)=>s+p.pixels.length,0),pending:this.debris.length,collected:this.collected};
  }

  settle(profile) {
    if(!super.settle(profile))return false;
    for(const piece of [...this.bodies])this.removePiece(piece);
    this.debris=[];this.chunkCells.fill(0);this.syncStatic();return true;
  }
}
