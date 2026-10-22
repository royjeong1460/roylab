import {CULTURE_MAPS,ORIGINAL_YARD} from './maps.js';
import {createYardSurface} from './art.js';
import {MapDraft} from '../../free30/editor/model.js';

function thumbnail(map){
 const draft=new MapDraft(map.site),surface=createYardSurface(draft.width,draft.cells),canvas=document.createElement('canvas');
 canvas.width=draft.width;canvas.height=map.site.data.height;canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d');ctx.fillStyle='#e9dfc9';ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let id=0;id<draft.cells.length;id++)if(draft.cells[id]){ctx.fillStyle=surface.css(id,draft.cells[id]);ctx.fillRect(id%draft.width,Math.floor(id/draft.width),1,1);}
 ctx.fillStyle='#777e77';ctx.fillRect(0,map.site.data.floorY,canvas.width,16);return canvas;
}
export function mountCulturePreview(banner,active,{pause,resume,label,backURL}){
 document.body.classList.add('culture-preview');banner.replaceChildren();
 const caption=document.createElement('span');caption.className='culture-caption';caption.textContent=`${active.title} · ${active.pixels.toLocaleString()}픽셀 · ${label}`;
 const choose=document.createElement('button');choose.textContent='맵 선택';choose.setAttribute('aria-haspopup','dialog');
 const retry=document.createElement('button');retry.textContent='다시 테스트';retry.onclick=()=>location.reload();
 const download=document.createElement('button');download.textContent='JSON 저장';
 download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(active.site,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${active.key}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 banner.append(caption,choose,retry,download);
 const dialog=document.createElement('dialog');dialog.className='culture-map-picker';dialog.setAttribute('aria-labelledby','culture-picker-title');
 const header=document.createElement('div');header.className='culture-picker-header';
 const title=document.createElement('h2');title.id='culture-picker-title';title.textContent='기와 바람땅';
 const close=document.createElement('button');close.textContent='닫기';close.onclick=()=>dialog.close();header.append(title,close);
 const note=document.createElement('p');note.textContent='일반 6개 + 보스 1개 · 모두 바로 테스트할 수 있어요. 맵을 바꾸면 현재 현장은 리셋되며 실제 진행은 저장하지 않아요.';
 const grid=document.createElement('div');grid.className='culture-map-grid';
 for(const map of [...CULTURE_MAPS,ORIGINAL_YARD]){
  const link=document.createElement('a');link.href=`?artMap=${map.key}`;link.className='culture-map-card';
  if(active.key===map.key)link.setAttribute('aria-current','page');
  const label=document.createElement('strong');label.textContent=map.title;
  const count=document.createElement('small');count.textContent=`${map.pixels.toLocaleString()}픽셀`;
  const hint=document.createElement('span');hint.textContent=map.site.hint;
  link.append(thumbnail(map),label,count,hint);grid.append(link);
 }
 const back=document.createElement('a');back.href=backURL;back.textContent='무료판으로 돌아가기';back.className='culture-back';
 dialog.append(header,note,grid,back);document.body.append(dialog);
 choose.onclick=()=>{pause();dialog.showModal();};dialog.addEventListener('close',resume);
 return dialog;
}
