import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {writeFileSync,renameSync} from 'node:fs';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist-demo',rollupOptions:{input:'demo.html'}},plugins:[{
 name:'demo-entry',closeBundle(){renameSync(new URL('./dist-demo/demo.html',import.meta.url),new URL('./dist-demo/index.html',import.meta.url));},generateBundle(){
  // Record the exact local source closure so roylab can rebuild this game independently.
  const files=[...this.getModuleIds()].map(id=>id.split('?')[0]).filter(id=>id.startsWith(root)&&!id.includes('/node_modules/'));
  writeFileSync(new URL('./demo-sources.json',import.meta.url),JSON.stringify([...new Set(files.map(id=>id.slice(root.length)))],null,2));
 }
}]});
