import {FIELDS,PRESETS,normalizeMotion,saveMotion} from './settings.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function mountMotion(banner,current,storage,{pause,resume},warning){
 const open=el('button','낙하·점진 회전');open.className='motion-open';open.setAttribute('aria-haspopup','dialog');banner.insertBefore(open,banner.children[1]);
 const dialog=el('dialog');dialog.className='motion-dialog';dialog.setAttribute('aria-labelledby','motion-title');
 const form=el('form'),header=el('header'),title=el('h2','낙하·점진 회전 테스트'),close=el('button','닫기');title.id='motion-title';close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const note=el('p','회전이 시작되면 조각마다 1배에서 출발해 5초 동안 설정한 최대 배수로 증가해요. 기본 상한은 5배이며, 일시정지 시간은 제외해요.');
 const presets=el('div');presets.className='motion-presets';const controls=new Map();let draft={...current};
 const sync=()=>{for(const [key,{number,range}] of controls){number.value=draft[key];range.value=draft[key];}};
 for(const preset of PRESETS){const b=el('button',preset.label);b.type='button';b.onclick=()=>{draft=normalizeMotion(preset.values);sync();status.textContent='선택한 값이에요. 아래 적용 버튼을 누르면 같은 맵을 다시 시작해요.';};presets.append(b);}
 form.append(header,note,presets);
 for(const f of FIELDS){
  const row=el('fieldset'),legend=el('legend',`${f.label} (기존 대비 배수)`),label=el('label',f.label),number=el('input'),range=el('input');
  number.id=`motion-${f.key}`;number.type='number';number.min=f.min;number.max=f.max;number.step='any';number.inputMode='decimal';number.required=true;label.htmlFor=number.id;
  range.type='range';range.min=f.min;range.max=f.max;range.step=.05;range.setAttribute('aria-label',`${f.label} 슬라이더`);
  number.oninput=()=>{if(number.value!==''&&number.validity.valid){draft[f.key]=number.valueAsNumber;range.value=number.value;}};
  range.oninput=()=>{draft[f.key]=Number(range.value);number.value=range.value;};
  row.append(legend,label,number,range,el('small',f.help));form.append(row);controls.set(f.key,{number,range});
 }
 const status=el('p',warning||'기본값: 중력 1배 · 회전 1→5배 (5초) · 최고 속도 1배.');status.setAttribute('role','status');
 const caution=el('p','속도가 커지면 충돌 파괴도 강해져요. 최고 속도를 높이면 얇은 구조물을 통과할 수 있으니 제한 횟수가 늘어날 때만 비교하세요.');caution.className='motion-caution';
 const footer=el('footer'),apply=el('button','적용하고 같은 맵 다시 시작');apply.type='submit';footer.append(apply);form.append(caution,status,footer);dialog.append(form);document.body.append(dialog);
 form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;if(!saveMotion(storage,draft).ok){status.textContent='저장하지 못했어요. 사이트 저장 허용 여부를 확인해 주세요.';return;}location.reload();};
 open.onclick=()=>{draft={...current};sync();pause();dialog.showModal();};dialog.addEventListener('close',resume);sync();
}
