import test from 'node:test';import assert from 'node:assert/strict';
import {FreeJourney} from '../src/free30/journey.js';import {FREE_BOSS} from '../src/free30/sites.js';
import {play} from '../simulation/free30-probe.mjs';
const fresh=()=>new FreeJourney({getItem:()=>null,setItem:()=>{}},{request:async(_,f)=>f()}).profile;
test('starter and three developed builds have distinct actual-world boss outcomes',()=>{
 assert.equal(play(FREE_BOSS,fresh(),{style:'bomb',interval:10}).qualified,false);
 const builds={
 bomb:{bombRange:12,bombForce:10,capacity:18,suction:6,range:4},
 mixed:{bombRange:10,bombForce:8,capacity:16,suction:6,range:4,gravityForce:6,coreMix:6,wearSpeed:6},
 blackhole:{bombRange:5,bombForce:3,capacity:15,suction:6,range:4,gravityForce:7,coreMix:7,wearSpeed:7},
 };
 for(const [style,levels] of Object.entries(builds)){const p=fresh();Object.assign(p.upgrades,levels);if(style!=='bomb')p.owned.push('blackhole');const result=play(FREE_BOSS,p,{style,interval:10});assert(result.qualified,`${style}: ${JSON.stringify(result)}`);}
});
