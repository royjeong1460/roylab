import Projection from './projection.js';
// Design territories: spherical proximity, gently warped in world coordinates.
// All six regions cover the world; no camera-space circles or geometry changes.
const Territories=(()=>{
const smooth=t=>t*t*(3-2*t);
function weights(u,v,seeds){const a=(u-.5)*Math.PI*2,b=(.5-v)*Math.PI,x=Math.sin(a)*Math.cos(b),y=Math.sin(b),z=Math.cos(a)*Math.cos(b),w=[x+.04*Math.sin(y*5+z*3),y+.04*Math.sin(z*4+x*2),z+.04*Math.sin(x*5+y*4)];
const scores=seeds.map((s,i)=>({i,d:w[0]*s[0]+w[1]*s[1]+w[2]*s[2]})).sort((a,b)=>b.d-a.d);return {first:scores[0].i,second:scores[1].i,weight:.5+.5*smooth(Math.min(1,(scores[0].d-scores[1].d)/.045))}}
function build(width,height,sites){const seeds=sites.map(Projection.vector),first=new Uint8Array(width*height),second=new Uint8Array(width*height),weight=new Float32Array(width*height);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,m=weights(x/width,y/(height-1),seeds);first[i]=m.first;second[i]=m.second;weight[i]=m.weight}return {first,second,weight}}
function compose(clean,dirty,masks,cleared,highlight=-1){const out=new Uint8ClampedArray(clean.length);for(let i=0;i<masks.first.length;i++){const a=masks.first[i],b=masks.second[i],w=masks.weight[i],t=(cleared.has(a)?w:0)+(cleared.has(b)?1-w:0),h=highlight<0?0:((highlight===a?w:0)+(highlight===b?1-w:0))*.24;for(let c=0;c<3;c++){const color=dirty[i*4+c]*(1-t)+clean[i*4+c]*t;out[i*4+c]=color*(1-h)+[235,208,116][c]*h}out[i*4+3]=clean[i*4+3]}return out}
return {weights,build,compose};})();

export default Territories;
