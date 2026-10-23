// Compile topology from occupancy, so recoloring, padding, resampling and editor
// exports cannot leave structural IDs referring to a different grid.
export function compileStructure(data,authored=null){
 const {width,height,floorY,shapes}=data,cells=new Uint8Array(width*height),roles=new Uint8Array(width*height);
 for(const {rect:[x,y,w,h],color} of shapes)for(let yy=y;yy<y+h;yy++)cells.fill(color,yy*width+x,yy*width+x+w);
 const neighbors=id=>[...(id%width?[id-1]:[]),...(id%width<width-1?[id+1]:[]),id-width,id+width].filter(n=>n>=0&&n<cells.length);
 const groups=(predicate)=>{
  const seen=new Uint8Array(cells.length),out=[];
  for(let id=0;id<cells.length;id++)if(!seen[id]&&predicate(id)){
   const part=[id];seen[id]=1;for(let n=0;n<part.length;n++)for(const next of neighbors(part[n]))if(!seen[next]&&predicate(next)){seen[next]=1;part.push(next);}out.push(part);
  }return out;
 };
 // Short end caps and rubble are not columns. Diagonal lattice legs remain
 // connected and can qualify; wide panels never become columns from their color.
 const narrow=new Uint8Array(cells.length);
 for(let y=0;y<floorY;y++)for(let x=0;x<width;){
  if(!cells[y*width+x]){x++;continue;}const start=x;while(x<width&&cells[y*width+x])x++;
  if(x-start<=6)narrow.fill(1,y*width+start,y*width+x);
 }
 for(const part of groups(id=>narrow[id])){
  const xs=part.map(id=>id%width),ys=part.map(id=>Math.floor(id/width));
  const w=Math.max(...xs)-Math.min(...xs)+1,h=Math.max(...ys)-Math.min(...ys)+1;
  if(h>=7&&h>=w*1.5)for(const id of part)roles[id]=1;
 }
 for(const part of groups(id=>cells[id]&&roles[id]!==1)){
  const xs=part.map(id=>id%width),ys=part.map(id=>Math.floor(id/width)),top=Math.min(...ys),bottom=Math.max(...ys);
  const wide=Math.max(...xs)-Math.min(...xs)>=9,cap=Math.min(6,Math.max(2,Math.floor((bottom-top+1)*.2)));
  for(const id of part)roles[id]=wide&&bottom-top>=3&&top<floorY-10&&Math.floor(id/width)<top+cap?3:2;
 }
 if(authored?.version===1){
  roles.fill(0);
  for(const {rect:[x,y,w,h],color} of authored.roles)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(cells[yy*width+xx])roles[yy*width+xx]=color;
  for(let id=0;id<cells.length;id++)if(cells[id]&&!roles[id])roles[id]=2;
 }
 const moduleOf=new Int16Array(cells.length).fill(-1),modules=[];
 for(const role of [1,2,3])for(const part of groups(id=>cells[id]&&roles[id]===role)){
  const index=modules.length;for(const id of part)moduleOf[id]=index;
  modules.push({type:({1:'pillar',2:'body',3:'roof'})[role],pixels:part});
 }
 const links=new Map();
 for(let id=0;id<cells.length;id++)if(cells[id])for(const next of [id+width,...(id%width<width-1?[id+1]:[])]){
  if(!cells[next]||moduleOf[id]===moduleOf[next])continue;
  const a=moduleOf[id],b=moduleOf[next],key=a<b?`${a}:${b}`:`${b}:${a}`;
  if(!links.has(key))links.set(key,[]);links.get(key).push([id,next]);
 }
 return {cells,roles,moduleOf,modules,moduleLinks:[...links.values()]};
}
