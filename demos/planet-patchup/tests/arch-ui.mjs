import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {ArchGuide,archTip,receiptText} from '../src/arch/ui.js';import {analyzeReport} from '../scripts/analyze-arch-report.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Arch tutorial teaches proximity collection and actual first upgrade',()=>{const g=new ArchGuide({x:1,y:1});g.stage='collect';assert.match(g.copy('mouse'),/No click needed/);g.stage='work';assert.match(g.copy('touch'),/300/);assert.match(archTip(10,'mouse',false),/Auto Collect/);});
test('boss receipt separates recovered parts from clear bonuses and explains failure payout',()=>{
 for(const [recovered,bonus,qualified,firstClear] of [[4199,0,false,false],[4200,4000,true,true],[6000,1000,true,false]]){
  const reward=recovered+bonus,text=receiptText({siteName:'Boss',ratio:recovered/6000,recovered,reward,bonus,qualified,firstClear,mode:'boss'});
  assert.match(text.copy,new RegExp(`${reward.toLocaleString()} parts awarded`));assert.match(text.bonus,new RegExp(`${recovered.toLocaleString()} recovered parts`));
  if(qualified)assert.match(text.bonus,new RegExp(`${bonus.toLocaleString()} clear bonus`));else assert.match(text.bonus,/kept/);
  assert.doesNotMatch(text.bonus,/0 parts awarded|unlimited/);
 }
});
test('boss advice explains recovery on every attempt and keeps clear bonuses',async()=>{
 const {bossAdvice}=await import('../src/arch/balance.js');
 for(const bossCleared of [false,true]){const text=bossAdvice({bossCleared});assert.match(text,/Keep recovered pixels on every attempt/);assert.doesNotMatch(text,/failure: 0/);assert.match(text,bossCleared?/1,000/:/4,000/);}
});
test('only free config replaces boot and shared adapter preserves defaults',()=>{assert.match(read('../vite.free.config.js'),/replace\('\/src\/free30\/main.js','\/src\/arch\/main.js'\)/);assert.match(read('../free30.html'),/src="\/src\/free30\/main.js"/);assert.match(read('../src/free30/main.js'),/campaign\?\.Journey\|\|LegacyJourney/);assert.match(read('../src/arch/main.js'),/collectibleStyle:COLLECTIBLE_STYLE/);assert.match(read('../src/arch/hud.js'),/e\.stopPropagation/);});
test('analyzer handles empty reports and separates balance reset and training cohorts',()=>{const empty={schemaVersion:1,campaign:'arch',records:[],currentProfile:{}};assert.match(analyzeReport(empty),/0 runs/);const records=[{balanceVersion:'v1',mapVersion:'m1',mapId:'a',resetCount:0,status:'abandoned',latest:{activeMs:1000}},{balanceVersion:'v2',mapVersion:'m1',mapId:'a',resetCount:1,training:true,status:'finished',qualified:true,latest:{activeMs:2000,recovered:7,total:10}}];const text=analyzeReport({...empty,records});assert.match(text,/v1 \| m1 \| reset 0 \| a \| campaign/);assert.match(text,/v2 \| m1 \| reset 1 \| a \| training/);assert.match(text,/abandoned=1/);});
test('passive icon is visible only before the triggering attack; active skill stays an accessible button',async()=>{
 const {renderSkillHUD}=await import('../src/arch/hud.js');const nodes=new Map(['arch-skill-hud','arch-passive','arch-active'].map(id=>[id,{classList:{toggle(){}}}])),doc={getElementById:id=>nodes.get(id)};
 let p={id:null},a={id:null,level:0,available:false};const run={skillState:()=>({passive:p,active:a})};renderSkillHUD(doc,run,()=>{});assert(nodes.get('arch-skill-hud').hidden);
 p={id:'aftershock',count:1,threshold:4};renderSkillHUD(doc,run,()=>{});assert(nodes.get('arch-passive').hidden);
 p.count=3;renderSkillHUD(doc,run,()=>{});assert(!nodes.get('arch-passive').hidden);assert.match(nodes.get('arch-passive').alt,/next Blast/);
 a={id:'orbital',level:1,available:true,used:0};let activated=0;renderSkillHUD(doc,run,()=>activated++);nodes.get('arch-active').onclick({preventDefault(){},stopPropagation(){}});assert.equal(activated,1);assert.match(nodes.get('arch-active').ariaLabel,/Ready/);
});
test('Arch collection overlay retains suction spotlight and loose pixel target',async()=>{const {ArchTutorialOverlay}=await import('../src/arch/ui.js');const g=new ArchGuide({x:1,y:1});g.stage='collect';const view={guide:g,el:{},mask:{style:{}},marker:{style:{}},markerLabel:{},label:{},text:{}};ArchTutorialOverlay.prototype.render.call(view,{viewWidth:390,worldToScreen:(x,y)=>({x,y})},{x:2,y:3},{sand:[],flying:[]},'touch',false);assert.equal(view.mask.hidden,false);assert.equal(view.marker.hidden,false);assert.match(view.label.textContent,/Collect loose pixels/);assert.match(g.copy('touch'),/suction circle/);});
test('Arch touch help teaches proximity collection in both modes and milestone reset abandons journal',async()=>{const {archTouchHelp}=await import('../src/arch/ui.js');for(const contact of [true,false]){assert.match(archTouchHelp(contact),/suction circle/);assert.doesNotMatch(archTouchHelp(contact),/끌면 수집만|drag to collect/);}const main=read('../src/free30/main.js');assert.match(main,/campaign\?\.touchHelp/);assert.match(main,/else if\(result.reason==='reset'\)\{campaign\?\.abandon\(r,'progress-reset'\);home\(\)/);});
