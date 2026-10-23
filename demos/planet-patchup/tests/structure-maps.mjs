import test from 'node:test';
import assert from 'node:assert/strict';
import {compileStructure} from '../src/structure/model.js';
import {StructuralFreeWorld} from '../src/structure/free-world.js';
import {FREE_SITES,FREE_BOSS,FREE_TUTORIAL} from '../src/free30/sites.js';
import {CULTURE_MAPS,ORIGINAL_YARD} from '../src/paid-lab/culture/maps.js';
import {LAYOUT_MAPS} from '../src/ideas-lab/maps.js';
import {FreeJourney} from '../src/free30/journey.js';
import {extendWorksite} from '../src/ideas-lab/space.js';
export const sites=[...FREE_SITES,FREE_BOSS,FREE_TUTORIAL,...CULTURE_MAPS.map(m=>m.site),ORIGINAL_YARD.site,...LAYOUT_MAPS.map(m=>m.site)];
const profile=()=>({...new FreeJourney({getItem:()=>null,setItem:()=>{}}).profile,owned:['bomb','blackhole']});
test('every campaign and experimental map has complete structural ownership and load paths',()=>{
 for(const site of sites){const m=compileStructure(site.data,site.structure);assert(m.modules.some(p=>p.type==='pillar'),site.id);assert(m.modules.some(p=>p.type==='body'),site.id);assert(m.moduleLinks.length,site.id);
  assert.equal(m.moduleOf.filter(n=>n>=0).length,m.cells.filter(Boolean).length,site.id);
  const ext=extendWorksite(site).site;const padded=compileStructure(ext.data,ext.structure);assert.equal(padded.modules.length,m.modules.length,site.id+' apron');
 }
});
test('all pristine maps stay supported; a real blast releases finite conserved material',()=>{
 for(const site of sites){const w=new StructuralFreeWorld(site,profile());w.unlimited=true;
  for(let n=0;n<90;n++)w.step(1/60);assert.equal(w.snapCount,0,site.id+' pristine snap');assert.equal(w.targetReleased,0,site.id+' spontaneous release');
  const q=site.preview[0];assert(w.activate(q.x,q.y),site.id);
  for(let n=0;n<300;n++){w.step(1/60);w.events=[];}
  assert(w.diagnostics().balanced&&w.diagnostics().finite,site.id);assert(w.bodies.length<=w.tune('bodyCap',18),site.id);assert(w.targetReleased>0,site.id+' blast');
 }
});

import {MapDraft} from '../src/free30/editor/model.js';
import {validateSite} from '../src/map-maker-generator.js';
import Body from 'phaser/src/physics/matter-js/lib/body/Body.js';
test('local editor preserves authored roles until pixels are edited; undo restores them',()=>{
 for(const {site} of CULTURE_MAPS){
  const draft=new MapDraft(site),reopened=MapDraft.open(draft.serialize());
  assert.deepEqual(reopened.export().structure,site.structure);
  reopened.checkpoint();const id=reopened.cells.findIndex(Boolean);reopened.point(id%reopened.width,Math.floor(id/reopened.width),0);
  assert.equal(JSON.parse(reopened.serialize()).structure,undefined);
  reopened.undo();assert.deepEqual(reopened.export().structure,site.structure);
 }
 const invalid=structuredClone(CULTURE_MAPS[0].site);invalid.structure.roles[0].color=4;
 assert.throws(()=>validateSite(invalid));
 const local=JSON.parse(new MapDraft(CULTURE_MAPS[0].site).serialize());local.structure.roles=[];
 assert.throws(()=>MapDraft.open(JSON.stringify(local)));
});
const tall=()=>new StructuralFreeWorld(LAYOUT_MAPS.find(m=>m.key==='layout-tall').site,profile());
const idsOf=w=>Array.from(w.cells.keys()).filter(id=>w.cells[id]);
test('generic load paths react to width, overhead mass, and an actual severed column',()=>{
 const w=tall(),ids=idsOf(w),full=w.sections(ids)[0];
 const thin=ids.filter(id=>!(id%w.width===34&&Math.floor(id/w.width)>187));
 assert(w.sections(thin)[0].utilization>full.utilization);
 assert(w.sections(ids.filter(id=>Math.floor(id/w.width)>86))[0].utilization<full.utilization);
 for(let y=200;y<204;y++)for(let x=33;x<35;x++)w.makeSand(y*w.width+x);
 w.detach();assert(w.bodies.some(p=>p.structuralHinge));
 for(let i=0;i<360;i++){w.step(1/60);w.events=[];}
 assert(w.snapCount>0);assert(w.diagnostics().balanced&&w.diagnostics().finite);
});
test('free-falling structural pieces do not accumulate supported gravity stress',()=>{
 const w=tall(),p=w.releaseBody(idsOf(w));w.syncStatic();Body.setAngle(p.body,.4);
 assert(!w.isSupported(p));for(let n=0;n<30;n++)w.checkStructure(.1);
 assert.equal(w.snapCount,0);assert(w.bodies.includes(p));assert(w.diagnostics().balanced);
});
test('separate upper houses remain separate across a common lower deck',()=>{
 const w=new StructuralFreeWorld(CULTURE_MAPS.find(m=>m.key==='yard-03').site,profile());
 for(const s of w.sections(idsOf(w)))assert.equal(w.groups(s.above.map(id=>({id}))).length,1);
});
