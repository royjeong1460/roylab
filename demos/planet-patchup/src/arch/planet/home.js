import Globe from './globe-math.js';
import Terrain from './terrain.js';
// Source: 픽셀디자인 / planet-home-v3-2026-10-26. Visuals only; campaign owns entry and saves.
export function mountPlanetHome(doc){
 const base=doc.getElementById('base');base.classList.add('planet-home');
 const keep=id=>doc.getElementById(id);
 const options=keep('home-options'),enter=keep('dispatch'),upgrade=keep('workshop-open'),maps=keep('home-zones'),editor=keep('home-map-maker'),zoneLink=keep('home-zone-link'),caption=keep('start-caption');
 base.replaceChildren();
 base.innerHTML='<header class="planet-heading"><div class="planet-brand">PLANET<br><span>PATCHUP</span></div></header><section class="planet-stage"><div class="planet-bubble"><small id="zone-number"></small><span id="zone-name"></span><i></i></div><canvas id="planet" width="130" height="140" tabindex="0" aria-label="Rotate planet with drag or arrow keys"></canvas><div class="orbit-nav"><button id="prev" aria-label="Previous region">‹</button><div id="dots"></div><button id="next" aria-label="Next region">›</button></div></section><section class="planet-action"></section><footer class="planet-footer"></footer><div class="home-current-zone" hidden><span></span></div>';
 options.textContent='⚙';options.setAttribute('aria-label','Options');base.querySelector('header').append(options);
 base.querySelector('.planet-action').append(enter,caption);upgrade.textContent='↑ Upgrades';maps.textContent='Maps';editor.textContent='Map Maker ↗';base.querySelector('footer').append(upgrade,maps,editor);base.querySelector('.home-current-zone').append(zoneLink);
 const q=s=>base.querySelector(s),cv=q('#planet'),ctx=cv.getContext('2d'),zones=['Arch Quarter','Eave Alley','Amber Bazaar','Canal Works','Terrace Heights','Mosaic Basin'];
 let selected=0,angle=0,pitch=0,cleared=false,drag=null,raf=0;
 const levels={mid:{mix:.43,shade:.92,veil:.055,rim:.40,count:5}},pollution='mid';
const TAU=Math.PI*2,step=TAU/6,mod=(v,n)=>(v%n+n)%n;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function px(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function landmark(id,x,y,clean,scale=1){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);const roof=clean?'#517a7d':'#777d68',light=clean?'#f1d3a2':'#c5b68c',wall=clean?'#c9ab77':'#a89b77',shade='#73745d';const R=(x,y,w,h,c)=>px(x,y,w,h,c);
R(-12,0,25,3,shade);R(-10,-2,21,3,clean?'#95aa6b':'#a79b70');
if(id===0){R(-10,-11,20,10,wall);R(-9,-10,18,2,light);for(let x=-8;x<10;x+=7)R(x,-8,2,7,shade);R(-12,-13,24,2,roof);R(-9,-15,18,2,roof);R(-6,-17,12,2,roof);R(-2,-19,4,2,roof);R(-5,-4,4,4,shade);R(5,-24,8,11,wall);R(3,-25,12,2,roof);R(5,-27,8,2,roof);R(8,-30,2,3,roof)}
if(id===1){R(-11,-15,22,14,wall);R(-12,-17,24,3,light);for(let x=-8;x<10;x+=8){R(x,-10,5,9,shade);R(x+1,-12,3,3,shade)}R(4,-25,6,10,wall);R(3,-27,8,2,roof);R(6,-23,2,4,shade)}
if(id===2){R(-10,-12,21,11,wall);R(-12,-14,25,3,roof);R(-9,-17,19,3,roof);R(-6,-20,13,3,roof);R(-2,-22,5,2,roof);R(-2,-9,5,8,shade);R(11,-19,3,18,light);R(10,-21,5,2,roof)}
if(id===3){R(-15,-2,30,5,clean?'#68a6a2':'#8b9c8e');R(-13,-12,9,10,wall);R(6,-14,9,12,wall);R(-14,-14,11,2,roof);R(-12,-16,7,2,roof);R(5,-16,11,2,roof);R(8,-19,5,3,roof);R(-5,-6,12,3,light);R(-4,-3,2,4,shade);R(3,-3,2,4,shade)}
if(id===4){for(let k=0;k<3;k++){R(-12+k*7,-8-k*6,10,9+k*6,wall);R(-13+k*7,-10-k*6,12,2,roof);R(-9+k*7,-6-k*6,3,3,shade)}R(-14,0,28,2,light)}
if(id===5){R(-11,-9,22,8,wall);R(-8,-15,16,6,light);R(-4,-22,9,7,wall);R(-5,-24,11,2,roof);R(-2,-27,5,3,roof);R(0,-31,1,4,roof);R(-2,-12,4,11,shade);R(-13,-11,8,2,roof)}
if(clean){R(-15,-1,3,2,'#6d9258');R(14,-3,2,4,'#638a50');R(13,-6,4,4,'#8cb563');R(-8,-1,1,1,'#edcf75')}
ctx.restore()}
function draw(){ctx.clearRect(0,0,130,140);ctx.imageSmoothingEnabled=false;const cx=65,cy=76,R=51,preset=levels[pollution],regions=new Int8Array(130*140).fill(-1);
for(const [x,y]of[[13,24],[112,29],[9,86],[119,95],[28,118]]){px(x,y,1,3,'#c7c6a6');px(x-1,y+1,3,1,'#c7c6a6')}
ctx.fillStyle='#777a69';ctx.beginPath();ctx.ellipse(65,131,34,3,0,0,TAU);ctx.fill();
// Pixelated, uneven atmospheric rim, behind the surface and its silhouettes.
for(let y=-59;y<=59;y++)for(let x=-59;x<=59;x++){
const d=Math.hypot(x,y);if(d<49||d>59)continue;
const v=Globe.world([x/d,-y/d,0],angle,pitch);if(cleared&&Globe.region(v).index===0)continue;
const cloud=Terrain.smog(v),edge=55+cloud*5;if(d>edge)continue;
const alpha=Math.max(0,(edge-d)/(edge-48))*preset.rim;
ctx.fillStyle=`rgba(49,48,43,${alpha})`;ctx.fillRect(cx+x,cy+y,1,1)}
for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){
const rr=(x*x+y*y)/(R*R);if(rr>1)continue;const z=Math.sqrt(1-rr),v=Globe.world([x/R,-y/R,z],angle,pitch),land=Terrain.sample(v),idx=Globe.region(v).index,clean=cleared&&idx===0;
regions[(cy+y)*130+cx+x]=idx;const e=land.e;let base;
if(e<-.13)base=rgb('#548f9e');else if(e<-.035)base=rgb('#68a8b1');else if(e<0)base=rgb('#9bc9bc');else if(e<.035)base=rgb('#d9c99c');else if(e>.39)base=rgb('#cbd0ba');else if(e>.28)base=rgb('#9e9a7c');else if(e>.19)base=rgb('#84916a');else if(land.dry>.44)base=rgb('#c4af79');else if(land.forest>.2)base=rgb('#64876c');else base=rgb('#97ad79');
// Surface elevation supplies local slopes; colours no longer depend on zone polygons.
let relief=0;if(e>0){const nearby=Terrain.sample([v[0]-.018,v[1]+.024,v[2]+.008]).e;relief=Math.max(-.17,Math.min(.15,(nearby-e)*3.8));}
let light=.83+.20*z-.10*x/R-.10*y/R+relief;light=Math.round(light*16)/16;
// The approved terrain is the clean base. Pollution is a removable, world-fixed layer.
base=base.map((n,i)=>n*.88+[192,177,139][i]*.12);
if(!clean){const stain=Math.max(0,Math.min(1,(land.dirt+.3)*1.6));const grime=e<0?[49,57,51]:[80,68,51];const opacity=preset.mix+stain*.12;base=base.map((n,i)=>n*(1-opacity)+grime[i]*opacity);light*=preset.shade;if(land.dirt>.22)base=base.map((n,i)=>n*.9+[65,58,42][i]*.1)}
ctx.fillStyle='rgb('+base.map(n=>Math.max(0,Math.min(255,Math.round(n*light)))).join(',')+')';ctx.fillRect(cx+x,cy+y,1,1)}
// Low-poly mountain silhouettes are code-native pixel art, attached to world positions.
const objects=[];
for(const [i,site] of Terrain.debris.entries()){if(i%7>=preset.count)continue;const v=Globe.view(site,angle,pitch);if(v[2]>.25&&!(cleared&&Globe.region(site).index===0))objects.push({type:'debris',v})}
for(const site of Terrain.ridges){const v=Globe.view(site.v,angle,pitch);if(v[2]>.08)objects.push({type:'ridge',v,site})}
for(let i=0;i<6;i++){const v=Globe.view(Globe.seeds[i],angle,pitch);if(v[2]>.12)objects.push({type:'landmark',i,v})}
objects.sort((a,b)=>a.v[2]-b.v[2]);
for(const o of objects){const x=65+o.v[0]*49,y=78-o.v[1]*48;
if(o.type==='debris'){const h=3+Math.round(Math.abs(o.v[1])*4);px(x-3,y,7,2,'#282b29');px(x-3,y-h,4,h,'#776448');px(x+1,y-h-2,3,h+2,'#505852');px(x-3,y-h,4,1,'#a08458');px(x+1,y-h-2,3,1,'#798078');px(x-2,y-2,2,1,'#33372f');px(x,y-3,2,1,'#a47548')}
else if(o.type==='ridge'){const clean=cleared&&Globe.region(o.site.v).index===0;mountains(x,y,o.site.size,clean,o.v[2]);}
else{landmark(o.i===0?1:o.i===1?0:o.i,x,y+5,cleared&&o.i===0,o.v[2]>.65?.85:.55);if(o.i===selected){px(x-2,y+9,5,1,'#f5dc9b');px(x-1,y+10,3,1,'#f5dc9b')}}}
// A veil over the scene hides the terrain under smog; a cleared region opens a window.
for(let y=-R;y<=R;y++)for(let x=-R;x<=R;x++){
const rr=(x*x+y*y)/(R*R);if(rr>1)continue;
const v=Globe.world([x/R,-y/R,Math.sqrt(1-rr)],angle,pitch);if(cleared&&Globe.region(v).index===0)continue;
const density=Math.max(0,Math.min(1,(Terrain.smog(v)+.45)*1.2));
const alpha=preset.veil+density*.045+Math.max(0,rr-.45)*preset.rim;
ctx.fillStyle=`rgba(28,29,27,${alpha})`;ctx.fillRect(cx+x,cy+y,1,1);
if(density>.64){ctx.fillStyle='rgba(106,96,70,.12)';ctx.fillRect(cx+x,cy+y,1,1)}}
// Outline only the selected region, using the same ownership map as picking and cleanup.
const edge=[];
for(let y=1;y<139;y++)for(let x=1;x<129;x++){const i=y*130+x;if(regions[i]!==selected)continue;if([-1,1,-130,130].some(d=>regions[i+d]>=0&&regions[i+d]!==selected))edge.push([x,y])}
for(const [x,y]of edge)px(x-1,y-1,3,3,'#4c503d');
for(const [x,y]of edge)px(x,y,1,1,'#f1d98f');
}
function mountains(x,y,size,clean,depth){ctx.save();ctx.translate(Math.round(x),Math.round(y));const h=Math.round(size*(.6+.4*depth));
for(let row=0;row<h;row++){const w=Math.max(1,Math.floor(row*.72));px(-w,row-h,w+1,1,clean?'#b9ba99':'#a69b79');px(1,row-h,w,1,clean?'#7b8770':'#79735c');if(row<3)px(-w,row-h,w+1,1,clean?'#e0dec4':'#c2b38e')}
px(-Math.floor(h*.7),0,Math.floor(h*1.4)+1,2,clean?'#749462':'#7f936e');ctx.restore()}
function snap(index){cancelAnimationFrame(raf);selected=mod(index,6);const target=Globe.target(selected,angle),from=angle,fromPitch=pitch,start=performance.now(),dur=matchMedia('(prefers-reduced-motion: reduce)').matches?0:220;
sync();function tick(now){const t=dur?Math.min(1,(now-start)/dur):1,e=1-Math.pow(1-t,3);angle=from+(target.yaw-from)*e;pitch=fromPitch+(target.pitch-fromPitch)*e;draw();if(t<1)raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick)}
for(let i=0;i<6;i++){let b=document.createElement('button');b.setAttribute('aria-label',`${i+1}. ${zones[i]}${i?' · Locked preview':''}`);b.dataset.locked=String(i>0);b.onclick=()=>snap(i);q('#dots').append(b)}
q('#prev').onclick=()=>snap(selected-1);q('#next').onclick=()=>snap(selected+1);
cv.addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];if(!keys.includes(e.key))return;e.preventDefault();cancelAnimationFrame(raf);if(e.key==='ArrowUp')pitch=Math.min(Math.PI/2,pitch+Math.PI/3);if(e.key==='ArrowDown')pitch=Math.max(-Math.PI/2,pitch-Math.PI/3);if(e.key==='ArrowLeft')angle-=Math.PI/2;if(e.key==='ArrowRight')angle+=Math.PI/2;snap(Globe.region(Globe.world([0,0,1],angle,pitch)).index)});
cv.addEventListener('pointerdown',e=>{if(e.button!==0||drag)return;cancelAnimationFrame(raf);drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle,pitch};cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const sensitivity=cv.getBoundingClientRect().width*.43;angle=drag.angle-(e.clientX-drag.x)/sensitivity;pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,drag.pitch+(e.clientY-drag.y)/sensitivity));draw()});
cv.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);let region=Globe.region(Globe.world([0,0,1],angle,pitch)).index;
if(moved<8){const rect=cv.getBoundingClientRect(),x=((e.clientX-rect.left)/rect.width*130-65)/51,y=-((e.clientY-rect.top)/rect.height*140-76)/51,rr=x*x+y*y;if(rr<=1)region=Globe.region(Globe.world([x,y,Math.sqrt(1-rr)],angle,pitch)).index}
drag=null;snap(region)});
cv.addEventListener('pointercancel',()=>{drag=null;snap(Globe.region(Globe.world([0,0,1],angle,pitch)).index)});

 function sync(){q('#zone-number').textContent=String(selected+1).padStart(2,'0')+' / 06';q('#zone-name').textContent=zones[selected]+(selected?' · Locked':cleared?' ✓':'');enter.disabled=selected!==0;enter.textContent=selected?'Full game · Locked':'Enter →';maps.hidden=selected!==0;doc.getElementById('home-zone-link').disabled=selected!==0;for(const [i,b]of [...q('#dots').children].entries())b.setAttribute('aria-current',String(i===selected));}
 options.onclick=()=>doc.getElementById('home-options-dialog').showModal();
 for(const id of ['home-options-dialog','home-zones-dialog'])doc.getElementById(id).querySelector('[data-home-close]').onclick=()=>doc.getElementById(id).close();
 sync();draw();
 return {update(profile){const next=!!profile.bossCleared;if(next!==cleared){cleared=next;draw();}sync();}};
}
