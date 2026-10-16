import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateSite,pixelCount} from '../src/map-maker-generator.js';
import {SettlingWorld} from '../src/free-step1/settling-world.js';

const url=new URL('../src/free-step1/sites.js',import.meta.url);
const api=existsSync(url)?await import(url):{};
assert(Array.isArray(api.STEP1_SITES),'STEP1_SITES must export six independent maps');
assert.equal(api.STEP1_SITES.length,6);
assert(api.STEP1_BOSS,'STEP1_BOSS must export an original twin-peak tower');
assert.equal(typeof api.chooseStep1Site,'function');
const frozen=value=>{if(value&&typeof value==='object'){assert(Object.isFrozen(value));Object.values(value).forEach(frozen);}};
frozen(api.STEP1_SITES);frozen(api.STEP1_BOSS);
const cellsFor=site=>{const {width,floorY,shapes}=site.data,cells=new Uint8Array(width*floorY);for(const {rect:[x,y,w,h],color} of shapes)for(let yy=y;yy<y+h;yy++)cells.fill(color,yy*width+x,yy*width+x+w);return cells;};
function componentsAbove(site,limit){
 const {width}=site.data,cells=cellsFor(site).slice(0,width*limit),result=[];
 for(let id=0;id<cells.length;id++)if(cells[id]){
  const queue=[id],points=[];cells[id]=0;
  for(let i=0;i<queue.length;i++){const n=queue[i],x=n%width,y=Math.floor(n/width);points.push({x,y});for(const next of [x>0?n-1:-1,x<width-1?n+1:-1,n-width,n+width])if(next>=0&&next<cells.length&&cells[next]){cells[next]=0;queue.push(next);}}
  result.push(points);
 }return result;
}
const maps=[...api.STEP1_SITES,api.STEP1_BOSS];
assert.equal(new Set(maps.map(s=>s.id)).size,7);
assert(!/france|eiffel|프랑스|에펠|파리|몽마르트|센 강|리옹|보르도|프로방스/i.test(JSON.stringify(maps)),'the region data must have independent planet identities');
assert(new Set(api.STEP1_SITES.map(s=>s.generator.family)).size>=4);
const report=[];
for(const site of maps){
 assert.deepEqual(validateSite(site),site);
 const total=pixelCount(site.data),boss=site===api.STEP1_BOSS;
 assert(total>=(boss?4500:1200)&&total<=(boss?5500:3500),`${site.id}: pixel budget ${total}`);
 assert(site.data.width<=160&&site.data.height<=240);
 assert(site.data.shapes.length<240,`${site.id}: compact geometry`);
 const before=JSON.stringify(site),w=new SettlingWorld(site.data,{capacity:60});
 for(let n=0;n<90;n++)w.step(1/60);
 assert.equal(w.ledger().static,total,'intact site remains supported at rest');
 assert.equal(w.bodies.length,0);
 for(const p of site.preview)for(let dx=-6;dx<=6;dx++)w.activate(p.x+dx,p.y);
 let released=w.bodies.length>0;
 for(let n=0;n<180;n++){
  w.step(1/60);released ||= w.bodies.length>0;
  assert.equal(Object.values(w.ledger()).reduce((a,b)=>a+b,0),total,'material is conserved after a real support cut');
  assert(w.bodies.length<=18);
  for(const p of w.bodies)assert([p.body.position.x,p.body.position.y,p.body.angle,p.body.velocity.x,p.body.velocity.y].every(Number.isFinite));
 }
 assert(released,`${site.id}: starter dot cuts at the preview supports must release a body`);
 assert.equal(JSON.stringify(site),before,'runtime damage cannot change the original');
 report.push({id:site.id,pixels:total,rectangles:site.data.shapes.length,preview:site.preview,remainingCharge:w.charge,ledger:w.ledger()});
}
const peaks=componentsAbove(api.STEP1_BOSS,100);
assert.equal(peaks.length,2,'upper silhouette contains exactly two separate peaks');
assert(peaks.every(p=>p.length>=400),'both peaks are substantial structures');
const tips=peaks.map(p=>({x:p.filter(q=>q.y===Math.min(...p.map(q=>q.y)))[0].x,y:Math.min(...p.map(q=>q.y))})).sort((a,b)=>a.x-b.x);
assert(tips[1].x-tips[0].x>=40,'tips are clearly separated at portrait scale');
assert.notEqual(tips[0].y,tips[1].y,'the shared tower has an asymmetric upper silhouette');
assert.equal(componentsAbove(api.STEP1_BOSS,160).length,1,'the peaks join into one lower tower');
for(const [earned,count] of [[0,2],[1999,2],[2000,4],[5999,4],[6000,6],[100000,6]]){
 const pool=api.STEP1_SITES.slice(0,count),seen=new Set();
 for(let n=0;n<100;n++){const site=api.chooseStep1Site(null,earned,()=>n/100);assert(pool.includes(site));seen.add(site.id);}
 assert.equal(seen.size,count);
 for(const previous of pool)for(const random of [0,.5,.999999,1,-2,8,NaN,Infinity,-Infinity,'bad']){
  const site=api.chooseStep1Site(previous.id,earned,()=>random);assert(pool.includes(site));assert.notEqual(site.id,previous.id);
 }
}
assert.equal(api.chooseStep1Site(null,0,()=>0),api.STEP1_SITES[0]);
for(const earned of [undefined,NaN,-1,'bad'])assert(api.STEP1_SITES.slice(0,2).includes(api.chooseStep1Site(null,earned,()=>.5)));
const originals={
 'src/france/sites.js':'aa9c5c60d7681fdba108d3196bf6411c0533cac9a894c17602666dd2ed92124f',
 'src/france/sites.json':'5ee779cb79d95178a673c0863b566591b8a2ba6d322812b4201a9c39c57035f0',
 'src/map-maker-eiffel.js':'65b4c947450eaf729764e5d0238b1a71b5b0ec5cbad3fd74e01ef94f8d0e0a86',
};
for(const [file,hash] of Object.entries(originals))assert.equal(createHash('sha256').update(readFileSync(new URL(`../${file}`,import.meta.url))).digest('hex'),hash,`${file} preserved`);
console.log('PASS free step 1 maps: validation, independent frozen data, two joined peaks, support-cut release, rest, conservation, selection pools, and older originals preserved');
console.log(JSON.stringify({sites:report,tips},null,2));
