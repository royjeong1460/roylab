import {FreeJourney,FreeRun} from '../src/free30/journey.js';
import {FREE_SITES,FREE_BOSS} from '../src/free30/sites.js';
import {UPGRADES,totalSpent} from '../src/free30/balance.js';
const fresh=()=>new FreeJourney({getItem:()=>null,setItem:()=>{}},{request:async(_,f)=>f()}).profile;
export function collectAim(w,previous){
 const i=w.sand.findIndex(Boolean);return i>=0?{x:i%w.width+.5,y:Math.floor(i/w.width)+.5}:w.flying[0]||previous;
}
export function attackAim(w,site,shots,tool){
 // Cut low supports first; then target a dense, reachable mass with the selected tool.
 if(shots<site.preview.length)return site.preview[shots];
 const points=[];
 for(let id=0;id<w.cells.length;id++)if(w.cells[id])points.push({x:id%w.width+.5,y:Math.floor(id/w.width)+.5});
 for(const b of w.bodies)for(const {q} of w.material(b))if(w.validPoint(q.x,q.y))points.push(q);
 if(!points.length)return{x:w.width/2,y:w.floorY-2};
 let best=points[0],score=-Infinity,radius=tool==='blackhole'?w.stats().gravityRadius*.4:w.stats().bombRadius+2;
 for(let i=0;i<points.length;i+=Math.max(1,Math.floor(points.length/100))){const q=points[i];let n=0;for(let j=0;j<points.length;j+=3)if(Math.hypot(points[j].x-q.x,points[j].y-q.y)<radius)n++;if(n>score){score=n;best=q;}}
 return best;
}
export function play(site,p,{style='mixed',limit=180,interval=8}={}){
 const r=new FreeRun(site,p,site===FREE_BOSS?'boss':'random'),w=r.world;let shots=0,next=0;
 for(let tick=0;tick<30*limit&&!r.finishReady&&!r.qualified;tick++){
  if(tick>=next&&r.phase==='working'){
   const tool=p.owned.includes('blackhole')&&shots>=2&&(style==='blackhole'||style==='mixed'&&shots%2===0)?'blackhole':'bomb';
   r.selectTool(tool);if(w.canUseTool()){r.press(attackAim(w,site,shots,tool));r.release();shots++;next=tick+30*interval;}
  }
  r.update(1/30,{...collectAim(w,r.aim),working:false});w.events=[];
 }
 const d=w.diagnostics();if(!d.finite||!d.balanced)throw Error('Invalid physics ledger');
 return {site:site.id,qualified:r.qualified,recovered:w.collected,total:w.initial,shots,seconds:+w.elapsed.toFixed(1),energy:w.charge,reason:r.finishReason};
}
if(process.argv.includes('--probes')){
 for(const [name,levels] of [['starter',{}],['early',{capacity:4,bombRange:4,bombForce:3}],['middle',{capacity:8,bombRange:6,bombForce:5,gravityForce:3,coreMix:4,wearSpeed:4,suction:4,range:4}],['max',Object.fromEntries(Object.entries(UPGRADES).map(([k,v])=>[k,v.max]))]]){
  const p=fresh();Object.assign(p.upgrades,levels);if(['middle','max'].includes(name))p.owned.push('blackhole');
  for(const style of p.owned.length>1?['bomb','blackhole','mixed']:['bomb'])console.log(JSON.stringify({name,style,spent:totalSpent(p),...play(FREE_BOSS,p,{style})}));
  if(name==='starter')for(const site of FREE_SITES.slice(0,2))console.log(JSON.stringify({name,...play(site,p)}));
 }
}
