import test from 'node:test';
import assert from 'node:assert/strict';
import {ArchWorld} from '../src/arch/world.js';
import {ArchRun,freshProfile} from '../src/arch/journey.js';
import {ARCH_TUTORIAL,ARCH_SITES} from '../src/arch/maps.js';
const site=ARCH_TUTORIAL;
const point=w=>{const i=w.cells.findIndex(Boolean);return {x:i%w.width+.5,y:Math.floor(i/w.width)+.5};};
test('global batches preserve exact pixel IDs and exclude detached bodies',()=>{
 const profile=freshProfile();profile.upgrades.collectBatch=1;const w=new ArchWorld(site,profile),p=point(w);w.blast({...p,radius:4,power:1});const before=w.collected;assert(w.flying.length+w.debris.length+w.sand.filter(Boolean).length>0);w.work(0,0,.1);assert.equal(w.collected,before);
 for(let i=0;i<14;i++)w.step(1/60);assert.equal(w.collected,0);w.step(1/60);assert(w.collected>0&&w.collected<=22);assert.equal(w.collectedPixelIds.size,w.collected);assert(w.diagnostics().balanced);
 const chunks=w.bodies.reduce((n,p)=>n+p.pixels.length,0);w.secureLoose();assert.equal(w.bodies.reduce((n,p)=>n+p.pixels.length,0),chunks);assert.equal(w.collectedPixelIds.size,w.collected);assert(w.diagnostics().balanced);assert.equal(w.secureLoose(),0);
});
test('last positive energy attack is accepted, pause blocks and exhaustion sweeps by 10s',()=>{
 const r=new ArchRun(site,freshProfile());r.world.charge=.5;r.pause(true);assert(!r.press(point(r.world)));r.pause(false);assert(r.press(point(r.world)));assert.equal(r.world.charge,0);assert.equal(r.phase,'finishing');assert(!r.press(point(r.world)));r.pause(true);r.update(1);assert.equal(r.finishRemaining,10);r.pause(false);for(let i=0;i<310;i++)r.update(1/30);assert(r.finishReady);assert.equal(r.looseCount,0);assert(r.world.diagnostics().balanced);assert(r.workMs<=10001);
});
test('passive counts effective primary attacks, excludes empty and secondary attacks',()=>{
 const p=freshProfile();p.skills.aftershock=1;p.equipped.passive='aftershock';const w=new ArchWorld(ARCH_SITES[0],p);
 w.blast({x:0,y:0,radius:1,power:0});assert.equal(w.passiveCount,0);
 const q=point(w);w.blast({...q,radius:0,power:0,secondary:true});assert.equal(w.passiveCount,0);
 for(let i=0;i<4;i++)w.blast({...point(w),radius:3,power:1});assert.equal(w.passiveTriggers,1);assert.equal(w.passiveCount,0);assert.equal(w.ideaPending.length,2);
 const count=w.effectiveAttacks;for(let i=0;i<50;i++)w.step(1/60);assert.equal(w.effectiveAttacks,count);assert(w.diagnostics().balanced);
});
test('Orbital is once per run, free energy, guarded and has small campaign scaling',()=>{
 const p=freshProfile();p.skills.orbital=5;p.equipped.active='orbital';const r=new ArchRun(site,p);r.pause(true);assert(!r.activateSkill('orbital'));r.pause(false);assert(r.activateSkill('orbital'));assert.equal(r.world.charge,60);assert.equal(r.world.activeDevice.targets.length,7);assert.equal(r.world.activeDevice.archForce,1.4);assert(!r.activateSkill('orbital'));assert(!r.world.activateDevice('seismic',1));
 const z=new ArchRun(site,p);z.world.charge=0;assert(!z.activateSkill('orbital'));z.world.charge=60;z.phase='finishing';assert(!z.activateSkill('orbital'));z.phase='working';z.state='finished';assert(!z.activateSkill('orbital'));
 for(let i=0;i<270;i++)r.update(1/30);assert(r.world.diagnostics().balanced);assert.equal(r.world.energyUsed,0);assert.equal(r.world.passiveCount,0);
});
test('Black Hole never advances Blast-only passives; signature upgrades preserve radius/count',()=>{
 const p=freshProfile();p.skills.aftershock=5;p.equipped.passive='aftershock';p.owned.push('blackhole');const w=new ArchWorld(ARCH_SITES[0],p),q=point(w);w.setTool('blackhole');assert(w.activate(q.x,q.y));assert.equal(w.passiveCount,0);assert.equal(w.effectiveBlackHoles,1);
 for(let i=0;i<3;i++)w.blast({...point(w),radius:3,power:1});assert.equal(w.passiveTriggers,1);assert.equal(w.ideaPending.length,2);assert.equal(w.ideaPending[0].radius,2.5);assert.equal(w.ideaPending[0].power,.55*1.3);assert.equal(w.effectiveBlasts,3);
 const relay=new ArchWorld(ARCH_SITES[0],{...p,skills:{...p.skills,relay:5},equipped:{passive:'relay',active:null}});assert.equal(relay.ideaGain,1.3);assert.equal(relay.ideas.level,1);
});
test('actual severed heavy chunk remains after automatic collection and withdrawal sweep',()=>{
 const w=new ArchWorld(site,freshProfile());for(const q of site.preview)w.blast({...q,radius:4,power:1});assert(w.bodies.some(p=>p.pixels.length>100));
 const chunks=w.bodies.reduce((n,p)=>n+p.pixels.length,0);const before=w.cells.filter(Boolean).length;
 w.secureLoose();assert.equal(w.bodies.reduce((n,p)=>n+p.pixels.length,0),chunks);assert.equal(w.cells.filter(Boolean).length,before);assert.equal(w.collectedPixelIds.size,w.collected);assert(w.diagnostics().balanced);
});
test('release cancels held attack and pause freezes collection, energy and simulation',()=>{
 const r=new ArchRun(site,freshProfile());assert(r.press(point(r.world)));r.release();const count=r.world.attackCounts.bomb;r.update(.1,{working:false});assert.equal(r.world.attackCounts.bomb,count);
 const snapshot=[r.world.charge,r.world.collected,r.workMs,r.world.collectionClock];r.pause(true);for(let i=0;i<10;i++)r.update(.1,{working:true});assert.deepEqual([r.world.charge,r.world.collected,r.workMs,r.world.collectionClock],snapshot);r.pause(false);assert.equal(r.working,false);
});

