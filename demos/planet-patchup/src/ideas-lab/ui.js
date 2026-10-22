import {BLASTS,WELLS,normalizeOptions,optionsLabel,saveOptions} from './options.js';

const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
export function mountIdeas(banner,current,storage,hooks,warning){
 document.body.classList.add('ideas-preview');
 const open=el('button','실험 선택');open.className='ideas-open';open.setAttribute('aria-haspopup','dialog');banner.insertBefore(open,banner.children[2]);
 const dialog=el('dialog');dialog.className='ideas-dialog';dialog.setAttribute('aria-labelledby','ideas-title');
 const form=el('form'),header=el('header'),title=el('h2','파괴 아이디어 실험실'),close=el('button','닫기');title.id='ideas-title';close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const note=el('p','폭파와 블랙홀을 하나씩 골라 같은 맵에서 비교해 보세요. 저장하면 현재 맵을 처음부터 다시 시작해요.');
 const status=el('p');status.className='ideas-status';status.setAttribute('role','status');
 let draft={...current};const inputs=[];
 const sync=()=>{for(const {input,key,value} of inputs)input.checked=draft[key]===value;status.textContent=optionsLabel(draft);};
 form.append(header,note);
 for(const [key,label,choices] of [['blast','폭파 방식',BLASTS],['well','블랙홀 방식',WELLS],['level','추가 효과 강도',[{id:1,name:'1 · 약하게',description:'작은 변화부터 비교'},{id:2,name:'2 · 중간',description:'더 큰 움직임'},{id:3,name:'3 · 강하게',description:'가장 큰 추가 효과'}]]]){
  const fieldset=el('fieldset');fieldset.className=`ideas-${key}`;fieldset.append(el('legend',label));
  const choicesNode=el('div');choicesNode.className='ideas-choices';
  for(const choice of choices){
   const card=el('label'),input=el('input'),copy=el('span');card.className='ideas-choice';input.type='radio';input.name=key;input.value=choice.id;
   copy.append(el('strong',choice.name),el('small',choice.description));card.append(input,copy);choicesNode.append(card);inputs.push({input,key,value:choice.id});
   input.onchange=()=>{if(input.checked){draft[key]=choice.id;status.textContent=optionsLabel(draft);}};
  }
  fieldset.append(choicesNode);form.append(fieldset);
 }
 form.append(el('p','효과 강도는 추가 움직임만 바꿔요. 직접 파괴 반경 등은 세부 화력에서 조절할 수 있어요. 팽창은 커지는 압력장 실험이에요.'));
 const footer=el('footer'),apply=el('button','저장하고 맵 다시 시작');apply.type='submit';apply.className='primary';footer.append(status,apply);form.append(footer);dialog.append(form);document.body.append(dialog);
 form.onsubmit=event=>{event.preventDefault();const result=saveOptions(storage,draft);if(!result.ok){status.textContent='실험 선택을 저장하지 못했어요. 브라우저의 사이트 저장 허용 여부를 확인해 주세요.';return;}location.reload();};
 open.onclick=()=>{draft=normalizeOptions(current);sync();if(warning)status.textContent=warning;hooks.pause();dialog.showModal();};dialog.addEventListener('close',hooks.resume);sync();
 // Keep the existing tuning button outside this draft form so cancelled choices never leak into a run.
 const tuning=banner.querySelector('.paid-settings-open');if(tuning)tuning.textContent='세부 화력';
 const download=[...banner.querySelectorAll('button')].find(button=>button.textContent==='JSON 저장');
 if(download){download.type='button';download.className='ideas-download';download.textContent='현재 맵 JSON 저장';form.insertBefore(download,footer);}
 return dialog;
}
