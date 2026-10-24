import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {routes,routeAliases,HUB} from './planet-routes.mjs';
const root=new URL('../public/',import.meta.url);
const marker='<script src="/planet-patchup/routes.js"></script>';
const clean=html=>html.replace(marker,'');
const card=r=>`<a class="card" href="${r.url}"><strong>${r.title}</strong><span>${r.description}</span><code>${r.url}</code></a>`;
export function syncPlanetRoutes(){
 mkdirSync(new URL('planet-patchup/',root),{recursive:true});
 writeFileSync(new URL('planet-patchup/routes.js',root),`// Shared links retain map selections and fragments. Assets stay at their original paths.\nconst destination=${JSON.stringify(routeAliases())}[location.pathname];\nif(destination)location.replace(destination+location.search+location.hash);\n`);
 for(const r of routes){
  const source=new URL(`games/${r.folder}/${r.file}`,root),original=clean(readFileSync(source,'utf8'));
  writeFileSync(source,original.replace('<head>','<head>'+marker));
  const target=new URL(r.url.slice(1),root);mkdirSync(target,{recursive:true});
  writeFileSync(new URL('index.html',target),original.replace('<head>',`<head><base href="/games/${r.folder}/">${marker}`));
 }
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Planet Patchup · 플레이 & 실험실</title><style>
 :root{font-family:system-ui,sans-serif;color:#263e36;background:#efeddf}*{box-sizing:border-box}body{margin:0}main{max-width:980px;margin:auto;padding:30px 24px 60px}header{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid #c4c9b6;padding-bottom:18px}header a{color:inherit;text-decoration:none;font-weight:750}header span{font-size:12px;color:#647367}h1{font-size:clamp(32px,6vw,52px);letter-spacing:-2px;margin:38px 0 12px}p{line-height:1.7;color:#57695f;margin:0 0 24px}.eyebrow{margin:32px 0 -26px;font-size:11px;letter-spacing:2px;font-weight:700}.card.hero{background:#294b3c;color:#fff9df;border:1px solid #294b3c!important;padding:26px!important;margin:24px 0}.hero span,.hero code{color:#e1e4cf!important}.hero strong{font-size:25px!important}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.card{display:flex;flex-direction:column;gap:10px;text-decoration:none;color:inherit;border:1px solid #bec6b2;border-radius:12px;background:#fbf9ee;padding:20px}.card:hover{border-color:#426b52;box-shadow:0 3px 0 #bfcab3}.card strong{font-size:18px}.card span{font-size:14px;line-height:1.5;color:#5d6b5b}.card code{font-size:11px;color:#66725f;overflow-wrap:anywhere;margin-top:auto}.card:focus-visible,summary:focus-visible{outline:3px solid #c67a42;outline-offset:3px}h2,summary{font-size:19px;font-weight:750}h2{margin-top:32px}details{margin-top:30px;border-top:1px solid #c4c9b6;padding-top:24px}summary{cursor:pointer;padding:4px 0 16px}details p{font-size:13px}.note{font-size:12px;margin-top:26px}footer{font-size:12px;color:#6a7668;margin-top:34px}@media(max-width:560px){main{padding:22px 16px 40px}.grid{grid-template-columns:1fr}header span{max-width:160px;text-align:right}h1{letter-spacing:-1.4px}.card{padding:18px}}
 </style></head><body><main><header><a href="/">← roylab</a><span>게임과 테스트를 한곳에서</span></header><p class="eyebrow">PLANET PATCHUP</p><h1>플레이 & 실험실</h1><p>플레이는 무료판에서, 비교는 실험실에서.<br>이 주소 하나를 저장해 두면 모든 버전을 찾아갈 수 있어요.</p>
 ${card(routes[0]).replace('class="card"','class="card hero"')}
 <h2>개발·테스트</h2><p>테스트용 화면이에요. 실험별 설정과 진행 기록은 기존 방식대로 유지돼요.</p><div class="grid">${routes.filter(r=>r.group==='test').map(card).join('')}</div>
 <details><summary>이전 비교 버전 · ${routes.filter(r=>r.group==='archive').length}개</summary><p>과거 물리와 조작을 비교할 때 사용하세요. 현재 플레이 기준과 다를 수 있어요.</p><div class="grid">${routes.filter(r=>r.group==='archive').map(card).join('')}</div></details>
 <p class="note">이전에 공유한 주소로 들어와도 해당 화면의 새 주소로 연결돼요. 맵 선택값과 저장 기록은 유지돼요.</p><footer>Planet Patchup · Roylab</footer></main></body></html>`;
 writeFileSync(new URL(HUB.slice(1)+'index.html',root),html);
}
if(process.argv[1]===fileURLToPath(import.meta.url))syncPlanetRoutes();
