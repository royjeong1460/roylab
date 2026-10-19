import {FreeJourney} from '../src/free30/journey.js';
import {BALANCE_VERSION,UNLOCKS} from '../src/free30/balance.js';
import {FREE_SITES,FREE_BOSS} from '../src/free30/sites.js';
import {play} from './free30-probe.mjs';
const style=process.argv[2]||'mixed',interval=Number(process.argv[3]||2),shopSeconds=Number(process.argv[4]||5);
if(!['bomb','blackhole','mixed'].includes(style)||!Number.isFinite(interval)||interval<=0||!Number.isFinite(shopSeconds)||shopSeconds<0)throw Error('usage: style [positive attack seconds] [nonnegative shop seconds]');
const j=new FreeJourney({getItem:()=>null,setItem:()=>{}},{request:async(_,f)=>f()}),p=j.profile;
let work=0,menu=0,firstBH=null;
function buy(){
 // Defined preference curves; no purchase or playtime gates exist in the actual game.
 const goals=style==='bomb'?{bombRange:12,bombForce:10,capacity:18,suction:6,range:4}:style==='blackhole'?{bombRange:5,bombForce:3,capacity:18,suction:6,range:4,gravityForce:8,coreMix:8,wearSpeed:8}:{bombRange:10,bombForce:8,capacity:16,suction:6,range:4,gravityForce:6,coreMix:6,wearSpeed:6};
 while(true){
  if(style!=='bomb'&&!p.owned.includes('blackhole')&&p.upgrades.bombRange>=3&&p.parts>=UNLOCKS.blackhole.cost){p.parts-=UNLOCKS.blackhole.cost;p.spent+=UNLOCKS.blackhole.cost;p.owned.push('blackhole');firstBH=work+menu;continue;}
  const options=j.offers().filter(o=>Object.hasOwn(goals,o.id)&&o.available&&o.level<goals[o.id]&&o.cost<=p.parts);
  options.sort((a,b)=>(a.level/goals[a.id]-(a.id==='bombRange'?.2:0))-(b.level/goals[b.id]-(b.id==='bombRange'?.2:0)));
  const o=options[0];if(!o)break;p.parts-=o.cost;p.spent+=o.cost;p.upgrades[o.id]++;
 }
}
for(let n=0;n<150;n++){
 const eligible=FREE_SITES.slice(0,p.earned<2000?2:p.earned<6000?4:6),site=eligible[n%eligible.length];
 const result=play(site,p,{style,interval});p.parts+=result.recovered;p.earned+=result.recovered;work+=result.seconds;menu+=shopSeconds;buy();
 {const boss=play(FREE_BOSS,p,{style,interval});console.log(JSON.stringify({balanceVersion:BALANCE_VERSION,style,interval,shopSeconds,run:n+1,earned:p.earned,spent:p.spent,estimateMinutes:+((work+menu+boss.seconds)/60).toFixed(1),firstBH,upgrades:p.upgrades,last:result,boss}));if(boss.qualified)break;}
}
