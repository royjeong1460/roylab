import {FIELDS,PRESETS,normalizeSettings,saveSettings,settingsLabel} from './settings.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
export function mountSettings(banner,current,storage,{pause,resume},warning){
 const open=el('button','화력 설정');open.className='paid-settings-open';open.setAttribute('aria-haspopup','dialog');banner.insertBefore(open,banner.children[2]);
 const dialog=el('dialog');dialog.className='paid-settings';dialog.setAttribute('aria-labelledby','paid-settings-title');
 const form=el('form'),header=el('header'),title=el('h2','화력 테스트 설정'),close=el('button','닫기');title.id='paid-settings-title';close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const note=el('p','화력 비교용 임시 프리셋이에요. 값을 저장하면 현재 맵을 처음부터 다시 시작해요. 무료판 진행에는 영향이 없어요.');
 const presets=el('div');presets.className='paid-presets';const status=el('p');status.className='paid-status';status.setAttribute('role','status');
 const unlimited=el('input');unlimited.type='checkbox';unlimited.checked=current.unlimited;
 const batteryLabel=el('label');batteryLabel.className='paid-battery';batteryLabel.append(unlimited,document.createTextNode('배터리 무제한 (끄면 용량·사용량 적용)'));
 let draft={...current};const controls=new Map(),presetButtons=new Map();
 const describe=()=>{status.textContent=`${settingsLabel(draft)} · 갈리는 속도는 실제로 비비는 동안 1배 → 설정 상한으로 가속해요.`;for(const [id,button] of presetButtons)button.setAttribute('aria-pressed',String(FIELDS.every(f=>draft[f.key]===PRESETS[id].values[f.key])));};
 const sync=()=>{for(const [key,{number,slider}] of controls){number.value=draft[key];slider.value=draft[key];}unlimited.checked=draft.unlimited;describe();};
 for(const [id,preset] of Object.entries(PRESETS)){
  const button=el('button',preset.label);button.type='button';button.onclick=()=>{draft=normalizeSettings({...preset.values,unlimited:unlimited.checked});sync();};presets.append(button);presetButtons.set(id,button);
 }
 form.append(header,note,presets,status,batteryLabel);
 const groups=new Map();
 for(const f of FIELDS){
  if(!groups.has(f.group)){const fieldset=el('fieldset');fieldset.append(el('legend',f.group));groups.set(f.group,fieldset);form.append(fieldset);}
  const row=el('div');row.className='paid-field';const label=el('label',`${f.label}${f.unit?` (${f.unit})`:''}`),number=el('input'),slider=el('input');
  number.type='number';number.id=`paid-${f.key}`;number.min=f.min;number.max=f.max;number.step='any';number.inputMode='decimal';number.required=true;label.htmlFor=number.id;
  slider.type='range';slider.min=f.min;slider.max=f.max;slider.step=f.step;slider.setAttribute('aria-label',f.label);
  number.oninput=()=>{if(number.value!==''&&number.validity.valid){draft[f.key]=number.valueAsNumber;slider.value=draft[f.key];describe();}};
  slider.oninput=()=>{draft[f.key]=Number(slider.value);number.value=slider.value;describe();};
  controls.set(f.key,{number,slider});row.append(label,number,slider);groups.get(f.group).append(row);
 }
 unlimited.onchange=()=>{draft.unlimited=unlimited.checked;};
 const footer=el('footer'),apply=el('button','저장하고 맵 다시 시작');apply.type='submit';apply.className='primary';footer.append(apply);form.append(footer);dialog.append(form);document.body.append(dialog);
 form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;const result=saveSettings(storage,draft);if(!result.ok){status.textContent='설정을 저장하지 못했어요. 브라우저의 사이트 저장 허용 여부를 확인해 주세요.';return;}location.reload();};
 open.onclick=()=>{draft={...current};sync();if(warning)status.textContent=warning;pause();dialog.showModal();};dialog.addEventListener('close',resume);sync();
}
