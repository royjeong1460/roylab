import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
import {STEP1_SITES,STEP1_BOSS} from '../src/free-step1/sites.js';
import {MapViewport} from '../src/map-viewport.js';
import {pixelCount} from '../src/map-maker-generator.js';
import {BlastJourney} from '../src/blast-step1/journey.js';
const file=new URL('../src/blast-step1/presentation.js',import.meta.url),api=existsSync(file)?await import(file):{};
test('blast mobile presentation exists',()=>assert.equal(typeof api.closeView,'function'));
const feature=api.closeView?test:test.skip;
feature('wider map adds symmetric space without changing pixels or source geometry',()=>{
 for(const s of [...STEP1_SITES,STEP1_BOSS]){const before=JSON.stringify(s),wide=api.widenSite(s);assert.equal(wide.data.width,s.data.width*1.5);assert.equal(pixelCount(wide.data),pixelCount(s.data));assert.equal(wide.id,s.id);assert.equal(wide.data.floorY,s.data.floorY);assert.equal(wide.data.shapes[0].rect[0],s.data.shapes[0].rect[0]+s.data.width/4);assert.equal(JSON.stringify(s),before);}
});
feature('close camera enlarges pixels and permits side scrolling, overview fits everything',()=>{
 const v=new MapViewport({worldWidth:144,worldHeight:144,viewWidth:390,viewHeight:756});api.closeView(v);assert.equal(v.zoom,6);assert(v.zoom>v.minZoom);assert(v.x>0);const before=v.x;v.pan(-120,0);assert(v.x>before);v.fit();assert(v.rect().width>=144);assert(v.rect().height>=144);api.closeView(v);assert.equal(v.zoom,6);
});
feature('new actual journeys use wide sites and existing profiles remain valid',async()=>{
 const store=new Map(),s={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},lock={request:async(_,fn)=>fn()};
 const j=new BlastJourney(s,lock);let r=(await j.start()).run;assert.equal(r.world.width,144);await j.finish();const loaded=new BlastJourney(s,lock);assert.equal(loaded.profile.runCount,1);r=(await loaded.start('boss')).run;assert.equal(r.world.width,240);
});

import {offers,upgradeGuide} from '../src/blast-step1/balance.js';
test('upgrade guide explains affordability, effects and unlocked tools',()=>{
 const j=new BlastJourney({getItem:()=>null,setItem:()=>{}},{request:async(_,fn)=>fn()}),p=j.profile;
 assert.match(upgradeGuide(p),/80부품/);p.parts=100;
 assert.match(upgradeGuide(p),/3개 항목/);
 assert(offers(p).find(o=>o.id==='bombRange').help.includes('반경'));
 assert.equal(offers(p).find(o=>o.id==='gravityForce').available,false);
 assert.equal(offers(p).find(o=>o.id==='bombForce').description,'100% → 125%');
});
