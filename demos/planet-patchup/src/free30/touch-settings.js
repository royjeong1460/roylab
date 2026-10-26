export const TOUCH_MODE_KEY='free30-mobile-touch-mode';
export function loadTouchMode(storage){try{return storage.getItem(TOUCH_MODE_KEY)==='contact';}catch{return false;}}
export function saveTouchMode(storage,contact){try{storage.setItem(TOUCH_MODE_KEY,contact?'contact':'aim');return true;}catch{return false;}}

export function mountTouchSettings(doc,storage,onChange,helpCopy){
 let contact=loadTouchMode(storage);
 const controls=['home-options-dialog','pause-dialog'].map(id=>{
  const dialog=doc.getElementById(id),help=dialog.querySelector('p.fine');
  const label=doc.createElement('label');label.className='pattern-label';label.textContent='모바일 조작 · 테스트';
  const select=doc.createElement('select');select.setAttribute('aria-label','모바일 조작 방식');
  for(const [value,text] of [['aim','기존 · 조준 후 손 떼기'],['contact','터치 · 누른 위치에서 폭파']]){
   const option=doc.createElement('option');option.value=value;option.textContent=text;select.append(option);
  }
  const status=doc.createElement('p');status.className='fine';status.setAttribute('role','status');status.hidden=true;
  label.append(select);help.before(label);label.after(status);
  return {select,help,status};
 });
 const render=()=>{for(const {select,help} of controls){
  select.value=contact?'contact':'aim';
  help.textContent=helpCopy?helpCopy(contact):contact?'한 손가락으로 톡 누르고 떼면 누른 위치에서 폭파. 끌면 수집만 해요. 두 번째 손가락이 들어오면 폭파 취소 · 두 손가락 이동·확대. PC는 기존 클릭 그대로예요.':'기존 조작: 왼쪽 위 포인터로 조준 후 손을 떼면 사용. 두 손가락 이동·확대 · PC는 기존 클릭 그대로예요.';
 }};
 for(const {select} of controls)select.onchange=()=>{
  if(!['aim','contact'].includes(select.value)){render();return;}
  contact=select.value==='contact';const saved=saveTouchMode(storage,contact);
  onChange(contact);render();
  for(const {status} of controls){status.hidden=saved;status.textContent=saved?'':'선택은 적용했지만 저장하지 못했어요. 이번 접속에서만 유지돼요.';}
 };
 render();
}
