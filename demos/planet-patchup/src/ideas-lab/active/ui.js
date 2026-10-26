import {DEVICES} from './world.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export function mountActiveDevices(banner,getRun,hooks){
 const open=el('button','Active Devices');open.type='button';open.className='active-open';banner.append(open);
 const dialog=el('dialog');dialog.className='device-dialog';dialog.setAttribute('aria-labelledby','device-title');
 const section=el('section');section.className='active-devices';
 const header=el('header'),title=el('h2','Active Devices'),close=el('button','Close');title.id='device-title';close.type='button';close.onclick=()=>dialog.close();header.append(title,close);
 const note=el('p','Whole map · no energy cost · repeat after each sequence. Lab-only values.');
 const label=el('label','Test strength '),select=el('select');select.id='active-strength';label.htmlFor=select.id;
 for(const [value,name] of [[1,'1 · Low'],[2,'2 · Medium'],[3,'3 · High']]){const opt=el('option',name);opt.value=value;select.append(opt);}label.append(select);
 const grid=el('div');grid.className='device-buttons';const buttons=[];
 const status=el('p');status.className='device-status';status.setAttribute('role','status');
 for(const d of DEVICES){
  const button=el('button');button.type='button';button.dataset.device=d.id;button.append(el('strong',d.name),el('small',d.hint));buttons.push(button);grid.append(button);
  button.onclick=()=>{
   if(dialog.open){dialog.close();hooks.resume();}
   const run=getRun();if(!run||run.paused||run.finishReady||run.phase==='finishing')return;
   run.world.activateDevice(d.id,Number(select.value));update();
  };
 }
 section.append(header,note,label,grid,status);dialog.append(section);document.body.append(dialog);
 open.onclick=()=>{hooks.pause();dialog.showModal();update();};dialog.addEventListener('close',hooks.resume);
 const media=matchMedia('(min-width:1180px)');
 const sync=()=>{if(dialog.open)dialog.close();open.hidden=media.matches;close.hidden=media.matches;if(media.matches)document.querySelector('.ideas-dialog form').prepend(section);else dialog.append(section);};
 const update=()=>{
  const r=getRun(),w=r?.world,busy=Boolean(w?.activeDevice),unavailable=!r||r.finishReady||r.phase==='finishing'||w?.settled;
  for(const button of buttons)button.disabled=busy||unavailable||Boolean(r?.paused&&!dialog.open);
  select.disabled=busy;
  const text=r?.paused&&!dialog.open?'Paused · resume to use devices.':w?.deviceStatus||'Ready';if(status.textContent!==text)status.textContent=text;
  open.textContent=busy?'Device running…':'Active Devices';
 };
 media.addEventListener('change',sync);sync();update();return {update};
}
