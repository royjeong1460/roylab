import {execFileSync} from 'node:child_process';
import {cpSync,rmSync,mkdirSync} from 'node:fs';
const blast=process.argv.includes('--blast');
const root=new URL('../',import.meta.url),demo=new URL('demos/planet-patchup/',root),out=new URL(blast?'public/games/planet-patchup-blast/':'public/games/planet-patchup/',root);
execFileSync('npm',['ci'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['test'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['run',blast?'build:blast':'build'],{cwd:demo,stdio:'inherit'});
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});cpSync(new URL(blast?'dist-blast/':'dist-demo/',demo),out,{recursive:true});

mkdirSync(new URL("licenses/",out),{recursive:true});
cpSync(new URL("node_modules/phaser/LICENSE.md",demo),new URL("licenses/Phaser-MIT.txt",out));
cpSync(new URL("node_modules/phaser/src/physics/matter-js/lib/license.js",demo),new URL("licenses/Matter-MIT.txt",out));
