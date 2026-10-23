import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the tilt harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-tilt',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'tilt-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/tilt-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 1·3·5칸 · 받침 회전 보정</title>');}},
 writeBundle(){renameSync(new URL('./dist-tilt/free30.html',import.meta.url),new URL('./dist-tilt/index.html',import.meta.url));}
}]});
