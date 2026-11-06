import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync,existsSync,mkdirSync,mkdtempSync,openSync,closeSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {syncPlanetRoutes} from '../../../scripts/sync-planet-routes.mjs';

const demo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(demo,'../..');
const source=path.join(demo,'godot-free');
const target=path.join(repo,'public/games/planet-patchup-free');
const output=path.join(demo,'dist-godot-free');
const sha=data=>createHash('sha256').update(data).digest('hex');
const fail=message=>{throw Error(message);};
const files=directory=>readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>{
 if(e.name==='.godot'||e.name==='.DS_Store')return [];
 const full=path.join(directory,e.name);return e.isDirectory()?files(full):[full];
});
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const campaign=json(path.join(source,'data/campaign.json'));
const siteIds=campaign.sites.map(site=>site.id);
const allowedMaps=new Set([campaign.tutorial,...siteIds]);
const expectedMaps=[...allowedMaps].map(id=>id+'.json').sort();
if(allowedMaps.size!==43||campaign.regions.length!==6||campaign.sites.length!==42||campaign.tutorial!=='arch-0-arch-quarter-v2')fail('Expected six regions and 42 campaign maps plus the tutorial.');
for(const [index,region] of campaign.regions.entries()){
 const sites=campaign.sites.filter(site=>site.region===index);
 if(region.index!==index||sites.length!==7||sites.filter(site=>site.boss).length!==1||JSON.stringify(region.sites)!==JSON.stringify(sites.map(site=>site.id)))fail('Incorrect campaign membership for region '+index);
}
if(JSON.stringify(readdirSync(path.join(source,'data/maps')).filter(n=>n.endsWith('.json')).sort())!==JSON.stringify(expectedMaps))fail('Map directory differs from the campaign.');
const balance=json(path.join(source,'data/balance.json'));
const expansion=json(path.join(source,'data/skill_expansion.json'));
const allowedSkills=['aftershock','expand','gravity','orbital','recharge','relay','seismic','slam','sonic','wave'];
if(JSON.stringify([...Object.keys(balance.skills),...Object.keys(expansion.skills)].sort())!==JSON.stringify(allowedSkills))fail('Expected ten campaign skills.');
const project=readFileSync(path.join(source,'project.godot'),'utf8');
if(!project.includes('config/version="0.5.41"')||!project.includes('config/custom_user_dir_name="PlanetPatchupGodotFreeWeb"'))fail('Incorrect free version or persistent user directory.');

const inputs=files(source).concat(files(path.join(demo,'src/godot-free')),fileURLToPath(import.meta.url),path.join(demo,'vite.godot-shell.config.js'));
const content=createHash('sha256');
for(const p of inputs){content.update(path.relative(demo,p));content.update(readFileSync(p));}
const sourceHash=content.digest('hex');
const exportStem='free-0541-'+sourceHash.slice(0,12);
const scratch=mkdtempSync(path.join(tmpdir(),'pp-godot-free-0541-'));
const staging=path.join(scratch,'project');
cpSync(source,staging,{recursive:true,filter:p=>!p.split(path.sep).includes('.godot')&&!p.endsWith('.DS_Store')});
const raw=path.join(scratch,'export');mkdirSync(raw);
const logs=path.join(scratch,'logs');mkdirSync(logs);
const pinned='/Users/roy/Developer/breakout/.tools/Godot.app/Contents/MacOS/Godot';
const godot=process.env.GODOT_BIN||(existsSync(pinned)?pinned:'godot');
const templates=[process.env.GODOT_WEB_TEMPLATE,
 '/Users/roy/Developer/sand/.local-tools/web-g40/web_dlink_nothreads_release.zip',
 path.join(homedir(),'Library/Application Support/Godot/export_templates/4.6.2.stable/web_dlink_nothreads_release.zip')].filter(Boolean);
