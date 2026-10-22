import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the paid harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-paid',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'paid-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/paid-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 유료판 화력 테스트</title>');}},
 writeBundle(){renameSync(new URL('./dist-paid/free30.html',import.meta.url),new URL('./dist-paid/index.html',import.meta.url));}
}]});
