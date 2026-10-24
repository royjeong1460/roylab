import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {routes,routeAliases} from '../scripts/planet-routes.mjs';
import {syncPlanetRoutes} from '../scripts/sync-planet-routes.mjs';
test('catalog preserves all shared paths and unique destinations',()=>{
 const map=routeAliases();assert.equal(routes.length,13);assert.equal(new Set(routes.map(r=>r.url)).size,13);
 assert.equal(map['/games/planet-patchup-blast/'],'/planet-patchup/archive/blast/');
 for(const r of routes)assert.equal(map[r.legacy],r.url);
});
test('generated pages are idempotent and resolve existing scripts/styles through original base',()=>{
 syncPlanetRoutes();const paths=routes.flatMap(r=>['public'+r.url+'index.html','public'+r.legacy+(r.file==='index.html'?'index.html':'')]);
 const before=paths.map(p=>readFileSync(p,'utf8'));syncPlanetRoutes();assert.deepEqual(paths.map(p=>readFileSync(p,'utf8')),before);
 for(const r of routes){const html=readFileSync('public'+r.url+'index.html','utf8'),base=new URL('/games/'+r.folder+'/', 'https://roylab.pages.dev');
  assert(html.includes(`<base href="${base.pathname}">`),r.id);
  for(const [,url] of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^\"]*)?)"/g))assert(existsSync('public'+new URL(url,base).pathname),url);
 }
});

import vm from 'node:vm';
test('legacy redirects preserve map/query/hash and canonical paths never loop',()=>{
 const script=readFileSync('public/planet-patchup/routes.js','utf8');
 for(const [pathname,target] of Object.entries(routeAliases())){
  let got;vm.runInNewContext(script,{location:{pathname,search:'?artMap=layout-tall&v=blast-1',hash:'#settings',replace:url=>got=url}});
  assert.equal(got,target+'?artMap=layout-tall&v=blast-1#settings');
 }
 for(const r of routes)vm.runInNewContext(script,{location:{pathname:r.url,replace(){assert.fail('redirect loop');}}});
});
