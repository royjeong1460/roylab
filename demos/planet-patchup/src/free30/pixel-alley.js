// Portrait composition matched visually to Figma 411:2 (390 × 844).
// Keep the open road visible; foreground trash belongs beyond the phone crop.
export function drawPixelAlley(canvas){
  const {width,height}=canvas.getBoundingClientRect();
  if(!width||!height)return;
  const W=130,H=282,c=canvas.getContext('2d');
  canvas.width=W;canvas.height=H;c.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  rect(0,0,W,H,'#d7d2b2');
  rect(0,73,W,55,'#ded9b5');
  rect(0,128,W,27,'#ddd2ad');
  // Distant skyline; deliberately quiet behind the title and menu.
  for(const [x,y,w,h] of [[4,109,15,42],[2,113,18,38],[47,111,18,40],[72,124,24,27],[79,119,9,8],[90,109,20,42],[113,124,17,27],[26,129,17,22]]){
    rect(x,y,w,h,'#bebfa0');
  }
  rect(8,106,8,4,'#bebfa0');
  for(const [x,y] of [[30,134],[39,132],[116,130],[124,133],[80,132]])rect(x,y,3,5,'#d3cfae');
  rect(0,150,W,132,'#b9a37b');
  rect(0,145,W,17,'#cbb98e');
  // Broad lane with straight, stepped pixel edges, as in the mobile frame.
  for(let y=155;y<H;y++){
    const t=(y-155)/(H-155),left=Math.round(50-88*t),right=Math.round(87+83*t);
    rect(left,y,right-left,1,'#d5bf90');
    rect(left-3,y,3,1,'#dfc99b');rect(right,y,2,1,'#a9936c');
  }
  const steel='#adb394';
  rect(35,129,2,35,steel);rect(97,130,2,34,steel);
  rect(39,125,55,2,steel);rect(38,127,3,2,steel);rect(94,127,3,3,steel);
  rect(43,130,2,31,'#b7ba9b');rect(88,129,2,33,'#b7ba9b');
  rect(43,130,46,1,'#c6c5a2');
  rect(70,179,2,1,'#b8a174');rect(89,193,3,1,'#b8a174');
  rect(64,264,3,1,'#b8a174');rect(102,274,2,1,'#b8a174');
  // Only the edge of a distant pile enters the bottom-right corner.
  rect(127,262,3,7,'#9e9979');rect(125,267,5,4,'#aaa17e');
  rect(128,276,2,6,'#b5aa82');
}
