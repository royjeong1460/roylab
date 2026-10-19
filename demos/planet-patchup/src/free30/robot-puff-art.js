// A soft box silhouette at mobile size; keep the face larger than the machinery.
let sprite;
export function drawPuffRobot(c){
  if(!sprite){
    sprite=document.createElement('canvas');sprite.width=32;sprite.height=40;
    const p=sprite.getContext('2d'),mask=new Uint8Array(32*32);
    // Extra headroom keeps the body and mobile pixel scale unchanged.
    p.translate(0,8);
    const widths=[18,22,24,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,26,24,22,18];
    const rect=(x,y,w,h,color)=>{p.fillStyle=color;p.fillRect(x,y,w,h);};
    const pair=(x,y,w,h,color)=>{rect(x,y,w,h,color);rect(32-x-w,y,w,h,color);};
    pair(8,26,6,3,'#746e58');pair(9,26,4,2,'#879b7a');
    widths.forEach((w,i)=>mask.fill(1,(i+4)*32+16-w/2,(i+4)*32+16+w/2));
    for(let y=4;y<27;y++)for(let x=3;x<29;x++)if(mask[y*32+x]){
      const inner=mask[y*32+x-1]&&mask[y*32+x+1]&&mask[(y-1)*32+x]&&mask[(y+1)*32+x];
      rect(x,y,1,1,inner?(y>23?'#e3c99e':'#f5e6bd'):'#746e58');
    }
    pair(1,18,4,5,'#746e58');pair(2,19,2,3,'#c7d0a7');
    pair(1,20,2,1,'#c7d0a7');
    rect(9,-1,14,1,'#5e7058');rect(7,0,18,1,'#5e7058');
    rect(6,1,20,4,'#5e7058');
    rect(9,0,14,1,'#b5c49a');rect(7,1,18,3,'#9caf86');
    pair(9,0,1,4,'#7f956f');pair(13,0,1,4,'#7f956f');
    rect(12,6,8,1,'#fff2d2');rect(14,8,4,1,'#c3cb9f');
    pair(6,8,1,1,'#c3cb9f');
    pair(8,11,1,1,'#879b7a');pair(9,10,1,1,'#879b7a');
    pair(10,13,3,5,'#3e5348');pair(10,13,3,1,'#879b8a');
    for(const x of [12,21])rect(x,14,1,1,'#fff9e9');
    pair(6,19,3,1,'#dca78d');
    rect(14,21,4,1,'#746e58');
    rect(14,24,4,1,'#b9c39b');
  }
  c.save();c.imageSmoothingEnabled=false;c.drawImage(sprite,-32,-78,64,80);c.restore();
}
