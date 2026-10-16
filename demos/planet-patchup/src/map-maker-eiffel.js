import {packMapCells,validateSite} from './map-maker-generator.js';

export const EIFFEL_ID='landmark-eiffel-day-v1';

// A hand-built daytime silhouette. Two-cell strokes keep curves readable and geometry bounded.
export function createEiffelSite(){
  const width=72,floor=90,cells=new Uint8Array(width*floor);
  function paint(predicate,color){
    for(let y=0;y<floor;y++)for(let x=0;x<width;x++)if(predicate(x+.5,y+.5))cells[y*width+x]=color;
  }
  const box=(x,y,w,h,c)=>paint((px,py)=>px>=x&&px<x+w&&py>=y&&py<y+h,c);
  function polygon(points,color){
    paint((x,y)=>{let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [ax,ay]=points[i],[bx,by]=points[j];
        if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
      }return inside;
    },color);
  }
  function stroke(ax,ay,bx,by,thickness,color){
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    paint((x,y)=>{const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length));return (x-ax-t*dx)**2+(y-ay-t*dy)**2<=(thickness/2)**2;},color);
  }
  const mirror=points=>points.map(([x,y])=>[width-x,y]);
  // Back feet, then the splayed front legs. All four remain real supports.
  const back=[[17,89],[22,70],[24,70],[19,89]];
  polygon(back,1);polygon(mirror(back),1);
  const leg=[[9,89],[18,70],[25,54],[28,54],[21,71],[12,89]];
  polygon(leg,3);polygon(mirror(leg),3);
  // Open arch and X-braces: empty cells are actual gaps, not painted-on windows.
  paint((x,y)=>{const u=(x-36)/19,v=(y-89)/18;return y>=71&&y<89&&u*u+v*v<=1.08&&u*u+v*v>=.92;},1);
  stroke(26,56,48,69,2,1);stroke(46,56,24,69,2,1);
  const upper=[[33,17],[39,17],[40,31],[43,44],[48,54],[24,54],[29,44],[32,31]];
  polygon(upper,3);
  for(const [y,halfW,halfH] of [[25,1.5,3],[34,2.5,4],[43,4,4],[50,5,3]])polygon([[36,y-halfH],[36+halfW,y],[36,y+halfH],[36-halfW,y]],0);
  // Broad observation decks contrast with the tapered lattice and thin antenna.
  box(24,52,24,4,1);box(24,52,24,2,3);
  box(15,69,42,4,1);box(15,69,42,2,3);
  box(32,14,8,4,1);polygon([[32,14],[36,10],[40,14]],3);box(35,5,2,6,1);
  for(const [x,w] of [[6,8],[16,6],[50,6],[58,8]])box(x,88,w,2,1);
  const shapes=packMapCells(cells,width,floor).map(shape=>({...shape,rect:shape.rect.map(n=>n*2)}));
  return validateSite({
    id:EIFFEL_ID,name:'에펠탑 · 낮의 철골',description:'직접 만든 에펠탑 픽셀 예시. 넓은 전망대와 다리 네 개, 비어 있는 아치가 실제 파괴 구조예요.',
    hint:'한쪽의 앞·뒤 다리를 끊어 기울여 보세요. 전망대는 면, 아치와 교차 철골은 선으로 연결돼요.',
    preview:[{x:24,y:171},{x:38,y:171},{x:106,y:171},{x:119,y:171}],
    // Existing highrise classification keeps the same portable map format; this is a preset, not a seed recipe.
    generator:{version:1,seed:'eiffel-day-v1',family:'highrise',size:'medium',index:0},
    data:{width:144,height:192,floorY:180,shapes},
  });
}
