// Gameplay strength model, not a material engineering solver. Equal pixels have equal mass.
export function bearingStrength(load,center,bearings){
 const live=bearings.filter(p=>p.strength>0).sort((a,b)=>a.x-b.x);
 let width=0,bendingWidth=0,run=0,previous=-Infinity;
 for(const p of live){
  if(p.x!==previous+1){bendingWidth+=run*run;run=0;}
  width+=p.strength;run+=p.strength;previous=p.x;
 }
 bendingWidth+=run*run;
 if(!live.length)return {load,center,width:0,bendingWidth:0,eccentricity:0,pivot:center,utilization:Infinity};
 const left=live[0].x,right=live.at(-1).x+1;
 const pivot=Math.max(left,Math.min(right,center)),eccentricity=Math.abs(center-pivot);
 return {load,center,width,bendingWidth,eccentricity,pivot,
  utilization:load/(800*width)+load*eccentricity/(3500*bendingWidth)};
}
