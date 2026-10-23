import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the structure harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-structure',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'structure-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/structure-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 전체 맵 · 구조 파단</title>');}},
 writeBundle(){renameSync(new URL('./dist-structure/free30.html',import.meta.url),new URL('./dist-structure/index.html',import.meta.url));}
}]});
