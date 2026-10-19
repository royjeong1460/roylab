import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-free',rollupOptions:{input:'free30.html'}},plugins:[{
 name:'free-entry',writeBundle(){renameSync(new URL('./dist-free/free30.html',import.meta.url),new URL('./dist-free/index.html',import.meta.url));}
}]});
