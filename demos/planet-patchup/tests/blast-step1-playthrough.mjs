import {BlastJourney,BlastRun} from '../src/blast-step1/journey.js';
import {STEP1_BOSS} from '../src/free-step1/sites.js';
const j=new BlastJourney({getItem:()=>null,setItem:()=>{}},{request:async(_,f)=>f()});
const p=structuredClone(j.profile);p.owned.push('blackhole');Object.assign(p.upgrades,{capacity:24,suction:20,range:16,bombRange:5,bombForce:5,gravityForce:5});
const r=new BlastRun(STEP1_BOSS,p,'boss'),w=r.world;let shots=0;
function target(){
 if(shots===0)return{x:27,y:208};if(shots===1)return{x:133,y:208};
 const b=w.bodies.reduce((a,b)=>!a||a.pixels.length<b.pixels.length?b:a,null);if(!b)return{x:w.width/2,y:w.floorY-8};
 const m=w.material(b);let best=m[0].q,count=-1;
 for(let i=0;i<m.length;i+=32){const q=m[i].q;if(!w.validPoint(q.x,q.y))continue;const score=m.reduce((s,p)=>s+(Math.hypot(q.x-p.q.x,q.y-p.q.y)<8),0);if(score>count){count=score;best=q;}}
 return best;
}
for(let n=0;n<30*180&&!r.finishReady&&!r.qualified;n++){
 if(n%90===0&&w.charge>0){r.press(target());r.release();shots++;}
 const i=w.sand.findIndex(Boolean),aim=i>=0?{x:i%w.width+.5,y:Math.floor(i/w.width)+.5}:w.flying[0]||r.aim;
 r.update(1/30,{...aim,working:false});w.events=[];
}
console.log(JSON.stringify({qualified:r.qualified,recovered:w.collected,total:w.initial,shots,seconds:w.elapsed,energy:w.charge,note:'Max-upgrade reachability fixture, not player pacing.'}));
if(!r.qualified)process.exitCode=1;
