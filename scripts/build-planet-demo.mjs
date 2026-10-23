import {execFileSync} from 'node:child_process';
import {cpSync,rmSync,mkdirSync,existsSync,lstatSync,unlinkSync} from 'node:fs';
const tutorial2=process.argv.includes('--tutorial2'),structure=process.argv.includes('--structure');
const blast=process.argv.includes('--blast'),free=process.argv.includes('--free'),paid=process.argv.includes('--paid'),ideas=process.argv.includes('--ideas'),support=process.argv.includes('--support'),motion=process.argv.includes('--motion'),bearing=process.argv.includes('--bearing'),ramp=process.argv.includes('--ramp'),tilt=process.argv.includes('--tilt');
if([tutorial2,structure,blast,free,paid,ideas,support,motion,bearing,ramp,tilt].filter(Boolean).length>1)throw Error('Choose only one edition: --blast, --free, --paid, --ideas, --support, --motion --bearing or --ramp or --tilt or --structure or --tutorial2');
const root=new URL('../',import.meta.url),demo=new URL('demos/planet-patchup/',root),out=new URL(tutorial2?'public/games/planet-patchup-tutorial2/':structure?'public/games/planet-patchup-structure/':tilt?'public/games/planet-patchup-tilt/':ramp?'public/games/planet-patchup-ramp/':bearing?'public/games/planet-patchup-bearing/':motion?'public/games/planet-patchup-motion/':support?'public/games/planet-patchup-support/':ideas?'public/games/planet-patchup-ideas/':paid?'public/games/planet-patchup-paid-test/':free?'public/games/planet-patchup-free/':blast?'public/games/planet-patchup-blast/':'public/games/planet-patchup/',root);
// npm ci can follow a linked node_modules and empty another working copy.
const dependencies=new URL('node_modules',demo);
if(existsSync(dependencies)&&lstatSync(dependencies).isSymbolicLink())unlinkSync(dependencies);
execFileSync('npm',['ci'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['test'],{cwd:demo,stdio:'inherit'});
if(tutorial2||free||paid||ideas||support||motion||bearing||ramp||tilt||structure)execFileSync('npm',['run','test:free'],{cwd:demo,stdio:'inherit'});
if(paid||ideas||support||motion||bearing||ramp||tilt||structure)execFileSync('npm',['run','test:paid'],{cwd:demo,stdio:'inherit'});
if(ideas||support||motion||bearing||ramp||tilt||structure)execFileSync('npm',['run','test:ideas'],{cwd:demo,stdio:'inherit'});
if(support||motion||bearing||ramp||tilt||structure)execFileSync('npm',['run','test:support'],{cwd:demo,stdio:'inherit'});
if(motion||bearing||ramp||tilt||structure)execFileSync('npm',['run','test:motion'],{cwd:demo,stdio:'inherit'});
if(bearing||ramp||tilt||structure)execFileSync('npm',['run','test:bearing'],{cwd:demo,stdio:'inherit'});
if(tilt||structure)execFileSync('npm',['run','test:tilt'],{cwd:demo,stdio:'inherit'});
if(ramp)execFileSync('npm',['run','test:ramp'],{cwd:demo,stdio:'inherit'});
if(tutorial2)execFileSync('npm',['run','test:tutorial2'],{cwd:demo,stdio:'inherit'});
if(structure)execFileSync('npm',['run','test:structure'],{cwd:demo,stdio:'inherit'});
execFileSync('npm',['run',tutorial2?'build:tutorial2':structure?'build:structure':tilt?'build:tilt':ramp?'build:ramp':bearing?'build:bearing':motion?'build:motion':support?'build:support':ideas?'build:ideas':paid?'build:paid':free?'build:free':blast?'build:blast':'build'],{cwd:demo,stdio:'inherit'});
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});cpSync(new URL(tutorial2?'dist-tutorial2/':structure?'dist-structure/':tilt?'dist-tilt/':ramp?'dist-ramp/':bearing?'dist-bearing/':motion?'dist-motion/':support?'dist-support/':ideas?'dist-ideas/':paid?'dist-paid/':free?'dist-free/':blast?'dist-blast/':'dist-demo/',demo),out,{recursive:true});

mkdirSync(new URL("licenses/",out),{recursive:true});
cpSync(new URL("node_modules/phaser/LICENSE.md",demo),new URL("licenses/Phaser-MIT.txt",out));
cpSync(new URL("node_modules/phaser/src/physics/matter-js/lib/license.js",demo),new URL("licenses/Matter-MIT.txt",out));
