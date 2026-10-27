import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchJourney,ARCH_SAVE_KEYS,freshProfile} from '../src/arch/journey.js';
import {freeStats,freeOffers,totalSpent,BALANCE_VERSION} from '../src/arch/balance.js';
import {ArchWorld} from '../src/arch/world.js';
import {ARCH_SITES} from '../src/arch/maps.js';
import {offerPresentation} from '../src/arch/menus.js';
const legacyKeys=['pixel-demolition-arch-v1-a','pixel-demolition-arch-v1-b'];
const store=()=>{const m=new Map();return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const locks={request:async(_,f)=>f()};
function legacy(){const p=freshProfile();p.version=1;p.balanceVersion='arch-campaign-v0.2';delete p.upgrades.suction;delete p.upgrades.range;p.upgrades.collectBatch=3;p.upgrades.collectInterval=4;p.upgrades.battery=2;p.spent=totalSpent(p);p.parts=900;p.earned=p.spent+p.parts;p.stageRecords[ARCH_SITES[0].id]={recovered:750,total:1000,boss:false};return p;}
test('three independent collection upgrades distinguish local radius, local speed and global speed',async()=>{
 const s=store(),j=new ArchJourney(s,locks),p=structuredClone(j.profile);p.parts=p.earned=1000;j.save(p);
 const offers=freeOffers(p);for(const id of ['range','suction','collectBatch'])assert(offers.find(o=>o.id===id)?.available);
 assert(!offers.some(o=>o.id==='collectInterval'));assert.equal((await j.buy('collectInterval')).reason,'unknown');
 assert.equal(offerPresentation(offers.find(o=>o.id==='collectBatch'),p).action,'Learn');
 assert((await j.buy('range')).ok);assert.equal(j.stats().suctionRadius,12.5);assert.equal(j.stats().suctionRate,20);assert(!j.stats().autoCollect);
 assert((await j.buy('suction')).ok);assert.equal(j.stats().suctionRate,28);assert(!j.stats().autoCollect);
 assert((await j.buy('collectBatch')).ok);assert(j.stats().autoCollect);assert.equal(j.stats().autoCollectRate,2);
 assert((await j.buy('collectBatch')).ok);assert.equal(j.stats().autoCollectRate,24/11);assert.equal(j.stats().suctionRate,28);assert.equal(j.stats().suctionRadius,12.5);
 const run=(await j.start('stage',ARCH_SITES[0].id)).run;assert.equal(run.world.suctionRate,28);assert.equal(run.world.suctionRadius,12.5);
 assert.equal((await j.buy('suction')).reason,'active');assert.equal(run.world.stats().autoCollectRate,24/11);
});
test('v1 purchases, currency and clears migrate with retuned throughput without overwriting the original save',async()=>{
 const s=store(),old=legacy(),encoded=JSON.stringify(old);for(const key of legacyKeys)s.setItem(key,encoded);
 const j=new ArchJourney(s,locks);assert(j.persistent);assert.equal(j.profile.parts,900);assert.equal(j.profile.spent,old.spent);assert.deepEqual(j.profile.stageRecords,old.stageRecords);
 assert.equal(j.stats().autoCollectRate,(26/.21)/44);assert.equal(j.stats().suctionRate,20);assert.equal(j.stats().suctionRadius,12);
 assert((await j.buy('suction')).ok);const loaded=new ArchJourney(s,locks);assert.equal(loaded.stats().suctionRate,28);assert.equal(loaded.stats().autoCollectRate,(26/.21)/44);assert.equal(loaded.profile.parts,820);assert.equal(totalSpent(loaded.profile),loaded.profile.spent);assert.equal(loaded.profile.balanceVersion,BALANCE_VERSION);
 for(const key of legacyKeys)assert.equal(s.getItem(key),encoded);assert(ARCH_SAVE_KEYS.some(k=>s.getItem(k)));
 assert((await loaded.resetProgress(loaded.profile.revision)).ok);const reset=new ArchJourney(s,locks);assert.equal(reset.profile.parts,0);assert(!reset.stats().autoCollect);assert.equal(reset.stats().suctionRate,20);
});
test('invalid legacy saves fail closed and a corrupt current save never falls back to older progress',()=>{
 for(const mutate of [p=>delete p.upgrades.battery,p=>p.spent++,p=>p.upgrades.range=0,p=>p.balanceVersion='unknown']){const s=store(),p=legacy();mutate(p);s.setItem(legacyKeys[0],JSON.stringify(p));assert.equal(new ArchJourney(s,locks).persistent,false);}
 const s=store();s.setItem(legacyKeys[0],JSON.stringify(legacy()));s.setItem(ARCH_SAVE_KEYS[0],'{bad');assert.equal(new ArchJourney(s,locks).persistent,false);
});
test('restored local upgrades change actual reach and throughput without enabling global pickup',()=>{
 function world(levels){const p=freshProfile();Object.assign(p.upgrades,levels);const w=new ArchWorld(ARCH_SITES[0],p),i=w.cells.findIndex(Boolean),x=i%w.width+.5,y=Math.floor(i/w.width)+.5;w.breakContact(x,y,()=>true,Infinity);w.flushDebris();return {w,x,y};}
 const base=world({}),fast=world({suction:10});for(const q of [base,fast])q.w.work(q.x,q.y,.1,1,undefined,false);
 assert(fast.w.collected>base.w.collected);assert(fast.w.diagnostics().balanced);
 const narrow=world({}),wide=world({range:20});for(const q of [narrow,wide])q.w.work(q.x-18,q.y,.1,1,undefined,false);
 assert.equal(narrow.w.collected,0);assert(wide.w.collected>0);assert(!wide.w.stats().autoCollect);assert(wide.w.diagnostics().balanced);
});

test('global pickup uses the stated two pixels per simulated second, independently of proximity suction',()=>{
 const p=freshProfile();p.upgrades.collectBatch=1;
 const w=new ArchWorld(ARCH_SITES[0],p),i=w.cells.findIndex(Boolean),x=i%w.width+.5,y=Math.floor(i/w.width)+.5;
 w.breakContact(x,y,()=>true,Infinity);w.flushDebris();
 for(let i=0;i<29;i++)w.step(1/60);assert.equal(w.collected,0);
 w.step(1/60);assert.equal(w.collected,1);
 for(let i=0;i<30;i++)w.step(1/60);assert.equal(w.collected,2);assert(w.diagnostics().balanced);
});
test('base proximity suction collects twenty pixels per simulated second',()=>{
 const w=new ArchWorld(ARCH_SITES[0],freshProfile()),i=w.cells.findIndex(Boolean),x=i%w.width+.5,y=Math.floor(i/w.width)+.5;
 w.breakContact(x,y,()=>true,Infinity);w.flushDebris();
 for(let i=0;i<60;i++)w.work(x,y,1/60,1,undefined,false);
 assert.equal(w.collected,20);assert(w.diagnostics().balanced);
});
