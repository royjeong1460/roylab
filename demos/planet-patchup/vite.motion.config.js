import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
// Reuse the game shell; only this build boots the motion harness and includes culture maps.
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-motion',target:'es2022',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'motion-test-entry',
 transformIndexHtml:{order:'pre',handler(html){return html.replace('/src/free30/main.js','/src/motion-lab/main.js').replace(/<title>.*?<\/title>/,'<title>Planet Patchup · 낙하·회전 속도 실험실</title>');}},
 writeBundle(){renameSync(new URL('./dist-motion/free30.html',import.meta.url),new URL('./dist-motion/index.html',import.meta.url));}
}]});
