import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-tutorial2',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'tutorial2-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/mobile-tutorial2/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 모바일 튜토리얼 2</title>');}},
 writeBundle(){renameSync(new URL('./dist-tutorial2/free30.html',import.meta.url),new URL('./dist-tutorial2/index.html',import.meta.url));}
}]});
