import {BatteryWorld,toolCost} from './battery-world.js';
import {BATTERY_MAPS,mapPixelCount} from './battery-maps.js';

export {BATTERY_MAPS};
export const BATTERY_SAVE_KEYS=['pixel-demolition-battery-v1-a','pixel-demolition-battery-v1-b'];
export const BATTERY_TOOLS=[
  {id:'cutter',name:'절단기',description:'가는 연결부를 자르고 무게로 무너뜨리기'},
  {id:'hammer',name:'충격기',description:'좁은 곳을 깨고 조각을 선택한 방향으로 밀기'},
  {id:'bomb',name:'폭파기',description:'작은 범위를 시간차로 폭파하기'},
];
const ids=BATTERY_TOOLS.map(t=>t.id),stageIds=BATTERY_MAPS.map(m=>m.id);
const levelLimit={capacity:16,cutter:5,hammer:5,bomb:5};
const upgradePrice=(key,level,extra={})=>extra[key]?extra[key].cost+extra[key].step*level:key==='capacity'?120+80*level:200+150*level;
const spent=(p,extra)=>p.owned.reduce((n,id)=>n+(id==='hammer'?220:id==='bomb'?480:0),0)+
  Object.entries(p.upgrades).reduce((sum,[key,level])=>sum+Array.from({length:level},(_,n)=>upgradePrice(key,n,extra)).reduce((a,b)=>a+b,0),0);
