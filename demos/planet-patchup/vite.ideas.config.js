import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the ideas harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-ideas',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'ideas-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/ideas-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 파괴 아이디어 실험실</title>');}},
 writeBundle(){renameSync(new URL('./dist-ideas/free30.html',import.meta.url),new URL('./dist-ideas/index.html',import.meta.url));}
}]});
