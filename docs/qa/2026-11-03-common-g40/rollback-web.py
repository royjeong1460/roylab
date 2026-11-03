#!/usr/bin/env python3
"""Guarded entry rollback only; retain all immutable assets and browser saves."""
from pathlib import Path
import argparse,hashlib,json,subprocess
here=Path(__file__).resolve().parent
repo=here.parents[2]
meta=json.loads((here/'rollback-web.json').read_text())
p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
prepared={}
for name,expected in meta['currentEntryHashes'].items():
 file=repo/name
 if hashlib.sha256(file.read_bytes()).hexdigest()!=expected:raise SystemExit('Entry drift: '+name+'; preserve newer work before rollback')
 prepared[name]=subprocess.check_output(['git','show',meta['baseCommit']+':'+name],cwd=repo)
print(json.dumps({'restoreEntries':list(prepared),'baseCommit':meta['baseCommit'],'retainAllAssets':True,'touchBrowserSaves':False,'apply':args.apply},indent=2))
if args.apply:
 for name,body in prepared.items():(repo/name).write_bytes(body)
 print('Entries restored only. Review diff, update version ledger, build/deploy, then verify HTTP. No game/browser started.')
