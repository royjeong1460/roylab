import {defineConfig} from 'vite';
import {mkdirSync,writeFileSync} from 'node:fs';

export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-godot-shell',rollupOptions:{
 input:'src/godot-free/shell.js',output:{entryFileNames:'godot-shell-assets/[name]-[hash].js',
 chunkFileNames:'godot-shell-assets/[name]-[hash].js',assetFileNames:'godot-shell-assets/[name]-[hash][extname]'}
}},plugins:[{name:'godot-shell-manifest',writeBundle(options,bundle){
 const script=Object.values(bundle).find(f=>f.type==='chunk'&&f.isEntry)?.fileName;
 const css=Object.values(bundle).find(f=>f.type==='asset'&&f.fileName.endsWith('.css'))?.fileName;
 if(!script||!css)throw Error('Godot shell must emit a script and stylesheet.');
 mkdirSync(options.dir,{recursive:true});writeFileSync(new URL('./dist-godot-shell/shell-manifest.json',import.meta.url),JSON.stringify({script,css})+'\n');
}}]});
