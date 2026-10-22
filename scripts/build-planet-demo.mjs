import {execFileSync} from 'node:child_process';
import {cpSync,rmSync,mkdirSync,existsSync,lstatSync,unlinkSync} from 'node:fs';
const blast=process.argv.includes('--blast'),free=process.argv.includes('--free'),paid=process.argv.includes('--paid');
if([blast,free,paid].filter(Boolean).length>1)throw Error('Choose only one edition: --blast, --free or --paid');
const root=new URL('../',import.meta.url),demo=new URL('demos/planet-patchup/',root),out=new URL(paid?'public/games/planet-patchup-paid-test/':free?'public/games/planet-patchup-free/':blast?'public/games/planet-patchup-blast/':'public/games/planet-patchup/',root);
// npm ci can follow a linked node_modules and empty another working copy.
const dependencies=new URL('node_modules',demo);
if(existsSync(dependencies)&&lstatSync(dependencies).isSymbolicLink())unlinkSync(dependencies);
execFileSync('npm',['ci'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['test'],{cwd:demo,stdio:'inherit'});
if(free||paid)execFileSync('npm',['run','test:free'],{cwd:demo,stdio:'inherit'});
if(paid)execFileSync('npm',['run','test:paid'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['run',paid?'build:paid':free?'build:free':blast?'build:blast':'build'],{cwd:demo,stdio:'inherit'});
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});cpSync(new URL(paid?'dist-paid/':free?'dist-free/':blast?'dist-blast/':'dist-demo/',demo),out,{recursive:true});

mkdirSync(new URL("licenses/",out),{recursive:true});
cpSync(new URL("node_modules/phaser/LICENSE.md",demo),new URL("licenses/Phaser-MIT.txt",out));
cpSync(new URL("node_modules/phaser/src/physics/matter-js/lib/license.js",demo),new URL("licenses/Matter-MIT.txt",out));
