// Runtime colour/atmosphere layer. The approved base texture is never mutated.
const Pollution=(()=>{
const mix=(a,b,t)=>a+(b-a)*t,fade=t=>t*t*(3-2*t),fract=n=>n-Math.floor(n);
const hash=(x,y,z)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x,y,z){const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),u=fade(x-X),v=fade(y-Y),w=fade(z-Z);return mix(mix(mix(hash(X,Y,Z),hash(X+1,Y,Z),u),mix(hash(X,Y+1,Z),hash(X+1,Y+1,Z),u),v),mix(mix(hash(X,Y,Z+1),hash(X+1,Y,Z+1),u),mix(hash(X,Y+1,Z+1),hash(X+1,Y+1,Z+1),u),v),w)}
function haze(u,v){const a=(u-.5)*Math.PI*2,b=(.5-v)*Math.PI,x=Math.sin(a)*Math.cos(b),y=Math.sin(b),z=Math.cos(a)*Math.cos(b);const n=noise(x*3+4,y*4+7,z*3+2)*.8+noise(x*7+8,y*8,z*7)*.2;return Math.max(0,Math.min(1,(n-.44)*3.4))}
function vector([u,v]){const a=(u-.5)*Math.PI*2,b=(.5-v)*Math.PI;return [Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)]}
// Keep readable pockets at hubs; obscure the intervening terrain with broad cloud masses.
function outerCloud(u,v,seeds){if(!seeds.length)return {opacity:0,tone:0};const [x,y,z]=vector([u,v]);let nearest=-1;for(const seed of seeds)nearest=Math.max(nearest,x*seed[0]+y*seed[1]+z*seed[2]);const outside=fade(Math.max(0,Math.min(1,(.985-nearest)/.12))),n=noise(x*3.1+11,y*4.2+2,z*3.1-3)*.78+noise(x*8+3,y*7,z*8+1)*.22,tone=Math.round(n*6)/6;return {opacity:outside*(.56+tone*.28),tone}}
function build(source,width,height,sites=[],includeIndustry=true){const result=new Uint8ClampedArray(source.length),seeds=sites.map(vector);for(let y=0;y<height;y++)for(let x=0;x<width;x++){
const i=(y*width+x)*4,r=source[i],g=source[i+1],b=source[i+2],water=b>r*1.22&&g>r*1.12,green=g>r*1.04&&g>b*1.12,ice=r>155&&g>180&&b>175;
const stain=water?[119,103,82]:green?[144,123,86]:ice?[160,162,132]:[140,119,83];
const amount=water?.9:green?.82:ice?.32:.29,smog=haze(x/width,y/(height-1))*.43;
const cloud=outerCloud(x/width,y/(height-1),seeds);for(let c=0;c<3;c++){let value=mix(source[i+c],stain[c],amount);value=mix(value,[133,120,91][c],smog)*.94;const soot=[41,47,43][c]+cloud.tone*[45,39,28][c];result[i+c]=mix(value,soot,cloud.opacity)}result[i+3]=source[i+3]}
// All industrial marks live in UV coordinates, so they stay attached during rotation.
if(includeIndustry)for(const [index,site]of sites.entries())industry(result,width,height,site,index);
return result}
function industry(data,width,height,[u,v],index){const cx=Math.round(u*width),cy=Math.round(v*(height-1)),scale=width/512;
const color={soil:[86,73,50],rim:[129,103,62],roof:[55,65,60],wall:[91,93,75],edge:[143,137,104],rust:[143,97,57],metal:[105,116,104],dark:[42,51,47],light:[191,151,80]};
function rect(x,y,w,h,c,alpha=1){const left=Math.round(cx+x*scale),top=Math.round(cy+y*scale),right=Math.round(cx+(x+w)*scale),bottom=Math.round(cy+(y+h)*scale);for(let py=Math.max(0,top);py<Math.min(height,bottom);py++)for(let px=left;px<right;px++){const i=(py*width+(px%width+width)%width)*4;for(let k=0;k<3;k++)data[i+k]=mix(data[i+k],c[k],alpha)}}
// A single concentrated waste yard, not scattered noise over the planet.
rect(-20,-3,41,15,color.soil,.65);rect(-17,-6,34,19,color.rim,.25);
// Layered compressed-trash buildings, with a different silhouette at each group of hubs.
const towerX=index%3===1?-18:-17,towerH=index%3===0?15:index%3===1?10:12;
rect(towerX,2-towerH,8,towerH+4,color.dark);
for(let row=0;row<towerH;row+=3){const offset=(row/3)%2;rect(towerX+offset,2-towerH+row,8-offset,2,row%2?color.metal:color.rust);rect(towerX+2+offset,2-towerH+row,2,1,color.edge,.65)}
rect(towerX+2,-towerH,4,2,color.metal);
// Low corrugated scrap warehouse behind the main factory.
rect(8,3,13,7,color.dark);rect(9,4,11,5,color.wall);rect(7,1,15,3,color.roof);rect(9,0,11,1,color.metal);rect(13,5,4,5,color.dark);for(let k=0;k<4;k++)rect(9+k*3,2,1,1,color.edge,.45);
// Stepped cylindrical waste tanks, readable as a different silhouette.
for(let k=0;k<2;k++){const tx=11+k*5;rect(tx,-8,4,8,color.dark);rect(tx+1,-9,2,1,color.edge);rect(tx,-7,3,6,k?color.rust:color.metal);rect(tx,-4,4,1,color.roof);rect(tx+1,-7,1,5,color.edge,.4)}

rect(-7,-6,15,9,color.dark);rect(-6,-5,13,7,color.wall);rect(-8,-7,6,2,color.roof);rect(-2,-9,6,2,color.roof);rect(4,-7,5,2,color.roof);rect(-7,-6,15,1,color.edge,.65);
rect(-5,-16,3,10,color.wall);rect(-6,-17,5,2,color.dark);rect(3,-13,3,7,color.wall);rect(2,-14,5,2,color.dark);rect(-5,-13,3,1,color.rust);rect(3,-10,3,1,color.rust);
for(let k=0;k<3;k++)rect(-4+k*4,-3,2,2,color.light,.7);rect(-1,0,3,3,color.dark);
// Scrap blocks, crushed metal and rusted drums clustered beside the factory.
rect(-15,0,7,3,color.dark);rect(-14,-3,4,3,color.rust);rect(-12,-5,3,3,color.metal);rect(-10,-1,3,2,color.edge);
rect(9,1,8,3,color.dark);rect(10,-2,4,3,color.metal);rect(13,-4,3,5,color.rust);rect(8,-4,4,2,color.edge);rect(10,-5,3,1,color.dark);
if(index%2===0){rect(16,0,2,3,color.wall);rect(-17,2,3,1,color.metal)}
// Broken pixel clouds: opaque at the chimney, diffuse away from the yard.
const soot=[75,75,65],dust=[132,124,96];rect(-6,-20,5,4,soot,.8);rect(-9,-23,8,5,soot,.65);rect(-13,-26,10,5,dust,.52);rect(-15,-28,8,4,dust,.33);rect(-17,-29,6,3,dust,.15);
rect(2,-17,5,4,soot,.66);rect(4,-20,6,4,dust,.42);rect(6,-22,6,3,dust,.22)
}
// Apply fog after all buildings; access and cleanup remain separate states.
function conceal(source,width,height,masks,available){const out=new Uint8ClampedArray(source);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,w=masks.weight[i],visible=(available.has(masks.first[i])?w:0)+(available.has(masks.second[i])?1-w:0);if(visible===1)continue;const cloud=Math.round(haze(x/width,y/(height-1))*5)/5,amount=(1-visible)*.96;for(let c=0;c<3;c++)out[i*4+c]=mix(source[i*4+c],[27,34,37][c]+cloud*[25,26,23][c],amount)}return out}
return {build,haze,industry,outerCloud,vector,conceal};})();

export default Pollution;
