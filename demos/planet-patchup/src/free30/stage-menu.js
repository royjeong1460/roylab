import {FREE_STAGES,stageBest,stageOpen} from './stages.js';
export function renderStageList(container,profile,onChoose,provider={FREE_STAGES,stageBest,stageOpen}){
 const doc=container.ownerDocument;
 container.replaceChildren(...provider.FREE_STAGES.map((site,index)=>{
  const button=doc.createElement('button'),left=doc.createElement('span'),name=doc.createElement('strong'),detail=doc.createElement('small'),right=doc.createElement('span');
  const best=provider.stageBest(profile,site.id),open=provider.stageOpen(profile,index);
  button.className='stage-row';button.disabled=!open;button.dataset.stage=site.id;
  name.textContent=site.name;detail.textContent=open?(site.subtitle||site.description):`일반 현장 6곳 모두 70% 이상 회수하면 열려요`;
  // Never round an incomplete run up to 100% or a sub-70 run up to 70%.
  right.textContent=best===1?'100% · 올클리어':`최고 ${(Math.floor(best*1000)/10).toFixed(1)}%`;
  right.className='stage-best';if(best===1)button.classList.add('all-clear');else if(best>=.7)button.classList.add('cleared');
  if(!open)right.textContent+=' · 잠김';
  left.append(name,detail);button.append(left,right);button.onclick=()=>onChoose(site.id);return button;
 }));
}
