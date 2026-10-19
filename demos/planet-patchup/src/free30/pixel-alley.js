const W=130;
const trash=[
  ['#bd986c','#dfc399','#9d7e59'],
  ['#a3ad8b','#c7ccab','#79856b'],
  ['#c18f70','#dfb18a','#9d7258'],
  ['#c7b38b','#e7d3aa','#9a8e70'],
];

export function drawPixelAlley(canvas,menuTop){
  const {width,height}=canvas.getBoundingClientRect();
  if(!width||!height)return;
  // Roughly 3 CSS pixels per source pixel on a phone.
  const H=Math.round(height*W/width),c=canvas.getContext('2d');
  canvas.width=W;canvas.height=H;c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const line=(x,y,x2,y2,color)=>{
    const dx=Math.abs(x2-x),dy=-Math.abs(y2-y),sx=x<x2?1:-1,sy=y<y2?1:-1;
    let error=dx+dy;
    while(true){rect(x,y,1,1,color);if(x===x2&&y===y2)break;
      const e=error*2;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}
  };
  const horizon=Math.round(H*.47);
  const base=Math.round(menuTop*H/height)-20;

  rect(0,0,W,H,'#e4d7b6');
  rect(0,0,W,Math.round(H*.22),'#d7d2b2');
  rect(0,Math.round(H*.22),W,Math.round(H*.13),'#dfd6b3');
  rect(0,Math.round(H*.35),W,horizon-Math.round(H*.35),'#e8d8af');
  // Sparse cloud and haze bands leave the title area quiet.
  rect(6,horizon-37,17,1,'#e9dfc1');rect(9,horizon-38,9,1,'#e9dfc1');
  rect(95,horizon-27,24,1,'#eddfbd');rect(102,horizon-28,9,1,'#eddfbd');
  [6,10,12,14,16,16,16,16,16,16,14,12,10,6].forEach((w,i)=>rect(103-w/2,horizon-44+i,w,1,'#eee0ba'));

  // Distant city: soft silhouettes and only a few window marks.
  for(const [x,w,h] of [[-5,17,24],[15,12,15],[31,10,31],[45,15,20],[64,10,26],[78,17,17],[99,12,29],[115,19,22]]){
    rect(x,horizon-h,w,h,'#c2bfa1');rect(x+2,horizon-h-2,w-4,2,'#c2bfa1');
    rect(x+3,horizon-h+5,2,2,'#d3ccaa');rect(x+w-5,horizon-h+5,2,2,'#d3ccaa');
  }
  rect(0,horizon-3,W,5,'#d0c5a0');
  rect(0,horizon,W,H-horizon,'#c9ae80');
  rect(0,horizon,W,8,'#d4bd91');
  // The lane widens toward the viewer in integer scanlines.
  for(let y=horizon;y<H;y++){
    const t=(y-horizon)/(H-horizon),left=Math.round(55-35*t),right=Math.round(78+40*t);
    rect(left,y,right-left,1,'#d7bd90');
    if(y%4!==0){rect(left-2,y,1,1,'#e0c69a');rect(right+1,y,1,1,'#bda577');}
  }
  // A small, hazy loading gate belongs to the background.
  rect(43,horizon-24,2,27,'#aeb496');rect(88,horizon-24,2,27,'#aeb496');
  line(43,horizon-24,50,horizon-29,'#aeb496');line(50,horizon-29,81,horizon-29,'#aeb496');
  line(81,horizon-29,89,horizon-24,'#aeb496');
  line(50,horizon-28,81,horizon-28,'#c1c4a3');
  rect(50,horizon-22,31,1,'#c1bd9a');
  // Muted stacks in the distance lead into the two foreground trash buildings.
  for(const [x,y,w,h] of [[24,horizon-8,12,15],[27,horizon-15,8,7],[95,horizon-10,12,18],[97,horizon-17,8,7]]){
    rect(x,y,w,h,'#b4aa86');rect(x+1,y,w-2,1,'#ccc09b');
  }

  function bale(x,y,w,h,type){
    const [face,light,shade]=trash[type%trash.length];
    rect(x,y,w,h,'#887857');rect(x+1,y+1,w-2,h-2,face);
    rect(x+1,y+1,w-2,1,light);rect(x+w-3,y+2,2,h-3,shade);
    if(type%4===0){
      rect(x+5,y+2,2,h-3,light);rect(x+3,y+5,6,2,shade);
      rect(x+2,y+h-4,3,2,light);
    }else if(type%4===1){
      rect(x+3,y+4,6,3,shade);rect(x+4,y+4,4,1,light);
      rect(x+2,y+h-4,3,1,light);rect(x+w-5,y+h-5,1,2,light);
    }else if(type%4===2){
      line(x+2,y+3,x+6,y+6,shade);line(x+6,y+6,x+3,y+9,shade);
      rect(x+7,y+4,3,2,light);rect(x+6,y+h-3,4,1,shade);
    }else{
      rect(x+3,y+3,6,5,light);rect(x+4,y+4,4,3,shade);
      rect(x+2,y+h-4,5,1,shade);
    }
  }
  function appliance(x,y){
    rect(x,y,14,15,'#788069');rect(x+1,y+1,12,13,'#b6bd9c');
    rect(x+2,y+1,10,1,'#d4d8b6');rect(x+2,y+4,10,1,'#788069');
    rect(x+4,y+6,6,1,'#788069');rect(x+3,y+7,8,5,'#788069');rect(x+4,y+12,6,1,'#788069');
    rect(x+5,y+7,4,1,'#d4d8b6');rect(x+4,y+8,6,3,'#949e83');
    rect(x+10,y+3,1,1,'#788069');
  }
  // Wide foundations with staggered tiers: refuse has accumulated from the ground.
  for(let i=0;i<5;i++)rect(0,base+i,48-i*2,1,'#ac946b');
  for(let i=0;i<5;i++)rect(89+i*2,base+2+i,41-i*2,1,'#ac946b');
  const left=[[-6,0,0],[8,0,2],[22,0,1],[2,1,3],[16,1,0],[30,1,2],[-5,2,1],[9,2,2],[23,2,3],[0,3,0],[14,3,1],[5,4,3]];
  for(const [x,tier,type] of left)bale(x,base-(tier+1)*13,14,13,type);
  appliance(13,base-54);
  const right=[[94,0,0],[108,0,1],[122,0,3],[90,1,2],[104,1,3],[118,1,0],[98,2,1],[112,2,2],[126,2,0],[105,3,0],[119,3,1]];
  for(const [x,tier,type] of right)bale(x,base-(tier+1)*14+2,14,14,type);
  appliance(113,base-69);
  // A few loose fragments use the same colours as their parent bales.
  for(const [x,y,color] of [[7,base+8,0],[28,base+5,1],[37,base+13,2],[93,base+11,3],[117,base+9,1]]){
    rect(x,y,4,2,trash[color][2]);rect(x+1,y-1,3,2,trash[color][0]);
  }
  for(const [x,y] of [[50,horizon+24],[79,base-8],[15,H-24],[114,H-17],[44,H-11]]){
    rect(x,y,3,1,'#baa071');rect(x+4,y+1,1,1,'#baa071');
  }
}
