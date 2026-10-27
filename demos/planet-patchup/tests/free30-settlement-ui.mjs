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
 const scene={settled:false,settling:false,hud(){}};let calls=0;
 const context={r:{finishReady:true},now:0,campaign:undefined,operating:true,guarded:async fn=>{if(!context.operating)await fn();},settle:async()=>{calls++;}};
 vm.createContext(context);vm.runInContext(`function tick(){${condition}}`,context);
 context.tick.call(scene);assert.equal(scene.settling,false);
 context.operating=false;context.tick.call(scene);await Promise.resolve();assert.equal(calls,1);assert.equal(scene.settling,true);
});

test('completion notice remains for one second before settlement and cannot settle twice',async()=>{
 const start=main.indexOf('if(r.finishReady&&!this.settled'),end=main.indexOf('\n  }',start),condition=main.slice(start,end);
 let shown=0,calls=0;const scene={settled:false,settling:false,hud(){shown++;}};
 const context={r:{finishReady:true},now:100,campaign:{finishNoticeMs:()=>1000},operating:false,guarded:async fn=>fn(),settle:async()=>{calls++;}};
 vm.createContext(context);vm.runInContext(`function tick(){${condition}}`,context);
 context.tick.call(scene);assert.equal(shown,1);assert.equal(calls,0);
 context.now=1099;context.tick.call(scene);assert.equal(shown,1);assert.equal(calls,0);
 context.now=1100;context.tick.call(scene);await Promise.resolve();assert.equal(calls,1);
 context.now=2100;context.tick.call(scene);assert.equal(calls,1);
});

test('successful boss receipt explicitly offers continued uncapped upgrades',async()=>{
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{open:false,hidden:true,textContent:'',close(){},showModal(){}});return nodes.get(id);};
 const context={scene:{run:{pause(){}}},$:get,release(){},profile(){},workshop(){},duration:()=>'',journey:{finish:async()=>({ok:true,recovered:1598,qualified:true,mode:'boss',firstClear:true,bonus:500,siteName:'쌍봉 철탑',workMs:1000})}};
 vm.createContext(context);vm.runInContext(code,context);await context.settle();assert.match(get('result-title').textContent,/클리어/);assert.match(get('result-bonus').textContent,/계속 업그레이드/);assert.match(get('result-bonus').textContent,/제한이 해제/);assert.equal(get('run-receipt').hidden,false);
});
