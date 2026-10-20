import {packMapCells,validateSite} from '../../map-maker-generator.js';
import {FREE_STAGES} from '../stages.js';
export const DRAFT_PREFIX='planet-patchup-stage-draft-v1:';
export const LOCAL_PREVIEW_ID='local-editor-preview';
export const MAX_EDITOR_DIMENSION=1024;
export const MAX_MAP_FILE_BYTES=4000000;
const validateEditorSite=site=>validateSite(site,{maxDimension:MAX_EDITOR_DIMENSION});
export const PALETTE=['#f1edda','#aa805b','#5f8a92','#d8af66','#e88b51','#ba7770'];
export class MapDraft {
 static create({width=144,height=132,name='새 맵',worldHeight=Math.max(96,height+12)}={}){
  // Use a grounded seed to validate metadata without requiring a finished drawing.
  const draft=new MapDraft({id:LOCAL_PREVIEW_ID,name,description:'로컬 맵 메이커에서 만든 맵',hint:'구조물을 부수고 잔해를 회수하세요.',preview:[{x:0,y:height-1}],generator:{version:1,seed:'local-editor',family:'piloti',size:'medium',index:0},data:{width,height:worldHeight,floorY:height,shapes:[{rect:[0,height-1,1,1],color:1}]}});
  draft.cells.fill(0);return draft;
 }
 static open(text){
  if(typeof text!=='string'||text.length>MAX_MAP_FILE_BYTES)throw Error('Invalid map: file size');
  const value=JSON.parse(text);
  if(value?.format!=='planet-patchup-map')return new MapDraft(value);
  if(value.version!==1||!Number.isInteger(value.width)||!Number.isInteger(value.height)||!Number.isInteger(value.worldHeight)||!Array.isArray(value.cells)||value.cells.length!==value.width*value.height||!value.cells.every(c=>Number.isInteger(c)&&c>=0&&c<=5))throw Error('Invalid map: local document');
  const draft=MapDraft.create(value);draft.cells.set(value.cells);return draft;
 }
 serialize(){return JSON.stringify({format:'planet-patchup-map',version:1,name:this.site.name,width:this.width,height:this.height,worldHeight:this.site.data.height,cells:Array.from(this.cells)});}
 constructor(site){this.site=structuredClone(validateEditorSite(site));const {width,floorY}=this.site.data;this.cells=new Uint8Array(width*floorY);for(const {rect:[x,y,w,h],color} of this.site.data.shapes)for(let yy=y;yy<y+h;yy++)this.cells.fill(color,yy*width+x,yy*width+x+w);this.history=[];}
 get width(){return this.site.data.width;}
 get height(){return this.site.data.floorY;}
 checkpoint(){this.history.push(this.cells.slice());if(this.history.length>40)this.history.shift();}
 undo(){const before=this.history.pop();if(!before)return false;this.cells=before;return true;}
 point(x,y,color){if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(color)||color<0||color>5||x<0||y<0||x>=this.width||y>=this.height)return;this.cells[y*this.width+x]=color;}
 stamp(x,y,color,size=1){const offset=Math.floor(size/2);for(let yy=y-offset;yy<y-offset+size;yy++)for(let xx=x-offset;xx<x-offset+size;xx++)this.point(xx,yy,color);}
 line(a,b,color,size=1){const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));let previous=a;for(let i=0;i<=n;i++){const t=n?i/n:0,x=Math.round(a.x+(b.x-a.x)*t),y=Math.round(a.y+(b.y-a.y)*t);this.stamp(x,previous.y,color,size);this.stamp(x,y,color,size);previous={x,y};}}
 rectangle(a,b,color){for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)this.point(x,y,color);}
 polygon(points,color,filled=false,size=1){
  if(!points.length)return;
  if(filled&&points.length>=3){
   const minY=Math.max(0,Math.min(...points.map(p=>p.y))),maxY=Math.min(this.height-1,Math.max(...points.map(p=>p.y)));
   for(let y=minY;y<=maxY;y++){
    const intersections=[];
    for(let i=0,j=points.length-1;i<points.length;j=i++){
     const a=points[i],b=points[j];
     if((a.y>y)!==(b.y>y))intersections.push((b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x);
    }
    intersections.sort((a,b)=>a-b);
    for(let i=0;i+1<intersections.length;i+=2)for(let x=Math.max(0,Math.ceil(intersections[i]));x<=Math.min(this.width-1,Math.floor(intersections[i+1]));x++)this.point(x,y,color);
   }
  }
  for(let i=0;i<points.length;i++)this.line(points[i],points[(i+1)%points.length],color,filled?1:size);
 }
 shape(kind,a,b,color,filled=false,size=1){
  let x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y),points;
  if(kind==='circle'){const side=Math.min(x1-x0,y1-y0);x1=x0+side;y1=y0+side;}
  if(kind==='rect')points=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
  else if(kind==='triangle')points=[{x:Math.round((x0+x1)/2),y:y0},{x:x1,y:y1},{x:x0,y:y1}];
  else {
   const rx=(x1-x0)/2,ry=(y1-y0)/2,cx=(x0+x1)/2,cy=(y0+y1)/2;
   const steps=Math.max(8,Math.ceil(2*Math.PI*Math.max(rx,ry)*2));
   points=Array.from({length:steps},(_,i)=>({x:Math.round(cx+rx*Math.cos(i/steps*2*Math.PI)),y:Math.round(cy+ry*Math.sin(i/steps*2*Math.PI))}));
  }
  this.polygon(points,color,filled,size);
 }
 fill({x,y},color){
  if(x<0||y<0||x>=this.width||y>=this.height)return;
  const start=y*this.width+x,old=this.cells[start];if(old===color)return;
  const queue=[start];this.cells[start]=color;
  const visit=id=>{if(this.cells[id]===old){this.cells[id]=color;queue.push(id);}};
  for(let head=0;head<queue.length;head++){const id=queue[head],xx=id%this.width;if(xx>0)visit(id-1);if(xx<this.width-1)visit(id+1);if(id>=this.width)visit(id-this.width);if(id<this.cells.length-this.width)visit(id+this.width);}
 }
 export(){return validateEditorSite({...this.site,data:{...this.site.data,shapes:packMapCells(this.cells,this.width,this.height)}});}
}
export function parseDraft(text,stageId){
 if(typeof text!=='string'||text.length>MAX_MAP_FILE_BYTES)throw Error('맵 파일은 4MB 이하만 불러올 수 있어요.');
 const stage=FREE_STAGES.find(s=>s.id===stageId);
 if(stageId===LOCAL_PREVIEW_ID)return {...validateEditorSite(JSON.parse(text)),id:LOCAL_PREVIEW_ID};
 if(!stage)throw Error('맵을 선택해 주세요.');
 const site=validateSite(JSON.parse(text));return {...site,id:stage.id,name:stage.name};
}
export function saveDraft(storage,stageId,draft){const site=parseDraft(JSON.stringify(draft.export()),stageId);storage.setItem(DRAFT_PREFIX+stageId,JSON.stringify(site));return site;}
export function loadDraft(storage,stageId){const raw=storage.getItem(DRAFT_PREFIX+stageId);return raw===null?null:parseDraft(raw,stageId);}
export function editorMessage(error){
 const text=String(error?.message||error);
 if(text.includes('floating component'))return '공중에 연결되지 않은 픽셀이 있어요. 바닥까지 기둥이나 연결부를 이어 주세요.';
 if(text.includes('occupied pixels'))return '픽셀은 1개 이상, 20,000개 이하로 배치해 주세요.';
 if(text.includes('shapes'))return '게임 테스트 한도인 사각형 묶음 240개를 넘었어요. 도형을 단순하게 정리해 주세요. 로컬 작업 파일 저장은 가능해요.';
 if(text.includes('Invalid map:'))return '맵 형식이나 크기가 맞지 않아요. 이 편집기에서 내려받은 JSON을 사용해 주세요.';
 return '저장하거나 불러오지 못했어요. 맵 JSON 또는 브라우저 저장 공간을 확인해 주세요.';
}
