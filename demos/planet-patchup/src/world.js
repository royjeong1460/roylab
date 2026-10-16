export const C01 = {
  width: 96, height: 144, floorY: 132,
  shapes: [
    { rect: [16,72,6,60], color: 1 },
    { rect: [22,78,10,6], color: 2 },
    { rect: [32,70,42,30], color: 3, target: true },
  ],
};

export const createProfile = () => ({ coins: 0, suction: 0, claimed: false });

export class World {
  constructor(data = C01, mode = 'baseline') {
    if(!['baseline','accelerated','chunks','cascade'].includes(mode)) throw new Error('Invalid collapse mode');
    this.mode=mode;this.randomState=301;this.pieces=[];this.nextPieceId=1;
    const {width, height, floorY, shapes} = data;
    if (![width,height,floorY].every(Number.isInteger) || width < 1 || height < 1 ||
        width > 256 || height > 256 || floorY < 1 || floorY >= height || !Array.isArray(shapes)) throw new Error('Invalid grid');
    Object.assign(this, {width,height,floorY});
    this.cells = new Uint8Array(width*height);
    this.sand = new Uint8Array(width*height);
    // Display provenance only: original cell ID + 1; zero means unknown/empty.
    this.sandOrigins = new Uint32Array(width*height);
    this.speed = new Uint8Array(width*height);
    this.movedAt = new Uint32Array(width*height);
    this.chunkCells = new Uint8Array(width*height);
    this.chunkOwners = new Uint16Array(width*height);
    this.pending = new Uint8Array(width*height);
    this.releaseAt = new Uint32Array(width*height);
    this.target = new Uint8Array(width*height);
    for (const shape of shapes) {
      const [x,y,w,h] = shape.rect;
      if (![x,y,w,h].every(Number.isInteger) || x<0 || y<0 || w<1 || h<1 || x+w>width || y+h>floorY) throw new Error('Shape outside grid');
      for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) {
        const i=yy*width+xx;
        if(this.cells[i]) throw new Error('Overlapping shapes');
        this.cells[i]=shape.color || 1;
        this.target[i]=shape.target ? 1 : 0;
      }
    }
    this.initial=this.cells.reduce((s,v)=>s+!!v,0);
    this.targetInitial=this.target.reduce((s,v)=>s+v,0);
    if(!this.initial) throw new Error('Empty contract');
    this.targetReleased=0; this.collected=0;
    this.events=[]; this.sandMoving=false; this.sandElapsed=0; this.tick=0;
    this.cutRate=30;this.cutBudget=0; this.suctionBudget=0; this.version=0; this.settled=false;
  }

  neighbors(i) {
    const x=i%this.width, out=[];
    if(x>0) out.push(i-1);
    if(x<this.width-1) out.push(i+1);
    if(i>=this.width) out.push(i-this.width);
    if(i+this.width<this.cells.length) out.push(i+this.width);
    return out;
  }

  makeSand(i) {
    if(!this.cells[i]) return;
    this.sand[i]=this.cells[i];this.sandOrigins[i]=i+1;this.cells[i]=0;this.speed[i]=0;
    this.targetReleased+=this.target[i];this.sandMoving=true;this.version++;
  }

  random() {
    this.randomState=(Math.imul(this.randomState,1664525)+1013904223)>>>0;
    return this.randomState/4294967296;
  }

  detach(origin={x:this.width/2,y:this.floorY/2}) {
    const seen=new Uint8Array(this.cells.length), queue=[];
    for(let x=0;x<this.width;x++) {
      const i=(this.floorY-1)*this.width+x;
      if(this.cells[i]) {seen[i]=1;queue.push(i);}
    }
    for(let head=0;head<queue.length;head++) for(const n of this.neighbors(queue[head])) {
      if(this.cells[n] && !seen[n]) {seen[n]=1;queue.push(n);}
    }
    const released=[];let x=0,y=0;
    for(let i=0;i<this.cells.length;i++) {
      if(!this.cells[i] || seen[i]) continue;
      released.push(i);x+=i%this.width+.5;y+=Math.floor(i/this.width)+.5;
    }
    if(this.mode==='chunks'&&released.length>8&&this.pieces.length<12) this.makePieces(released);
    else for(const i of released) {
      if(this.mode==='cascade') {
        this.pending[i]=this.cells[i];this.cells[i]=0;this.targetReleased+=this.target[i];
        const distance=Math.hypot(i%this.width+.5-origin.x,Math.floor(i/this.width)+.5-origin.y);
        this.releaseAt[i]=this.tick+1+Math.min(8,Math.floor(distance/6))+Math.floor(this.random()*2);
      } else this.makeSand(i);
    }
    if(released.length) {
      this.version++;this.sandMoving=true;
      this.events.push({kind:'detach',count:released.length,x:x/released.length,y:y/released.length});
    }
  }

  makePieces(indices) {
    const count=Math.min(12-this.pieces.length,Math.max(2,Math.ceil(indices.length/140)));
    const seeds=[indices[Math.floor(this.random()*indices.length)]], distances=new Float32Array(indices.length).fill(Infinity);
    // ponytail: at most 12 Voronoi regions; no per-pixel rigid bodies or rotation in this comparison.
    for(let n=1;n<count;n++) {
      const seed=seeds.at(-1);let farthest=0;
      for(let k=0;k<indices.length;k++) {
        const i=indices[k],distance=(i%this.width-seed%this.width)**2+(Math.floor(i/this.width)-Math.floor(seed/this.width))**2;
        distances[k]=Math.min(distances[k],distance);
        if(distances[k]>distances[farthest])farthest=k;
      }
      seeds.push(indices[farthest]);
    }
    const groups=seeds.map(()=>[]);
    for(const i of indices) {
      let best=0,nearest=Infinity;
      for(let n=0;n<seeds.length;n++) {
        const distance=(i%this.width-seeds[n]%this.width)**2+(Math.floor(i/this.width)-Math.floor(seeds[n]/this.width))**2;
        if(distance<nearest){nearest=distance;best=n;}
      }
      groups[best].push({i,color:this.cells[i]});this.targetReleased+=this.target[i];this.cells[i]=0;
    }
    for(const pixels of groups)if(pixels.length) {
      const bottom=Math.max(...pixels.map(p=>Math.floor(p.i/this.width)));
      const piece={pixels,id:this.nextPieceId++,offset:0,speed:0,carry:0,delay:Math.floor(this.random()*3),bottom};
      this.pieces.push(piece);
      for(const p of pixels){this.chunkCells[p.i]=p.color;this.chunkOwners[p.i]=piece.id;}
    }
  }

  occupied(i) {return this.cells[i]||this.sand[i]||this.chunkCells[i]||this.pending[i];}

  stepPieces() {
    const alive=[];
    for(const piece of [...this.pieces].sort((a,b)=>(b.bottom+b.offset)-(a.bottom+a.offset))) {
      if(piece.delay-->0){alive.push(piece);continue;}
      for(const p of piece.pixels){const i=p.i+piece.offset*this.width;this.chunkCells[i]=0;this.chunkOwners[i]=0;}
      piece.speed=Math.min(5,piece.speed+.7);piece.carry+=piece.speed;
      const steps=Math.floor(piece.carry);piece.carry-=steps;
      let hit=false;
      for(let n=0;n<steps;n++) {
        if(piece.pixels.some(p=>{
          const next=p.i+(piece.offset+1)*this.width;
          return next>=this.floorY*this.width||this.occupied(next);
        })){hit=true;break;}
        piece.offset++;
      }
      for(const p of piece.pixels){
        const i=p.i+piece.offset*this.width;
        if(hit){this.sand[i]=p.color;this.sandOrigins[i]=p.i+1;this.speed[i]=0;}
        else {this.chunkCells[i]=p.color;this.chunkOwners[i]=piece.id;}
      }
      if(!hit)alive.push(piece);
      this.version++;
    }
    this.pieces=alive;
  }

  fastSandTick() {
    const {width,floorY,sand,sandOrigins,speed,movedAt}=this,direction=this.tick%2?1:-1;
    let moved=false;
    for(let y=floorY-1;y>=0;y--)for(let x=direction===1?0:width-1;x>=0&&x<width;x+=direction) {
      const i=y*width+x;
      if(!sand[i]||movedAt[i]===this.tick)continue;
      const origin=sandOrigins[i],color=sand[i],velocity=Math.min(6,speed[i]+1);let at=i,hit=false;
      sand[i]=0;sandOrigins[i]=0;speed[i]=0;
      for(let n=0;n<velocity;n++) {
        if(at+width<floorY*width&&!this.occupied(at+width)){at+=width;continue;}
        hit=true;
        const side=this.random()<.5?-1:1;
        let diagonal=-1;
        for(const dx of [side,-side])if(at%width+dx>=0&&at%width+dx<width&&at+width<floorY*width&&
          !this.occupied(at+width+dx)&&!sand[at+dx]&&!this.chunkCells[at+dx]&&!this.pending[at+dx]){diagonal=at+width+dx;break;}
        if(diagonal>=0)at=diagonal;
        else if(velocity>=3)for(let kick=0;kick<2;kick++) {
          if(at%width+side<0||at%width+side>=width||this.occupied(at+side))break;
          at+=side;
        }
        break;
      }
      sand[at]=color;sandOrigins[at]=origin;speed[at]=hit?0:velocity;movedAt[at]=this.tick;
      moved ||= at!==i;
    }
    return moved;
  }

  work(x,y,dt,suctionMultiplier=1,from={x,y}) {
    if(this.settled || ![x,y,dt,suctionMultiplier,from.x,from.y].every(Number.isFinite) || dt<=0 || dt>.1 || suctionMultiplier<=0) return;
    const vx=x-from.x, vy=y-from.y, len=vx*vx+vy*vy;
    const distance=(px,py)=>{
      const t=len ? Math.max(0,Math.min(1,((px-from.x)*vx+(py-from.y)*vy)/len)) : 0;
      return (px-from.x-t*vx)**2+(py-from.y-t*vy)**2;
    };
    const candidates=[];
    for(let yy=Math.max(0,Math.floor(Math.min(y,from.y)-3));yy<Math.min(this.floorY,Math.ceil(Math.max(y,from.y)+3));yy++) {
      for(let xx=Math.max(0,Math.floor(Math.min(x,from.x)-3));xx<Math.min(this.width,Math.ceil(Math.max(x,from.x)+3));xx++) {
        const i=yy*this.width+xx;
        if(this.cells[i] && distance(xx+.5,yy+.5)<=9) candidates.push(i);
      }
    }
    candidates.sort((a,b)=>distance(a%this.width+.5,Math.floor(a/this.width)+.5)-distance(b%this.width+.5,Math.floor(b/this.width)+.5));
    this.cutBudget+=this.cutRate*dt;
    const cut=Math.min(candidates.length,Math.floor(this.cutBudget+1e-8));
    for(const i of candidates.slice(0,cut)) this.makeSand(i);
    this.cutBudget-=cut;
    if(cut<candidates.length || !candidates.length) this.cutBudget%=1;
    else this.cutBudget=Math.min(this.cutBudget,.999999);
    if(cut) {this.version++;this.events.push({kind:'cut',x,y,count:cut});this.detach({x,y});}
    this.suctionBudget+=80*suctionMultiplier*dt;
    const nearby=[];
    for(let yy=Math.max(0,Math.floor(Math.min(y,from.y)-12));yy<Math.min(this.floorY,Math.ceil(Math.max(y,from.y)+12));yy++) {
      for(let xx=Math.max(0,Math.floor(Math.min(x,from.x)-12));xx<Math.min(this.width,Math.ceil(Math.max(x,from.x)+12));xx++) {
        const i=yy*this.width+xx;
        if(this.sand[i] && distance(xx+.5,yy+.5)<=144) nearby.push(i);
      }
    }
    nearby.sort((a,b)=>distance(a%this.width+.5,Math.floor(a/this.width)+.5)-distance(b%this.width+.5,Math.floor(b/this.width)+.5));
    const recovered=Math.min(nearby.length,Math.floor(this.suctionBudget+1e-8));
    for(let n=0;n<recovered;n++) {
      const i=nearby[n];
      this.events.push({kind:'collect',x:i%this.width+.5,y:Math.floor(i/this.width)+.5,count:1,color:this.sand[i],id:this.sandOrigins[i]-1});
      this.sand[i]=0;this.sandOrigins[i]=0;this.speed[i]=0;
    }
    if(recovered){this.version++;this.sandMoving=true;}
    this.collected+=recovered;
    this.suctionBudget-=recovered;
    this.suctionBudget=Math.min(this.suctionBudget,.999999);
  }

  step(dt) {
    if(this.settled || !Number.isFinite(dt) || dt<=0) return;
    this.sandElapsed+=Math.min(dt,.1);
    const {width,floorY,cells,sand}=this;
    // ponytail: scan this 96x144 grid; use active regions only if larger sites need them.
    while(this.sandElapsed+1e-8>=1/30) {
      this.sandElapsed=Math.max(0,this.sandElapsed-1/30);
      const direction=this.tick++%2===0?1:-1;
      let moved=false;
      for(let i=0;i<this.pending.length;i++)if(this.pending[i]&&this.releaseAt[i]<=this.tick){
        sand[i]=this.pending[i];this.sandOrigins[i]=i+1;this.pending[i]=0;this.speed[i]=0;moved=true;
      }
      if(this.pieces.length)this.stepPieces();
      if(this.mode==='accelerated'||this.mode==='cascade') moved=this.fastSandTick()||moved;
      else for(let y=floorY-1;y>0;y--) {
        for(let x=direction===1?0:width-1;x>=0&&x<width;x+=direction) {
          const target=y*width+x;
          if(this.occupied(target)) continue;
          let source=target-width;
          if(!sand[source]) {
            let first=-1,second=-1;
            // Diagonal donors must be supported; their own straight fall wins otherwise.
            if(x+direction>=0&&x+direction<width&&sand[source+direction]&&this.occupied(target+direction)) first=source+direction;
            if(x-direction>=0&&x-direction<width&&sand[source-direction]&&this.occupied(target-direction)) second=source-direction;
            if(first<0&&second<0) continue;
            source=first>=0&&second>=0?(Math.random()<.5?first:second):Math.max(first,second);
          }
          sand[target]=sand[source];sand[source]=0;this.sandOrigins[target]=this.sandOrigins[source];this.sandOrigins[source]=0;moved=true;
        }
      }
      this.sandMoving=moved||this.pieces.length>0||this.pending.some(Boolean);
      if(moved)this.version++;
    }
  }

  ledger() {
    return {static:this.cells.reduce((s,v)=>s+!!v,0),sand:this.sand.reduce((s,v)=>s+!!v,0),
      chunks:this.chunkCells.reduce((s,v)=>s+!!v,0),pending:this.pending.reduce((s,v)=>s+!!v,0),collected:this.collected};
  }
  ready() {return !this.settled && this.targetReleased>=this.targetInitial*.95 && this.collected>=this.initial*.7 && !this.sandMoving;}
  settle(profile=null) {
    if(!this.ready()) return false;
    this.settled=true;this.cells.fill(0);this.sand.fill(0);this.sandOrigins.fill(0);this.collected=this.initial;this.targetReleased=this.targetInitial;this.version++;
    if(profile&&!profile.claimed) {profile.coins+=120;profile.claimed=true;}
    return true;
  }
  buySuction(profile) {
    if(!this.settled || profile.suction!==0 || profile.coins<120) return false;
    profile.coins-=120;profile.suction=1;return true;
  }
}
