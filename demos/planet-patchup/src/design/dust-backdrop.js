// Low-contrast scenery only. The foreground world's occupied cells are the building.
export function createDustBackdrop(scene,world,layer,look='earth'){
  const g=scene.add.graphics();layer.addAt(g,1);
  function setMode(mode){
    const sunny=mode==='sunny',w=world.width,f=world.floorY;g.clear();
    if(look==='pastel'){
      g.fillStyle(sunny?0xd5ece8:0xc5dce7);g.fillRect(-w,-world.height,w*3,world.height*3);
      g.fillStyle(sunny?0xffedbe:0xf5eccd);g.fillCircle(w*.8,f*.15,10);
      // Soft distant shapes stay quieter than the outlined, destructible foreground.
      for(const [x,y,s] of [[14,25,1],[89,41,.65],[4,61,.6]]){
        g.fillStyle(0xf9fbef,.84);g.fillRoundedRect(x,y,26*s,5*s,2*s);
        g.fillCircle(x+8*s,y,5*s);g.fillCircle(x+16*s,y-2*s,6*s);
      }
      for(let plane=0;plane<2;plane++){
        const ground=f*(.68+plane*.15);g.fillStyle(plane?0xa7c5c2:0xb1c8d4,plane?.6:.65);
        for(let n=-12;n<24;n++){
          const x=n*13-6,height=10+((n*17+plane*13)%25+25)%25;
          g.fillRoundedRect(x,ground-height,11,height+5,2);
          g.fillRoundedRect(x+3,ground-height-4,5,6,1.5);
        }
        g.fillRect(-w,ground,w*3,f-ground);
      }
      g.fillStyle(sunny?0xd8e9c8:0xc0dcce,.85);g.fillRect(-w,f*.85,w*3,f*.15);
      g.fillStyle(0x879a81);g.fillRect(-w,f,w*3,world.height);
      g.fillStyle(sunny?0xcce3b4:0xbbd9bd);g.fillRect(-w,f+1,w*3,world.height);
      g.fillStyle(0xecf3d7);g.fillRect(-w,f+1,w*3,1);
      for(let n=-8;n<17;n++){
        g.fillStyle(0x94b79a,.7);g.fillRoundedRect(n*17+4,f+4+n%3,2.5,1,0.5);
      }
      return;
    }
    const sky=sunny?[0xf1d8a8,0xf3ddb5,0xecd0a0,0xe2c397]:[0xd8c6a6,0xdfc9a5,0xe3c69d,0xd6b88e];
    for(let n=0;n<4;n++){g.fillStyle(sky[n]);g.fillRect(0,n*f/4,w,f/4+1);}
    for(let radius=20;radius>6;radius-=4){g.fillStyle(0xffe9bb,.06);g.fillCircle(w*.8,f*.18,radius);}
    g.fillStyle(0xffecc8,sunny?.7:.3);g.fillRect(w*.13,f*.2,24,2);g.fillRect(w*.2,f*.2-1,11,1);
    // Two quiet silhouettes of distant trash blocks, fading into the dust.
    for(let plane=0;plane<2;plane++){
      const ground=f*(.63+plane*.16);g.fillStyle(plane?0xbba482:0xcaba9d,plane?.38:.55);
      for(let n=0;n<14;n++){
        const x=n*11-5,height=10+(n*17+plane*13)%29;
        g.fillRect(x,ground-height,9,height);g.fillRect(x+2,ground-height-3,5,3);
      }
      g.fillRect(0,ground,w,f-ground);
    }
    g.fillStyle(0xe7c99b,.65);g.fillRect(0,f*.76,w,f*.24);
    g.fillStyle(sunny?0xd4b17c:0xc7a879);g.fillRect(0,f,w,world.height-f);
    g.fillStyle(0x98744f);g.fillRect(0,f,w,1);
    g.fillStyle(0xf0d4a2,.5);g.fillRect(0,f+1,w,1);
  }
  setMode('dust');
  return {setMode,destroy:()=>g.destroy()};
}
