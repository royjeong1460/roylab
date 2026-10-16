const positive=value=>Number.isFinite(value)&&value>0;
const validSizes=(worldWidth,worldHeight,viewWidth,viewHeight)=>[worldWidth,worldHeight,viewWidth,viewHeight,viewWidth/worldWidth,viewHeight/worldHeight].every(positive);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export class MapViewport {
  constructor({worldWidth,worldHeight,viewWidth=384,viewHeight=576}) {
    if(!validSizes(worldWidth,worldHeight,viewWidth,viewHeight))throw new RangeError('Camera sizes must be finite and positive');
    Object.assign(this,{worldWidth,worldHeight,viewWidth,viewHeight});
    this.limits();this.reset();
  }
  limits() {
    this.minZoom=Math.min(this.viewWidth/this.worldWidth,this.viewHeight/this.worldHeight);
    this.maxZoom=Math.max(8,this.minZoom);
  }
  clamp() {
    const width=this.viewWidth/this.zoom,height=this.viewHeight/this.zoom;
    this.x=width>=this.worldWidth?(this.worldWidth-width)/2:clamp(this.x,0,this.worldWidth-width);
    this.y=height>=this.worldHeight?(this.worldHeight-height)/2:clamp(this.y,0,this.worldHeight-height);
    return this;
  }
  reset() {
    this.zoom=clamp(4,this.minZoom,this.maxZoom);
    this.x=0;this.y=this.worldHeight-this.viewHeight/this.zoom;
    return this.clamp();
  }
  fit() {
    this.zoom=this.minZoom;this.x=0;this.y=0;
    return this.clamp();
  }
  setSize(viewWidth,viewHeight) {
    if(!validSizes(this.worldWidth,this.worldHeight,viewWidth,viewHeight))return false;
    const center=this.screenToWorld(this.viewWidth/2,this.viewHeight/2);
    Object.assign(this,{viewWidth,viewHeight});this.limits();
    this.zoom=clamp(this.zoom,this.minZoom,this.maxZoom);
    this.x=center.x-viewWidth/this.zoom/2;this.y=center.y-viewHeight/this.zoom/2;
    return this.clamp();
  }
  pan(dx,dy) {
    if(![dx,dy].every(Number.isFinite))return false;
    this.x-=dx/this.zoom;this.y-=dy/this.zoom;
    return this.clamp();
  }
  zoomAt(factor,sx,sy) {
    if(!positive(factor)||![sx,sy].every(Number.isFinite))return false;
    const anchor=this.screenToWorld(sx,sy);
    if(![anchor.x,anchor.y].every(Number.isFinite))return false;
    this.zoom=clamp(this.zoom*factor,this.minZoom,this.maxZoom);
    this.x=anchor.x-sx/this.zoom;this.y=anchor.y-sy/this.zoom;
    return this.clamp();
  }
  screenToWorld(sx,sy) {return {x:this.x+sx/this.zoom,y:this.y+sy/this.zoom};}
  worldToScreen(x,y) {return {x:(x-this.x)*this.zoom,y:(y-this.y)*this.zoom};}
  rect() {return {x:this.x,y:this.y,width:this.viewWidth/this.zoom,height:this.viewHeight/this.zoom};}
}
