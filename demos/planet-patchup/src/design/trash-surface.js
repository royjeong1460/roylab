import {tones, palette} from './theme.js';

export const trashPreviewEnabled=(search=globalThis.location?.search||'')=>new URLSearchParams(search).get('design')==='backdrop';

// Paint once in original-cell space. Every fragment samples this same immutable art.
// These are display colors, separate from the material IDs used by the simulation.
export function createTrashSurface(width,cells,look='classic') {
  const pixels=new Uint32Array(cells.length),seen=new Uint8Array(cells.length);
  const earth=look==='earth',pastel=look==='pastel',park=look==='park';
  const styles=park?[
    [0xb59a67,0xd9ca92,0x766848], // stacked timber and cardboard
    [0x607f61,0x9aaf80,0x3a5746], // salvaged green metal
    [0x98745a,0xc4a475,0x63503e], // rust and folded scrap
    [0x96a39b,0xd0d3b6,0x586b64], // weathered sheet metal
  ]:pastel?[
    [0xf3cea0,0xffedc6,0xb39472], // butter cardboard
    [0xb8d8c4,0xe3f0d5,0x859d88], // mint folded metal
    [0xe8b3a6,0xffded0,0xb1847b], // peach compressed scrap
    [0xc6b9df,0xeae0f4,0x9685ad], // lavender packing
  ]:earth?[
    [0xc59a64,0xe5c796,0x92734f], // dusty cardboard
    [0x9c9780,0xc6bea2,0x747664], // weathered warm-grey metal
    [0xb37a50,0xd6aa79,0x895e43], // rust and compressed scrap
    [0xd5ad6e,0xf0d5a1,0xa78352], // sun-bleached packing
  ]:[
    [0xd9ad76,0xf1d19c,0xaa825c], // cardboard
    [0x80a6a0,0xb5c6ac,0x587b79], // folded metal
    [0xc88d73,0xe3b494,0x956f62], // compressed scrap
    [0xc4c7ac,0xe4dfbb,0x8a9e93], // small salvaged casing
  ];
  for(let start=0;start<cells.length;start++){
    if(!cells[start]||seen[start])continue;
    const material=cells[start],group=[start];seen[start]=1;
    let left=start%width,right=left,top=Math.floor(start/width),bottom=top;
    for(let n=0;n<group.length;n++){
      const id=group[n],x=id%width,y=Math.floor(id/width);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      for(const next of [x>0?id-1:-1,x<width-1?id+1:-1,id-width,id+width]){
        if(next<0||next>=cells.length||seen[next]||cells[next]!==material)continue;
        seen[next]=1;group.push(next);
      }
    }
    const narrow=right-left<10&&bottom-top>right-left;
    for(const id of group){
      const x=id%width-left,y=Math.floor(id/width)-top;
      if(narrow){
        // A stack of short metal/crushed-cardboard sections instead of a plain post.
        const band=Math.floor(y/9),v=y%9,p=styles[band%3===0?0:1];
        pixels[id]=x===0||x===right-left||v===8?p[2]:v===0?p[1]:p[0];
        if(v===4&&x>1&&x<right-left-1)pixels[id]=p[2];
        continue;
      }
      const row=Math.floor(y/10),offset=row%2*5,col=Math.floor((x+offset)/12),u=(x+offset)%12,v=y%10;
      const kind=(col+row*3+material)%4,p=styles[kind];let ink=p[0];
      if(u===0||v===9||x===right-left||y===bottom-top)ink=p[2];
      else if(v===0||u===1)ink=p[1];
      else if(park){
        const grain=(Math.imul(id+19,1103515245)>>>16)%19;
        if(kind===0){
          if(v===4||v===7)ink=p[2];
          else if((v===2&&u>4)||(v===6&&u<7))ink=p[1];
        }else if(kind===1){
          if(u===4||u===8)ink=p[2];
          else if(u===5||u===9)ink=p[1];
          if((u===2||u===10)&&(v===2||v===7))ink=0xd9ca92;
        }else if(kind===2){
          if((u+v)%7===0||(u-v+12)%9===0)ink=p[2];
          else if((u+v)%7===1)ink=p[1];
        }else{
          if(v===3&&u>3||v===6&&u<8)ink=p[2];
          else if(v===2&&u>3||v===5&&u<8)ink=p[1];
        }
        if(grain===0)ink=p[2];else if(grain===1)ink=p[1];
      }
      else if(earth||pastel){
        // A few bent strips per compressed bale; no intact appliance/window icons.
        if((u===4&&v>=3&&v<=6)||(v===6&&u>=4&&u<=8))ink=p[2];
        else if((v===3&&u>=6&&u<=9)||(u===9&&v===4))ink=p[1];
        else if(kind===0&&u===7)ink=pastel?p[1]:0xe5c796;
        else if(kind===2&&v===4&&u>=2&&u<=4)ink=pastel?p[1]:0xd6b58a;
      }
      else if(kind===0){
        if(u===6)ink=0xeed3a0; // broad tape, torn with the box itself
        else if(v===4&&u>2&&u<10)ink=p[2];
      }else if(kind===1){
        if((v===3||v===6)&&u>2&&u<10)ink=p[2];
      }else if(kind===2){
        if(u===4||u===9)ink=0xd5c6a1;
        else if(v===5&&u>1&&u<11)ink=p[2];
      }else{
        if(u>=4&&u<=8&&v>=3&&v<=6)ink=v===3?0x587b79:0x95b3aa;
      }
      if(pastel){
        if(u===0||v===9||x===right-left||y===bottom-top)ink=0x817768;
        // Pale corners and a short shine soften each compressed bale without changing its cells.
        else if((u===2&&v===1)||(u>=3&&u<=5&&v===1))ink=p[1];
      }
      pixels[id]=ink;
    }
  }
  const inks=Array.from(pixels,color=>color?'#'+color.toString(16).padStart(6,'0'):null);
  return {pixels,color:(id,material)=>pixels[id]||palette[material],css:(id,material)=>inks[id]||tones[material]};
}
