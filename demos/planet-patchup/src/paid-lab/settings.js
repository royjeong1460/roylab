export const SETTINGS_KEY='planet-patchup-paid-test-v1';
const field=(group,key,label,min,max,step,unit)=>({group,key,label,min,max,step,unit});
// Absolute gameplay values. Solver limits, collision physics and free balance stay untouched.
export const FIELDS=[
 field('폭파','bombRadius','직접 파괴 반경',1,24,.25,'칸'),field('폭파','bombPower','밀어내는 힘',.1,20,.1,'배'),
 field('폭파','blastReach','힘 전달 반경',3,80,1,'칸'),field('폭파','crackStrength','주변 균열 강도',0,10,.1,'배'),field('폭파','crackRange','균열 확산 범위',.25,5,.05,'배'),
 field('폭파','bombDelay','폭발 지연',0,2,.05,'초'),field('폭파','bombCost','1회 에너지',1,100,1,''),
 field('블랙홀','gravityRadius','끌어당김 반경',8,100,1,'칸'),field('블랙홀','gravityPower','끌어당기는 힘',.05,2,.05,''),
 field('블랙홀','gravityDuration','유지 시간',.5,15,.5,'초'),field('블랙홀','coreMix','중심부 휘젓기',1,10,.25,'배'),field('블랙홀','wearSpeed','갈리는 속도 상한',1,10,.5,'배'),field('블랙홀','gravityCost','1회 에너지',1,100,1,''),
 field('수집 · 배터리','suctionRate','흡입량',20,800,10,'개/초'),field('수집 · 배터리','suctionRadius','흡입 반경',4,40,.5,'칸'),field('수집 · 배터리','capacity','배터리 용량',10,1000,10,''),
];
const base={bombRadius:3,bombPower:1,blastReach:18,crackStrength:1,crackRange:1,bombDelay:.35,bombCost:12,gravityRadius:44,gravityPower:.2,gravityDuration:3,coreMix:1,wearSpeed:1,gravityCost:24,suctionRate:80,suctionRadius:12,capacity:60,unlimited:true};
export const PRESETS={
 free:{label:'무료 기본',values:{...base}},
 early:{label:'유료 초반',values:{...base,bombRadius:5,bombPower:2,blastReach:22,crackStrength:2,crackRange:1.5,gravityPower:.35,gravityRadius:48,gravityDuration:4,coreMix:2,wearSpeed:3,suctionRate:160,suctionRadius:16,capacity:100}},
 middle:{label:'유료 중반',values:{...base,bombRadius:7,bombPower:3.5,blastReach:30,crackStrength:3,crackRange:2,gravityPower:.6,gravityRadius:56,gravityDuration:5,coreMix:5,wearSpeed:6,suctionRate:240,suctionRadius:20,capacity:160}},
 late:{label:'유료 후반',values:{...base,bombRadius:10,bombPower:6,blastReach:40,crackStrength:5,crackRange:3,gravityPower:1,gravityRadius:64,gravityDuration:6,coreMix:10,wearSpeed:10,suctionRate:400,suctionRadius:24,capacity:240}},
};
export function normalizeSettings(input){
 const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const out={unlimited:typeof source.unlimited==='boolean'?source.unlimited:true};
 for(const f of FIELDS){const n=source[f.key];out[f.key]=typeof n==='number'&&Number.isFinite(n)?Math.max(f.min,Math.min(f.max,n)):PRESETS.early.values[f.key];}
 return out;
}
export function settingsLabel(s){return Object.values(PRESETS).find(p=>FIELDS.every(f=>p.values[f.key]===s[f.key]))?.label||'사용자 설정';}
export function loadSettings(storage){
 try{const raw=storage.getItem(SETTINGS_KEY);if(!raw)return {settings:normalizeSettings({})};const data=JSON.parse(raw);if(data?.version!==1||!data.settings||typeof data.settings!=='object')throw Error('version');return {settings:normalizeSettings(data.settings)};}
 catch{return {settings:normalizeSettings({}),warning:'저장 설정을 읽지 못해 유료 초반 값으로 시작했어요.'};}
}
export function saveSettings(storage,settings){try{storage.setItem(SETTINGS_KEY,JSON.stringify({version:1,settings:normalizeSettings(settings)}));return {ok:true};}catch{return {ok:false};}}
export function applySettings(world,input){
 const s=normalizeSettings(input);
 // FreeWorld.stats overrides inherited lab fields; update the actual game stats as well.
 world.gameStats={...world.gameStats,...s};
 for(const f of FIELDS)if(f.key in world.labParameters)world.labParameters[f.key]=s[f.key];
 world.tuning={...world.tuning,crackStrength:s.crackStrength,crackRange:s.crackRange};
 world.blackholeSettings.coreMix=s.coreMix;world.wearSettings.wearSpeed=s.wearSpeed;
 world.capacity=s.capacity;world.charge=s.capacity;world.unlimited=s.unlimited;
 world.suctionRate=s.suctionRate;world.suctionRadius=s.suctionRadius;world.version++;
 return s;
}
