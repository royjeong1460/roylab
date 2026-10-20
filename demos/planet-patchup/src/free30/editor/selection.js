function selection(cells,width,indices){
 if(!indices.length)return null;
 let x=width,y=Infinity,right=0,bottom=0;for(const id of indices){x=Math.min(x,id%width);y=Math.min(y,Math.floor(id/width));right=Math.max(right,id%width);bottom=Math.max(bottom,Math.floor(id/width));}
 const w=right-x+1,h=bottom-y+1,pixels=new Uint8Array(w*h);
 for(const id of indices)pixels[(Math.floor(id/width)-y)*w+id%width-x]=cells[id];
 return {x,y,width:w,height:h,pixels,indices};
}
export function selectConnected(cells,width,height,x,y){
 if(x<0||y<0||x>=width||y>=height||!cells[y*width+x])return null;
 const seen=new Uint8Array(cells.length),queue=[y*width+x];seen[queue[0]]=1;
 for(let n=0;n<queue.length;n++){const id=queue[n],xx=id%width,yy=Math.floor(id/width);for(const [nx,ny] of [[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]]){const k=ny*width+nx;if(nx>=0&&ny>=0&&nx<width&&ny<height&&!seen[k]&&cells[k]){seen[k]=1;queue.push(k);}}}
 return selection(cells,width,queue);
}
export function selectArea(cells,width,height,a,b){
 const indices=[];for(let y=Math.max(0,Math.min(a.y,b.y));y<=Math.min(height-1,Math.max(a.y,b.y));y++)for(let x=Math.max(0,Math.min(a.x,b.x));x<=Math.min(width-1,Math.max(a.x,b.x));x++){const id=y*width+x;if(cells[id])indices.push(id);}
 return selection(cells,width,indices);
}
export function transformSelection(cells,width,height,selected,bounds){
 const {x,y,width:w,height:h}=bounds;
 if(!selected||![x,y,w,h].every(Number.isInteger)||w<1||h<1||x<0||y<0||x+w>width||y+h>height)return {ok:false,reason:'맵 안에 들어오는 위치와 크기를 입력해 주세요.'};
 const out=cells.slice(),indices=[];for(const id of selected.indices)out[id]=0;
 for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
  const color=selected.pixels[Math.floor(yy*selected.height/h)*selected.width+Math.floor(xx*selected.width/w)];if(!color)continue;
  const id=(y+yy)*width+x+xx;if(out[id])return {ok:false,reason:'다른 구조물과 겹쳐요. 빈 곳으로 이동하거나 크기를 줄여 주세요.'};out[id]=color;indices.push(id);
 }
 if(!indices.length)return {ok:false,reason:'너무 작아 모든 픽셀이 사라져요. 크기를 조금 늘려 주세요.'};
 return {ok:true,cells:out,selection:selection(out,width,indices)};
}
