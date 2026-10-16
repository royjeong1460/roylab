import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Step1Journey,Step1Run,STEP1_SAVE_KEYS} from '../src/free-step1/journey.js';
import {ThreeToolsOverlay} from '../src/three-tools-view.js';
const locks={request:async(_n,fn)=>fn()},memory=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const site={id:'fixture',data:{width:72,height:80,floorY:76,shapes:[{rect:[8,8,56,68],color:3,target:true}]}};
const fresh=()=>new Step1Journey(memory(),locks).profile;
const run=level=>{const p=fresh();p.upgrades.cutter=level;return new Step1Run(site,p);};
test('each upgrade fills one adjacent cell: cross5, square9, outer ring up to21',()=>{
 let previous=[];
 for(let level=0;level<=20;level++){
  const w=run(level).world;assert.equal(typeof w.cutPattern,'function');const cells=w.cutPattern().cells,ids=cells.map(c=>c.join(':'));
  assert.equal(cells.length,level+1);assert.equal(new Set(ids).size,cells.length);assert(previous.every(id=>ids.includes(id)));
  if(level){const [x,y]=cells.at(-1);assert([[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(c=>previous.includes(c.join(':'))),'each new cell touches the existing cut');}previous=ids;
  assert(cells.every(([x,y])=>Math.abs(x)<=2&&Math.abs(y)<=2));
  if(level===4)assert(cells.every(([x,y])=>Math.abs(x)+Math.abs(y)<=1),'5 cells form a cross');
  if(level===5)assert.deepEqual(cells.at(-1),[1,-1],'6th cell fills a corner instead of lengthening an arm');
  if(level===8)assert(cells.every(([x,y])=>Math.abs(x)<=1&&Math.abs(y)<=1),'9 cells fill the3x3 square');
 }
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)assert.equal(previous.includes(`${x}:${y}`),!(Math.abs(x)===2&&Math.abs(y)===2),'21 cells fill5x5 except its four corners');
});
test('static hit mask and displayed cursor agree; repeated cutting pays once per successful stamp',()=>{
 const r=run(20),w=r.world;assert.equal(typeof w.cutPattern,'function');const shape=w.cutPattern();
 assert(r.press({x:34.8,y:30.1}));assert.equal(w.charge,59);assert.equal(w.flying.length,21);
 assert.deepEqual(w.flying.map(p=>p.id).sort((a,b)=>a-b),shape.cells.map(([x,y])=>(30+y)*72+34+x).sort((a,b)=>a-b));r.release();
 for(let n=0;n<5;n++)w.work(34.8,30.1,.1,1,{x:34.8,y:30.1},true);assert.equal(w.charge,59,'empty stamps are free');
 w.work(49.8,30.1,.1,1,{x:34.8,y:30.1},true);assert.equal(w.charge,58,'held input repeats upgraded shape');
 assert.equal(Object.values(w.ledger()).reduce((s,v)=>s+v,0),w.initial);
 const drawn=[],g={clear(){},fillStyle(){},lineStyle(){},fillRect(x,y){drawn.push([x-34,y-30]);},strokeRect(){}};
 const overlay=new ThreeToolsOverlay({add:{graphics:()=>g}},{layer:{add(){}}});overlay.draw(0,w,{x:34.8,y:30.1});assert.deepEqual(drawn,shape.cells);
});
test('moving chunks use the same cross mask without deleting other material',()=>{
 const p=fresh();p.upgrades.cutter=12;
 const d=new Step1Run({id:'floating',data:{width:72,height:80,floorY:76,shapes:[{rect:[23,20,23,21],color:3}]}},p).world;
 d.detach();assert(d.bodies.length);const before=d.ledger(),mask=new Set(d.cutPattern().cells.map(([x,y])=>`${x+34}:${y+30}`));
 const expected=d.bodies.flatMap(b=>d.material(b)).filter(p=>mask.has(`${Math.floor(p.q.x)}:${Math.floor(p.q.y)}`)).map(p=>p.p.id);
 assert(d.activate(34.5,30.5));assert.equal(d.charge,59);assert.equal(before.chunks-d.ledger().chunks,13);assert.deepEqual(d.flying.map(p=>p.id).sort((a,b)=>a-b),expected.sort((a,b)=>a-b));assert.equal(Object.values(d.ledger()).reduce((s,v)=>s+v,0),d.initial);
});
const legacy=()=>({version:1,campaign:'free-step1',revision:4,earned:4000,spent:1360,parts:2640,owned:['cutter','bomb'],patterns:['dot','claw','ring'],upgrades:{capacity:1,suction:0,range:0,bombRange:0,bombForce:0,gravityForce:0},bossCleared:false,lastSite:null,runCount:1,bossAttempts:0,workMs:60000,firstClearMs:null,history:[],purchases:[{id:'claw',cost:180,workMs:5000},{id:'ring',cost:700,workMs:6000}]});
test('legacy patterns refund once with all other progress preserved and old slots untouched',async()=>{
 const s=memory(),raw=JSON.stringify(legacy());s.setItem('pixel-demolition-free-step1-v1-a',raw);const j=new Step1Journey(s,locks);
 assert.equal(j.profile.version,2);assert.equal(j.profile.parts,3520);assert.equal(j.profile.spent,480);assert.equal(j.profile.earned,4000);assert.deepEqual(j.profile.patterns,['dot']);assert.equal(j.profile.upgrades.cutter,0);assert.equal(j.profile.upgrades.capacity,1);assert(j.profile.owned.includes('bomb'));assert.equal(j.profile.workMs,60000);
 assert((await j.buy('cutter')).ok);assert.equal(j.profile.parts,3440);assert.equal(j.profile.upgrades.cutter,1);assert.equal(s.getItem('pixel-demolition-free-step1-v1-a'),raw);
 const reload=new Step1Journey(s,locks);assert.equal(reload.profile.parts,3440);assert.equal(reload.profile.upgrades.cutter,1);assert(STEP1_SAVE_KEYS.some(k=>s.getItem(k)));assert(!reload.offers().some(o=>['claw','ring','foot'].includes(o.id)));assert.equal((await reload.buy('claw')).ok,false);
});
test('invalid legacy accounting never migrates or grants a refund',()=>{
 const s=memory(),p=legacy();p.parts++;s.setItem('pixel-demolition-free-step1-v1-a',JSON.stringify(p));const j=new Step1Journey(s,locks);assert.equal(j.persistent,false);assert.equal(j.profile.parts,0);
});
test('cutter purchase levels apply automatically with cap and immutable run settings',async()=>{
 const s=memory(),j=new Step1Journey(s,locks);
 for(let n=0;n<12;n++){const r=(await j.start()).run;r.world.collected=r.world.initial;await j.finish();}
 for(let n=0;n<20;n++){assert((await j.buy('cutter')).ok);assert.equal(j.stats().cutPixels,n+2);}
 assert.equal(j.offers().find(o=>o.id==='cutter').available,false);assert.equal((await j.buy('cutter')).reason,'unavailable');
 const r=(await j.start()).run;assert.equal(r.world.cutPattern().cells.length,21);assert.equal(r.selectPattern('claw'),false);assert.equal(r.world.configure({cutter:0}),false);assert.equal((await j.buy('cutter')).reason,'active');
});
