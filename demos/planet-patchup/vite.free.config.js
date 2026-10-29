import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
export default defineConfig({base:'./',publicDir:false,define:{'import.meta.env.PP_FREE_WEB':true},build:{outDir:'dist-free',rollupOptions:{input:['free30.html','free30-map-editor.html','salvage-preview.html']}},plugins:[{
 name:'free-entry',transformIndexHtml:{order:'pre',handler(html,ctx){return ctx.filename.endsWith('free30.html')?html.replace('/src/free30/main.js','/src/arch/main.js'):html;}},writeBundle(){renameSync(new URL('./dist-free/free30.html',import.meta.url),new URL('./dist-free/index.html',import.meta.url));}
}]});
