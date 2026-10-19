import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
const main=readFileSync(new URL('../src/free30/main.js',import.meta.url),'utf8');
const code=main.slice(main.indexOf('async function settle(){'),main.indexOf('class FreeScene'));
test('returned settlement failure keeps a visible retry control and frozen run',async()=>{
 let attempts=0;const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{open:id==='pause-dialog',hidden:false,textContent:'',close(){this.open=false},showModal(){this.open=true}});return elements.get(id)};
 const run={paused:false,pause(v){this.paused=v}},scene={run,settling:true};
 const context={scene,$:get,release:()=>{},notice:s=>{get('notice').textContent=s},failureMessage:()=> 'save failed',profile:()=>{},workshop:()=>{get('workshop').hidden=false},duration:()=>'',journey:{finish:async()=>{attempts++;return attempts===1?{ok:false,reason:'storage'}:{ok:true,recovered:10,qualified:false,mode:'random',siteName:'test',workMs:1}}}};
 vm.createContext(context);vm.runInContext(code,context);await context.settle();
 assert.equal(run.paused,true);assert.equal(get('pause-dialog').open,true);assert.equal(get('resume').hidden,true);assert.match(get('pause-return').textContent,/다시/);
 await context.settle();assert.equal(attempts,2);assert.equal(get('pause-dialog').open,false);assert.equal(scene.settled,true);assert.equal(get('resume').hidden,false);
});
test('finish during an awaited operation retries automatic settlement next frame',async()=>{
 const start=main.indexOf('if(r.finishReady&&!this.settled'),end=main.indexOf('\n  }',start);
 const condition=main.slice(start,end);
 const scene={settled:false,settling:false};let calls=0;
 const context={r:{finishReady:true},operating:true,guarded:async fn=>{if(!context.operating)await fn();},settle:async()=>{calls++;}};
 vm.createContext(context);vm.runInContext(`function tick(){${condition}}`,context);
 context.tick.call(scene);assert.equal(scene.settling,false);
 context.operating=false;context.tick.call(scene);await Promise.resolve();assert.equal(calls,1);assert.equal(scene.settling,true);
});
