import {tones, palette, worldTheme} from './theme.js';
import {createBackdropPreview} from './backdrop-preview.js';
import {createTrashSurface,trashPreviewEnabled} from './trash-surface.js';

// Borrows world data for drawing only; never moves bodies or removes pixels.
export class WorldRenderer {
  constructor(scene, world, viewport, minimap, automaticSuction, {surface,createBackdrop=createBackdropPreview,collectibleStyle=null}={}) {
    this.scene=scene;this.world=world;this.viewport=viewport;this.minimap=minimap;
    this.automaticSuction=automaticSuction;this.collectibleStyle=collectibleStyle;
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const w=world;
    this.surface=surface??(trashPreviewEnabled()?createTrashSurface(w.width,w.cells):null);
    this.layer=scene.add.container(0,0);
    const bg=scene.add.graphics();bg.fillStyle(worldTheme.backgroundColor);bg.fillRect(0,0,w.width,w.height);
    bg.lineStyle(.25,worldTheme.grid,.08);
    for(let x=0;x<w.width;x+=8)bg.lineBetween(x,0,x,w.floorY);
    for(let y=0;y<w.floorY;y+=8)bg.lineBetween(0,y,w.width,y);
    bg.fillStyle(worldTheme.floorEdge);bg.fillRect(0,w.floorY,w.width,1.25);bg.fillStyle(worldTheme.floor);bg.fillRect(0,w.floorY+1.25,w.width,w.height-w.floorY-1.25);
    this.gridTexture=scene.textures.createCanvas('battery-grid',w.width,w.height);
    this.bodyTexture=scene.textures.createCanvas('battery-bodies',w.width*4,w.height*4);
    this.fx=scene.add.graphics();this.nozzle=scene.add.graphics();
    this.layer.add([bg,scene.add.image(0,0,'battery-grid').setOrigin(0),scene.add.image(0,0,'battery-bodies').setOrigin(0).setScale(.25),this.fx,this.nozzle]);
    this.backdropPreview=createBackdrop(scene,w,this.layer);
    this.effects=[];this.airTime=0;this.shownVersion=-1;
  }
  destroy() {
    this.backdropPreview?.destroy();
    this.layer.destroy(true);
    for(const key of ['battery-grid','battery-bodies']){
      if(this.scene.textures.exists(key))this.scene.textures.remove(key);
    }
  }
  transform() {
    const v=this.viewport;
    this.layer.setScale(v.zoom).setPosition(-v.x*v.zoom,-v.y*v.zoom);
    this.drawMinimap();
  }
  addEffect(event) {
    if(this.reducedMotion.matches)return;
    if(['collect','tool-line','tool-strike','tool-blast','cut','impact','fracture'].includes(event.kind)){
      this.effects.push({...event,age:0,life:event.phase==='fuse'?.35:event.kind==='tool-blast'?.4:this.automaticSuction&&event.kind==='collect'?.3:.22});
      if(this.effects.length>60)this.effects.shift();
    }
  }
  render(dt, {aim, working, selectedTool, direction, suctionOnly, hideCursor=false}) {
    const w=this.world, automaticSuction=this.automaticSuction;
    if(this.shownVersion!==w.version){
      const ctx=this.gridTexture.context;ctx.clearRect(0,0,w.width,w.height);
      for(let i=0;i<w.cells.length;i++){
        const color=w.cells[i]||(!this.collectibleStyle&&w.sand[i])||w.pending[i];if(!color)continue;
        const id=w.cells[i]||w.pending[i]?i:w.sandOrigins[i]-1;
        const x=i%w.width,y=Math.floor(i/w.width);ctx.fillStyle=this.surface?.css(id,color)||tones[color];ctx.fillRect(x,y,1,1);
        if(!this.surface&&(x*7+y*3)%11===0){ctx.fillStyle=worldTheme.grainHighlight;ctx.fillRect(x,y,1,1);}
      }
      const bodyCtx=this.bodyTexture.context;bodyCtx.clearRect(0,0,w.width*4,w.height*4);
      for(const piece of w.bodies){
        bodyCtx.save();bodyCtx.translate(piece.body.position.x*4,piece.body.position.y*4);bodyCtx.rotate(piece.body.angle);
        for(const p of piece.pixels){
          bodyCtx.fillStyle=this.surface?.css(p.id,p.color)||tones[p.color];bodyCtx.fillRect((p.x-.5)*4,(p.y-.5)*4,4,4);
          if(!this.surface&&p.id%11===0){bodyCtx.fillStyle=worldTheme.grainHighlight;bodyCtx.fillRect((p.x-.5)*4,(p.y-.5)*4,4,4);}
          if(p.scar){bodyCtx.fillStyle=worldTheme.scar;bodyCtx.fillRect((p.x-.5)*4,(p.y-.5)*4,4,3);}
        }
        bodyCtx.restore();
      }
      if(this.collectibleStyle)for(let i=0;i<w.sand.length;i++)if(w.sand[i])this.drawCollectible(bodyCtx,i%w.width,Math.floor(i/w.width));
      for(const grain of w.flying||[]){
        if(this.collectibleStyle)this.drawCollectible(bodyCtx,grain.x-.5,grain.y-.5);
        else{bodyCtx.fillStyle=this.surface?.css(grain.id,grain.color)||tones[grain.color];bodyCtx.fillRect((grain.x-.5)*4,(grain.y-.5)*4,4,4);}
      }
      for(const crack of w.crackSegments?.()||[]){
        bodyCtx.strokeStyle=crack.broken?worldTheme.brokenCrack:worldTheme.scar;bodyCtx.lineWidth=crack.broken?2:1;
        bodyCtx.beginPath();bodyCtx.moveTo(crack.x*4,crack.y*4);bodyCtx.lineTo(crack.x2*4,crack.y2*4);bodyCtx.stroke();
      }
      this.gridTexture.refresh();this.bodyTexture.refresh();this.shownVersion=w.version;this.drawMinimap();
    }
    const fx=this.fx;fx.clear();
    for(const e of this.effects){
      e.age+=dt;const t=Math.min(1,e.age/e.life),alpha=1-t;
      if(e.kind==='tool-line'){fx.lineStyle(.5,0xffae5e,alpha);fx.lineBetween(e.x,e.y,e.x2,e.y2);}
      else if(e.kind==='tool-strike'){fx.lineStyle(.75,0xb16d49,alpha);fx.lineBetween(e.x,e.y,e.x+(e.direction||direction)*8,e.y);}
      else if(e.kind==='collect'){
        const x=e.x+(aim.x-e.x)*t*t,y=e.y+(aim.y-e.y)*t*t;fx.fillStyle(this.collectibleStyle?.color??(this.surface?.color(e.id,e.color)||palette[e.color]),alpha);fx.fillRect(x-.5,y-.5,1,1);
      }else{fx.lineStyle(.5,e.phase==='fuse'?0xd55635:0xffb766,alpha);fx.strokeCircle(e.x,e.y,e.phase==='fuse'?(e.radius||6):1+t*(e.radius||4));}
    }
    this.effects=this.effects.filter(e=>e.age<e.life);const n=this.nozzle;n.clear();
    const {x,y}=aim,color=suctionOnly?0x447c68:selectedTool==='bomb'?0xb17151:selectedTool==='hammer'?0xa78247:0x447c68;
    const suctionActive=automaticSuction||working,suctionRadius=w.suctionRadius??12;
    n.fillStyle(color,suctionActive?.06:.025);n.fillCircle(x,y,suctionRadius);n.lineStyle(.3,color,suctionActive?.55:.22);n.strokeCircle(x,y,suctionRadius);
    if(automaticSuction&&!this.reducedMotion.matches){
      this.airTime+=dt;
      for(let i=0;i<3;i++){
        const phase=(this.airTime*.9+i/3)%1,angle=-Math.PI/2+i*Math.PI*2/3+this.airTime*.35,radius=(suctionRadius-1)*(1-phase)+1;
        n.lineStyle(.35,color,.15+.4*Math.sin(phase*Math.PI));n.beginPath();n.arc(x,y,radius,angle,angle+.7);n.strokePath();
      }
    }
    if(hideCursor)return;
    n.lineStyle(.6,working?0xf18a42:color,.9);n.strokeCircle(x,y,3);n.lineStyle(1,0x32524d);n.lineBetween(x,y+4,x,y+6.75);
    n.fillStyle(color);n.fillRoundedRect(x-1.75,y+5.5,3.5,4.25,1);n.fillStyle(0xeab572);n.fillRect(x-1,y+6.75,2,.75);
    if(!suctionOnly&&selectedTool!=='cutter'){n.lineStyle(.5,color,.8);n.lineBetween(x,y,x+direction*6,y);}
  }
  drawCollectible(ctx,x,y){
    // A steady mint face and shaded edge remain readable without blinking or glow.
    const px=x*4,py=y*4;ctx.fillStyle=this.collectibleStyle.fill;ctx.fillRect(px,py,4,4);
    ctx.fillStyle=this.collectibleStyle.rim;ctx.fillRect(px+3,py,1,4);ctx.fillRect(px,py+3,3,1);
  }
  drawMinimap() {
    if(!this.gridTexture)return;
    const w=this.world,v=this.viewport,c=this.minimap,ctx=c.getContext('2d'),scale=Math.min(c.width/w.width,c.height/w.height);
    const ox=(c.width-w.width*scale)/2,oy=(c.height-w.height*scale)/2;
    ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=worldTheme.minimapBackground;ctx.fillRect(0,0,w.width,w.height);ctx.fillStyle=worldTheme.minimapFloor;ctx.fillRect(0,w.floorY,w.width,w.height-w.floorY);
    ctx.drawImage(this.gridTexture.canvas,0,0);ctx.drawImage(this.bodyTexture.canvas,0,0,w.width,w.height);
    const r=v.rect(),left=Math.max(0,r.x),top=Math.max(0,r.y),right=Math.min(w.width,r.x+r.width),bottom=Math.min(w.height,r.y+r.height);
    ctx.strokeStyle=worldTheme.minimapViewport;ctx.lineWidth=1.4/scale;ctx.strokeRect(left,top,right-left,bottom-top);ctx.restore();
  }
}
