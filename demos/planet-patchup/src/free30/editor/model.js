import {packMapCells,validateSite} from '../../map-maker-generator.js';
import {FREE_STAGES} from '../stages.js';
export const DRAFT_PREFIX='planet-patchup-stage-draft-v1:';
export const PALETTE=['#f1edda','#aa805b','#5f8a92','#d8af66','#e88b51','#ba7770'];
export class MapDraft {
 constructor(site){this.site=structuredClone(validateSite(site));const {width,floorY}=this.site.data;this.cells=new Uint8Array(width*floorY);for(const {rect:[x,y,w,h],color} of this.site.data.shapes)for(let yy=y;yy<y+h;yy++)this.cells.fill(color,yy*width+x,yy*width+x+w);this.history=[];}
 get width(){return this.site.data.width;}
 get height(){return this.site.data.floorY;}
 checkpoint(){this.history.push(this.cells.slice());if(this.history.length>40)this.history.shift();}
 undo(){const before=this.history.pop();if(!before)return false;this.cells=before;return true;}
 point(x,y,color){if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(color)||color<0||color>5||x<0||y<0||x>=this.width||y>=this.height)return;this.cells[y*this.width+x]=color;}
 line(a,b,color){const n=Math.max(Math.abs(b.x-a.x),Math.abs(b.y-a.y));let previous=a;for(let i=0;i<=n;i++){const t=n?i/n:0,x=Math.round(a.x+(b.x-a.x)*t),y=Math.round(a.y+(b.y-a.y)*t);this.point(x,previous.y,color);this.point(x,y,color);previous={x,y};}}
 rectangle(a,b,color){for(let y=Math.min(a.y,b.y);y<=Math.max(a.y,b.y);y++)for(let x=Math.min(a.x,b.x);x<=Math.max(a.x,b.x);x++)this.point(x,y,color);}
 export(){return validateSite({...this.site,data:{...this.site.data,shapes:packMapCells(this.cells,this.width,this.height)}});}
}
export function parseDraft(text,stageId){
 if(typeof text!=='string'||text.length>2000000)throw Error('맵 파일은 2MB 이하만 불러올 수 있어요.');
 const stage=FREE_STAGES.find(s=>s.id===stageId);if(!stage)throw Error('맵을 선택해 주세요.');
 const site=validateSite(JSON.parse(text));return {...site,id:stage.id,name:stage.name};
}
export function saveDraft(storage,stageId,draft){const site=parseDraft(JSON.stringify(draft.export()),stageId);storage.setItem(DRAFT_PREFIX+stageId,JSON.stringify(site));return site;}
export function loadDraft(storage,stageId){const raw=storage.getItem(DRAFT_PREFIX+stageId);return raw===null?null:parseDraft(raw,stageId);}
export function editorMessage(error){
 const text=String(error?.message||error);
 if(text.includes('floating component'))return '공중에 연결되지 않은 픽셀이 있어요. 바닥까지 기둥이나 연결부를 이어 주세요.';
 if(text.includes('occupied pixels'))return '픽셀은 1개 이상, 20,000개 이하로 배치해 주세요.';
 if(text.includes('shapes'))return '조각 모양이 너무 복잡해요. 선·사각형으로 정리해 주세요. 저장 한도는 사각형 묶음 240개예요.';
 if(text.includes('Invalid map:'))return '맵 형식이나 크기가 맞지 않아요. 이 편집기에서 내려받은 JSON을 사용해 주세요.';
 return '저장하거나 불러오지 못했어요. 맵 JSON 또는 브라우저 저장 공간을 확인해 주세요.';
}