const fresh=(extra={})=>({version:1,revision:0,parts:0,earned:0,owned:['cutter'],upgrades:{capacity:0,cutter:0,hammer:0,bomb:0,...Object.fromEntries(Object.keys(extra).map(key=>[key,0]))},completed:[],attempt:null});
export const capacity=p=>30+15*p.upgrades.capacity;
export const energyCost=(tool,p)=>toolCost(tool,p.upgrades);
const list=(value,allowed)=>Array.isArray(value)&&value.length===new Set(value).size&&value.every(v=>allowed.includes(v));
function parse(raw,capacityLimit=levelLimit.capacity,efficiencyLimit=levelLimit.cutter,extra={}){
  try{
    const p=JSON.parse(raw);
    const extraKeys=Object.keys(extra);
    // Old saves have exactly the four original upgrades; introduce new levels only at zero.
    if(p?.upgrades&&Object.keys(p.upgrades).length===4&&extraKeys.every(k=>!Object.hasOwn(p.upgrades,k)))
      p.upgrades={...p.upgrades,...Object.fromEntries(extraKeys.map(k=>[k,0]))};
    if(!p||p.version!==1||![p.revision,p.parts,p.earned].every(n=>Number.isSafeInteger(n)&&n>=0)||
      !list(p.owned,ids)||!p.owned.includes('cutter')||!list(p.completed,stageIds)||!p.upgrades||
      Object.keys(p.upgrades).length!==4+extraKeys.length||Object.keys(levelLimit).some(k=>!Number.isInteger(p.upgrades[k])||p.upgrades[k]<0||p.upgrades[k]>(k==='capacity'?capacityLimit:efficiencyLimit))||
      extraKeys.some(k=>!Number.isInteger(p.upgrades[k])||p.upgrades[k]<0||p.upgrades[k]>extra[k].max)||
      ids.some(k=>p.upgrades[k]>0&&!p.owned.includes(k))||p.parts!==p.earned-spent(p,extra))return null;
    if(p.completed.some(id=>stageIds.indexOf(id)>0&&!p.completed.includes(stageIds[stageIds.indexOf(id)-1])))return null;
    if(p.attempt!==null){
      const a=p.attempt,site=BATTERY_MAPS.find(s=>s.id===a?.stage);
      if(!site||typeof a.id!=='string'||a.id.length<1||a.id.length>100||!Number.isInteger(a.count)||a.count<0||a.count>mapPixelCount(site)||
        typeof a.qualified!=='boolean'||a.qualified!==(a.count>=Math.ceil(mapPixelCount(site)*.7))||a.count>p.earned||
        stageIds.indexOf(a.stage)>0&&!p.completed.includes(stageIds[stageIds.indexOf(a.stage)-1])||a.qualified&&!p.completed.includes(a.stage))return null;
    }
    return {version:1,revision:p.revision,parts:p.parts,earned:p.earned,owned:p.owned,upgrades:p.upgrades,completed:p.completed,attempt:p.attempt};
  }catch{return null;}
}
function read(storage,saveKeys=BATTERY_SAVE_KEYS,capacityLimit=levelLimit.capacity,efficiencyLimit=levelLimit.cutter,extra={},legacySaveKeys=[]){
  let raw=saveKeys.map(k=>storage.getItem(k));
  // Import only before any new-version save exists; never roll back a damaged new save.
  if(raw.every(v=>v===null))raw=legacySaveKeys.map(k=>storage.getItem(k));
  const valid=raw.map(v=>parse(v,capacityLimit,efficiencyLimit,extra)).filter(Boolean).sort((a,b)=>b.revision-a.revision);
  return {profile:valid[0]||null,damaged:raw.some(v=>v!==null&&!parse(v,capacityLimit,efficiencyLimit,extra))};
}
export class BatteryRun{
  constructor(site,profile,id=globalThis.crypto.randomUUID()){
    this.site=site;this.id=id;this.world=new BatteryWorld(site.data,{capacity:capacity(profile),efficiency:profile.upgrades});
    this.state='active';this.paused=false;this.accumulator=0;
  }
  get ratio(){return this.world.collected/this.world.initial;}
  get qualified(){return this.world.collected>=Math.ceil(this.world.initial*.7);}
  pause(value){this.paused=!!value;this.accumulator=0;}
  update(dt,input={working:false}){
    if(this.paused||this.state!=='active'||!Number.isFinite(dt)||dt<=0)return;
    this.accumulator+=Math.min(.1,dt);
    let from=input.from||{x:input.x,y:input.y};
    while(this.accumulator+1e-8>=1/30){
      if(input.working)this.world.work(input.x,Math.min(this.world.floorY,input.y),1/30,1,from);
      this.world.step(1/30);this.accumulator=Math.max(0,this.accumulator-1/30);
      from={x:input.x,y:Math.min(this.world.floorY,input.y)};
    }
  }
}
export class BatteryJourney{
  constructor(storage,locks=globalThis.navigator?.locks,{runClass=BatteryRun,saveKeys=BATTERY_SAVE_KEYS,lockName='pixel-demolition-battery-v1',capacityLimit=levelLimit.capacity,efficiencyLimit=levelLimit.cutter,extraUpgrades={},legacySaveKeys=[]}={}){
    this.runClass=runClass;this.saveKeys=saveKeys;this.legacySaveKeys=legacySaveKeys;this.lockName=lockName;this.capacityLimit=capacityLimit;this.efficiencyLimit=efficiencyLimit;this.extraUpgrades=extraUpgrades;
    this.storage=storage;this.locks=locks;this.profile=fresh(extraUpgrades);this.currentRun=null;this.notice='';this.busy=false;
    this.persistent=!!storage&&!!locks?.request;
    try{if(storage){const loaded=read(storage,this.saveKeys,this.capacityLimit,this.efficiencyLimit,this.extraUpgrades,this.legacySaveKeys);if(loaded.profile)this.profile=loaded.profile;
      else if(loaded.damaged)this.persistent=false;
      if(loaded.damaged)this.notice=loaded.profile?'이전 정상 저장으로 복구했어요.':'저장을 읽지 못해 이번 실행만 진행돼요.';
    }}catch{this.persistent=false;}
    if(!this.persistent&&!this.notice)this.notice='저장을 사용할 수 없어 이번 실행만 진행돼요.';
  }
  capacity(profile=this.profile){return capacity(profile);}
  energyCost(tool,profile=this.profile){return energyCost(tool,profile);}
  upgradeCost(key,level){return upgradePrice(key,level,this.extraUpgrades);}
  isUnlocked(id){const n=stageIds.indexOf(id);return n>=0&&(n===0||this.profile.completed.includes(stageIds[n-1]));}
  async commit(change){
    if(this.busy)return {ok:false,reason:'저장 중이에요.'};this.busy=true;
    const expected=JSON.stringify(this.profile);
    const perform=async()=>{try{
      if(this.persistent&&JSON.stringify(read(this.storage,this.saveKeys,this.capacityLimit,this.efficiencyLimit,this.extraUpgrades,this.legacySaveKeys).profile||fresh(this.extraUpgrades))!==expected)return {ok:false,reason:'다른 탭에서 진행이 바뀌었어요. 새로고침해 주세요.'};
      const next=change(this.profile);next.revision=this.profile.revision+1;
      if(!parse(JSON.stringify(next),this.capacityLimit,this.efficiencyLimit,this.extraUpgrades))return {ok:false,reason:'저장할 부품 내역을 확인하지 못했어요.'};
      if(this.persistent)await this.storage.setItem(this.saveKeys[next.revision%2],JSON.stringify(next));
      this.profile=next;return {ok:true};
    }catch{return {ok:false,reason:'저장하지 못했어요. 다시 시도해 주세요.'};}};
    try{return this.persistent?await this.locks.request(this.lockName,perform):await perform();}
    catch{return {ok:false,reason:'저장 잠금을 얻지 못했어요. 다시 시도해 주세요.'};}
    finally{this.busy=false;}
  }
  async start(id){
    if(!this.isUnlocked(id))return {ok:false,reason:'이전 현장에서 한 번에 70%를 회수하세요.'};
    if(this.currentRun?.state==='active')return {ok:false,reason:'현재 출동의 부품을 먼저 정산하세요.'};
    const run=new this.runClass(BATTERY_MAPS.find(s=>s.id===id),this.profile);
    const result=await this.commit(p=>({...p,attempt:{id:run.id,stage:id,count:0,qualified:false}}));
    if(result.ok)this.currentRun=run;
    return {...result,run:result.ok?run:null};
  }
  validRun(run){return run===this.currentRun&&run?.state==='active'&&this.profile.attempt?.id===run.id;}
  async checkpoint(run){
    if(!this.validRun(run))return {ok:false,reason:'저장할 출동이 없어요.'};
    const count=run.world.collected,qualified=run.qualified;
    if(count===this.profile.attempt.count)return {ok:true,awarded:0};
    const delta=count-this.profile.attempt.count;
    if(delta<0)return {ok:false,reason:'회수 내역이 맞지 않아요.'};
    const result=await this.commit(p=>({...p,parts:p.parts+delta,earned:p.earned+delta,
      completed:qualified&&!p.completed.includes(run.site.id)?[...p.completed,run.site.id]:p.completed,
      attempt:{id:run.id,stage:run.site.id,count,qualified}}));
    return {...result,awarded:result.ok?delta:0};
  }
  async returnToBase(run){
    if(!this.validRun(run))return {ok:false,reason:'이미 정산했거나 현재 출동이 아니에요.'};
    const count=run.world.collected,qualified=run.qualified,delta=count-this.profile.attempt.count;
    if(delta<0)return {ok:false,reason:'회수 내역이 맞지 않아요.'};
    const result=await this.commit(p=>({...p,parts:p.parts+delta,earned:p.earned+delta,
      completed:qualified&&!p.completed.includes(run.site.id)?[...p.completed,run.site.id]:p.completed,attempt:null}));
    if(result.ok){run.state='returned';run.pause(true);}
    return {...result,recovered:result.ok?count:0,qualified:result.ok&&qualified};
  }
  offer(id){
    const p=this.profile;
    if(id==='hammer'||id==='bomb')return {id,name:BATTERY_TOOLS.find(t=>t.id===id).name+' 구입',cost:id==='hammer'?220:480,available:!p.owned.includes(id),description:id==='hammer'?'조각을 좌우로 밀어 연쇄 붕괴':'작은 범위를 한꺼번에 폭파',level:p.owned.includes(id)?1:0,max:1};
    const key=id==='capacity'?'capacity':id.replace('-efficiency','');
    if(!Object.hasOwn(levelLimit,key))return null;
    const level=p.upgrades[key],max=key==='capacity'?this.capacityLimit:this.efficiencyLimit;
    const next={...p,upgrades:{...p.upgrades,[key]:level+1}};
    return {id,name:key==='capacity'?`배터리 용량 +${this.capacity(next)-this.capacity(p)}`:BATTERY_TOOLS.find(t=>t.id===key).name+' 효율 개조',cost:upgradePrice(key,level),
      available:level<max&&(key==='capacity'||p.owned.includes(key)),level,max,
      description:key==='capacity'?`완충 ${this.capacity(p)} → ${this.capacity(next)}`:`배터리 소모 ${this.energyCost(key,p).toFixed(1)} → ${this.energyCost(key,next).toFixed(1)} / ${key==='cutter'?'초':'회'}`};
  }
  offers(){return ['capacity','hammer','bomb','cutter-efficiency','hammer-efficiency','bomb-efficiency'].map(id=>this.offer(id));}
  async buy(id){
    if(this.currentRun?.state==='active')return {ok:false,reason:'복귀해서 부품을 정산한 뒤 개조하세요.'};
    const offer=this.offer(id);if(!offer?.available)return {ok:false,reason:'먼저 도구를 구입하거나 개조 한도를 확인하세요.'};
    if(this.profile.parts<offer.cost)return {ok:false,reason:'부품이 부족해요.'};
    return this.commit(p=>id==='hammer'||id==='bomb'?{...p,parts:p.parts-offer.cost,owned:[...p.owned,id]}:
      {...p,parts:p.parts-offer.cost,upgrades:{...p.upgrades,[id==='capacity'?'capacity':id.replace('-efficiency','')]:offer.level+1}});
  }
}
