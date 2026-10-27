import test from 'node:test';
import assert from 'node:assert/strict';
import {stagePresentation,offerPresentation,renderArchStageList,workshopTabs} from '../src/arch/menus.js';
import {freeOffers} from '../src/arch/balance.js';
import {FREE_STAGES} from '../src/arch/stages.js';
const profile=()=>({parts:150,upgrades:{},owned:['bomb'],skills:{},equipped:{passive:null,active:null},stageRecords:{}});

test('weapons lead, skills appear when learnable even without money, and tutorial stays on its required weapon',()=>{
 const p=profile(),ids=()=>workshopTabs(p).map(t=>t.id);
 assert.deepEqual(ids(),['weapons','utility']);
 p.parts=0;p.stageRecords[FREE_STAGES[0].id]={recovered:70,total:100};assert.deepEqual(ids(),['weapons','utility']);
 p.stageRecords[FREE_STAGES[1].id]={recovered:70,total:100};assert.deepEqual(ids(),['weapons','skills','utility']);
 p.tutorial='upgrade';assert.deepEqual(ids(),['weapons']);p.tutorial='done';assert.deepEqual(ids(),['weapons','skills','utility']);
 p.stageRecords={};p.skills.aftershock=1;assert.deepEqual(ids(),['weapons','skills','utility']);
 p.skills={};assert.deepEqual(ids(),['weapons','utility']);
});

test('map labels do not round incomplete clears or full clears upward',()=>{
 for(const [recovered,status,text]of [[699,'open','69.9%'],[700,'cleared','70.0%'],[999,'cleared','99.9%'],[1000,'complete','100%']]){
  const p=profile();p.stageRecords[FREE_STAGES[0].id]={recovered,total:1000};
  const row=stagePresentation(p,FREE_STAGES[0],0);assert.equal(row.state,status);assert.equal(row.percent,text);assert(row.open);
 }
 const p=profile();assert.equal(stagePresentation(p,FREE_STAGES[6],6).open,false);
 for(const s of FREE_STAGES.slice(0,6))p.stageRecords[s.id]={recovered:70,total:100};
 assert.equal(stagePresentation(p,FREE_STAGES[6],6).open,true);
});

test('upgrade cards distinguish cost, missing parts, unlock requirements and cap',()=>{
 const p=profile(),find=id=>freeOffers(p).find(o=>o.id===id);
 assert.equal(offerPresentation(find('battery'),p).action,'Upgrade');
 assert.equal(offerPresentation(find('blastRadius'),p).action,'Need 150');
 assert.match(offerPresentation(find('wellPull'),p).hint,/Unlock Black Hole/);
 assert.match(offerPresentation(find('blackhole'),p).hint,/3 sites/);
 p.upgrades.battery=24;assert.equal(offerPresentation(find('battery'),p).action,'Max level');
 for(const s of FREE_STAGES.slice(0,2))p.stageRecords[s.id]={recovered:70,total:100};
 assert.equal(offerPresentation(find('aftershock'),p).action,'Learn');
 assert.equal(offerPresentation(find('aftershock'),p).price,'FREE');
});

function documentStub(){
 const doc={createElement(tag){const n={tag,ownerDocument:doc,children:[],dataset:{},style:{},attributes:{},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=[...nodes];},setAttribute(k,v){this.attributes[k]=v;}};return n;}};return doc;
}
test('map rendering keeps actual IDs, separate boss lock, and selection callbacks',()=>{
 const doc=documentStub(),container=doc.createElement('div'),picked=[];
 renderArchStageList(container,profile(),id=>picked.push(id));
 assert.equal(container.children.length,7);
 for(const [i,b]of container.children.entries()){assert.equal(b.dataset.stage,FREE_STAGES[i].id);assert.equal(b.disabled,i===6);if(!b.disabled)b.onclick();}
 assert.deepEqual(picked,FREE_STAGES.slice(0,6).map(s=>s.id));
});
