// Three presentation states. No physics, unlocks, rewards or saved counters here.
export function restorationTier(ratio){return Number.isFinite(ratio)&&ratio>=1?1:Number.isFinite(ratio)&&ratio>=.7?.7:0;}
export function environmentStyle(restoration){
 const tier=restorationTier(restoration);
 return tier===1?{sky:'#a9c7cf',horizon:'#cad4c2',ground:'#a08365',dust:0}:
 tier===.7?{sky:'#b6c3bc',horizon:'#c8c6ac',ground:'#96816a',dust:.08}:
 {sky:'#aca696',horizon:'#afa58f',ground:'#776653',dust:.26};
}
const names=['01-compacted','02-panels','03-pipes','04-appliances','05-drums','06-mixed'];
// Ten overlapping piles share the ground plane, not two floating shelves.
export function environmentDebris(restoration){
 const tier=restorationTier(restoration),remaining=tier===1?[]:tier===.7?[0,5,9]:[0,1,2,3,4,5,6,7,8,9];
 const positions=[[-.21,.54],[.01,.49],[.25,.51],[.49,.48],[.73,.50],[-.08,.30],[.12,.35],[.35,.32],[.57,.34],[.79,.31]];
 const materials=[0,5,3,4,1,2,0,1,3,4];
 return remaining.map(i=>({i,name:names[materials[i]],x:positions[i][0],width:positions[i][1],row:Math.floor(i/5)}));
}
export function drawArchEnvironment(c,images,{width:w,height:h,floor:f,restoration=0}){
 const tier=restorationTier(restoration),style=environmentStyle(tier);
 c.imageSmoothingEnabled=false;c.globalAlpha=1;c.clearRect(0,0,w,h);
 const sprite=(name,x,base,width,alpha=1,maxHeight=Infinity)=>{
  const im=images[name];if(!im)return;
  width=Math.min(width,maxHeight*im.width/im.height);const height=Math.round(im.height*width/im.width);
  c.globalAlpha=alpha;c.drawImage(im,Math.round(x),Math.round(base-height),Math.round(width),height);c.globalAlpha=1;
 };
 c.fillStyle=style.sky;c.fillRect(0,0,w,h);
 for(let i=0;i<4;i++)sprite(`shared-cloud-${'abc'[i%3]}`,i*w/3-w*.08,f*.19+(i%2)*f*.045,w*.29,tier?.72:.42);
 // An uneven pixel ridge replaces the full-width horizontal colour band.
 c.fillStyle=style.horizon;
 for(let x=0;x<w;x+=8){
  const u=x/w,y=Math.round((f*.79+Math.sin(u*9+.4)*f*.025+Math.sin(u*23)*f*.009)/4)*4;
  c.fillRect(x,y,8,h-y);
 }
 for(let i=-1;i<3;i++)sprite(`shared-mesa-${'abc'[(i+3)%3]}`,i*w*.43,f*.82,w*.63,.32);
 // Intact cultural buildings appear only after the waste has been cleared.
 if(tier){
  sprite('arch-building-b',-w*.08,f-9,w*.37,.72);
  sprite('arch-building-a',w*.23,f-12,w*.55,.86);
  sprite('arch-building-c',w*.78,f-8,w*.28,.72);
 }
 for(const p of environmentDebris(tier)){
  const base=f+4+(p.i%3)*3;
  // Low piles fill the valleys of tall rear heaps; their bases extend under the floor.
  sprite(p.name,p.x*w,base,w*p.width,p.row?.86:.70,f*.62);
 }
 if(style.dust){c.globalAlpha=style.dust;c.fillStyle=style.sky;c.fillRect(0,0,w,f);c.globalAlpha=1;}
 c.fillStyle=style.ground;c.fillRect(0,f,w,h-f);
 if(tier===1){
  // Calm clear water and small vegetation remain scenery, never physics bodies.
  c.fillStyle='#83a8aa';c.fillRect(w*.04,f-5,w*.29,5);
  c.fillStyle='#a8ced0';c.fillRect(w*.07,f-4,w*.12,1);
  c.fillStyle='#8f9f74';for(const x of [.02,.37,.71,.93]){c.fillRect(Math.round(w*x),f-3,12,3);c.fillRect(Math.round(w*x)+3,f-6,4,3);}
 }
 for(let x=0;x<w;x+=192)sprite(`arch-ground-${'abc'[Math.floor(x/192)%3]}`,x,f+28,192,.85);
 return {restoration:tier,debrisCount:environmentDebris(tier).length};
}
