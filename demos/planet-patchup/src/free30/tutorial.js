// Tutorial observes the real run; it never creates debris or awards currency.
export class FirstRunGuide{
 constructor(target){this.target=target;this.stage='aim';this.elapsed=0;}
 attack(point,accepted){if(this.stage==='aim'&&accepted&&point){this.pending=true;this.elapsed=0;}}
 update(dt,collected,hasDebris=false){
  this.elapsed+=dt;
  if(this.stage==='aim'&&this.pending){
   if(hasDebris){this.stage='collapse';this.elapsed=0;this.pending=false;}
   else if(this.elapsed>1.5)this.pending=false;
  }
  if(this.stage==='collapse'&&this.elapsed>=2.5){this.stage='collect';this.elapsed=0;}
  if(this.stage==='collect'&&this.elapsed>=3&&collected>=10){this.stage='work';this.elapsed=0;}
 }
 skip(){this.stage='done';this.pending=false;}
 copy(device){return {
  aim:device==='touch'?'왼쪽 위 조준점을 표시된 기둥에 맞추고 손을 떼세요.':'표시된 기둥을 클릭해 폭파해 보세요.',
  collapse:'받침이 끊어지면 위의 구조물도 떨어져요.',
  collect:device==='touch'?'누른 채 흡입 원을 민트색 잔해에 가까이 대 보세요. 손을 떼면 폭파돼요.':'흡입 원을 민트색 잔해에 가까이 대 보세요. 클릭하지 않아도 수집돼요.',
  work:'남은 조각도 폭파해 보세요. 배터리를 다 쓰면 모은 부품으로 강화할 수 있어요.',
 }[this.stage]||'';}
}
export function gameTip(seconds,device){
 const touch=device==='touch',tips=[
  touch?'누른 채 조준 → 손을 떼면 폭파. 왼쪽 위 조준점을 확인하세요.':'마우스 클릭으로 폭파해요. 받침을 노리면 크게 무너져요.',
  touch?'두 손가락으로 맵을 이동하고, 벌리거나 오므려 확대·축소해요.':'우클릭 드래그로 맵 이동 · 마우스 휠로 확대·축소해요.',
  '민트색 쓰레기는 흡입 원 가까이에서 자동 수집돼요. 수집은 배터리를 쓰지 않아요.',
  '회수한 쓰레기로 장비를 강화하세요. 강화는 다음 출동부터 적용돼요.',
  '배터리가 소진돼도 10초 동안 더 수집할 수 있어요. 모은 부품은 남아요.',
  'Ⅱ 메뉴에서 도구를 바꾸거나, 지금까지 모은 부품을 챙겨 돌아갈 수 있어요.',
  '준비되면 쌍봉 철탑에 도전하세요. 한 번에 70% 회수하면 성공!',
 ];
 return tips[Math.floor(Math.max(0,seconds)/9)%tips.length];
}

export class TutorialOverlay{
 constructor(surface,guide,onSkip){
  this.guide=guide;
  this.el=document.createElement('div');this.el.className='first-guide';
  this.mask=document.createElement('div');this.mask.className='guide-mask';
  this.marker=document.createElement('div');this.marker.className='guide-marker';this.marker.setAttribute('aria-hidden','true');
  this.markerLabel=document.createElement('span');this.marker.append(this.markerLabel);
  this.card=document.createElement('div');this.card.className='guide-card';
  this.label=document.createElement('strong');this.text=document.createElement('p');this.text.setAttribute('role','status');
  this.skip=document.createElement('button');this.skip.type='button';this.skip.textContent='안내 건너뛰기';this.skip.onclick=onSkip;
  this.card.append(this.label,this.text,this.skip);this.el.append(this.mask,this.marker,this.card);surface.append(this.el);
 }
 render(viewport,aim,world,device,paused){
  const g=this.guide,active=!['work','done'].includes(g.stage);
  this.el.hidden=paused||g.stage==='done'||g.stage==='work'&&g.elapsed>7;
  this.mask.hidden=!active;this.marker.hidden=!['aim','collect'].includes(g.stage);
  const point=viewport.worldToScreen(aim.x,aim.y),radius=Math.max(90,Math.min(140,viewport.viewWidth*.32));
  this.mask.style.background=`radial-gradient(circle at ${point.x}px ${point.y}px, transparent 0, transparent ${radius*.48}px, rgba(24,40,33,.12) ${radius}px, rgba(24,40,33,.53) ${radius*1.8}px)`;
  let target=g.target;
  if(g.stage==='collect'){
   const id=world.sand.findIndex(Boolean);target=id>=0?{x:id%world.width+.5,y:Math.floor(id/world.width)+.5}:world.flying[0]||aim;
  }
  const marker=viewport.worldToScreen(target.x,target.y);
  this.marker.style.left=`${marker.x}px`;this.marker.style.top=`${marker.y}px`;
  this.markerLabel.textContent=g.stage==='aim'?'여기 기둥':'자동 수집';
  this.label.textContent={aim:'1 · 기둥을 폭파해요',collapse:'2 · 무너지는 모습을 보세요',collect:'3 · 쓰레기를 모아요',work:'이제 직접 청소해 보세요'}[g.stage]||'';
  const copy=g.copy(device);if(this.text.textContent!==copy)this.text.textContent=copy;
 }
 destroy(){this.el.remove();}
}
