import {defineConfig} from 'vite';
export default defineConfig({base:'./',publicDir:false,server:{host:'127.0.0.1',port:8793,strictPort:true},build:{outDir:'dist-collapse-fall',rollupOptions:{input:['collapse-fall.html','collapse-lab.html']}}});
