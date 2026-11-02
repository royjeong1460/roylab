"""Inspect source and exported files only; never load Godot or play audio."""
from pathlib import Path
import gzip,hashlib,json,re,struct,shutil,datetime
q=Path(__file__).resolve().parent;r=q.parents[2];f=r/'demos/planet-patchup/godot-free';pub=r/'public/games/planet-patchup-free'
sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((r/'demos/planet-patchup/dist-godot-free/build-manifest.json').read_text());old_m=json.loads((pub/'free-0534-f4dda62c94b4-manifest.json').read_text())
def pack(p):
 d=gzip.decompress(p.read_bytes());assert d[:4]==b'GDPC' and struct.unpack_from('<I',d,4)[0]==3;base=struct.unpack_from('<Q',d,24)[0];at=struct.unpack_from('<Q',d,32)[0];n=struct.unpack_from('<I',d,at)[0];at+=4;out={}
 for _ in range(n):
  length=struct.unpack_from('<I',d,at)[0];at+=4;name=d[at:at+length].rstrip(b'\0').decode();at+=length;offset,size=struct.unpack_from('<QQ',d,at);at+=16;md5=d[at:at+16];at+=16;flags=struct.unpack_from('<I',d,at)[0];at+=4;b=d[base+offset:base+offset+size];assert flags==0 and len(b)==size and hashlib.md5(b).digest()==md5 and name not in out;out[name]=b
 return out
old=pack(pub/'free-0534-f4dda62c94b4.pck');new=pack(pub/(m['stem']+'.pck'));changed=sorted(p for p in old.keys()|new.keys() if old.get(p)!=new.get(p));scene=next(p for p in new if p.endswith('app.scn'));assert len(old[scene])==len(new[scene])==679;scene_diff=[i for i,(a,b) in enumerate(zip(old[scene],new[scene])) if a!=b];assert scene_diff==[503,504,505,506]
assert new[scene][486:495]==b'node_ids\0' and struct.unpack_from('<II',new[scene],495)==(32,1)
mp3=next(p for p in new if p.endswith('.mp3str'));mp3_import='assets/audio/quiet-background-v5-94bpm-32bars.mp3.import';wave=next(p for p in old if p.endswith('.sample') and 'quiet-background-v5-' in p);wave_import='assets/audio/quiet-background-v5-94bpm-32bars.wav.import'
assert set(changed)=={scene,mp3,mp3_import,wave,wave_import,'.godot/uid_cache.bin','data/assets.json'},changed
assert not any('quiet-background-v5-' in p and (p.endswith('.sample') or p.endswith('.wav.import')) for p in new)
assert b'AudioStreamMP3\0' in new[mp3] and (f/'assets/audio/quiet-background-v5-94bpm-32bars.mp3').read_bytes() in new[mp3]
assert struct.pack('<III',6,2,1) in new[mp3][-32:],'Serialized loop=true missing'
source_import=(f/mp3_import).read_bytes();assert new[mp3_import].rstrip(b'\0\n')==source_import.split(b'[deps]')[0].rstrip(b'\n');assert b'loop=true' in source_import and b'loop_offset=0' in source_import
a=json.loads(old['data/assets.json']);b=json.loads(new['data/assets.json']);a['assets']['music']=b['assets']['music'];assert a==b and b['assets']['music'].endswith('.mp3')
assert sorted(p for p in new if p.startswith('data/maps/') and p.endswith('.json'))==['data/maps/arch-%d-arch-quarter-v2.json'%i for i in range(8)]
assert sorted(json.loads(new['data/balance.json'])['skills'])==['aftershock','orbital','relay']
assert all(old.get(p)==b for p,b in new.items() if p.endswith('.gdc'))
before=json.loads((q/'before-free-source.json').read_text());current={p.relative_to(f).as_posix():sha(p.read_bytes()) for p in f.rglob('*') if p.is_file() and '.godot' not in p.parts and p.name!='.DS_Store'};allowed={'AGENTS.md','README.md','data/assets.json','export_presets.cfg'};assert {p for p in before if before[p]!=current.get(p)}==allowed;assert set(current)-set(before)=={'assets/audio/quiet-background-v5-94bpm-32bars.mp3',mp3_import}
for a in m['artifacts']:
 data=(pub/a['file']).read_bytes();assert len(data)==a['bytes']<=25*1024*1024 and sha(data)==a['sha256'];raw=gzip.decompress(data) if a['encoding']=='gzip-payload' else data;assert sha(raw)==a['decodedSha256']
wasm=next(a for a in m['artifacts'] if a['file'].endswith('.wasm'));old_wasm=next(a for a in old_m['artifacts'] if a['file'].endswith('.wasm'));assert wasm['sha256']==old_wasm['sha256']
assert all((r/'out'/p.relative_to(r/'public')).read_bytes()==p.read_bytes() for p in [pub/a['file'] for a in m['artifacts']]+[r/'public/planet-patchup/play/index.html',r/'public/_headers'])
for p in (Path(m['scratch'])/'logs').glob('*.log'):
 text=p.read_text(errors='replace');assert not re.search(r'SCRIPT ERROR:|Parse Error:|^ERROR:',text,re.M)
old_size=next(a['bytes'] for a in old_m['artifacts'] if a['file'].endswith('.pck'));size=next(a['bytes'] for a in m['artifacts'] if a['file'].endswith('.pck'));result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'stem':m['stem'],'version':m['version'],'pck_entries':len(new),'identical_shared_entries':sum(old.get(p)==b for p,b in new.items()),'changed_package_paths':changed,'gdc_changes':[],'generated_scene_difference':{'field':'PackedScene._bundled.node_ids[0]','offsets':scene_diff,'source_scene_unchanged':True},'native_mp3_loop_serialized':True,'loop_offset_default':0,'original_wav_preserved_and_excluded':True,'free_source_files':len(current),'free_maps':8,'free_skills':3,'wasm_bytes_identical':True,'pck_before_bytes':old_size,'pck_after_bytes':size,'initial_main_files_before_bytes':old_size+wasm['bytes'],'initial_main_files_after_bytes':size+wasm['bytes'],'initial_main_file_reduction_percent':100*(old_size-size)/(old_size+wasm['bytes']),'free_build_exit_code':0,'site_build_final_exit_code':0,'initial_site_build_exit_code':1,'runtime_audio_game_or_browser_executed':False}
(q/'package-verification.json').write_text(json.dumps(result,indent=2)+'\n');shutil.copy2(r/'demos/planet-patchup/dist-godot-free/build-manifest.json',q/'build-manifest.json');print(json.dumps(result,indent=2))
