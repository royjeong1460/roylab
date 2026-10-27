const COLORS=[0xf1ce77,0xf0ae62,0xee8661,0xdd7185];
const caption=(stage,count)=>`${stage} CHAIN\n${count?`+${count} PIXELS`:'CRACK'}`;

export class ChainView {
 constructor(scene,viewport,reducedMotion=null){this.scene=scene;this.viewport=viewport;this.reducedMotion=reducedMotion;this.graphics=scene.add.graphics().setDepth(50);this.effects=[];}
 add(event){
  const key=`${event.chainId}:${event.edge}`,existing=this.effects.find(e=>e.key===key&&e.age<.15);
  if(existing){existing.count+=event.count;existing.label.setText(caption(event.stage,existing.count));return;}
  if(this.effects.length>=10)this.effects.shift().label.destroy();
  const color=COLORS[Math.min(3,event.stage-1)],label=this.scene.add.text(0,0,caption(event.stage,event.count),{fontFamily:'system-ui,sans-serif',fontSize:'17px',fontStyle:'bold',align:'center',color:`#${color.toString(16)}`,stroke:'#273c3c',strokeThickness:4}).setOrigin(.5,1).setDepth(60);
  this.effects.push({...event,key,color,label,age:0});
 }
 draw(dt){
  this.graphics.clear();
  for(const e of this.effects){
   e.age+=dt;
   const p=this.viewport.worldToScreen(e.x,e.y),alpha=Math.max(0,1-e.age/1.1),r=(6+Math.sqrt(e.count)*.7)*this.viewport.zoom;
   e.label.setPosition(Math.max(70,Math.min(this.viewport.viewWidth-70,p.x)),Math.max(54,p.y-12-(this.reducedMotion?.matches?0:e.age*30))).setAlpha(alpha);
   const flash=Math.max(0,1-e.age/.5);
   if(!flash||this.reducedMotion?.matches)continue;
   this.graphics.lineStyle(2,e.color,flash*.8).strokeCircle(p.x,p.y,r*(.45+e.age*2));
   this.graphics.fillStyle(e.color,flash*.8);
   for(let i=0;i<8;i++){const a=i*Math.PI/4+e.stage*.23,d=r*(.25+e.age*3);this.graphics.fillRect(p.x+Math.cos(a)*d-2,p.y+Math.sin(a)*d-2,4,4);}
  }
  this.effects=this.effects.filter(e=>{if(e.age<1.1)return true;e.label.destroy();return false;});
 }
 destroy(){for(const e of this.effects)e.label.destroy();this.graphics.destroy();}
}
