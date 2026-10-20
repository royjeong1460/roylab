import {selectConnected,selectArea,transformSelection} from './selection.js';
export class SelectionView {
 constructor({getDraft,render,edited,status}){
  Object.assign(this,{getDraft,redraw:render,edited,status});this.selected=null;this.gesture=null;this.preview=null;
  this.panel=document.getElementById('selection-controls');this.fields=Object.fromEntries(['x','y','width','height'].map(k=>[k,document.getElementById('selection-'+k)]));
  document.getElementById('selection-apply').onclick=()=>{if(!this.selected)return;const d=getDraft(),bounds=Object.fromEntries(Object.entries(this.fields).map(([k,input])=>[k,input.value===''?NaN:Number(input.value)]));this.commit(transformSelection(d.cells,d.width,d.height,this.selected,bounds));};
  document.getElementById('selection-clear').onclick=()=>{this.clear();render();};
 }
 clear(){this.selected=null;this.gesture=null;this.preview=null;this.panel.hidden=true;}
 begin(point,tool,zoom){
  const d=this.getDraft();this.preview=null;
  if(tool==='area'){this.gesture={kind:'area',start:point,last:point};return;}
  const s=this.selected,tolerance=Math.max(1,Math.ceil(7/zoom));
  if(s&&Math.abs(point.x-(s.x+s.width-1))<=tolerance&&Math.abs(point.y-(s.y+s.height-1))<=tolerance)this.gesture={kind:'resize',start:point,selection:s,base:d.cells.slice()};
  else if(s&&point.x>=s.x&&point.x<s.x+s.width&&point.y>=s.y&&point.y<s.y+s.height)this.gesture={kind:'move',start:point,selection:s,base:d.cells.slice()};
  else {this.selected=selectConnected(d.cells,d.width,d.height,point.x,point.y);this.gesture=this.selected?{kind:'move',start:point,selection:this.selected,base:d.cells.slice()}:null;this.status(this.selected?'구조물을 선택했어요. 안쪽 드래그로 이동, 오른쪽 아래 손잡이로 크기를 조절하세요.':'선택할 구조물을 클릭하세요. 일부만 고르려면 영역 선택을 사용하세요.');}
  this.redraw();
 }
 move(point){
  const g=this.gesture;if(!g)return;g.last=point;
  if(g.kind!=='area'){
   const s=g.selection,dx=point.x-g.start.x,dy=point.y-g.start.y,d=this.getDraft();
   this.preview=transformSelection(g.base,d.width,d.height,s,g.kind==='move'?{x:s.x+dx,y:s.y+dy,width:s.width,height:s.height}:{x:s.x,y:s.y,width:s.width+dx,height:s.height+dy});
  }
  this.redraw();
 }
 end(point){
  const g=this.gesture;if(!g)return;this.move(point);
  if(g.kind==='area'){const d=this.getDraft();this.selected=selectArea(d.cells,d.width,d.height,g.start,point);this.status(this.selected?'영역을 선택했어요. 구조물 선택 도구로 바꾸면 이동할 수 있어요.':'이 영역에는 픽셀이 없어요.');this.gesture=null;this.redraw();}
  else {const result=this.preview;this.gesture=null;this.preview=null;this.commit(result);}
 }
 cancel(){this.gesture=null;this.preview=null;this.redraw();}
 commit(result){
  if(!result?.ok){this.status(result?.reason||'선택한 구조물을 확인해 주세요.');this.redraw();return;}
  const d=this.getDraft();if(result.cells.some((v,i)=>v!==d.cells[i])){d.checkpoint();d.cells=result.cells;this.edited();}
  this.selected=result.selection;this.status('위치·크기를 적용했어요. 바닥과 연결되는지 확인한 뒤 저장하세요.');this.redraw();
 }
 get cells(){return this.preview?.ok?this.preview.cells:null;}
 draw(ctx,zoom){
  const s=this.preview?.ok?this.preview.selection:this.selected;
  this.panel.hidden=!s;
  if(s){for(const [k,input] of Object.entries(this.fields))input.value=s[k];ctx.strokeStyle=this.preview&&!this.preview.ok?'#bb4133':'#f5b331';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.strokeRect(s.x*zoom,s.y*zoom,s.width*zoom,s.height*zoom);ctx.setLineDash([]);ctx.fillStyle='#f5b331';ctx.fillRect((s.x+s.width)*zoom-6,(s.y+s.height)*zoom-6,12,12);}
  if(this.gesture?.kind==='area'){const {start:a,last:b}=this.gesture;ctx.strokeStyle='#288baa';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(Math.min(a.x,b.x)*zoom,Math.min(a.y,b.y)*zoom,(Math.abs(a.x-b.x)+1)*zoom,(Math.abs(a.y-b.y)+1)*zoom);ctx.setLineDash([]);}
 }
}
