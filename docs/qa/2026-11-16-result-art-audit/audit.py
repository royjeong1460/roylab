"""Read-only code/package/static HTTP audit. Never starts a Godot game or scene."""
from pathlib import Path
import json,hashlib,struct,gzip,urllib.request,re
q=Path(__file__).resolve().parent;repo=q.parents[2];port=Path('/Users/roy/Developer/sand/variants/godot-paid-port');current=json.loads((port/'CURRENT.json').read_text());native=port/current['project'];web=repo/'demos/planet-patchup/godot-free'
sha=lambda body:hashlib.sha256(body).hexdigest()
def unpack(data):
 assert data[:4]==b'GDPC' and struct.unpack_from('<I',data,4)[0]==3
 base=struct.unpack_from('<Q',data,24)[0];at=struct.unpack_from('<Q',data,32)[0];count=struct.unpack_from('<I',data,at)[0];at+=4;entries={}
 for _ in range(count):
  length=struct.unpack_from('<I',data,at)[0];at+=4;name=data[at:at+length].rstrip(b'\0').decode();at+=length
  offset,size=struct.unpack_from('<QQ',data,at);at+=16;digest=data[at:at+16];at+=16;flags=struct.unpack_from('<I',data,at)[0];at+=4
  body=data[base+offset:base+offset+size];assert flags==0 and len(body)==size and hashlib.md5(body).digest()==digest;entries[name]=body
 return entries
http=[]
def fetch(path):
 req=urllib.request.Request('https://roylab.pages.dev'+path,headers={'User-Agent':'PlanetPatchup-static-delivery-verification','Accept-Encoding':'identity'})
 with urllib.request.urlopen(req,timeout=60) as r:body=r.read();headers=dict(r.headers);status=r.status
 http.append({'path':path,'status':status,'bytes':len(body),'sha256':sha(body),'contentType':headers.get('Content-Type'),'contentEncoding':headers.get('Content-Encoding')})
 return body
html=fetch('/planet-patchup/play/');stem=re.search(rb'"mainPack":"(free-[a-z0-9-]+)\.pck"',html).group(1).decode();manifest=json.loads(fetch('/games/planet-patchup-free/'+stem+'-manifest.json'));a=next(a for a in manifest['artifacts'] if a['file']==stem+'.pck');raw=fetch('/games/planet-patchup-free/'+a['file']);assert sha(raw)==a['sha256'];decoded=gzip.decompress(raw) if a['encoding']=='gzip-payload' else raw;assert sha(decoded)==a['decodedSha256'];published=unpack(decoded)
app=port/'native/build'/current['candidate'];native_raw=(app/'PPGodotCompare.pck').read_bytes();signed_app=port/'native/build'/(current['candidate']+'-derived')/'Build/Products/Release-iphoneos/PPGodotCompare.app';assert (signed_app/'PPGodotCompare.pck').read_bytes()==native_raw;packaged_native=unpack(native_raw)
paths=['app/screens.gd','presentation/environment_receipt.gd','background.gd','presentation/culture_backdrop.gd','presentation/culture_route_panorama.gd','data/culture_routes.json','data/restoration_art.json']
source={}
for rel in paths:
 nb=(native/rel).read_bytes();wb=(web/rel).read_bytes();assert nb==wb,rel
 pairs={};payloads=[]
 for label,entries in [('native',packaged_native),('publicWeb',published)]:
  key=rel if rel in entries else rel+'.remap'
  assert key in entries,(rel,label);remap=key.endswith('.remap')
  if remap:
   target=re.search(rb'path="res://([^"]+)"',entries[key]).group(1).decode();assert target in entries;key=target
  body=entries[key];payloads.append(body)
  pairs[label]={'member':key,'sha256':sha(body),'compiledGDScript':remap,'plainSourceMatches':body==nb}
  if not remap:assert body==nb,(rel,label)
 assert payloads[0]==payloads[1],(rel,'native and Web packed payload differ')
 source[rel]={'sourceSha256':sha(nb),'packaged':pairs,'nativeAndWebPackedPayloadsMatch':True}

art=json.loads((native/'data/restoration_art.json').read_text());images=[]
for c in art['cultures']:
 rel=c['full'].removeprefix('res://');body=(native/rel).read_bytes();assert body==(web/rel).read_bytes() and sha(body)==c['sourceSha256'];images.append({'region':c['region'],'file':rel,'sha256':sha(body),'matchesAdoptedSource':True})
screens=(native/'app/screens.gd').read_text();assert 'elif int(receipt.get("regionIndex",0)) <= 0:' in screens and 'var illustration := EnvironmentReceipt.new()' in screens
assert 'const Background = preload("res://background.gd")' in (native/'presentation/environment_receipt.gd').read_text()
assert '"arch-building-a"' in (native/'background.gd').read_text()
result={'date':'2026-11-16','nativeVersion':current['version'],'nativeBuild':current['build'],'nativeCandidate':current['candidate'],'publicWebStem':stem,'matchesCurrentRelease':stem==current['webSync']['manifestStem'],'sourceAndPackagedFiles':source,'adoptedGalleryImages':images,'rootCause':'Non-chapter Arch Quarter result instantiates EnvironmentReceipt, which loads old background.gd and combines individual salvage/arch-building assets. It does not use culture_routes or restoration_art panorama. The normal-map branch is not gated on allClear; it also applies below100%. Other culture normal results have no image in this branch. Boss chapter branch uses text. Achievement reward/gallery uses the six adopted restoration images.','http':http,'productModified':False,'gameSceneTestBrowserDeviceExecuted':False}
(q/'evidence.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'native':current['version']+'('+str(current['build'])+')','publicWeb':stem,'sourceFilesConfirmedInBothPcks':len(source),'galleryImagesMatchAdoptedSource':len(images),'rootCauseConfirmed':True,'gameExecuted':False},ensure_ascii=False))
