const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function bindBatteryInput(surface,canvas,viewport,{canStart,start,move,end,press,touchPressOnRelease=()=>false,touchMargin={right:0,bottom:0},onViewChange=()=>{}}) {
  const pointers=new Map();
  let working=false,touchBlocked=false,gesture=null,destroyed=false;
  const isArea=event=>event.target===surface||event.target===canvas;
  const screen=event=>{
    const rect=canvas.getBoundingClientRect();
    if(!(rect.width>0&&rect.height>0)||![event.clientX,event.clientY].every(Number.isFinite))return null;
    return {x:(event.clientX-rect.left)*viewport.viewWidth/rect.width,y:(event.clientY-rect.top)*viewport.viewHeight/rect.height};
  };
  const locate=event=>{
    const raw=screen(event);
    if(!raw)return null;
    const world=viewport.screenToWorld(raw.x,raw.y);
    const rect=canvas.getBoundingClientRect(),touch=event.pointerType==='touch';
    const right=touch?Math.max(0,touchMargin.right||0):0,bottom=touch?Math.max(0,touchMargin.bottom||0):0;
    const extraX=right*viewport.viewWidth/rect.width,extraY=bottom*viewport.viewHeight/rect.height;
    // Permit a bounded finger apron before applying the nozzle offset, including letterboxed map edges.
    if(raw.x<0||raw.y<0||raw.x>viewport.viewWidth+extraX||raw.y>viewport.viewHeight+extraY||world.x<0||world.y<0||world.x>viewport.worldWidth+extraX/viewport.zoom||world.y>viewport.worldHeight+extraY/viewport.zoom)return null;
    if(event.pointerType!=='touch')return world;
    const bounds=surface.getBoundingClientRect();
    const offsetX=32*clamp((bounds.right-event.clientX)/64,0,1);
    const offsetY=64*clamp((bounds.bottom-event.clientY)/96,0,1);
    const nozzle=viewport.screenToWorld(raw.x-offsetX*viewport.viewWidth/rect.width,raw.y-offsetY*viewport.viewHeight/rect.height);
    return {x:clamp(nozzle.x,0,viewport.worldWidth),y:clamp(nozzle.y,0,viewport.worldHeight)};
  };
  const stopWork=()=>{if(working){working=false;end();}};
  const workAt=event=>{
    const point=locate(event);
    if(!point||!canStart(point)){stopWork();return;}
    if(working)move(point);
    else {working=true;start(point);}
  };
  const touches=()=>[...pointers.values()].filter(pointer=>pointer.type==='touch');
  const gestureState=()=>{
    const pair=touches().slice(0,2);
    if(pair.length<2)return null;
    const [a,b]=pair;
    return {x:(a.screen.x+b.screen.x)/2,y:(a.screen.y+b.screen.y)/2,distance:Math.hypot(a.screen.x-b.screen.x,a.screen.y-b.screen.y)};
  };
  const notifyChange=before=>{
    if(before[0]!==viewport.x||before[1]!==viewport.y||before[2]!==viewport.zoom)onViewChange();
  };
  const cameraState=()=>[viewport.x,viewport.y,viewport.zoom];
  const capture=id=>{surface.setPointerCapture(id);};
  const uncapture=id=>{if(surface.hasPointerCapture(id))surface.releasePointerCapture(id);};
  const remove=id=>{
    const pointer=pointers.get(id);if(!pointer)return;
    pointers.delete(id);stopWork();uncapture(id);
    gesture=gestureState();
    if(pointers.size===0)touchBlocked=false;
  };
  const release=()=>{
    if(destroyed)return;
    const ids=[...pointers.keys()];pointers.clear();gesture=null;touchBlocked=false;
    stopWork();for(const id of ids)uncapture(id);
  };
  const handlers={
    pointerdown:event=>{
      if(destroyed||!isArea(event)||pointers.has(event.pointerId))return;
      const point=screen(event);if(!point)return;
      const touch=event.pointerType==='touch';
      const pan=!touch&&(event.button===2||(event.button===0&&event.shiftKey));
      if(!touch&&event.button!==0&&event.button!==2)return;
      if(pointers.size&&(!touch||touches().length!==pointers.size))return;
      if(!pointers.size&&!canStart(locate(event)))return;
      event.preventDefault();
      pointers.set(event.pointerId,{type:event.pointerType,mode:pan?'pan':'work',button:pan&&event.button===2?2:1,screen:point});capture(event.pointerId);
      if(touches().length>=2){touchBlocked=true;for(const pointer of pointers.values())pointer.tap=null;stopWork();gesture=gestureState();return;}
      if(!pan&&!touchBlocked){
        workAt(event);
        if(working){
          // A second finger must be able to turn a touch into a camera gesture before a paid tap fires.
          if(touch&&touchPressOnRelease())pointers.get(event.pointerId).tap={point:locate(event),x:event.clientX,y:event.clientY};
          else press?.(locate(event));
        }
      }
    },
    pointermove:event=>{
      if(destroyed)return;
      const pointer=pointers.get(event.pointerId);
      if(!pointer){
        if(pointers.size===0&&event.pointerType==='mouse'&&event.buttons===0&&isArea(event)){
          const point=locate(event);if(point&&canStart(point))move(point);
        }
        return;
      }
      if(pointer.type!=='touch'&&(event.buttons&pointer.button)===0){remove(event.pointerId);return;}
      const point=screen(event);if(!point){stopWork();return;}
      if(pointer.tap&&Math.hypot(event.clientX-pointer.tap.x,event.clientY-pointer.tap.y)>12)pointer.tap=null;
      event.preventDefault();const previous=pointer.screen;pointer.screen=point;
      if(touches().length>=2){
        const next=gestureState();
        if(gesture&&canStart()){
          const before=cameraState();viewport.pan(next.x-gesture.x,next.y-gesture.y);
          if(gesture.distance>0&&next.distance>0)viewport.zoomAt(next.distance/gesture.distance,next.x,next.y);
          notifyChange(before);
        }
        gesture=next;return;
      }
      if(touchBlocked)return;
      if(pointer.mode==='pan'){
        if(canStart()){const before=cameraState();viewport.pan(point.x-previous.x,point.y-previous.y);notifyChange(before);}
      }else workAt(event);
    },
    pointerup:event=>{
      if(destroyed)return;
      const tap=pointers.get(event.pointerId)?.tap;
      if(tap&&!touchBlocked&&locate(event)&&canStart(tap.point))press?.(tap.point);
      remove(event.pointerId);
    },
    pointercancel:event=>{if(!destroyed)remove(event.pointerId);},
    lostpointercapture:event=>{if(!destroyed)remove(event.pointerId);},
    wheel:event=>{
      if(destroyed||!isArea(event)||!Number.isFinite(event.deltaY)||!canStart())return;
      const point=screen(event);if(!point)return;
      event.preventDefault();stopWork();
      // Bound each wheel impulse, including trackpad and page-mode events.
      const units=event.deltaMode===1?16:event.deltaMode===2?viewport.viewHeight:1;
      const factor=Math.exp(-clamp(event.deltaY*units,-2000,2000)*0.002);
      const before=cameraState();viewport.zoomAt(factor,point.x,point.y);notifyChange(before);
    },
    contextmenu:event=>{if(!destroyed&&isArea(event))event.preventDefault();},
  };
  for(const [name,handler] of Object.entries(handlers))surface.addEventListener(name,handler,{passive:false});
  return {release,destroy(){if(destroyed)return;release();destroyed=true;for(const [name,handler] of Object.entries(handlers))surface.removeEventListener(name,handler);}};
}
