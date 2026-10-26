import test from 'node:test';
import assert from 'node:assert/strict';
import Composite from 'phaser/src/physics/matter-js/lib/body/Composite.js';
import {ArchWorld} from '../src/arch/world.js';
import {ArchRun,freshProfile} from '../src/arch/journey.js';
import {ARCH_SITES,ARCH_TUTORIAL,ARCH_BOSS} from '../src/arch/maps.js';
const step=(w,seconds)=>{for(let i=0;i<Math.round(seconds*60);i++){w.step(1/60);w.events=[];}};
const make=(site=ARCH_SITES[0])=>new ArchRun(site,freshProfile(),'stage').world;
const attacks=[{name:'root',t:56/60,x:69.51165709145775,y:138.42162111188486},{name:'head',t:76/60,x:69.24857822655525,y:97.89153174326835}];
for(const a of attacks)test(`free campaign ${a.name}: connected bend precedes separation`,()=>{
 const w=make();w.unlimited=true;step(w,a.t);w.activate(a.x,a.y);
 let bending=0,peak=0,started=null,released=null;
 for(let n=0;n<600;n++){
  w.step(1/60);
  for(const e of w.events){if(e.kind==='joint-yield'&&started===null)started=w.elapsed;if(e.kind==='joint-release'&&released===null)released=w.elapsed;}
  w.events=[];
  for(const j of w.yieldJoints||[])if(j.phase==='yielding'){const angle=Math.abs(j.upper.body.angle-j.lower.body.angle-j.initialAngle);peak=Math.max(peak,angle);if(angle>Math.PI/90)bending+=1/60;}
 }
 assert(started!==null,'campaign must enter connected yielding');assert(released!==null,'overload must eventually release');assert(released-started>.6);assert(bending>.3);assert(peak>Math.PI/60);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('tutorial and all seven free maps retain stats, gravity and stable pristine structure',()=>{
 for(const site of [ARCH_TUTORIAL,...ARCH_SITES,ARCH_BOSS]){
  const w=make(site),baseline=new ArchWorld(site,freshProfile());
  assert.deepEqual(w.stats(),baseline.stats());assert.deepEqual(w.engine.gravity,baseline.engine.gravity);
  step(w,4);assert.equal(w.bodies.length,0,site.name);assert(w.diagnostics().balanced&&w.diagnostics().finite);
 }
});

test('mirrored map works without the debug source numbers',()=>{
 const original=ARCH_SITES[0],mirror=shapes=>shapes.map(s=>({...s,rect:[original.data.width-s.rect[0]-s.rect[2],...s.rect.slice(1)]}));
 const site={...original,data:{...original.data,shapes:mirror(original.data.shapes)},structure:{...original.structure,roles:mirror(original.structure.roles)}};
 const w=make(site);w.activate(w.width-attacks[1].x,attacks[1].y);step(w,8);
 assert(w.jointYields>0);assert(w.jointBreaks>0);assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
const activeJoint=()=>{
 const w=make();w.unlimited=true;w.activate(attacks[1].x,attacks[1].y);
 for(let i=0;i<180&&!w.yieldJoints?.length;i++)w.step(1/60);
 assert(w.yieldJoints?.length);return {w,j:w.yieldJoints[0]};
};
test('rebuilding a body away from its seam retains the physical connection and fatigue',()=>{
 const {w,j}=activeJoint(),old=j.upper,constraint=j.constraint;j.damage=.25;
 w.removePiece(old);w.addConnected(old.pixels,old,old.damage);w.reconcileJoints();
 assert.equal(j.phase,'yielding');assert.notEqual(j.upper,old);assert.equal(j.damage,.25);
 const constraints=Composite.allConstraints(w.engine.world);assert(!constraints.includes(constraint));assert(constraints.includes(j.constraint));
 assert(w.diagnostics().balanced);step(w,6);assert(w.diagnostics().finite);
});
test('removing the actual seam releases it with no orphan constraint or extra impulse',()=>{
 const {w,j}=activeJoint(),old=j.upper,constraint=j.constraint,remove=new Set(j.cuts.map(c=>c.id));
 const velocities=()=>[j.upper,j.lower].map(p=>({...p.body.velocity,angular:p.body.angularVelocity}));
 const release=w.releaseJoint.bind(w);let checked=false;
 w.releaseJoint=(joint,reason)=>{const before=velocities();release(joint,reason);assert.deepEqual(velocities(),before);checked=true;};
 for(const p of old.pixels)if(remove.has(p.id))w.emitPixel({...p,...w.pixelPosition(old,p)});
 w.removePiece(old);w.addConnected(old.pixels.filter(p=>!remove.has(p.id)),old,old.damage);w.reconcileJoints();
 assert(checked);assert.equal(j.phase,'separated');assert(!Composite.allConstraints(w.engine.world).includes(constraint));
 step(w,3);assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
for(const tool of ['bomb','blackhole'])test(`second ${tool} at a live connection conserves all pixels`,()=>{
 const {w,j}=activeJoint(),q={x:j.lower.body.position.x+j.constraint.pointA.x,y:j.lower.body.position.y+j.constraint.pointA.y};
 w.allowedTools.push('blackhole');w.setTool(tool);assert(w.activate(q.x,q.y));step(w,10);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
 const bodies=new Set(Composite.allBodies(w.engine.world));
 for(const c of Composite.allConstraints(w.engine.world))for(const b of [c.bodyA,c.bodyB])if(b)assert(bodies.has(b));
});

test('multiple seams restore collision groups independently and never add release velocity',async()=>{
 const {YardKit}=await import('../src/paid-lab/culture/kit.js'),{packMapCells}=await import('../src/map-maker-generator.js');
 const k=new YardKit(100,110);k.paintAs(2,()=>k.rect(15,10,68,20,3));k.paintAs(1,()=>{k.rect(25,30,2,80,3);k.rect(65,30,2,80,3);});
 const site={data:{width:100,height:122,floorY:110,shapes:packMapCells(k.cells,100,110)},structure:{version:1,roles:packMapCells(k.roles,100,110)}};
 const w=make(site),ids=Array.from(w.cells,(_,i)=>i).filter(i=>w.cells[i]&&Math.floor(i/w.width)<109),p=w.releaseBody(ids);
 w.attachHinge(p,{x:26,y:109},108*100+25,109*100+25);w.syncStatic();
 const section=w.sections(ids,0,109,[p.anchorId])[0],cuts=[25,26,65,66].map(x=>({id:29*100+x,x:x+.5,strength:1,pillar:true}));
 w.beginYield({piece:p,section,cuts});assert.equal(w.yieldJoints.length,2);const [a,b]=w.yieldJoints;
 const motion=j=>[j.upper,j.lower].map(p=>({...p.body.velocity,angular:p.body.angularVelocity}));
 const before=motion(a);w.releaseJoint(a,'test-release');assert.deepEqual(motion(a),before);
 assert.equal(a.lower.body.collisionFilter.group,0);assert(b.upper.body.collisionFilter.group<0);assert.equal(b.upper.body.collisionFilter.group,b.lower.body.collisionFilter.group);
 const next=motion(b);w.releaseJoint(b,'test-release');assert.deepEqual(motion(b),next);
 for(const piece of w.bodies)for(const part of piece.body.parts)assert.equal(part.collisionFilter.group,0);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('free run export identifies the physical model and connection counts',async()=>{
 const {runSnapshot,ArchJournal}=await import('../src/arch/telemetry.js');
 const run=new ArchRun(ARCH_SITES[0],freshProfile(),'stage'),journal=new ArchJournal({sessionId:'joint-test'});
 run.world.activate(attacks[1].x,attacks[1].y);step(run.world,4);
 const snapshot=runSnapshot(run);assert.equal(snapshot.physicsVersion,'arch-yielding-joints-v1');assert(snapshot.jointYields>0);assert(snapshot.jointBreaks>0);
 journal.start(run);assert.equal(journal.current.physicsVersion,snapshot.physicsVersion);
});
test('body budget fallback releases a removed joint endpoint without losing pixels',()=>{
 const {w,j}=activeJoint(),tune=w.tune.bind(w);w.tune=(id,fallback)=>id==='bodyCap'?1:tune(id,fallback);
 w.enforceBodyBudget();w.reconcileJoints();assert.equal(j.phase,'separated');step(w,3);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);assert(w.bodies.length<=1);
 const bodies=new Set(Composite.allBodies(w.engine.world));for(const c of Composite.allConstraints(w.engine.world))for(const b of [c.bodyA,c.bodyB])if(b)assert(bodies.has(b));
});
for(const site of [ARCH_TUTORIAL,...ARCH_SITES,ARCH_BOSS])test(`${site.name}: several starter blasts keep the new campaign stable`,()=>{
 const w=make(site);w.unlimited=true;
 for(const q of site.preview){w.activate(q.x,q.y);step(w,1);}
 step(w,10);assert(w.diagnostics().balanced&&w.diagnostics().finite);
 const bodies=new Set(Composite.allBodies(w.engine.world));for(const c of Composite.allConstraints(w.engine.world))for(const b of [c.bodyA,c.bodyB])if(b)assert(bodies.has(b));
});
test('balance analysis separates the old and new physical models',async()=>{
 const {analyzeReport}=await import('../scripts/analyze-arch-report.mjs');
 const run={balanceVersion:'same',mapVersion:'same',resetCount:0,mapId:'a',status:'finished',latest:{activeMs:1000}};
 const text=analyzeReport({schemaVersion:1,campaign:'arch',currentProfile:{},records:[run,{...run,physicsVersion:'arch-yielding-joints-v1'}]});
 assert.match(text,/arch-rigid-joints-v0/);assert.match(text,/arch-yielding-joints-v1/);
});
