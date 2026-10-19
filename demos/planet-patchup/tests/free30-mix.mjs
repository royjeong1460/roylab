import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSound} from '../src/free30/game-sound.js';
function fixture(){const voices=[],plays=[];const manager={locked:false,add(key){const v={key,isPlaying:false,volume:0,play(c){this.isPlaying=true;this.volume=c.volume;plays.push({key,...c})},setVolume(v){this.volume=v},stop(){this.isPlaying=false},destroy(){this.stop();this.destroyed=true}};voices.push(v);return v}};return {sound:new GameSound(manager,true,()=>true),manager,voices,plays};}
const blast={kind:'tool-blast',phase:'blast',power:1},hit={kind:'sound-impact',speed:60,energy:10};
test('explosion, real collision and collection overlap with bounded total gain',()=>{
 const f=fixture();f.sound.update(.1,1,[{...blast,phase:'fuse'}]);assert.deepEqual(f.plays.map(p=>p.key),['pixel-collect']);
 for(let i=2;i<20;i++)f.sound.update(.1,i,[blast,hit]);
 assert(f.plays.some(p=>p.key==='blast'));assert(f.plays.some(p=>p.key==='debris-impact'));assert(f.voices.filter(v=>v.isPlaying).length<=10);
 assert(f.voices.reduce((s,v)=>s+(v.isPlaying?v.volume:0),0)<=1);
});
test('burst of contacts plays strongest hit once; idle rubbing and tool damage do not fake collisions',()=>{
 const f=fixture();f.sound.update(.1,0,[{...hit,speed:2},{kind:'impact',source:'blast',damage:99},{kind:'fracture',count:100}]);assert.equal(f.plays.length,0);
 f.sound.update(.1,0,[{...hit,energy:.1},...Array(100).fill(hit)]);assert.equal(f.plays.length,1);
 f.sound.update(.01,0,[hit]);assert.equal(f.plays.length,1);
 f.sound.update(.1,0,[]);assert.equal(f.plays.length,1);
});
test('global mute, pause and teardown stop every channel and do not queue old events',()=>{
 const f=fixture();f.sound.update(.1,1,[blast,hit]);f.sound.setEnabled(false);assert(f.voices.every(v=>!v.isPlaying));
 const n=f.plays.length;f.sound.update(1,100,[blast,hit]);assert.equal(f.plays.length,n);
 f.sound.setEnabled(true);f.sound.update(.1,100,[]);assert.equal(f.plays.length,n);
 f.sound.update(.1,101,[blast,hit]);f.sound.update(0,101,[],false);assert(f.voices.every(v=>!v.isPlaying));
 f.sound.destroy();assert(f.voices.every(v=>v.destroyed));
});
test('missing assets and browser audio lock leave gameplay silent without exceptions',()=>{
 const f=fixture();f.manager.locked=true;f.sound.update(.1,10,[blast,hit]);assert.equal(f.plays.length,0);
 const empty=new GameSound(f.manager,true,()=>false);empty.update(.1,1,[blast,hit]);empty.destroy();assert.equal(f.plays.length,0);
});

test('real demolition emits explosion and contact audio without changing pixel accounting',async()=>{
 const {FreeJourney,FreeRun}=await import('../src/free30/journey.js');
 const {FREE_SITES}=await import('../src/free30/sites.js');
 const j=new FreeJourney({getItem:()=>null,setItem(){}},{request:async(_,f)=>f()});
 const r=new FreeRun(FREE_SITES[0],j.profile),events=[];
 r.press(r.site.preview[0]);r.release();
 for(let i=0;i<360;i++){r.update(1/60,{...r.aim,working:false});events.push(...r.world.events.splice(0));}
 assert(events.some(e=>e.kind==='tool-blast'&&e.phase==='blast'));
 assert(events.some(e=>e.kind==='sound-impact'&&e.speed>=8&&e.energy>0));
 assert(r.world.diagnostics().balanced);assert(r.world.diagnostics().finite);
});
