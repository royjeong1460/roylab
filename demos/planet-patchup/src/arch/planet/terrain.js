// Continuous world-space terrain: district selection is independent of coastlines.
const Terrain=(()=>{
const mix=(a,b,t)=>a+(b-a)*t,smooth=t=>t*t*(3-2*t),fract=n=>n-Math.floor(n),hash=(x,y,z)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x,y,z){const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),u=smooth(x-X),v=smooth(y-Y),w=smooth(z-Z);return mix(mix(mix(hash(X,Y,Z),hash(X+1,Y,Z),u),mix(hash(X,Y+1,Z),hash(X+1,Y+1,Z),u),v),mix(mix(hash(X,Y,Z+1),hash(X+1,Y,Z+1),u),mix(hash(X,Y+1,Z+1),hash(X+1,Y+1,Z+1),u),v),w)*2-1}
const unit=v=>{const l=Math.hypot(...v);return v.map(n=>n/l)};
const ridges=[{v:unit([-.48,.38,1]),size:10},{v:unit([-.35,.53,1]),size:14},{v:unit([-.2,.63,1]),size:11},{v:unit([.55,-.35,1]),size:9},{v:unit([1,.5,.2]),size:12},{v:unit([1,.38,-.05]),size:9},{v:unit([-.4,.2,-1]),size:11},{v:unit([-.25,.4,-1]),size:14},{v:unit([-.6,-1,-.3]),size:11},{v:unit([-.45,-1,-.15]),size:9},{v:unit([-1,-.2,.4]),size:10}];
function sample(v){const [x,y,z]=v;let e=noise(x*2.4+4.2,y*2.4+6.1,z*2.4+2.3)*.42+noise(x*5.8+3,y*5.8+1,z*5.8+5)*.15+noise(x*13,y*13,z*13)*.045-.055;
// Keep the six city anchors on small coastal plains, not floating in water.
const closeness=Math.max(Math.abs(x),Math.abs(y),Math.abs(z));const anchor=Math.max(0,(closeness-.965)/.035);e=Math.max(e,anchor*.16-.045);
for(const ridge of ridges){const dot=x*ridge.v[0]+y*ridge.v[1]+z*ridge.v[2];if(dot>.91){const slope=smooth(Math.min(1,(dot-.91)/.09));e=Math.max(e,-.13+slope*.52+noise(x*11+2,y*11,z*11+5)*.09)}}
return {e,dirt:noise(x*8+12,y*8-4,z*8+6),forest:noise(x*7+9,y*7,z*7+6),dry:noise(x*2-4,y*2+8,z*2-2)} }
// A few concentrated scrap yards leave coastlines and landmarks readable.
const debris=[];
for(const center of [[-.52,-.28,1],[.58,.15,1],[1,-.4,-.3],[-.4,.3,-1],[-1,-.3,.4],[.3,1,-.45],[.2,-1,.4]]){
for(let i=0;i<7;i++){const a=i*2.39996,r=i? .045*Math.sqrt(i):0;debris.push(unit([center[0]+Math.cos(a)*r,center[1]+Math.sin(a)*r,center[2]]))}}
function smog(v){return noise(v[0]*3+18,v[1]*7+3,v[2]*3-5)*.7+noise(v[0]*9,v[1]*12,v[2]*9)*.3}
return {sample,ridges,debris,smog};})();


export default Terrain;
