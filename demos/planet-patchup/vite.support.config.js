import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the support harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-support',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'support-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/support-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 받침 붕괴 비교 실험실</title>');}},
 writeBundle(){renameSync(new URL('./dist-support/free30.html',import.meta.url),new URL('./dist-support/index.html',import.meta.url));}
}]});
