// Expand only the runtime site. Authored maps, thumbnails and exported JSON stay intact.
export function extendWorksite(source){
 const {width,height,floorY,shapes}=source.data;
 const margin=Math.min(Math.max(64,floorY+16),Math.floor((1024-width)/2));
 if(margin<1)throw new RangeError('No room for worksite apron');
 const site={...source,...(source.structure?{structure:{...source.structure,roles:source.structure.roles.map(s=>({...s,rect:[s.rect[0]+margin,...s.rect.slice(1)]}))}}:{}),data:{...source.data,width:width+margin*2,
  shapes:shapes.map(s=>({...s,rect:[s.rect[0]+margin,...s.rect.slice(1)]})),
 },preview:source.preview.map(p=>({...p,x:p.x+margin}))};
 return {site,bounds:{x:margin,y:0,width,height}};
}

// Frame the buildings at their old scale; pan/zoom limits still cover the full floor.
export function frameWorksite(viewport,bounds){
 viewport.zoom=Math.max(viewport.minZoom,Math.min(viewport.maxZoom,viewport.viewWidth/bounds.width,viewport.viewHeight/bounds.height));
 viewport.x=bounds.x+(bounds.width-viewport.viewWidth/viewport.zoom)/2;
 viewport.y=bounds.y+(bounds.height-viewport.viewHeight/viewport.zoom)/2;
 viewport.clamp();
}
