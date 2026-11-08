"""Loopback static server and user-generated journal checkpoint receiver."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import json,hashlib,threading
root=Path(__file__).resolve().parent
lock=threading.Lock()
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(root/'public'),**kwargs)
 def end_headers(self):
  self.send_header('Cross-Origin-Opener-Policy','same-origin')
  self.send_header('Cross-Origin-Embedder-Policy','require-corp')
  self.send_header('Cache-Control','no-store')
  super().end_headers()
 def do_POST(self):
  if self.path!='/local-records': self.send_error(404);return
  try:
   size=int(self.headers.get('Content-Length','0'))
   if size<=0 or size>2*1024*1024: self.send_error(413);return
   origin=self.headers.get('Origin','')
   if origin and origin not in ('http://127.0.0.1:8805','http://localhost:8805'): self.send_error(403);return
   record=json.loads(self.rfile.read(size))
   if not isinstance(record,dict) or record.get('schemaVersion')!=1 or not isinstance(record.get('id'),str) or len(record['id'])>256: self.send_error(400);return
   file=root/'records'/(hashlib.sha256(record['id'].encode()).hexdigest()[:24]+'.json')
   with lock:
    previous=json.loads(file.read_text()) if file.exists() else {}
    if record.get('checkpointAt',0)>=previous.get('checkpointAt',0):
     temp=file.with_suffix('.tmp');temp.write_text(json.dumps(record,ensure_ascii=False));temp.replace(file)
   self.send_response(204);self.end_headers()
  except (ValueError,TypeError,OSError):self.send_error(400)
ThreadingHTTPServer(('127.0.0.1',8805),Handler).serve_forever()
