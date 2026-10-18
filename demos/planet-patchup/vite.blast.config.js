import {defineConfig} from 'vite';
import {renameSync} from 'node:fs';
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-blast',rollupOptions:{input:'blast-step1.html'}},plugins:[{
 name:'blast-entry',closeBundle(){renameSync(new URL('./dist-blast/blast-step1.html',import.meta.url),new URL('./dist-blast/index.html',import.meta.url));}
}]});