const template=templates.find(p=>existsSync(p));
if(!template||!readFileSync(template).includes(Buffer.from('godot.side.wasm')))fail('Godot4.6.2 single-thread GDExtension web template required.');
if(template){
 const preset=path.join(staging,'export_presets.cfg');
 writeFileSync(preset,readFileSync(preset,'utf8').replace('[preset.0.options]',`[preset.0.options]\ncustom_template/debug=${JSON.stringify(template)}\ncustom_template/release=${JSON.stringify(template)}`));
}
const run=(name,args)=>{
 const log=path.join(logs,name+'.log'),fd=openSync(log,'w');
 try{execFileSync(godot,args.concat(['--log-file',path.join(logs,name+'-engine.log')]),{stdio:['ignore',fd,fd]});}
 finally{closeSync(fd);}
 const text=readFileSync(log,'utf8');
 if(/SCRIPT ERROR:|Parse Error:|^ERROR:/m.test(text))fail(`Godot ${name} reported an error; read ${log}`);
 console.log(`Godot ${name}: passed (${log})`);
};
run('import',['--headless','--editor','--path',staging,'--import','--quit']);
run('compile',['--headless','--path',staging,'--check-only','--script','res://app/app.gd']);
run('export',['--headless','--editor','--path',staging,'--export-release','Web',path.join(raw,exportStem+'.html')]);
// Keep a release identity for the HTML and game pack.
const exportFiles=files(raw);
const packageHash=createHash('sha256').update(sourceHash);
for(const file of exportFiles.filter(p=>/\.(wasm|pck)$/.test(p))){packageHash.update(path.relative(raw,file));packageHash.update(readFileSync(file));}
const stem='free-0541-'+packageHash.digest('hex').slice(0,12);
execFileSync(process.execPath,[path.join(demo,'node_modules/vite/bin/vite.js'),'build','--config','vite.godot-shell.config.js'],{cwd:demo,stdio:'inherit'});
const shellOutput=path.join(demo,'dist-godot-shell');
const shellIndex=json(path.join(shellOutput,'shell-manifest.json'));
const shellScript=shellIndex.script;
const shellCss=shellIndex.css;

