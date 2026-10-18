import {validateSite} from '../map-maker-generator.js';

// More landing room, with the same building, collectable count and save identity.
export function widenSite(site){
 const pad=site.data.width/4;
 return validateSite({...site,preview:site.preview.map(p=>({...p,x:p.x+pad})),data:{...site.data,width:site.data.width+2*pad,shapes:site.data.shapes.map(s=>({...s,rect:[s.rect[0]+pad,...s.rect.slice(1)]}))}});
}
export function closeView(viewport,focusX=viewport.worldWidth/2){
 viewport.zoom=Math.max(viewport.minZoom,Math.min(viewport.maxZoom,6));
 viewport.x=focusX-viewport.viewWidth/viewport.zoom/2;
 viewport.y=viewport.worldHeight-viewport.viewHeight/viewport.zoom;
 return viewport.clamp();
}
export const COLLECTIBLE_STYLE={fill:'#a8dfc4',rim:'#518c76',color:0xa8dfc4};
