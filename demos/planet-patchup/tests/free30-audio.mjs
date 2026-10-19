import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectionSound} from '../src/free30/collection-sound.js';
function fixture(){const voices=[];const manager={add(){const v={isPlaying:false,plays:0,setVolume(volume){this.config.volume=volume},stop(){this.isPlaying=false},play(config){this.isPlaying=true;this.plays++;this.config=config},destroy(){this.destroyed=true;this.stop()}};voices.push(v);return v}};return {sound:new CollectionSound(manager),voices,plays:()=>voices.reduce((n,v)=>n+v.plays,0)}}
test('collection sound follows recovery, bounds bursts, and never queues silent-frame backlog',()=>{
 const f=fixture();f.sound.update(.1,0);assert.equal(f.plays(),0);
 f.sound.update(.01,1);assert.equal(f.plays(),1);
 for(let n=2;n<=100;n++)f.sound.update(.001,n);
 assert(f.plays()<=3);const before=f.plays();f.sound.update(2,100);assert.equal(f.plays(),before);
 f.sound.update(.01,101);assert.equal(f.plays(),before+1);
});
test('continuous intake has bounded voices and gain',()=>{
 const f=fixture();for(let n=1;n<=1000;n++)f.sound.update(.08,n*80);
 assert.equal(f.plays(),1000);assert(f.voices.length<=6);
 assert(f.voices.reduce((n,v)=>n+v.config.volume,0)<=1);
});
test('pause, mute and destruction stop tails; enabling does not replay old collection',()=>{
 const f=fixture();f.sound.update(.1,1);f.sound.update(0,1,false);assert(f.voices.every(v=>!v.isPlaying));
 f.sound.update(.1,2);f.sound.setEnabled(false);assert(f.voices.every(v=>!v.isPlaying));
 f.sound.update(1,100);assert.equal(f.plays(),2);f.sound.setEnabled(true);f.sound.update(.1,100);assert.equal(f.plays(),2);
 f.sound.update(.1,101);assert.equal(f.plays(),3);f.sound.destroy();assert(f.voices.every(v=>v.destroyed));
});