// Preserve the original entry and old chunks, including map-editor dependencies.
const archive=path.join(repo,'public/games/planet-patchup-free-phaser');
if(!existsSync(archive))cpSync(target,archive,{recursive:true});
mkdirSync(target,{recursive:true});
rmSync(output,{recursive:true,force:true});mkdirSync(output,{recursive:true});
const sizeLimit=25*1024*1024;
const engineSuffixes=new Set(['.js','.wasm','.side.wasm','.audio.worklet.js','.audio.position.worklet.js']);
const packaged=exportFiles.filter(p=>!p.endsWith('.html')).map(p=>{
 const exportedName=path.basename(p);
 const suffix=exportedName.startsWith(exportStem)?exportedName.slice(exportStem.length):'';
 const engineFile=engineSuffixes.has(suffix);
 const original=readFileSync(p);
 if(engineFile&&suffix.endsWith('.js')&&original.includes(exportStem))fail('Engine script embeds the game release name: '+exportedName);
 const compressed=exportedName.endsWith('.wasm')||exportedName.endsWith('.pck');
 const bytes=compressed?gzipSync(original,{level:9}):original;
 return {exportedName,suffix,engineFile,original,compressed,bytes};
});
const engineFiles=packaged.filter(file=>file.engineFile);
if(new Set(engineFiles.map(file=>file.suffix)).size!==engineSuffixes.size)fail('Unexpected Godot web engine files.');
// Hash the served engine bytes independently of the game pack and HTML.
const engineHash=createHash('sha256');
for(const file of engineFiles)engineHash.update(file.suffix+':'+sha(file.bytes)+'\n');
const engineStem='godot-web-'+engineHash.digest('hex').slice(0,12);
const artifacts=[];
for(const {exportedName,suffix,engineFile,original,compressed,bytes} of packaged){
 const name=engineFile?engineStem+suffix:exportedName.replace(exportStem,stem);
 if(compressed&&!gunzipSync(bytes).equals(original))fail('Compression did not preserve '+name);
 if(bytes.length>sizeLimit)fail(`${name} exceeds Pages 25 MiB limit after packaging.`);
 const published=path.join(target,name);
 if((engineFile||compressed)&&existsSync(published)&&!readFileSync(published).equals(bytes))fail('Immutable asset changed: '+name);
 writeFileSync(path.join(output,name),bytes);writeFileSync(published,bytes);
 artifacts.push({file:name,encoding:compressed?'gzip-payload':'identity',bytes:bytes.length,decodedBytes:original.length,sha256:sha(bytes),decodedSha256:sha(original)});
}
cpSync(shellOutput,output,{recursive:true});cpSync(shellOutput,target,{recursive:true});
if(existsSync(path.join(source,'licenses'))){
 cpSync(path.join(source,'licenses'),path.join(output,'licenses'),{recursive:true});
 cpSync(path.join(source,'licenses'),path.join(target,'licenses'),{recursive:true});
}
let html=readFileSync(path.join(raw,exportStem+'.html'),'utf8').replaceAll(exportStem,stem);
html=html.replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 플레이</title>');
const engineError=`globalThis.PPFreeWebEngineError=()=>{
 const overlay=document.getElementById('status'),notice=document.getElementById('status-notice');
 document.getElementById('status-progress').style.display='none';
 document.getElementById('status-splash').style.display='none';
 notice.textContent='Game files could not be loaded. Reload to try again.';
 const reload=document.createElement('button');reload.type='button';reload.textContent='Reload';reload.onclick=()=>location.reload();
 notice.append(document.createElement('br'),reload);notice.style.display='block';overlay.style.visibility='visible';
};`;
const boot=`<script>globalThis.PPFreeWebReady=new Promise((resolve,reject)=>{globalThis.PPFreeWebResolve=resolve;globalThis.PPFreeWebReject=reject;});${engineError}</script><link rel="stylesheet" href="./${shellCss}"><script type="module" src="./${shellScript}" onerror="PPFreeWebReject(new Error('Game interface could not be loaded. Please reload.'))"></script>`;
html=html.replace('</head>',boot+'</head>');
const engineTag=`<script src="${stem}.js"></script>`;
if(!html.includes(engineTag))fail('Unexpected Godot engine script tag.');
html=html.replace(engineTag,`<script src="${engineStem}.js" onerror="PPFreeWebEngineError()"></script>`);
const configLine=/^const GODOT_CONFIG = (\{.*\});$/m;
const configMatch=html.match(configLine);
if(!configMatch)fail('Unexpected Godot export configuration.');
const config=JSON.parse(configMatch[1]);
if(config.executable!==stem||!config.fileSizes?.[`${stem}.wasm`])fail('Unexpected Godot executable or WASM size.');
config.executable=engineStem;
config.mainPack=`${stem}.pck`;
config.fileSizes[`${engineStem}.wasm`]=config.fileSizes[`${stem}.wasm`];
delete config.fileSizes[`${stem}.wasm`];
html=html.replace(configLine,`const GODOT_CONFIG = ${JSON.stringify(config)};`);
const marker='engine.startGame(';
if(html.split(marker).length!==2)fail('Unexpected Godot HTML startup structure.');
// Pages can add its own HTTP compression. Serve gzip as payload, then decode only
// the explicitly packaged WASM/PCK assets after host HTTP content coding.
const startWithAssets=`const startAfterBridge=engine.startGame.bind(engine);
const fetchBeforeGame=globalThis.fetch.bind(globalThis);
const compressedTypes=new Map(${JSON.stringify(artifacts.filter(a=>a.encoding==='gzip-payload').map(a=>[a.file,a.file.endsWith('.wasm')?'application/wasm':'application/octet-stream']))}.map(([name,type])=>[new URL(name,document.baseURI).href,type]));
engine.startGame=options=>globalThis.PPFreeWebReady.then(()=>{
 if(typeof DecompressionStream!=="function")throw new Error("Please update your browser to load this game.");
 globalThis.fetch=async(resource,options)=>{
  const type=compressedTypes.get(new URL(resource instanceof Request?resource.url:resource,document.baseURI).href);
  const response=await fetchBeforeGame(resource,options);
  if(!type||!response.ok)return response;
  const headers=new Headers(response.headers);headers.delete("Content-Encoding");headers.delete("Content-Length");headers.set("Content-Type",type);
  return new Response(response.body.pipeThrough(new DecompressionStream("gzip")),{status:response.status,statusText:response.statusText,headers});
 };
 return startAfterBridge({...options,persistentPaths:["/userfs/PlanetPatchupGodotFreeWeb"]});
});
`;
html=html.replace(marker,startWithAssets+marker);
const initStart=html.indexOf('const GODOT_CONFIG ='),initEnd=html.indexOf('</script>',initStart);
if(initStart<0||initEnd<initStart)fail('Unexpected Godot initializer.');
html=html.slice(0,initStart)+'if(typeof Engine === "function"){\n'+html.slice(initStart,initEnd)+'}else{PPFreeWebEngineError();}\n'+html.slice(initEnd);
html=html.replace(/[ \t]+$/gm,'').trimEnd()+'\n';
writeFileSync(path.join(output,'index.html'),html);writeFileSync(path.join(target,'index.html'),html);
const headersPath=path.join(repo,'public/_headers');
let headers=existsSync(headersPath)?readFileSync(headersPath,'utf8'):'';
headers=headers.replace(/# BEGIN GODOT FREE\n[\s\S]*?# END GODOT FREE\n?/g,'');
const encodedFiles=readdirSync(target).filter(n=>/^(?:free-(?:059|0534|0540|0541)-[a-f0-9]+(?:\.side)?\.(?:wasm|pck)|libpp_core-g40-[a-f0-9]+\.wasm|godot-web-[a-f0-9]{12}(?:\.side)?\.wasm)$/.test(n)).sort();
const engineScripts=readdirSync(target).filter(n=>/^godot-web-[a-f0-9]{12}(?:\.audio(?:\.position)?\.worklet)?\.js$/.test(n)).sort();
headers+='\n# BEGIN GODOT FREE\n'+encodedFiles.map(name=>`/games/planet-patchup-free/${name}\n  Content-Type: application/gzip\n  Cache-Control: public, max-age=31536000, immutable, no-transform\n`).join('')
 +engineScripts.map(name=>`/games/planet-patchup-free/${name}\n  Cache-Control: public, max-age=31536000, immutable\n`).join('')+'# END GODOT FREE\n';
writeFileSync(headersPath,headers);
syncPlanetRoutes();
const pck=readFileSync(path.join(raw,exportStem+'.pck'));
for(const id of allowedMaps)if(!pck.includes(Buffer.from('data/maps/'+id+'.json')))fail('Missing packaged map '+id);
const packagedMaps=[...new Set([...pck.toString('latin1').matchAll(/data\/maps\/([a-z0-9-]+)\.json/g)].map(m=>m[1]))].sort();
if(JSON.stringify(packagedMaps)!==JSON.stringify([...allowedMaps].sort()))fail('Packaged map directory differs from the campaign.');
for(const file of ['data/campaign.json','data/balance.json','data/skill_expansion.json']){
 if(!pck.includes(readFileSync(path.join(staging,file))))fail('Campaign data missing from PCK: '+file);
}
const assetData=readFileSync(path.join(staging,'data/assets.json'));
if(!pck.includes(assetData))fail('Filtered asset catalog missing from free PCK.');
const assetCatalog=JSON.parse(assetData);
const musicFile='quiet-background-v5-94bpm-32bars.mp3';
if(assetCatalog.assets.music!==`res://assets/audio/${musicFile}`)fail('Incorrect background music.');
const musicImport=readFileSync(path.join(source,'assets/audio',musicFile+'.import'),'utf8');
if(!/^loop=true$/m.test(musicImport)||!/^loop_offset=0(?:\.0)?$/m.test(musicImport))fail('Background music must loop from the beginning.');
if(!pck.includes(readFileSync(path.join(source,'assets/audio',musicFile))))fail('MP3 music bytes missing from free PCK.');
if(pck.includes(Buffer.from('quiet-background-v5-94bpm-32bars.wav-')))fail('Original large WAV sample must not ship in the free PCK.');
for(const p of files(output))if(readFileSync(p).length>sizeLimit)fail('Oversized final artifact: '+path.basename(p));
const manifest={version:'0.5.41',commonBaseline:'g40',nativeCore:json(path.join(source,'native_core/provenance.json')),templateSha256:sha(readFileSync(template)),sourceHash,stem,engineStem,scratch,allowedMaps:[...allowedMaps],allowedSkills,
 shellScript,shellCss,artifacts,scope:'compile/export/static package verification only; no game/browser/save-runtime testing'};
writeFileSync(path.join(output,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
writeFileSync(path.join(target,stem+'-manifest.json'),JSON.stringify({...manifest,scratch:undefined},null,2)+'\n');
console.log(JSON.stringify({built:stem,files:artifacts.map(a=>({file:a.file,bytes:a.bytes,decodedBytes:a.decodedBytes})),manifest:path.join(output,'build-manifest.json')},null,2));
