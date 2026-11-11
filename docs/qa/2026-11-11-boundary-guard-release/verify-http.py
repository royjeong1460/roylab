#!/usr/bin/env python3
"""Read static production bytes only; never start an engine/browser."""
from pathlib import Path
import urllib.request,json,hashlib,gzip
q=Path(__file__).resolve().parent;repo=q.parents[2];m=json.loads((q/'release-manifest.json').read_text());base='https://roylab.pages.dev';records=[]
def fetch(path,expected=None):
 req=urllib.request.Request(base+path,headers={'Accept-Encoding':'identity','User-Agent':'PlanetPatchup-static-delivery-verification'})
 with urllib.request.urlopen(req,timeout=50) as r: body=r.read();status=r.status;headers=dict(r.headers)
 if expected is not None:
  if body!=expected and headers.get('Content-Encoding','').lower()=='gzip':body=gzip.decompress(body)
  assert body==expected,'HTTP bytes differ: '+path
 records.append({'path':path,'status':status,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),'contentType':headers.get('Content-Type'),'contentEncoding':headers.get('Content-Encoding')})
 return body
html=fetch('/planet-patchup/play/',(repo/'public/planet-patchup/play/index.html').read_bytes());assert m['stem'].encode() in html
fetch('/games/planet-patchup-free/',(repo/'public/games/planet-patchup-free/index.html').read_bytes())
for a in m['artifacts']:
 body=fetch('/games/planet-patchup-free/'+a['file'],(repo/'public/games/planet-patchup-free'/a['file']).read_bytes())
 assert hashlib.sha256(body).hexdigest()==a['sha256']
 if a['encoding']=='gzip-payload':assert hashlib.sha256(gzip.decompress(body)).hexdigest()==a['decodedSha256']
for name in [m['shellScript'],m['shellCss'],m['stem']+'-manifest.json']:
 fetch('/games/planet-patchup-free/'+name,(repo/'public/games/planet-patchup-free'/name).read_bytes())
fetch('/planet-patchup/archive/free-phaser/')
fetch('/planet-patchup/tools/map-editor/')
result={'version':m['version'],'stem':m['stem'],'base':base,'records':records,'canonicalAndAllPublishedPayloadHashesMatch':True,'decodedHashesMatch':True,'gameOrBrowserStarted':False}
(q/'http-verification.json').write_text(json.dumps(result,indent=2)+'\n');print('Verified',len(records),'static production responses for',m['stem'])
