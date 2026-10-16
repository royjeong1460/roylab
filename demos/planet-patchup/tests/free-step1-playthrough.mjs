import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Step1Journey,Step1Run} from '../src/free-step1/journey.js';
import {STEP1_SITES,STEP1_BOSS} from '../src/free-step1/sites.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const locks={request:async(_name,fn)=>fn()};
const fresh=new Step1Journey(memory(),locks).profile;
const report=JSON.parse(readFileSync(new URL('../evidence/free-step1-map-report.json',import.meta.url)));
const fixture=report.fixture.trials.find(t=>t.capacity===130);
const p=structuredClone(fresh);p.owned.push('bomb');Object.assign(p.upgrades,{capacity:14,suction:10,range:10,bombRange:5,bombForce:5});
const r=new Step1Run(STEP1_BOSS,p,'boss');const actions=new Map(fixture.actions.map(a=>[a.frame,a]));
const w=r.world;
function aim(){const i=w.sand.findIndex(Boolean);return i>=0?{x:i%w.width+.5,y:Math.floor(i/w.width)+.5}:w.flying[0]||r.aim;}
function target(){
 const piece=w.bodies.reduce((a,b)=>a.pixels.length>b.pixels.length?a:b),material=w.material(piece);let point=material[0].q,best=0;
 for(let i=0;i<material.length;i+=8){const q=material[i].q;if(!w.validPoint(q.x,q.y))continue;const count=material.reduce((s,p)=>s+(Math.hypot(q.x-p.q.x,q.y-p.q.y)<=8),0);if(count>best){best=count;point=q;}}
 return point;
}
// Keep the recorded cuts, attack times and purchased equipment. Stable chunks
// now settle at different positions, so aim at current material instead of ghosts.
for(let n=0;n<90*30&&!r.qualified&&!r.finishReady;n++){
 const a=actions.get(n);if(a){assert(r.selectTool(a.tool));assert.equal(r.press(a.tool==='bomb'&&w.bodies.length?target():a),a.accepted);r.release();}
 r.update(1/30,{...aim(),working:false});r.world.events=[];
 assert.equal(Object.values(r.world.ledger()).reduce((sum,v)=>sum+v,0),r.world.initial);
}
assert(r.qualified,'actual purchased stat formulas reach 70% using recorded physical input');
assert.equal(r.world.charge,fixture.charge,'no extra equipment or energy is needed by the adaptive aiming strategy');
const cleanup=new Step1Run(STEP1_SITES[0],fresh);cleanup.world.charge=0;cleanup.update(1/30);assert.equal(cleanup.phase,'finishing');cleanup.pause(true);const remaining=cleanup.finishRemaining;cleanup.update(.1);assert.equal(cleanup.finishRemaining,remaining);cleanup.pause(false);for(let n=0;n<301&&!cleanup.finishReady;n++)cleanup.update(1/30);assert(cleanup.finishReady);
console.log(JSON.stringify({test:'free-step1 boss physical replay',recovered:r.world.collected,total:r.world.initial,seconds:r.world.elapsed,charge:r.world.charge,cleanup:'passed',note:'Configured equipment reachability; not human pacing.'}));
