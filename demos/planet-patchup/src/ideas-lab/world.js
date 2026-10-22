import {FreeWorld} from '../free30/world.js';
import {EXTRA_WELLS,prepareWell,wellFrame,pullTwin,holdPieces} from './blackholes.js';
const BLASTS=['normal','aftershock','relay','slam','expand','wave'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// Experimental impulses/pressure only. The shared collision solver and pixel ledger stay intact.
export class IdeaWorld extends FreeWorld {
 constructor(site,profile,options={}){
  super(site,profile);
  this.ideas={blast:BLASTS.includes(options.blast)?options.blast:'aftershock',well:['grind','release','drop',...EXTRA_WELLS].includes(options.well)?options.well:'grind',level:[1,2,3].includes(options.level)?options.level:1};
  this.ideaPending=[];this.ideaFields=[];this.ideaMarks=[];this.ideaVisuals=[];this.ideaCounts={};this.ideaClock=0;this.ideaStatus='받침이나 벽면을 눌러 효과를 비교해 보세요.';this.unlimited=true;
 }
 get ideaGain(){return 1+(this.ideas.level-1)*.4;}
 count(kind){this.ideaCounts[kind]=(this.ideaCounts[kind]||0)+1;}
 visual(kind,x,y,radius=6,life=.7){this.ideaVisuals.push({kind,x,y,radius,life,remaining:life});if(this.ideaVisuals.length>40)this.ideaVisuals.shift();}
 schedule(kind,delay,data){if(this.ideaPending.length<48)this.ideaPending.push({kind,remaining:delay,...data});}
 canUseTool(){return super.canUseTool()&&(!this.ideaPending||this.ideaPending.length<32)&&(!this.ideaFields||this.ideaFields.length<4)&&this.bombs.length<8;}
 activate(x,y){
  const ok=super.activate(x,y);if(!ok)return false;
  if(this.tool==='blackhole'){
   const w=this.wells.at(-1);w.ideaMode=this.ideas.well;prepareWell(this,w);
   if(w.ideaMode!=='grind'){w.coreMix=0;if(w.ideaMode==='drop')w.y=Math.max(5,y-(10+5*this.ideas.level));}
   this.ideaStatus=w.ideaMode==='release'?'압축 중 → 끝나면 바깥으로 방출':w.ideaMode==='drop'?'조각을 들어 올리는 중 → 끝나면 아래로 낙하':'중심에서 충돌·마찰로 분쇄 중';
   if(EXTRA_WELLS.includes(w.ideaMode))this.ideaStatus=wellFrame(this,w).phase;
  }
  return true;
 }
 blast(bomb){
  if(bomb.ideaSecondary){super.blast(bomb);return;}
  const mode=this.ideas.blast,gain=this.ideaGain;
  // The expanding device uses pressure instead of a full initial explosion.
  if(mode==='expand'){
   this.count(mode);this.ideaFields.push({kind:'expand',x:bomb.x,y:bomb.y,age:0,duration:1.6,radius:2,maxRadius:8+3*this.ideas.level,tick:0});
   this.ideaStatus='팽창 중 · 벽과 지붕을 안쪽에서 밀어요';return;
  }
  super.blast(bomb);this.count(mode);
  const radius=Math.max(16,this.tune('blastReach',18)),near=this.nearPieces(bomb.x,bomb.y,radius);
  if(mode==='aftershock'){
   for(let i=0;i<2;i++){const x=clamp(bomb.x+(i?1:-1)*(6+2*this.ideas.level),1,this.width-1),y=clamp(bomb.y-2,1,this.floorY-1);
    this.schedule('echo',.4+i*.3,{x,y,radius:2+.5*this.ideas.level,power:.55*gain});this.visual('echo',x,y,2+.5*this.ideas.level,.4+i*.3);}
   this.ideaStatus='첫 폭파 → 왼쪽 → 오른쪽 후속 폭파';
  }else if(mode==='relay'){
   const chosen=near.filter(p=>p.pixels.length>=8).sort((a,b)=>b.pixels.length-a.pixels.length)[0];
   if(chosen)this.ideaMarks.push({kind:'relay',ids:new Set(chosen.pixels.map(p=>p.id)),remaining:12,armedAt:this.ideaClock+.18});
   this.ideaStatus=chosen?'주황 조각 장전 · 다음 강한 충돌에서 한 번 폭파':'날아갈 덩어리가 없어요 · 받침 쪽을 노려보세요';
  }else if(mode==='slam'){
   const ids=new Set(near.flatMap(p=>p.pixels.map(v=>v.id)));
   for(const p of this.flying)if(Math.hypot(p.x-bomb.x,p.y-bomb.y)<=radius)ids.add(p.id);
   this.kick(bomb.x,bomb.y,radius,'up',1.5*gain);this.schedule('slam',.8,{x:bomb.x,y:bomb.y,radius:radius+12,ids});
   this.visual('up',bomb.x,bomb.y,radius,.8);this.ideaStatus='위로 띄우고 → 아래로 내려찍기';
  }else if(mode==='wave'){
   const chosen=near.filter(p=>p.pixels.length>=8).sort((a,b)=>b.pixels.length-a.pixels.length)[0];
   if(chosen)this.ideaMarks.push({kind:'wave',ids:new Set(chosen.pixels.map(p=>p.id)),remaining:12,armedAt:this.ideaClock+.18});
   this.ideaStatus=chosen?'민트 조각 장전 · 바닥에 떨어지면 좌우 충격파':'떨어질 덩어리가 없어요 · 높은 받침을 노려보세요';
  }
 }
 nearPieces(x,y,radius){return this.bodies.filter(p=>this.material(p).some(v=>Math.hypot(v.q.x-x,v.q.y-y)<=radius));}
 kick(x,y,radius,direction,strength,ids=null){
  const pieces=ids?this.bodies.filter(p=>p.pixels.some(v=>ids.has(v.id))):this.nearPieces(x,y,radius);
  for(const p of pieces){
   const b=p.body,dx=b.position.x-x,dy=b.position.y-y,d=Math.hypot(dx,dy)||1;
   const v=direction==='up'?{x:0,y:-1}:direction==='down'?{x:0,y:1}:{x:dx/d,y:dy/d};
   const impulse=strength*b.mass/(.6+b.mass);
   this.impulse(p,b.position,{x:v.x*impulse,y:v.y*impulse});
  }
  // Tiny debris participates in the same field, with the existing grain-speed cap.
  const cap=this.tune('grainSpeedCap',240);
  for(const p of this.flying){const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(ids?!ids.has(p.id):d>radius)continue;
   const v=direction==='up'?{x:0,y:-1}:direction==='down'?{x:0,y:1}:{x:dx/(d||1),y:dy/(d||1)};
   p.vx=clamp(p.vx+v.x*strength*35,-cap,cap);p.vy=clamp(p.vy+v.y*strength*35,-cap,cap);}
 }
 pressure(x,y,radius,strength){
  for(const p of [null,...this.nearPieces(x,y,radius)]){
   if(p&&!this.bodies.includes(p))continue;
   let closest=null,distance=radius;
   for(const v of this.material(p)){const d=Math.hypot(v.q.x-x,v.q.y-y);if(d<distance){closest=v.q;distance=d;}}
   if(closest)this.applyImpact(p,closest,{x:closest.x-x,y:closest.y-y||-.1},strength,'pressure',3+this.ideas.level);
  }
 }
 recordCollisions(pairs){
  const from=this.contacts?.length||0;super.recordCollisions(pairs);if(!this.ideaMarks?.length)return;
  // Record during Matter's callback; execute the explosion later, outside the solver.
  for(const hit of this.contacts.slice(from)){
   if(!hit.piece||hit.speed<12)continue;
   for(const mark of this.ideaMarks){
    if(mark.used||this.ideaClock<mark.armedAt||!hit.piece.pixels.some(p=>mark.ids.has(p.id)))continue;
    if(mark.kind==='wave'&&hit.point.y<this.floorY-3)continue;
    mark.used=true;
    if(mark.kind==='relay'){this.schedule('relay-hit',0,{x:hit.point.x,y:Math.min(this.floorY-1,hit.point.y),radius:2+this.ideas.level,power:.65*this.ideaGain});}
    else this.schedule('wave-start',0,{x:hit.point.x,y:this.floorY-1});
   }
  }
 }
 sampleWear(pairs,dt){
  if(this.ideas?.well!=='grind'){if(this.bodies)for(const p of this.bodies)p.rubbingTime=0;return;}
  super.sampleWear(pairs,dt);
 }
 displayWells(){
  return this.wells.flatMap(w=>w.ideaMode==='twin'?wellFrame(this,w).cores.map(q=>({...w,...q,radius:w.radius*.65})):w);
 }
 strainSupported(well,strength){
  const mode=well.ideaMode??this.ideas?.well;
  if(mode==='hold')return;
  if(EXTRA_WELLS.includes(mode)){
   const frame=wellFrame(this,{...well,ideaMode:mode});
   if(!frame.power)return;
   for(const q of frame.cores)super.strainSupported({...well,...q,radius:mode==='twin'?well.radius*.65:well.radius,power:well.power*frame.power/frame.cores.length},strength);
  }else super.strainSupported(well,strength);
 }
 pull(well,dt){
  if(EXTRA_WELLS.includes(well.ideaMode)){
   const frame=wellFrame(this,well);this.ideaStatus=frame.phase;
   if(well.ideaMode==='hold'){
    const n=holdPieces(this,well,dt);this.ideaStatus=n?`공중 고정 · ${n}개 붙잡는 중 · 아래를 폭파해 보세요`:'공중 고정 대기 · 범위 안의 떨어지는 조각을 붙잡아요';
   }else if(well.ideaMode==='twin')pullTwin(this,well,frame,dt);
   else{
    if(well.ideaMode==='travel')Object.assign(well,frame.cores[0]);
    if(frame.power)super.pull({...well,power:well.power*frame.power},dt);
   }
  }else if(well.ideaMode==='drop')super.pull({...well,power:well.power*(1+.3*this.ideas.level)},dt);
  else super.pull(well,dt);
 }
 execute(action){
  const g=this.ideaGain;
  if(action.kind==='echo'||action.kind==='relay-hit'){
   super.blast({...action,ideaSecondary:true,secondary:true});this.count(action.kind==='echo'?'echo':'relay-hit');
   this.visual('burst',action.x,action.y,action.radius+3,.5);this.ideaStatus=action.kind==='echo'?'후속 폭파 발동':'충돌 폭파 발동 · 연쇄는 여기서 종료';
  }else if(action.kind==='slam'){
   this.kick(action.x,action.y-10,action.radius+15,'down',2*g,action.ids);this.visual('down',action.x,action.y-10,action.radius,.8);this.ideaStatus='내려찍기 · 실제 충돌로 부서져요';
  }else if(action.kind==='wave-start'){
   this.count('wave-hit');this.ideaStatus='착지 충격파 · 좌우 받침으로 전달';
   for(let i=1;i<=3+this.ideas.level;i++)for(const sign of [-1,1])this.schedule('wave-pulse',i*.12,{x:clamp(action.x+sign*i*7,1,this.width-1),y:action.y});
  }else if(action.kind==='wave-pulse'){
   this.pressure(action.x,action.y,8,1.6*g);this.kick(action.x,action.y,8,'up',.6*g);this.visual('wave',action.x,action.y,7,.5);
  }
 }
 step(dt){
  if(this.settled||!Number.isFinite(dt)||dt<=0)return;
  let left=Math.min(.1,dt);
  while(left>1e-8){
   const h=Math.min(1/60,left);left-=h;this.ideaClock+=h;
   const pending=this.ideaPending;this.ideaPending=[];
   for(const action of pending){action.remaining-=h;if(action.remaining<=1e-8)this.execute(action);else this.ideaPending.push(action);}
   for(const field of this.ideaFields){
    field.age+=h;field.radius=2+(field.maxRadius-2)*Math.min(1,field.age/field.duration);field.tick-=h;
    if(field.tick<=0){field.tick=.15;this.pressure(field.x,field.y,field.radius,1.5*this.ideaGain);this.kick(field.x,field.y,field.radius,'out',.16*this.ideaGain);}
    if(field.age>=field.duration&&!field.ended){field.ended=true;super.blast({x:field.x,y:field.y,radius:2,power:.6*this.ideaGain,secondary:true});this.visual('burst',field.x,field.y,field.radius,.7);this.ideaStatus='팽창 완료 · 주변으로 밀어내고 터졌어요';}
   }
   this.ideaFields=this.ideaFields.filter(f=>!f.ended);
   const ending=this.wells.filter(w=>w.remaining<=h+1e-8&&w.ideaMode!=='grind');
   super.step(h);
   for(const well of ending){
    if(EXTRA_WELLS.includes(well.ideaMode)){
     this.count(well.ideaMode);well.held?.clear();
     this.ideaStatus={pulse:'맥동 종료 · 마지막 압축 후 중력으로 낙하',twin:'두 중심 합체 완료 · 충돌한 조각들이 떨어져요',travel:'이동 종료 · 끌려온 잔해가 떨어져요',hold:'공중 고정 해제 · 다시 중력으로 떨어져요'}[well.ideaMode];
     this.visual('down',well.x,well.y,well.radius,.7);continue;
    }
    const drop=well.ideaMode==='drop';this.count(drop?'drop':'release');
    this.kick(well.x,well.y,well.radius,drop?'down':'out',(drop?1.4:1.1)*this.ideaGain);
    this.visual(drop?'down':'burst',well.x,well.y,well.radius,.9);this.ideaStatus=drop?'블랙홀 해제 · 모인 조각을 아래로 떨어뜨려요':'압축 해제 · 남은 덩어리를 주변으로 방출해요';
   }
   for(const mark of this.ideaMarks)mark.remaining-=h;
   this.ideaMarks=this.ideaMarks.filter(m=>!m.used&&m.remaining>0).slice(-8);
   for(const fx of this.ideaVisuals)fx.remaining-=h;
   this.ideaVisuals=this.ideaVisuals.filter(fx=>fx.remaining>0);
  }
 }
}
