"""Static package/source inspection only. Does not load Godot or execute game code."""
from pathlib import Path
import datetime,gzip,hashlib,json,re,struct
q=Path(__file__).resolve().parent
r=q.parents[2]
f=r/'demos/planet-patchup/godot-free'
m=json.loads((r/'demos/planet-patchup/dist-godot-free/build-manifest.json').read_text())
pub=r/'public/games/planet-patchup-free'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert m['version']=='0.5.34-free'
for a in m['artifacts']:
 b=(pub/a['file']).read_bytes()
 assert len(b)<=25*1024*1024 and sha(b)==a['sha256'],a['file']
 raw=gzip.decompress(b) if a['encoding']=='gzip-payload' else b
 assert len(raw)==a['decodedBytes'] and sha(raw)==a['decodedSha256'],a['file']
 if a['file'].endswith('.pck'): data=raw
 if a['file'].endswith('.wasm'): assert raw[:4]==b'\x00asm'
assert data[:4]==b'GDPC' and struct.unpack_from('<I',data,4)[0]==3
base=struct.unpack_from('<Q',data,24)[0]; at=struct.unpack_from('<Q',data,32)[0]
count=struct.unpack_from('<I',data,at)[0]; at+=4; entries={}
for _ in range(count):
 n=struct.unpack_from('<I',data,at)[0]; at+=4
 name=data[at:at+n].rstrip(b'\0').decode(); at+=n
 off,size=struct.unpack_from('<QQ',data,at);at+=16
 md5=data[at:at+16];at+=16
 flags=struct.unpack_from('<I',data,at)[0];at+=4
 b=data[base+off:base+off+size]
 assert not flags and len(b)==size and hashlib.md5(b).digest()==md5 and name not in entries,name
 entries[name]=b
maps=sorted(x for x in entries if re.fullmatch(r'data/maps/[^/]+\.json',x))
expected=sorted('data/maps/arch-%d-arch-quarter-v2.json'%i for i in range(8))
assert maps==expected,maps
for p in (f/'data').rglob('*.json'):
 rel=p.relative_to(f).as_posix(); assert entries[rel]==p.read_bytes(),rel
assert sorted(json.loads(entries['data/balance.json'])['skills'])==['aftershock','orbital','relay']
assert not json.loads(entries['data/skill_expansion.json'])['skills']
assert 'data/source-manifest.json' not in entries
old=json.loads((q/'before-source.json').read_text())
stable=[p for p in old if p.startswith('data/maps/')]+['data/campaign.json','data/balance.json','data/skill_expansion.json','campaign/free_edition.gd','campaign/profile_store.gd','campaign/profile_schema.gd','campaign/progression.gd','campaign/economy.gd','campaign/catalog.gd','campaign/run_journal.gd','campaign/journey.gd','platform/free_web_bridge.gd','platform/legacy_profile.gd','platform/import_export.gd','assets/audio/quiet-background-v5-94bpm-32bars.wav']
for rel in stable: assert sha((f/rel).read_bytes())==old[rel],rel
for rel,payload in entries.items():
 if rel.endswith('.json') and rel.startswith('data/maps/'): assert sha(payload)==old[rel]
scratch=Path(m['scratch'])/'project'
source=lambda d:{p.relative_to(d).as_posix():sha(p.read_bytes()) for p in sorted(d.rglob('*')) if p.is_file() and '.godot' not in p.parts and p.name!='.DS_Store'}
live=source(f); frozen=source(scratch)
live_preset=live.pop('export_presets.cfg'); frozen.pop('export_presets.cfg')
assert live==frozen,'Source changed after exporter snapshot'
# The existing builder injects only its pinned local export-template paths.
preset=(scratch/'export_presets.cfg').read_text()
preset=re.sub(r'(?m)^custom_template/(?:debug|release)=.*\n','',preset)
assert preset==(f/'export_presets.cfg').read_text(),'Unexpected exporter preset change'
project=(f/'project.godot').read_text()
assert 'config/version="0.5.34"' in project and 'config/custom_user_dir_name="PlanetPatchupGodotFreeWeb"' in project and 'performance_overlay=false' in project
assert 'var enabled := bool(ProjectSettings.get_setting("diagnostics/performance_overlay", false))' in (f/'performance_probe.gd').read_text()
old_public=json.loads((q/'before-public-files.json').read_text())
changed=[]
allowed={'public/games/planet-patchup-free/index.html','public/games/planet-patchup-free/shell-manifest.json'}
for name,h in old_public.items():
 assert (r/name).is_file(),'Deleted old file '+name
 if sha((r/name).read_bytes())!=h: changed.append(name)
assert set(changed)<=allowed,changed
html=(r/'public/planet-patchup/play/index.html').read_text()
assert m['stem'] in html and '<base href="/games/planet-patchup-free/">' in html
headers=(r/'public/_headers').read_text()
for a in m['artifacts']:
 if a['encoding']=='gzip-payload': assert '/games/planet-patchup-free/'+a['file']+'\n  Content-Type: application/gzip' in headers
assert not 'Content-Encoding:' in headers
result={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':m['version'],'stem':m['stem'],'pck_entries':len(entries),'map_paths':maps,'skills':['aftershock','orbital','relay'],'stable_free_source_paths':len(stable),'source_count':len(source(f)),'source_drift':[],'old_public_files_preserved':len(old_public),'expected_old_mutable_entries_changed':changed,'sourceHash':m['sourceHash'],'package_payloads_and_decoded_hashes':'all match','max_asset_bytes':max(a['bytes'] for a in m['artifacts']),'game_tests_browser_or_device_executed':False}
(q/'package-verification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
