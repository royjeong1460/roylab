export const PERIOD=120;
export const SATELLITES=[
 {asset:'dead-satellite.svg',width:44,ratio:40/64},
 {asset:'dead-satellite.svg',width:34,ratio:40/64},
 {asset:'dish-satellite.svg',width:38,ratio:40/64},
 {asset:'broken-array.svg',width:42,ratio:40/64},
 {asset:'spent-probe.svg',width:32,ratio:40/64},
];
// The near half follows the lower limb. Side fades keep the mobile edges clear.
export function orbitPose(seconds,index){
 const theta=.7+index*Math.PI*2/SATELLITES.length+seconds*Math.PI*2/PERIOD;
 const depth=Math.sin(theta);
 return {x:194+194*Math.cos(theta),y:411+190*depth,depth,
  angle:theta-Math.PI/2,scale:.72+.28*Math.max(0,depth),
  opacity:Math.max(0,Math.min(1,(depth-.42)/.22))*.82};
}
