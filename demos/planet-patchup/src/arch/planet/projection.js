// Approved desert V2 anchors, indexed by the campaign cultural art IDs.
const Projection=(()=>{
const locations=[[-38,155],[18,125],[8,-100],[32,-25],[-25,30],[46,55]];
const anchors=locations.map(([lat,lon])=>[.5+lon/360,.5-lat/180]),tau=Math.PI*2;
function world([x,y,z],yaw,pitch){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),yy=y*cp+z*sp,zz=-y*sp+z*cp;return [x*cy+zz*sy,yy,-x*sy+zz*cy]}
function view([x,y,z],yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),xx=x*cy-z*sy,zz=x*sy+z*cy;return [xx,y*cp-zz*sp,y*sp+zz*cp]}
function vector([u,v]){const lon=(u-.5)*tau,lat=(.5-v)*Math.PI;return [Math.sin(lon)*Math.cos(lat),Math.sin(lat),Math.cos(lon)*Math.cos(lat)]}
function uv([x,y,z]){return [((Math.atan2(x,z)/tau+.5)%1+1)%1,.5-Math.asin(Math.max(-1,Math.min(1,y)))/Math.PI]}
function target(i,currentYaw){let yaw=(anchors[i][0]-.5)*tau;while(yaw-currentYaw>Math.PI)yaw-=tau;while(yaw-currentYaw< -Math.PI)yaw+=tau;return {yaw,pitch:(.5-anchors[i][1])*Math.PI}}
// Center the real anchor. Limit vertical speed separately to soften long north/south turns.
function duration(from,to,fromPitch=0,toPitch=0){return Math.max(500,Math.hypot(to-from,toPitch-fromPitch)*180/Math.PI/110*1.875*1000,Math.abs(toPitch-fromPitch)*180/Math.PI/40*1.875*1000)}
return {anchors,world,view,vector,uv,target,duration};})();


export default Projection;
