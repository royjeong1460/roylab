// Shared coordinate math for rendering, tap hit-testing and nearest-zone snapping.
const Globe = (()=>{
 const seeds=[[0,0,1],[1,0,0],[0,0,-1],[-1,0,0],[0,1,0],[0,-1,0]];
 function world([x,y,z],yaw,pitch){const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),yy=y*cp+z*sp,zz=-y*sp+z*cp;return [x*cy+zz*sy,yy,-x*sy+zz*cy]}
 function view([x,y,z],yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),xx=x*cy-z*sy,zz=x*sy+z*cy;return [xx,y*cp-zz*sp,y*sp+zz*cp]}
 function region(v){const [x,y,z]=v,warped=[x+.035*Math.sin(y*7+z*3),y+.035*Math.sin(z*6+x*4),z+.035*Math.sin(x*7+y*5)];const scores=seeds.map((s,index)=>({index,score:s.reduce((a,n,i)=>a+n*warped[i],0)})).sort((a,b)=>b.score-a.score);return {index:scores[0].index,margin:scores[0].score-scores[1].score}}
 function target(index,currentYaw){const s=seeds[index];let yaw=Math.abs(s[1])>.99?currentYaw:Math.atan2(s[0],s[2]);while(yaw-currentYaw>Math.PI)yaw-=Math.PI*2;while(yaw-currentYaw< -Math.PI)yaw+=Math.PI*2;return {yaw,pitch:Math.asin(s[1])}}
 return {seeds,world,view,region,target};
})();
export default Globe;
