export const MAP_MAKER_VERSION=1;
export const MAP_FAMILIES=[{id:'column',name:'기둥'},{id:'bridge',name:'다리'},{id:'piloti',name:'필로티'},{id:'apartment',name:'아파트'},{id:'highrise',name:'고층'},{id:'cascade',name:'연쇄 붕괴'}];
export const MAP_SIZES=[{id:'small',name:'소형'},{id:'medium',name:'중형'},{id:'large',name:'대형'}];
const familyIds=MAP_FAMILIES.map(v=>v.id),sizeIds=MAP_SIZES.map(v=>v.id);
const fail=message=>{throw new Error(`Invalid map: ${message}`);};
const object=(value,label)=>{if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))fail(label);return value;};
const integer=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)fail(label);return value;};
const seedText=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>64)fail('seed');return value.trim();};
const enumValue=(value,values,label)=>{if(!values.includes(value))fail(label);return value;};
function options(value,allowMixed=false,strict=false){
  object(value,'options');
  if(strict)for(const key of Object.keys(value))if(!['seed','family','size',...(allowMixed?[]:['index'])].includes(key))fail(`option ${key}`);
  return {seed:seedText(value.seed===undefined?'workshop':value.seed),family:enumValue(value.family===undefined?(allowMixed?'mixed':'column'):value.family,allowMixed?[...familyIds,'mixed']:familyIds,'family'),size:enumValue(value.size===undefined?'medium':value.size,sizeIds,'size'),index:integer(value.index===undefined?0:value.index,0,999999,'index')};
}
function text(value,max,label){if(typeof value!=='string'||value.length>max||/[<>\u0000-\u001f\u007f]/u.test(value))fail(label);return value;}
function readData(value,maxDimension=256){
  object(value,'data');
  const width=integer(value.width,64,maxDimension,'width'),height=integer(value.height,96,maxDimension,'height'),floorY=integer(value.floorY,32,height-4,'floorY');
  if(!Array.isArray(value.shapes)||value.shapes.length>240)fail('shapes');
  const shapes=value.shapes.map(shape=>{
    object(shape,'shape');if(!Array.isArray(shape.rect)||shape.rect.length!==4)fail('rectangle');
    const x=integer(shape.rect[0],0,width-1,'x'),y=integer(shape.rect[1],0,floorY-1,'y'),w=integer(shape.rect[2],1,width-x,'rectangle width'),h=integer(shape.rect[3],1,floorY-y,'rectangle height');
    const color=integer(shape.color,1,5,'color');if(shape.target!==undefined&&typeof shape.target!=='boolean')fail('target');
    return {rect:[x,y,w,h],color,target:shape.target===undefined?true:shape.target};
  });
  return {width,height,floorY,shapes};
}
function occupancy(data){const cells=new Uint8Array(data.width*data.floorY);let count=0;for(const {rect:[x,y,w,h]} of data.shapes)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const id=yy*data.width+xx;if(!cells[id]){cells[id]=1;count++;}}return {cells,count};}
export function pixelCount(data){return occupancy(readData(data)).count;}
export function validateSite(value,{maxDimension=256}={}){
  object(value,'site');const generator=object(value.generator,'generator');
  if(generator.version!==MAP_MAKER_VERSION)fail('generator version');
  for(const key of ['seed','family','size','index'])if(!Object.hasOwn(generator,key)||generator[key]===undefined)fail(`generator ${key}`);
  const metadata=options(generator),data=readData(value.data,maxDimension),{cells,count}=occupancy(data);
  if(count<1||count>20000)fail('occupied pixels');
  const paintedArea=data.shapes.reduce((sum,shape)=>sum+shape.rect[2]*shape.rect[3],0);
  if(paintedArea!==count)fail('overlapping rectangles');
  if(!Array.isArray(value.preview)||value.preview.length<1||value.preview.length>8)fail('preview');
  const preview=Array.from(value.preview,point=>{object(point,'preview point');if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>=data.width||point.y<0||point.y>=data.floorY)fail('preview point');return {x:point.x,y:point.y};});
  const queue=new Int32Array(count);let tail=0;
  for(let x=0;x<data.width;x++){const id=(data.floorY-1)*data.width+x;if(cells[id]){cells[id]=2;queue[tail++]=id;}}
  const visit=id=>{if(cells[id]===1){cells[id]=2;queue[tail++]=id;}};
  for(let head=0;head<tail;head++){const id=queue[head],x=id%data.width;if(x>0)visit(id-1);if(x<data.width-1)visit(id+1);if(id>=data.width)visit(id-data.width);if(id<data.width*(data.floorY-1))visit(id+data.width);}
  if(tail!==count)fail('floating component');
  return {id:text(value.id,100,'id'),name:text(value.name,100,'name'),description:text(value.description,300,'description'),hint:text(value.hint,300,'hint'),preview,generator:{version:MAP_MAKER_VERSION,...metadata},data};
}
function hash(text){let value=2166136261;for(let n=0;n<text.length;n++){value^=text.charCodeAt(n);value=Math.imul(value,16777619);}return value>>>0;}
function random(seed){let state=hash(seed);return (min,max)=>{state=(state+0x6d2b79f5)|0;let n=Math.imul(state^state>>>15,1|state);n^=n+Math.imul(n^n>>>7,61|n);return min+Math.floor(((n^n>>>14)>>>0)/4294967296*(max-min+1));};}
// Merge painted runs so generated rectangles never overlap in World's strict loader.
export function packMapCells(cells,width,floorY){
  const shapes=[];let previous=new Map();
  for(let y=0;y<floorY;y++){
    const next=new Map();
    for(let x=0;x<width;){const color=cells[y*width+x];if(!color){x++;continue;}const start=x;while(x<width&&cells[y*width+x]===color)x++;const key=`${start}:${x-start}:${color}`,existing=previous.get(key);if(existing){existing.rect[3]++;next.set(key,existing);}else{const shape={rect:[start,y,x-start,1],color,target:true};shapes.push(shape);next.set(key,shape);}}
    previous=next;
  }
  return shapes;
}
export function generateSite(value={}){
  const {seed,family,size,index}=options(value,false,true),scale=sizeIds.indexOf(size),width=[96,144,192][scale],height=[144,192,256][scale],floorY=height-12;
  const rng=random(JSON.stringify([seed,family,size,index])),cells=new Uint8Array(width*floorY),preview=[],palette=[rng(1,5),rng(1,5),rng(1,5)];
  const rect=(x,y,w,h,color=palette[0])=>{if(x<0||y<0||x+w>width||y+h>floorY||w<1||h<1)throw new Error('Generator rectangle outside grid');for(let yy=y;yy<y+h;yy++)cells.fill(color,yy*width+x,yy*width+x+w);};
  const point=(x,y)=>preview.push({x,y});
  const frame=(x,top,w,bottom,floors,posts=3)=>{
    const slab=3+scale,post=3+scale;
    for(let n=0;n<=floors;n++){const y=n===floors?bottom-slab:Math.round(top+(bottom-slab-top)*n/floors);rect(x,y,w,slab,palette[1]);}
    for(let n=0;n<posts;n++){const xx=x+Math.round((w-post)*n/(posts-1));rect(xx,top,post,bottom-top,palette[0]);}
  };
  if(family==='column'){
    const loadW=rng(26+scale*10,34+scale*13),loadH=rng(25+scale*8,35+scale*11),top=rng(18+scale*5,30+scale*7),pillar=rng(3,4+scale),right=rng(0,1)===1;
    const x=rng(10,Math.max(10,width-loadW-10)),supportX=right?x+3:x+loadW-pillar-3;
    rect(x,top,loadW,loadH,palette[1]);rect(supportX,top+loadH,pillar,floorY-top-loadH);
    point(supportX+Math.floor(pillar/2),floorY-7);
  }else if(family==='bridge'){
    const left=rng(7,12),span=width-left-rng(7,12),deckY=rng(43+scale*12,60+scale*15),deckH=rng(9+scale*2,14+scale*3),supports=rng(2,scale===2?3:2),post=rng(4,5+scale);
    rect(left,deckY,span,deckH,palette[1]);
    for(let n=0;n<supports;n++){const x=left+Math.round((span-post)*n/(supports-1));rect(x,deckY+deckH,post,floorY-deckY-deckH);point(x+Math.floor(post/2),floorY-7);}
    rect(left,deckY-4,span,4,palette[2]);
  }else if(family==='piloti'){
    const x=rng(7,12),w=width-x-rng(7,12),top=rng(18,30),bottom=rng(Math.round(floorY*.55),Math.round(floorY*.67)),posts=rng(3,4+scale),column=rng(3,4+scale);
    frame(x,top,w,bottom,rng(2,3+scale),rng(3,4));
    for(let n=0;n<posts;n++){const xx=x+Math.round((w-column)*n/(posts-1));rect(xx,bottom,column,floorY-bottom);point(xx+Math.floor(column/2),floorY-7);}
  }else if(family==='apartment'||family==='highrise'){
    const tall=family==='highrise',w=tall?rng(29+scale*6,37+scale*8):rng(width-27,width-15),x=rng(7,width-w-7),top=tall?rng(10,20):rng(28,43),floors=rng(tall?5+scale:3+scale,tall?6+scale*2:4+scale*2),posts=tall?2:rng(3,4+scale);
    frame(x,top,w,floorY,floors,posts);
    const post=3+scale;for(let n=0;n<Math.min(posts,8);n++)point(x+Math.round((w-post)*n/(posts-1))+Math.floor(post/2),floorY-8);
  }else{
    const count=scale===0?2:rng(2,3),gap=rng(5,8+scale),totalW=width-16,buildingW=Math.floor((totalW-gap*(count-1))/count),start=Math.floor((width-(buildingW*count+gap*(count-1)))/2);
    for(let n=0;n<count;n++){
      const x=start+n*(buildingW+gap),top=rng(18+scale*4,42+scale*7),bottom=rng(Math.round(floorY*.56),Math.round(floorY*.68)),post=rng(3,4+scale),supportX=x+(n===count-1?buildingW-post-2:2);
      frame(x,top,buildingW,bottom,rng(2+scale,3+scale),2);
      rect(supportX,bottom,post,floorY-bottom,palette[2]);point(supportX+Math.floor(post/2),floorY-7);
    }
  }
  const title=MAP_FAMILIES.find(v=>v.id===family).name,sizeName=MAP_SIZES.find(v=>v.id===size).name;
  const hints={column:'한쪽으로 치우친 무게를 보고 가느다란 기둥을 잘라 보세요.',bridge:'다리 아래 받침들을 차례로 끊어 보세요.',piloti:'넓은 건물을 떠받치는 아래층 기둥을 노려 보세요.',apartment:'빈 창문 사이의 벽과 아래층 연결을 잘라 보세요.',highrise:'좁고 높은 골조의 밑동을 조금씩 잘라 보세요.',cascade:'첫 건물의 받침을 잘라 이웃 건물 쪽으로 넘어뜨려 보세요.'};
  return validateSite({id:`maker-v1-${hash(seed).toString(36)}-${family}-${size}-${index}`,name:`${sizeName} ${title} ${index+1}`,description:family==='cascade'?'서로 가까운 건물들이 넘어지며 부딪치는 구조예요.':'기둥과 빈 공간을 살펴보고 무게가 움직일 길을 찾아보세요.',hint:hints[family],preview,generator:{version:MAP_MAKER_VERSION,seed,family,size,index},data:{width,height,floorY,shapes:packMapCells(cells,width,floorY)}});
}
export function generateCandidates(value={}){
  const {seed,family,size}=options(value,true,true),families=[...familyIds],rng=random(`${seed}:families:${size}`);
  for(let n=families.length-1;n>0;n--){const other=rng(0,n);[families[n],families[other]]=[families[other],families[n]];}
  return Array.from({length:6},(_,index)=>generateSite({seed,family:family==='mixed'?families[index]:family,size,index}));
}
