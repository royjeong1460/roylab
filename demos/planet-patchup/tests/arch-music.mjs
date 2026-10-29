import test from 'node:test';
import assert from 'node:assert/strict';
const {bootFreeMusic}=await import('../src/arch/web-music.js').catch(error=>{
 if(error.code==='ERR_MODULE_NOT_FOUND')return {};
 throw error;
});
function fixture(muted=false){
 const ctx={state:'suspended',destination:{},sources:[],createGain(){return {gain:{value:0},connect(){}};},createBufferSource(){const source={connect(){},start(){}};this.sources.push(source);return source;},async resume(){this.state='running';},async suspend(){this.state='suspended';},async decodeAudioData(){return {duration:142.222};}};
 const view=new EventTarget();view.AudioContext=function(){return ctx;};view.fetch=async()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(8)});
 const doc=new EventTarget();doc.defaultView=view;doc.hidden=false;
 let value=muted?'off':'on';const storage={getItem:()=>value};
 return {ctx,view,doc,storage,mute:()=>{value='off';},unmute:()=>{value='on';}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('free music uses the existing sound toggle and resumes the same loop after backgrounding',async()=>{
 assert.equal(typeof bootFreeMusic,'function');
 const f=fixture(),music=bootFreeMusic(f.storage,'/journey-v10.m4a',f.doc);
 assert.equal(f.ctx.sources.length,0);
 f.doc.dispatchEvent(new Event('pointerdown'));await tick();
 assert.equal(music.status,'playing');assert.equal(f.ctx.sources.length,1);assert.equal(music.source.loop,true);assert.equal(music.gain.gain.value,.125);
 f.mute();const click=new Event('click');Object.defineProperty(click,'target',{value:{closest:()=>true}});f.doc.dispatchEvent(click);await tick();
 assert.equal(music.status,'off');assert.equal(f.ctx.state,'suspended');
 f.unmute();f.doc.dispatchEvent(new Event('keydown'));await tick();
 assert.equal(f.ctx.sources.length,1);assert.equal(f.ctx.state,'running');
 f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(f.ctx.state,'suspended');
 f.doc.hidden=false;f.doc.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(f.ctx.state,'running');assert.equal(f.ctx.sources.length,1);
 f.view.dispatchEvent(new Event('blur'));await tick();assert.equal(f.ctx.state,'suspended');
 f.view.dispatchEvent(new Event('focus'));await tick();assert.equal(f.ctx.state,'running');
});
test('free music preserves a saved mute and does not write progress or audio settings',async()=>{
 assert.equal(typeof bootFreeMusic,'function');
 const f=fixture(true),music=bootFreeMusic(f.storage,'/journey-v10.m4a',f.doc);
 f.doc.dispatchEvent(new Event('pointerdown'));await tick();
 assert.equal(music.status,'off');assert.equal(f.ctx.sources.length,0);
});
