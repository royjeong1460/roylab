import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchWorld} from '../src/arch/world.js';
import {ARCH_SAVE_KEYS,ArchJourney,freshProfile} from '../src/arch/journey.js';
import {ArchJournal} from '../src/arch/telemetry.js';
import {freeStats,freeOffers,BALANCE_VERSION} from '../src/arch/balance.js';
import {ARCH_TUTORIAL,ARCH_SITES} from '../src/arch/maps.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
const loose=w=>{const i=w.cells.findIndex(Boolean);const x=i%w.width+.5,y=Math.floor(i/w.width)+.5;w.breakContact(x,y,q=>Math.hypot(q.x-x,q.y-y)<2,8);w.flushDebris();return {x,y};};
test('base suction collects nearby pixels without clicking, leaves remote debris and bodies intact',()=>{
 const w=new ArchWorld(ARCH_SITES[0],freshProfile()),q=loose(w),before=w.collected,chunks=w.bodies.reduce((n,p)=>n+p.pixels.length,0);
 w.work(w.width-1,1,.1,1,undefined,false);assert.equal(w.collected,before);
 w.work(q.x,q.y,.1,1,undefined,false);assert(w.collected>before);assert.equal(w.collectedPixelIds.size,w.collected);assert(w.events.some(e=>e.kind==='collect'&&e.mode!=='rise'));
 assert.equal(w.bodies.reduce((n,p)=>n+p.pixels.length,0),chunks);assert(w.diagnostics().balanced);assert.equal(w.charge,60);
});
test('global collection requires an upgrade and coexists with base suction',()=>{
 const p=freshProfile(),base=new ArchWorld(ARCH_SITES[0],p);loose(base);for(let i=0;i<30;i++)base.step(1/60);assert.equal(base.collected,0);
 assert.equal(freeStats(p).autoCollect,false);assert.equal(freeStats(p).suctionRate,20);assert.equal(freeStats(p).suctionRadius,12);
 assert.match(freeOffers(p).find(o=>o.id==='collectBatch').description,/Unlock/);
 p.upgrades.collectBatch=1;const w=new ArchWorld(ARCH_SITES[0],p);loose(w);for(let i=0;i<30;i++)w.step(1/60);assert(w.collected>0);assert(w.events.some(e=>e.kind==='collect'&&e.mode==='rise'));assert(w.diagnostics().balanced);assert.equal(w.suctionRate,20);
});
test('new profile selects real first site; tutorial is explicit and cannot clear a campaign site',async()=>{
 const j=new ArchJourney(storage(),{request:async(_,f)=>f()});let result=await j.start('stage',ARCH_SITES[0].id);assert.equal(result.run.site.id,ARCH_SITES[0].id);assert.equal(result.run.mode,'stage');await j.finish();
 result=await j.start('tutorial');assert.equal(result.run.site.id,ARCH_TUTORIAL.id);result.run.world.breakContact(0,0,()=>true,Infinity);result.run.world.secureLoose();await j.finish();assert.equal(Object.keys(j.profile.stageRecords).length,1);assert(!j.profile.stageRecords[ARCH_TUTORIAL.id]);
 const fresh=new ArchJourney(storage(),{request:async(_,f)=>f()});assert.equal((await fresh.start()).run.site.id,ARCH_SITES[0].id);
});
test('buying Auto Collect activates it next sortie and survives reload',async()=>{
 const store=storage(),lock={request:async(_,f)=>f()},j=new ArchJourney(store,lock);const p=structuredClone(j.profile);p.parts=100;p.earned=100;j.save(p);
 assert(!j.offers().some(o=>o.id==='collectInterval'));assert((await j.buy('collectBatch')).ok);assert.equal(j.profile.parts,20);assert(j.stats().autoCollect);
 const loaded=new ArchJourney(store,lock);assert(loaded.persistent);assert.equal(loaded.profile.parts,20);assert.equal(loaded.profile.upgrades.collectBatch,1);assert.equal(loaded.profile.balanceVersion,BALANCE_VERSION);assert((await loaded.start('stage',ARCH_SITES[0].id)).run.world.stats().autoCollect);
});
test('current tabs share purchases while run records identify the new collection rules',async()=>{
 const store=storage(),lock={request:async(_,f)=>f()},first=new ArchJourney(store,lock);
 const p=structuredClone(first.profile);p.parts=300;p.earned=300;first.save(p);
 const {run}=await first.start('tutorial'),other=new ArchJourney(store,lock);
 assert((await other.buy('battery')).ok);
 for(const key of ARCH_SAVE_KEYS)assert.equal(JSON.parse(store.getItem(key)).balanceVersion,'arch-campaign-v0.2.2');
 assert.equal(other.profile.balanceVersion,BALANCE_VERSION);
 const journal=new ArchJournal({storage:store,sessionId:'mixed-version',locks:null});journal.start(run);
 assert.equal(journal.current.balanceVersion,BALANCE_VERSION);
 assert((await first.finish()).ok);assert.equal(first.profile.upgrades.battery,1);assert.equal(first.profile.parts,150);
});
import Globe from '../src/arch/planet/globe-math.js';
import Terrain from '../src/arch/planet/terrain.js';
test('planet selection reaches all six region anchors with horizontal and vertical rotation',()=>{
 for(let i=0;i<6;i++){const {yaw,pitch}=Globe.target(i,0),front=Globe.world([0,0,1],yaw,pitch);assert.equal(Globe.region(front).index,i);const view=Globe.view(front,yaw,pitch);assert(Math.abs(view[0])+Math.abs(view[1])<1e-8);assert(Number.isFinite(Terrain.sample(front).e));}
});
