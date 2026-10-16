import {generateSite,packMapCells,validateSite} from '../map-maker-generator.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const names=['삐걱 고물 상자','바람골 화물 다리','먼지 창고','빈 창문 작업장','휘파람 급수탑','옆집 고물 더미'];
const descriptions=[
 '한쪽 받침에 얹힌 작은 고물 창고. 첫 절단과 회수를 연습하기 좋아요.',
 '두 받침 위에 화물 통로가 길게 놓였어요. 한쪽씩 끊으며 낙하를 살펴보세요.',
 '빈 아래층 위에 창고가 떠 있어요. 가는 받침들이 윗층 무게를 버티고 있어요.',
 '여러 층의 작업장에는 실제로 뚫린 창문과 두꺼운 바닥이 있어요.',
 '바람 소리가 나는 좁은 급수탑. 높은 골조가 넘어질 공간을 만들어 보세요.',
 '이웃한 고물 건물들이 기울며 부딪칠 수 있어요. 한쪽부터 무너뜨려 보세요.',
];

function createOrdinary(family,index){
 const base=generateSite({seed:'scrapyard-hollow-v1',family,size:'small',index});
 const {width,height,floorY}=base.data,cells=new Uint8Array(width*floorY);
 for(const {rect:[x,y,w,h],color} of base.data.shapes)for(let yy=y;yy<y+h;yy++)cells.fill(color,yy*width+x,yy*width+x+w);
 const original=cells.slice();
 if(family==='column'){
  const load=base.data.shapes.find(s=>s.rect[2]>20),[x,y,w,h]=load.rect;
  for(let yy=y+h;yy<y+h+3;yy++)cells.fill(load.color,yy*width+x,yy*width+x+w);
 }
 // Add actual window rims to the upper bays while keeping the slender supports open.
 for(let y=1;y<floorY-12;y++)for(let x=1;x<width-1;x++){
  if(original[y*width+x])continue;
  let l=x-1,r=x+1,t=y-1,b=y+1;
  while(l>=0&&!original[y*width+l])l--;while(r<width&&!original[y*width+r])r++;
  while(t>=0&&!original[t*width+x])t--;while(b<floorY&&!original[b*width+x])b++;
  if(l>=0&&r<width&&t>=0&&b<floorY&&r-l<40&&b-t<45&&(x-l===1||r-x===1||y-t===1||b-y===1))cells[y*width+x]=2;
 }
 if(family==='column'||family==='bridge'){
  const first=original.findIndex(Boolean),top=Math.floor(first/width),left=first%width;
  for(let y=top-4;y<top;y++)for(let x=left+2;x<left+12;x++)if(y>=0&&!(y===top-3&&x===left+6))cells[y*width+x]=4;
 }
 if(['column','piloti','apartment','cascade'].includes(family)){
  const top=Math.floor(cells.findIndex(Boolean)/width);let left=width,right=0;
  for(let x=0;x<width;x++)if(cells[top*width+x]){left=Math.min(left,x);right=Math.max(right,x);}
  for(let level=1;level<=5;level++)for(let x=left+level-1;x<=right-level+1;x++)if(top-level>=0)cells[(top-level)*width+x]=3;
 }
 return validateSite({...base,id:`step1-${family}-v1`,name:names[index],description:descriptions[index],data:{width,height,floorY,shapes:packMapCells(cells,width,floorY)}});
}

function createTwinPeakTower(){
 const width=80,floorY=110,cells=new Uint8Array(width*floorY);
 const paint=(predicate,color)=>{for(let y=0;y<floorY;y++)for(let x=0;x<width;x++)if(predicate(x+.5,y+.5))cells[y*width+x]=color;};
 const rect=(x,y,w,h,color)=>paint((px,py)=>px>=x&&px<x+w&&py>=y&&py<y+h,color);
 const polygon=(points,color)=>paint((x,y)=>{
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }return inside;
 },color);
 const stroke=(ax,ay,bx,by,thickness,color)=>{
  const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
  paint((x,y)=>{const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length));return (x-ax-t*dx)**2+(y-ay-t*dy)**2<=(thickness/2)**2;},color);
 };
 // One flared pedestal supports a broad junction; the unequal peaks fork above it.
 stroke(25,58,13,109,3,3);stroke(55,58,67,109,3,3);
 stroke(25,60,61,82,2,1);stroke(55,60,19,82,2,1);
 rect(18,81,44,2,3);
 polygon([[24,8],[26,8],[28,25],[35,55],[18,55],[22,25]],3);
 polygon([[54,18],[56,18],[59,36],[64,55],[46,55],[51,36]],3);
 // Gaps are part of the destructible grid, with solid decks joining the lattice.
 polygon([[25,27],[28,37],[25,44],[22,37]],0);
 polygon([[26,44],[31,51],[21,51]],0);
 polygon([[55,34],[59,43],[55,50],[51,43]],0);
 rect(16,55,49,4,1);rect(16,55,49,2,3);
 rect(23,6,4,3,1);rect(54,15,2,4,1);
 for(const [x,w] of [[9,8],[63,8]])rect(x,108,w,2,1);
 return validateSite({
  id:'step1-twin-peak-tower-v1',name:'쌍봉 고물 철탑',
  description:'고물 바람골의 오래된 신호탑. 하나의 넓은 밑동에서 높이가 다른 두 꼭지점이 갈라져 올라가요.',
  hint:'아래 두 받침을 차례로 끊고, 넓은 연결층에 폭파를 써 보세요. 빈 철골 사이로 무게가 움직일 길을 만들어요.',
  preview:[{x:27,y:210},{x:133,y:210}],
  generator:{version:1,seed:'scrapyard-twin-peaks-v1',family:'highrise',size:'medium',index:6},
  data:{width:160,height:232,floorY:220,shapes:packMapCells(cells,width,floorY).map(s=>({...s,rect:s.rect.map(v=>v*2)}))},
 });
}

export const STEP1_SITES=freeze(['column','bridge','piloti','apartment','highrise','cascade'].map(createOrdinary));
export const STEP1_BOSS=freeze(createTwinPeakTower());
export function chooseStep1Site(previousId,earned=0,random=Math.random){
 const progress=Number.isFinite(earned)?earned:0;
 const pool=STEP1_SITES.slice(0,progress<2000?2:progress<6000?4:6);
 const available=pool.filter(site=>site.id!==previousId),value=random();
 return available[Math.min(available.length-1,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*available.length)))];
}
