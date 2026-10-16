// Fill the cross's corners before expanding the next ring. Drawing uses this same mask.
const cells=[
 [0,0],
 [0,-1],[1,0],[0,1],[-1,0],
 [1,-1],[1,1],[-1,1],[-1,-1],
 [0,-2],[2,0],[0,2],[-2,0],
 [1,-2],[2,1],[-1,2],[-2,-1],
 [-1,-2],[2,-1],[1,2],[-2,1],
];
const patterns=Array.from({length:21},(_,level)=>{
 return Object.freeze({id:'cross',name:'절단',cost:1,cells:Object.freeze(cells.slice(0,level+1).map(Object.freeze))});
});
export function crossPattern(level){if(!Number.isInteger(level)||level<0||level>20)throw new RangeError('cutter level must be 0..20');return patterns[level];}
