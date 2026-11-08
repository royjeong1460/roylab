"""Compile/export only; never plays the game."""
from pathlib import Path
import subprocess,re,json,hashlib
root=Path(__file__).resolve().parent
engine='/Users/roy/Developer/breakout/.tools/Godot.app/Contents/MacOS/Godot'
for name,args in [('import',['--editor','--import','--quit']),('compile',['--check-only','--script','res://app/app.gd']),('export',['--editor','--export-release','Web',str(root/'public/game.html')])]:
 with (root/'logs'/f'{name}.log').open('w') as log:
  subprocess.run([engine,'--headless','--path',str(root/'project'),*args,'--log-file',str(root/'logs'/f'{name}-engine.log')],stdout=log,stderr=subprocess.STDOUT,check=True)
 text=(root/'logs'/f'{name}.log').read_text()
 assert not re.search(r'SCRIPT ERROR:|Parse Error:|^ERROR:',text,re.M),name
 print(name+': passed',flush=True)
html=root/'public/game.html';html.write_text(html.read_text().replace('<title>Planet Patchup Godot</title>','<title>Planet Patchup · Local Blast Lab</title>'))
(root/'public/index.html').write_text('<meta http-equiv="refresh" content="0;url=game.html">')
files={str(f.relative_to(root/'public')):hashlib.sha256(f.read_bytes()).hexdigest() for f in (root/'public').rglob('*') if f.is_file()}
(root/'build-manifest.json').write_text(json.dumps({'baseline':'0.5.55(65)','files':files,'gameplayTested':False},indent=2)+'\n')
