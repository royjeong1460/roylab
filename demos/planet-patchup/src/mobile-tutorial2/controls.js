// Separate saves let players compare the original aiming version without a reset.
export const contactStorage=storage=>({
 getItem:key=>storage.getItem('mobile-tutorial2:'+key),
 setItem:(key,value)=>storage.setItem('mobile-tutorial2:'+key,value),
});
export function pressContact(run,point){
 // Only a confirmed mobile tap skips the fuse; PC and other editions keep it.
 const world=run.world,previous=world.labParameters;
 world.labParameters={...previous,bombDelay:0};
 try{return run.press(point);}finally{world.labParameters=previous;}
}
