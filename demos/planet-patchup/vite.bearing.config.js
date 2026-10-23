import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the bearing harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-bearing',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'bearing-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/bearing-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 기둥 두께·하중 비교</title>');}},
 writeBundle(){renameSync(new URL('./dist-bearing/free30.html',import.meta.url),new URL('./dist-bearing/index.html',import.meta.url));}
}]});
