import test from 'node:test';
import assert from 'node:assert/strict';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
import {ArchWorld} from '../src/arch/world.js';
import {freshProfile} from '../src/arch/journey.js';
import {ARCH_SITES} from '../src/arch/maps.js';
import {YardKit} from '../src/paid-lab/culture/kit.js';
import {packMapCells} from '../src/map-maker-generator.js';

function fixture(){
 const k=new YardKit(80,100);
 k.paintAs(2,()=>k.rect(22,20,32,15,3));
 k.paintAs(1,()=>k.rect(40,35,3,65,3));
 const site={data:{width:80,height:112,floorY:100,shapes:packMapCells(k.cells,80,100)},structure:{version:1,roles:packMapCells(k.roles,80,100)}};
 const w=new ArchWorld(site,freshProfile());
 const ids=Array.from(w.cells,(_,id)=>id).filter(id=>w.cells[id]&&Math.floor(id/w.width)<99);
 const p=w.releaseBody(ids);w.attachHinge(p,{x:41.5,y:99},98*80+41,99*80+41);w.syncStatic();
 return {w,p};
}
function section(w,p){return w.sections(p.pixels.map(p=>p.id),p.body.angle,99,[p.anchorId])[0];}

test('an intact overloaded shaft breaks at its facade connection, not its midpoint',()=>{
 const {w,p}=fixture(),cuts=w.columnBreaks(p,section(w,p));
 assert(cuts.every(b=>Math.floor(b.id/w.width)===34),'use the body/pillar interface, not a fabricated middle cut');
});
test('a weakened shaft row fails there instead of relocating to the middle',()=>{
 const {w,p}=fixture();
 for(let x=40;x<43;x++)w.bonds.set(`${47*80+x}:${48*80+x}`,.85);
 const cuts=w.columnBreaks(p,section(w,p));
 assert(cuts.every(b=>Math.floor(b.id/w.width)===47));
});
test('brief recoil toward balance does not accumulate a bending snap',()=>{
 const {w,p}=fixture();
 for(const angle of [.6,.57,.54,.51]){
  Body.setAngle(p.body,angle);Body.setAngularVelocity(p.body,-.005);w.checkStructure(.1);
 }
 assert(w.bodies.includes(p),'the original pillar must stay attached during the brief unloading swing');
 assert.equal(w.snapCount,0);
});
test('a stationary overloaded facade still fractures instead of balancing forever',()=>{
 const {w,p}=fixture();Body.setAngle(p.body,.6);Body.setAngularVelocity(p.body,0);
 for(let i=0;i<30&&w.bodies.includes(p);i++)w.checkStructure(.1);
 assert(!w.bodies.includes(p));assert(w.snapCount>0);
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('a severely compressed column can fail even during an unloading swing',()=>{
 const {w,p}=fixture();w.engine.gravity.scale*=10;
 for(let i=0;i<10&&w.bodies.includes(p);i++){
  Body.setAngle(p.body,.6-i*.02);Body.setAngularVelocity(p.body,-.005);w.checkStructure(.1);
 }
 assert(!w.bodies.includes(p));assert(w.snapCount>0);
});

test('missing pixels create a real narrow neck that takes priority over the joint',()=>{
 const {w,p}=fixture();
 p.pixels=p.pixels.filter(v=>![47*80+40,47*80+42].includes(v.id));
 const cuts=w.columnBreaks(p,section(w,p));
 assert(cuts.every(b=>[46,47].includes(Math.floor(b.id/w.width))));
 assert(cuts.every(b=>b.id%w.width===41));
});
test('fractured children retain the moving parent velocity field',()=>{
 const {w,p}=fixture();Body.setAngle(p.body,.6);Body.setVelocity(p.body,{x:.12,y:.08});Body.setAngularVelocity(p.body,.005);
 for(let i=0;i<30&&w.bodies.includes(p);i++)w.checkStructure(.1);
 assert(!w.bodies.includes(p));assert(w.bodies.length>=2);
 for(const child of w.bodies){
  const dx=child.body.position.x-p.body.position.x,dy=child.body.position.y-p.body.position.y;
  assert(Math.abs(child.body.velocity.x-(p.body.velocity.x-p.body.angularVelocity*dy))<1e-8);
  assert(Math.abs(child.body.velocity.y-(p.body.velocity.y+p.body.angularVelocity*dx))<1e-8);
  assert(Math.abs(child.body.angularVelocity-p.body.angularVelocity)<1e-8);
 }
 assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('fracture telemetry identifies the actual broken joint rather than the support row',()=>{
 const {w,p}=fixture();Body.setAngle(p.body,.6);
 for(let i=0;i<30&&w.bodies.includes(p);i++)w.checkStructure(.1);
 const event=w.events.find(e=>e.kind==='pillar-snap');assert(event);assert.equal(event.y,35);
});

test('map-1 join blast recoils, then separates at a real joint with conserved pixels',()=>{
 const w=new ArchWorld(ARCH_SITES[0],freshProfile()),cuts=[],choose=w.columnBreaks.bind(w);
 w.columnBreaks=(p,s)=>{const result=choose(p,s);cuts.push(result);return result;};
 w.activate(12,103);
 for(let i=0;i<30;i++){w.step(1/60);w.events=[];}
 assert(w.bodies.some(p=>p.hinge&&p.body.angle>.01),'initial outward recoil remains visible');
 assert.equal(cuts.length,0,'do not immediately split the leg during recoil');
 for(let i=0;i<870;i++){w.step(1/60);w.events=[];assert(w.diagnostics().balanced&&w.diagnostics().finite);}
 assert(cuts.length>0);
 assert(cuts[0].every(b=>w.roles[b.id]!==1&&w.roles[b.id+w.width]===1),'first loaded shaft separates at the head/column joint');
});