test('near-miss cannot precharge passives through pristine static walls',()=>{
 const p=freshProfile();p.skills.aftershock=1;p.equipped.passive='aftershock';const w=new ArchWorld(ARCH_SITES[0],p);const before=w.ledger();
 w.blast({x:73,y:35,radius:3,power:1});assert.deepEqual(w.ledger(),before);assert.equal(w.passiveCount,0);assert.equal(w.effectiveBlasts,0);
 const q=point(w);w.blast({...q,radius:3,power:1});assert.equal(w.passiveCount,1);assert.equal(w.effectiveBlasts,1);assert(w.diagnostics().balanced);
});
test('outer reach counts only an actual nonzero impulse to a detached body',()=>{
 const p=freshProfile();p.skills.aftershock=1;p.equipped.passive='aftershock';const w=new ArchWorld(site,p);for(const q of site.preview)w.blast({...q,radius:4,power:1,secondary:true});w.secureLoose();assert(w.bodies.length>0);
 let aim;
 for(let y=1;y<w.floorY&&!aim;y++)for(let x=1;x<w.width&&!aim;x++)if(!w.effectiveAt(x,y,3)&&w.bodies.some(piece=>w.material(piece).some(({q})=>Math.hypot(q.x-x,q.y-y)<=18)))aim={x,y};
 assert(aim);const before=w.ledger();w.blast({...aim,radius:3,power:0});assert.deepEqual(w.ledger(),before);assert.equal(w.passiveCount,0);
 const velocity=w.bodies.map(p=>[p.body.velocity.x,p.body.velocity.y,p.body.angularVelocity]);w.blast({...aim,radius:3,power:1});assert.equal(w.passiveCount,1);assert.notDeepEqual(w.bodies.map(p=>[p.body.velocity.x,p.body.velocity.y,p.body.angularVelocity]),velocity);assert(w.diagnostics().balanced);
});
test('cleanup telemetry measures early drain and timeout simulation, excluding pause',()=>{const early=new ArchRun(site,freshProfile());early.world.charge=0;for(let i=0;i<20&&!early.finishReady;i++)early.update(1/30);assert.equal(early.finishReason,'drained');assert(Math.abs(early.finishingElapsedMs-500)<1e-6);assert.equal(early.finishRemaining,0);const timeout=new ArchRun(site,freshProfile());timeout.world.charge=0;timeout.debrisDrained=()=>false;timeout.update(.1);const before=timeout.finishingElapsedMs;timeout.pause(true);timeout.update(1);assert.equal(timeout.finishingElapsedMs,before);timeout.pause(false);for(let i=0;i<310&&!timeout.finishReady;i++)timeout.update(1/30);assert.equal(timeout.finishReason,'timeout');assert(Math.abs(timeout.finishingElapsedMs-10000)<1e-5);});
