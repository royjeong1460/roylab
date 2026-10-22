// Keep the same forms and saved settings when moving between desktop panels and phone dialogs.
export function mountDesktopPanels({document:doc=document,media=matchMedia('(min-width:1180px)')}={}){
 const panels=[doc.querySelector('.ideas-dialog'),doc.querySelector('.paid-settings')];
 const labels=['효과 적용 후 재시작','화력 적용 후 재시작'];
 const sync=()=>{
  const focused=doc.activeElement;
  doc.body.classList.toggle('ideas-desktop',media.matches);
  panels.forEach((panel,index)=>{
   if(panel.open)panel.close();
   panel.classList.toggle('ideas-docked',media.matches);
   panel.setAttribute('role',media.matches?'region':'dialog');
   panel.querySelector('[type=submit]').textContent=media.matches?labels[index]:'저장하고 맵 다시 시작';
   if(media.matches)panel.show();
  });
  if(focused?.isConnected)focused.focus({preventScroll:true});
 };
 media.addEventListener('change',sync);sync();
 return ()=>media.removeEventListener('change',sync);
}
