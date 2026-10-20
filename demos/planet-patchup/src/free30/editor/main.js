import {FREE_STAGES} from '../stages.js';
import {MapDraft,PALETTE,saveDraft,loadDraft,parseDraft,editorMessage} from './model.js';
import './style.css';
import {SelectionView} from './selection-view.js';
const $=id=>document.getElementById(id),canvas=$('map-canvas'),ctx=canvas.getContext('2d');
let draft,selected=FREE_STAGES[0].id,tool='draw',color=1,zoom=4,stroke=null,dirty=false;
const selection=new SelectionView({getDraft:()=>draft,render,edited:()=>{dirty=true;},status});
$('back-game').href=import.meta.env.DEV?'./free30.html':'./';
function status(message){$('status').textContent=message;}
function discard(){return !dirty||confirm('저장하지 않은 편집이 있어요. 버리고 불러올까요?');}
function load(site,message){draft=new MapDraft(site);stroke=null;selection.clear();dirty=false;render();status(message);}
function render(){
 const w=draft.width,h=draft.height,cells=selection.cells||draft.cells;
 canvas.width=w*zoom;canvas.height=(h+4)*zoom;ctx.fillStyle=PALETTE[0];ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=cells[y*w+x];if(c){ctx.fillStyle=PALETTE[c];ctx.fillRect(x*zoom,y*zoom,zoom,zoom);}}
 if(zoom>=6){ctx.strokeStyle='#4d694920';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=w;x++){ctx.moveTo(x*zoom,0);ctx.lineTo(x*zoom,h*zoom);}for(let y=0;y<=h;y++){ctx.moveTo(0,y*zoom);ctx.lineTo(w*zoom,y*zoom);}ctx.stroke();}
 ctx.fillStyle='#466253';ctx.fillRect(0,h*zoom,w*zoom,zoom*2);
 $('map-size').textContent=`${w} × ${h}칸 · ${draft.cells.filter(Boolean).length.toLocaleString()}픽셀${dirty?' · 미저장':''}`;
 selection.draw(ctx,zoom);
 $('undo').disabled=!draft.history.length;
}
function cell(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(draft.width-1,Math.floor((e.clientX-r.left)/zoom))),y:Math.max(0,Math.min(draft.height-1,Math.floor((e.clientY-r.top)/zoom)))};}
function drawStroke(point){
 if(tool==='line'||tool==='rect'){draft.cells.set(stroke.before);if(tool==='line')draft.line(stroke.start,point,color);else draft.rectangle(stroke.start,point,color);}
 else draft.line(stroke.last,point,tool==='erase'?0:color);
 stroke.last=point;dirty=true;render();
}
canvas.onpointerdown=e=>{
 if(e.button!==0||stroke)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);const q=cell(e);
 if(tool==='select'||tool==='area'){stroke={id:e.pointerId,selection:true};selection.begin(q,tool,zoom);render();return;}
 selection.clear();draft.checkpoint();stroke={id:e.pointerId,start:q,last:q,before:draft.cells.slice(),wasDirty:dirty};drawStroke(q);
};
canvas.onpointermove=e=>{if(stroke?.id===e.pointerId){if(stroke.selection)selection.move(cell(e));else drawStroke(cell(e));}};
canvas.onpointerup=e=>{if(stroke?.id===e.pointerId){if(stroke.selection)selection.end(cell(e));else drawStroke(cell(e));stroke=null;canvas.releasePointerCapture(e.pointerId);}};
canvas.onpointercancel=canvas.onlostpointercapture=()=>{if(stroke){if(stroke.selection)selection.cancel();else{draft.cells.set(stroke.before);draft.history.pop();dirty=stroke.wasDirty;}stroke=null;render();}};
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{tool=button.dataset.tool;if(!['select','area'].includes(tool))selection.clear();render();for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b===button));};
for(let i=1;i<PALETTE.length;i++){const b=document.createElement('button');b.style.background=PALETTE[i];b.title=`색상 ${i}`;b.setAttribute('aria-label',`색상 ${i}`);b.setAttribute('aria-pressed',String(i===color));b.onclick=()=>{color=i;for(const v of $('palette').children)v.setAttribute('aria-pressed',String(v===b));};$('palette').append(b);}
for(const site of FREE_STAGES){const o=document.createElement('option');o.value=site.id;o.textContent=site.name;$('stage').append(o);}
function selectStage(){const id=$('stage').value;if(!discard()){$('stage').value=selected;return;}selected=id;try{load(loadDraft(localStorage,id)||FREE_STAGES.find(s=>s.id===id),'맵을 불러왔어요. 수정한 뒤 저장하세요.');}catch(e){load(FREE_STAGES.find(s=>s.id===id),editorMessage(e));}}
$('stage').onchange=selectStage;
$('zoom').oninput=()=>{zoom=Number($('zoom').value);render();};
$('undo').onclick=()=>{if(draft.undo()){selection.clear();dirty=true;render();}};
$('template').onclick=()=>{if(discard())load(FREE_STAGES.find(s=>s.id===selected),'기본 맵을 불러왔어요. 저장한 초안은 아직 유지돼요.');};
$('load').onclick=()=>{if(!discard())return;try{const saved=loadDraft(localStorage,selected);if(saved)load(saved,'저장한 초안을 불러왔어요.');else status('이 맵은 아직 저장한 초안이 없어요.');}catch(e){status(editorMessage(e));}};
function save(){try{saveDraft(localStorage,selected,draft);dirty=false;render();status('초안을 저장했어요. 실제 게임 맵과 진행은 유지돼요.');return true;}catch(e){status(editorMessage(e));return false;}}
$('save').onclick=save;
$('test').onclick=()=>{if(!save())return;const url=new URL(import.meta.env.DEV?'./free30.html':'./',location.href);url.searchParams.set('mapPreview',selected);window.open(url.href,'_blank','noopener');};
$('download').onclick=()=>{try{const site=draft.export(),blob=new Blob([JSON.stringify(site,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${selected}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('맵 JSON을 내려받았어요. 공개 반영 시 사용할 수 있어요.');}catch(e){status(editorMessage(e));}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const f=$('file').files[0];$('file').value='';if(!f||!discard())return;const id=selected;try{if(f.size>2000000)throw Error('size');const site=parseDraft(await f.text(),id);if(selected!==id)return;load(site,'JSON을 불러왔어요. 저장하면 이 맵의 초안이 바뀌어요.');dirty=true;render();}catch(e){status(editorMessage(e));}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
const requested=new URLSearchParams(location.search).get('stage');if(FREE_STAGES.some(s=>s.id===requested))$('stage').value=requested;
selectStage();
