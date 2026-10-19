// Irregular regions are only a coarse damage graph, never additional rigid bodies.
export const bondKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
const hash=(x,y)=>{let v=Math.imul(x+137,374761393)^Math.imul(y+251,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967295;};
export function buildGraph(material,width,neighbors,bonds){
 const size=Math.max(8,Math.ceil(Math.sqrt(material.length/160))),labels=new Map(),byId=new Map(material.map(v=>[v.p.id,v]));
 for(const {p} of material){
  const x=p.id%width+.5,y=Math.floor(p.id/width)+.5,gx=Math.floor(x/size),gy=Math.floor(y/size);let best=Infinity,label;
  for(let a=gx-1;a<=gx+1;a++)for(let b=gy-1;b<=gy+1;b++){
   const dx=x-(a+.2+.6*hash(a,b))*size,dy=y-(b+.2+.6*hash(b,a+79))*size,d=dx*dx+dy*dy;
   if(d<best){best=d;label=`${a},${b}`;}
  }
  labels.set(p.id,label);
 }
 const owner=new Map(),nodes=[];
 // A region split by a void or old crack must remain two separate graph nodes.
 for(const v of material){if(owner.has(v.p.id))continue;const node={id:nodes.length,pixels:[v],x:0,y:0,edges:[]};nodes.push(node);owner.set(v.p.id,node.id);
  for(let i=0;i<node.pixels.length;i++)for(const id of neighbors(node.pixels[i].p.id)){
   if(owner.has(id)||!byId.has(id)||labels.get(id)!==labels.get(v.p.id)||(bonds.get(bondKey(id,node.pixels[i].p.id))||0)>=1)continue;
   owner.set(id,node.id);node.pixels.push(byId.get(id));
  }
  for(const cell of node.pixels){node.x+=cell.q.x/node.pixels.length;node.y+=cell.q.y/node.pixels.length;}
 }
 const edges=new Map();
 for(const {p} of material)for(const id of neighbors(p.id)){
  if(id<=p.id||!owner.has(id))continue;const a=owner.get(p.id),b=owner.get(id),key=bondKey(p.id,id),old=bonds.get(key)||0;
  if(a===b||old>=1)continue;
  const pair=bondKey(a,b);if(!edges.has(pair)){const edge={a,b,bonds:[],cost:0};edges.set(pair,edge);nodes[a].edges.push(edge);nodes[b].edges.push(edge);}
  const edge=edges.get(pair);edge.bonds.push({key,old,id:p.id,other:id});edge.cost+=(1-old)*(.65+.7*hash(p.id,id));
 }
 return {nodes,edges:[...edges.values()],owner};
}
export function graphDistances(graph,contactIds){
 const dist=graph.nodes.map(()=>Infinity),done=new Set();for(const id of contactIds){const n=graph.owner.get(id);if(n!==undefined)dist[n]=0;}
 // The graph is coarse; this bounded scan avoids a heap dependency.
 for(let k=0;k<graph.nodes.length;k++){
  let at=-1,best=Infinity;for(let i=0;i<dist.length;i++)if(!done.has(i)&&dist[i]<best){best=dist[i];at=i;}
  if(at<0)break;done.add(at);const node=graph.nodes[at];
  for(const edge of node.edges){const to=edge.a===at?edge.b:edge.a,q=graph.nodes[to];dist[to]=Math.min(dist[to],best+Math.hypot(node.x-q.x,node.y-q.y));}
 }
 return dist;
}
