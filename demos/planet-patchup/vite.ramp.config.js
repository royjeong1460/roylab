import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the ramp harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-ramp',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'ramp-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/ramp-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 1·3·5칸 · 점진 회전 비교</title>');}},
 writeBundle(){renameSync(new URL('./dist-ramp/free30.html',import.meta.url),new URL('./dist-ramp/index.html',import.meta.url));}
}]});
