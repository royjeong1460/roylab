import {FREE_STAGES} from '../stages.js';
import {MapDraft,PALETTE,LOCAL_PREVIEW_ID,MAX_MAP_FILE_BYTES,saveDraft,loadDraft,editorMessage} from './model.js';
import './style.css';
import {SelectionView} from './selection-view.js';
const $=id=>document.getElementById(id),canvas=$('map-canvas'),ctx=canvas.getContext('2d');
const shapes=['rect','triangle','circle','ellipse','polygon'];
let draft,tool='draw',color=1,zoom=4,stroke=null,dirty=false,vertices=[],hover=null,loading=0;
const selection=new SelectionView({getDraft:()=>draft,render,edited:()=>{dirty=true;},status});
$('back-game').href=import.meta.env.DEV?'./free30.html':'./';
function status(message){$('status').textContent=message;}
function discard(){return !(dirty||vertices.length)||confirm('저장하지 않은 편집이 있어요. 버리고 불러올까요?');}
function load(next,message){draft=next;stroke=null;vertices=[];hover=null;selection.clear();dirty=false;$('map-name').value=draft.site.name;render();status(message);}
const width=()=>Number($('line-width').value),filled=()=>$('shape-mode').value==='filled';
function render(){
 if(!draft)return;
 const w=draft.width,h=draft.height,cells=selection.cells||draft.cells;
 canvas.width=w*zoom;canvas.height=(h+4)*zoom;ctx.fillStyle=PALETTE[0];ctx.fillRect(0,0,canvas.width,canvas.height);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=cells[y*w+x];if(c){ctx.fillStyle=PALETTE[c];ctx.fillRect(x*zoom,y*zoom,zoom,zoom);}}
 if(zoom>=6){ctx.strokeStyle='#4d694920';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=w;x++){ctx.moveTo(x*zoom,0);ctx.lineTo(x*zoom,h*zoom);}for(let y=0;y<=h;y++){ctx.moveTo(0,y*zoom);ctx.lineTo(w*zoom,y*zoom);}ctx.stroke();}
 ctx.fillStyle='#466253';ctx.fillRect(0,h*zoom,w*zoom,zoom*2);
 selection.draw(ctx,zoom);
 if(vertices.length){ctx.save();ctx.strokeStyle='#c26b32';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.beginPath();const points=hover?[...vertices,hover]:vertices;points.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x+.5)*zoom,(p.y+.5)*zoom));if(points.length>2)ctx.closePath();ctx.stroke();ctx.setLineDash([]);for(const p of vertices)ctx.strokeRect(p.x*zoom-2,p.y*zoom-2,zoom+4,zoom+4);ctx.restore();}
 if(hover&&['draw','erase'].includes(tool)){const size=tool==='erase'?Number($('eraser-size').value):width(),offset=Math.floor(size/2);ctx.save();ctx.strokeStyle=tool==='erase'?'#bb5037':'#354a3d';ctx.lineWidth=1.5;ctx.strokeRect((hover.x-offset)*zoom,(hover.y-offset)*zoom,size*zoom,size*zoom);ctx.restore();}
 $('map-size').textContent=`${w} × ${h}칸 · ${draft.cells.filter(Boolean).length.toLocaleString()}픽셀${dirty?' · 미저장':''}`;
 $('undo').disabled=!draft.history.length&&!vertices.length;
 $('polygon-finish').disabled=vertices.length<3;$('polygon-cancel').disabled=!vertices.length;
}
function cell(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(draft.width-1,Math.floor((e.clientX-r.left)/zoom))),y:Math.max(0,Math.min(draft.height-1,Math.floor((e.clientY-r.top)/zoom)))};}
function drawStroke(point){
 if(tool==='line'||shapes.includes(tool)){draft.cells.set(stroke.before);if(tool==='line')draft.line(stroke.start,point,color,width());else draft.shape(tool,stroke.start,point,color,filled(),width());}
 else draft.line(stroke.last,point,tool==='erase'?0:color,tool==='erase'?Number($('eraser-size').value):width());
 stroke.last=point;dirty=true;render();
}
canvas.onpointerdown=e=>{
 if(e.button!==0||stroke)return;e.preventDefault();const q=cell(e);hover=q;
 if(tool==='polygon'){selection.clear();vertices.push(q);status(`꼭짓점 ${vertices.length}개 · 3개 이상 찍고 ‘다각형 완성’을 누르세요.`);render();return;}
 if(tool==='fill'){selection.clear();if(draft.cells[q.y*draft.width+q.x]!==color){draft.checkpoint();draft.fill(q,color);dirty=true;}render();return;}
 canvas.setPointerCapture(e.pointerId);
 if(tool==='select'||tool==='area'){stroke={id:e.pointerId,selection:true};selection.begin(q,tool,zoom);render();return;}
 selection.clear();draft.checkpoint();stroke={id:e.pointerId,start:q,last:q,before:draft.cells.slice(),wasDirty:dirty};drawStroke(q);
};
canvas.onpointermove=e=>{hover=cell(e);if(stroke?.id===e.pointerId){if(stroke.selection)selection.move(hover);else drawStroke(hover);}else if(['draw','erase','polygon'].includes(tool))render();};
canvas.onpointerleave=()=>{hover=null;if(!stroke&&['draw','erase','polygon'].includes(tool))render();};
canvas.onpointerup=e=>{if(stroke?.id===e.pointerId){if(stroke.selection)selection.end(cell(e));else drawStroke(cell(e));stroke=null;canvas.releasePointerCapture(e.pointerId);}};
canvas.onpointercancel=canvas.onlostpointercapture=()=>{if(stroke){if(stroke.selection)selection.cancel();else{draft.cells.set(stroke.before);draft.history.pop();dirty=stroke.wasDirty;}stroke=null;render();}};
function finishPolygon(){if(vertices.length<3)return;draft.checkpoint();draft.polygon(vertices,color,filled(),width());vertices=[];dirty=true;render();status('다각형을 그렸어요. 다음 꼭짓점을 클릭하면 새 도형이 시작돼요.');}
$('polygon-finish').onclick=finishPolygon;
$('polygon-cancel').onclick=()=>{vertices=[];render();status('작성 중인 다각형을 취소했어요.');};
const tips={draw:'누른 채 그리세요. 붓 두께는 1~6픽셀로 조절해요.',erase:'누른 채 지우세요. 사각 테두리가 실제 지워지는 크기예요.',fill:'선으로 둘러싸인 내부를 클릭하세요. 같은 색으로 연결된 영역을 채워요.',line:'시작점에서 끝점까지 드래그하세요.',polygon:'꼭짓점을 순서대로 클릭하고 완성 버튼 또는 Enter를 누르세요.',select:'연결된 구조물을 클릭해 이동하세요. 오른쪽 아래 손잡이로 크기를 조절해요.',area:'드래그로 선택한 부분을 이동하거나 크기를 조절하세요.'};
function toolUI(){
 $('shape-options').hidden=!shapes.includes(tool);$('eraser-control').hidden=tool!=='erase';$('width-control').hidden=!['draw','line',...shapes].includes(tool);$('polygon-controls').hidden=tool!=='polygon';
 $('tool-tip').textContent=tips[tool]||'드래그로 크기를 정하세요. 테두리 또는 채운 도형을 고를 수 있어요.';
 for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===tool));render();
}
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{if(vertices.length&&!confirm('작성 중인 다각형을 취소하고 도구를 바꿀까요?'))return;vertices=[];tool=button.dataset.tool;if(!['select','area'].includes(tool))selection.clear();toolUI();};
for(let i=1;i<PALETTE.length;i++){const b=document.createElement('button');b.style.background=PALETTE[i];b.title=`색상 ${i}`;b.setAttribute('aria-label',`색상 ${i}`);b.setAttribute('aria-pressed',String(i===color));b.onclick=()=>{color=i;for(const v of $('palette').children)v.setAttribute('aria-pressed',String(v===b));};$('palette').append(b);}
for(const site of FREE_STAGES){const o=document.createElement('option');o.value=site.id;o.textContent=site.name;$('stage').append(o);}
$('zoom').oninput=()=>{zoom=Number($('zoom').value);render();};
$('eraser-size').onchange=$('line-width').onchange=render;
$('map-name').oninput=()=>{draft.site.name=$('map-name').value;dirty=true;render();};
$('undo').onclick=()=>{if(vertices.length){vertices.pop();render();return;}if(draft.undo()){selection.clear();dirty=true;render();}};
$('new').onclick=()=>$('new-dialog').showModal();
$('new-cancel').onclick=()=>$('new-dialog').close();
$('new-form').onsubmit=e=>{e.preventDefault();if(!discard())return;try{const next=MapDraft.create({width:Number($('new-width').value),height:Number($('new-height').value),name:$('new-name').value.trim()});loading++;load(next,'빈 맵을 만들었어요. 도형을 그린 뒤 파일로 저장하세요.');dirty=true;render();$('new-dialog').close();}catch(error){status(editorMessage(error));}};
$('template').onclick=()=>{if(!discard())return;loading++;load(new MapDraft(FREE_STAGES.find(s=>s.id===$('stage').value)),'예제 맵을 불러왔어요. 편집 후 별도 파일로 저장하세요.');};
$('load').onclick=()=>{if(!discard())return;try{const saved=loadDraft(localStorage,$('stage').value);if(saved){loading++;load(new MapDraft(saved),'예전 브라우저 초안을 불러왔어요. 파일로 저장해 주세요.');}else status('저장한 브라우저 초안이 없어요.');}catch(e){status(editorMessage(e));}};
function download(text,suffix){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(draft.site.name.trim()||'새 맵').replace(/[\\/:*?"<>|]/g,'-')}${suffix}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function completedPolygon(){if(!vertices.length)return true;status('작성 중인 다각형을 완성하거나 취소한 뒤 진행해 주세요.');return false;}
$('save').onclick=()=>{if(!completedPolygon())return;try{const text=draft.serialize();MapDraft.open(text);download(text,'.map');dirty=false;render();status('로컬 작업 파일을 다운로드했어요. ‘파일 불러오기’로 이어서 편집할 수 있어요.');}catch(e){status(editorMessage(e));}};
$('download').onclick=()=>{if(!completedPolygon())return;try{download(JSON.stringify(draft.export(),null,2),'.game');status('게임 검사를 통과한 맵 JSON을 다운로드했어요.');}catch(e){status(editorMessage(e));}};
$('test').onclick=()=>{if(!completedPolygon())return;try{saveDraft(localStorage,LOCAL_PREVIEW_ID,draft);const url=new URL(import.meta.env.DEV?'./free30.html':'./',location.href);url.searchParams.set('mapPreview',LOCAL_PREVIEW_ID);window.open(url.href,'_blank','noopener');status('별도 창에서 테스트해요. 작업 파일은 ‘파일로 저장’을 눌러 보관하세요.');}catch(e){status(editorMessage(e));}};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const f=$('file').files[0];$('file').value='';if(!f)return;const ticket=++loading;try{if(f.size>MAX_MAP_FILE_BYTES)throw Error('Invalid map: file size');const next=MapDraft.open(await f.text());if(ticket!==loading||!discard())return;load(next,'파일을 불러왔어요. 수정 후 다시 파일로 저장하세요.');}catch(e){status(editorMessage(e));}};
window.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea')||$('new-dialog').open)return;if(tool==='polygon'&&e.key==='Enter'){e.preventDefault();finishPolygon();}if(e.key==='Escape'&&vertices.length){vertices=[];render();}});
window.addEventListener('beforeunload',e=>{if(dirty||vertices.length){e.preventDefault();e.returnValue='';}});
const requested=new URLSearchParams(location.search).get('stage');
try{const saved=requested?loadDraft(localStorage,requested):null;const site=FREE_STAGES.find(s=>s.id===requested);if(site)$('stage').value=site.id;load(saved?new MapDraft(saved):site?new MapDraft(site):MapDraft.create(),'새로 만들거나 로컬 JSON 파일을 불러오세요. 기존 맵은 왼쪽 예제에서 시작할 수 있어요.');}catch(e){load(MapDraft.create(),editorMessage(e));}
toolUI();
