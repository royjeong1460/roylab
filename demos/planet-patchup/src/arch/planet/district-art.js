// Fictional architectural motifs. Same pixel art is used on the globe and comparison board.
const DistrictArt=(()=>{
const names=['처마 골목','아치 지구','호박빛 시장','수로 공업지','계단 고원','모자이크 분지'];
const landmarks=['푸른 처마 누각','햇살 아치 회랑','호박빛 시장회관','수로 시계회관','계단 천문대','청록 모자이크 전당'];
const themes=[
 {roof:[65,115,118],bright:[116,170,162],wall:[233,214,158],shade:[170,144,99],ground:[111,151,104]},
 {roof:[185,107,63],bright:[242,174,100],wall:[242,211,155],shade:[187,146,94],ground:[178,165,112]},
 {roof:[214,145,56],bright:[255,208,109],wall:[232,187,112],shade:[169,117,71],ground:[175,155,93]},
 {roof:[68,115,135],bright:[119,190,192],wall:[192,123,84],shade:[137,82,62],ground:[103,152,122]},
 {roof:[90,155,149],bright:[166,209,177],wall:[215,198,149],shade:[151,138,101],ground:[129,160,107]},
 {roof:[42,148,160],bright:[131,225,213],wall:[244,220,170],shade:[176,149,107],ground:[123,158,127]}
];
function paint(data,width,height,site,index,clean){
 const t=themes[index],scale=width/512,cx=Math.round(site[0]*width),cy=Math.round(site[1]*(height-1));
 const ink=clean?[43,62,64]:[43,47,43],roof=clean?t.roof:[77,83,69],shine=clean?t.bright:[135,118,78],wall=clean?t.wall:[135,119,81],shade=clean?t.shade:[92,82,62];
 function rect(x,y,w,h,color,alpha=1){for(let py=Math.max(0,Math.round(cy+y*scale));py<Math.min(height,Math.round(cy+(y+h)*scale));py++)for(let px=Math.round(cx+x*scale);px<Math.round(cx+(x+w)*scale);px++){const i=(py*width+(px%width+width)%width)*4;for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*(1-alpha)+color[c]*alpha)}}
 function ellipse(x,y,rx,ry,color,alpha=1){for(let row=-ry;row<=ry;row++){const span=Math.floor(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));rect(x-span,y+row,span*2+1,1,color,alpha)}}
 function arch(x,y,w,h){rect(x+2,y,w-4,1,ink);rect(x+1,y+1,w-2,2,ink);rect(x,y+3,w,h-3,ink);rect(x+1,y+h-2,w-2,2,shade)}
 function eave(x,y,w){rect(x+3,y-3,w-6,2,roof);rect(x+1,y-1,w-2,2,roof);rect(x,y+1,w,2,ink);rect(x,y,w,1,shine);rect(x-2,y-2,2,3,roof);rect(x+w,y-2,2,3,roof)}
 function dome(x,y,w){rect(x+Math.floor(w/2)-1,y-3,2,3,shine);for(let row=0;row<7;row++){const inset=[7,5,3,2,1,0,0][row];rect(x+inset,y+row,w-inset*2,1,roof)}rect(x,y+7,w,2,ink);rect(x+4,y+2,2,4,shine)}
 // Cover the former factory mark with an irregular local plaza, not a global texture edit.
 ellipse(0,-2,24,18,clean?t.ground:[105,96,67],.90);ellipse(0,9,22,5,ink,.22);
 if(clean){for(let j=0;j<7;j++){const x=-23+j*7,y=8+(j%3)*2;rect(x,y,3,1,t.bright,.5);rect(x,y+1,2,1,t.ground)}rect(-18,8,36,2,shade);rect(-16,7,32,1,wall)}
 if(index===0){
  rect(-13,-9,26,17,ink);rect(-12,-8,24,15,wall);for(let x=-10;x<=10;x+=10){rect(x,-8,2,14,shade);rect(x,-7,1,12,shine)}
  rect(-7,-4,5,7,roof);rect(3,-4,5,7,roof);rect(-1,-8,2,15,shade);eave(-17,-12,34);
  rect(-7,-21,14,8,wall);rect(-5,-20,3,5,ink);rect(3,-20,3,5,ink);eave(-11,-23,22);rect(-1,-29,2,3,shine);
 }else if(index===1){
  rect(-18,-13,36,21,shade);rect(-17,-12,34,19,wall);rect(-19,-15,38,3,roof);rect(-17,-15,34,1,shine);
  for(let x=-14;x<15;x+=11){arch(x,-8,7,15);rect(x-2,-11,1,17,shine)}
  rect(-7,-24,14,10,shade);rect(-6,-23,12,8,wall);arch(-3,-21,6,7);rect(-8,-26,16,2,roof);rect(-6,-27,3,2,shine);rect(3,-27,3,2,shine);
 }else if(index===2){
  rect(-15,-10,30,18,shade);rect(-14,-9,28,16,wall);arch(-4,-4,8,12);rect(-7,-22,14,12,wall);dome(-10,-29,20);
  for(let x=-17;x<16;x+=6){rect(x,-13,6,3,roof);rect(x,-10,6,2,ink);rect(x+1,-13,2,3,shine)}
  for(const x of [-11,8]){rect(x,-5,4,6,ink);rect(x,-5,4,1,shine)}
 }else if(index===3){
  rect(-16,-8,32,16,shade);rect(-15,-7,30,14,wall);for(let x=-12;x<15;x+=8){arch(x,-4,5,8)}
  eave(-18,-12,36);rect(-5,-26,10,24,ink);rect(-4,-25,8,23,wall);eave(-7,-28,14);
  rect(-3,-22,6,6,shine);rect(-1,-21,1,3,ink);rect(-1,-19,3,1,ink);
  ellipse(14,3,7,7,ink);ellipse(14,3,5,5,shade);rect(13,-3,2,13,shine);rect(8,2,13,2,shine);rect(12,1,4,4,ink);
  rect(-20,11,40,3,roof);rect(-16,12,10,1,shine);rect(4,11,8,1,shine);
 }else if(index===4){
  for(let level=0;level<4;level++){const w=36-level*7,y=5-level*6;rect(-Math.floor(w/2),y-4,w,6,shade);rect(-Math.floor(w/2)+1,y-4,w-2,4,wall);rect(-Math.floor(w/2),y-5,w,1,shine)}
  for(let step=0;step<9;step++){rect(-3,-13+step*2,6,1,ink);rect(-2,-12+step*2,4,1,wall)}
  rect(-6,-23,12,7,shade);rect(-5,-22,10,5,wall);arch(-2,-22,4,6);rect(-8,-25,16,2,roof);rect(-4,-27,8,2,shine);rect(-1,-30,2,3,roof);
 }else{
  rect(-14,-11,28,19,shade);rect(-13,-10,26,17,wall);dome(-13,-25,26);arch(-4,-4,8,12);
  for(const x of [-17,13]){rect(x,-18,4,25,shade);rect(x,-18,3,24,wall);rect(x-1,-20,6,3,roof);rect(x,-22,4,2,shine)}
  for(let x=-11;x<=9;x+=4){rect(x,-8,2,2,roof);rect(x+1,-5,2,2,shine)}
  rect(-14,-12,28,2,roof);for(let x=-12;x<=12;x+=4)rect(x,-12,2,1,shine);
 }
 if(!clean){
  // Region-specific scrap shares the local architecture, not identical generic factories.
  const scrap=[127,91,58],metal=[99,111,103];
  if(index===0){for(let j=0;j<4;j++){rect(-22+j,-1-j*3,9,2,j%2?metal:scrap)}rect(15,-9,7,16,shade);eave(13,-10,10)}
  if(index===1){for(let j=0;j<3;j++){rect(-23+j*4,3-j*3,5,7,shade);rect(-22+j*4,2-j*3,4,1,wall)}rect(14,-2,10,8,scrap);arch(16,0,5,6)}
  if(index===2){for(let j=0;j<3;j++){rect(-23+j*5,1-j*2,5,8,scrap);rect(-22+j*5,2-j*2,3,1,shine)}rect(13,-3,10,9,shade);rect(14,-5,8,2,roof);rect(16,-7,4,2,scrap)}
  if(index===3){rect(-24,-9,7,18,metal);rect(-23,-11,5,2,shine);rect(-24,-3,7,2,ink);for(let j=0;j<3;j++)rect(17+j*2,4-j*3,6,3,scrap)}
  if(index===4){for(let j=0;j<4;j++){rect(-24+j*3,4-j*3,8,4,j%2?scrap:shade);rect(15-j,3-j*3,8,3,metal)}}
  if(index===5){for(let j=0;j<3;j++){rect(-24+j*4,3-j*3,6,6,shade);rect(-23+j*4,4-j*3,2,2,metal)}rect(17,0,6,8,scrap);rect(18,-2,4,2,shine)}
  // Retrofit chimneys and soot make the intact cultural shell read as a waste factory.
  const chimneyX=index%2?10:-11;rect(chimneyX,-29,4,17,ink);rect(chimneyX+1,-28,2,14,shade);rect(chimneyX-1,-31,6,2,metal);
  for(let k=0;k<4;k++)ellipse(chimneyX+1-k*2,-33-k*3,3+k,2,[70,72,65],.7-k*.14);
  rect(-10,1,20,7,ink,.65);for(let j=0;j<5;j++){rect(-11+j*5,5-j%2*3,5,4,j%2?scrap:metal)}
 }else{
  // One restored landmark, framed by low greenery and a few paving pixels.
  for(const x of [-21,19]){ellipse(x,6,3,2,t.roof);rect(x,3,2,2,t.bright)}
 }
}
return {paint,names,landmarks};})();

export default DistrictArt;
