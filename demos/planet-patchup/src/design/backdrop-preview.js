const backdropUrl=new URL('./assets/cleanup-backdrop-v1.png',import.meta.url).href;
let selectedMode='cloudy';

// An opt-in art check in the real game. Never changes the world or progression.
export function createBackdropPreview(scene,world,layer,{document:doc=globalThis.document,Image:ImageClass=globalThis.Image,search=globalThis.location?.search||''}={}) {
  if(new URLSearchParams(search).get('design')!=='backdrop')return null;
  const key='design-backdrop-preview',backdrop=scene.add.container(0,0);
  layer.addAt(backdrop,1);
  const toolbar=doc.createElement('div');toolbar.className='backdrop-preview';
  toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','배경 비교 시안');
  const label=doc.createElement('span');label.textContent='배경 비교';toolbar.append(label);
  const buttons=[];let alive=true,picture=null,veil=null;
  function show(mode) {
    selectedMode=mode;backdrop.setVisible(mode!=='original');
    for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
    if(!picture)return;
    picture.setTint(mode==='cloudy'?0xa9bac7:0xffffff);
    veil.clear();veil.fillStyle(mode==='cloudy'?0x718395:0xfff4dd,mode==='cloudy'?.24:.16);
    veil.fillRect(0,0,world.width,world.floorY);
  }
  for(const [mode,title] of [['original','기존 격자'],['cloudy','흐린 배경'],['sunny','밝은 배경']]) {
    const button=doc.createElement('button');button.type='button';button.className='secondary';
    button.dataset.mode=mode;button.textContent=title;button.disabled=true;button.onclick=()=>show(mode);
    buttons.push(button);toolbar.append(button);
  }
  doc.querySelector('#game-ui').insertBefore(toolbar,doc.querySelector('.view-controls'));
  show(selectedMode);
  const image=new ImageClass();
  image.onload=()=>{
    if(!alive)return;
    scene.textures.addImage(key,image);
    picture=scene.add.image(0,0,key).setOrigin(0).setDisplaySize(world.width,world.floorY);
    veil=scene.add.graphics();backdrop.add([picture,veil]);
    for(const button of buttons)button.disabled=false;
    show(selectedMode);
  };
  image.onerror=()=>{if(alive)toolbar.textContent='배경을 불러오지 못했어요. 기존 화면으로 표시합니다.';};
  image.src=backdropUrl;
  return {destroy(){
    if(!alive)return;alive=false;image.onload=null;image.onerror=null;
    toolbar.remove();backdrop.destroy(true);
    if(scene.textures.exists(key))scene.textures.remove(key);
  }};
}
