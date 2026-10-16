import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {test} from 'node:test';
const htmlFile=new URL('../free-step1.html',import.meta.url),mainFile=new URL('../src/free-step1/main.js',import.meta.url);
test('dedicated free region entry has required screens and makes payment boundary explicit',()=>{
 assert(existsSync(htmlFile),'new playable route required');const html=readFileSync(htmlFile,'utf8');
 for(const id of ['base','workshop','expedition','boss','next-region','playtest-report','export-report','pause-dialog','result-dialog','site-hint'])assert(html.includes(`id="${id}"`),id);
 assert(!/프랑스|에펠탑|PARIS|FRANCE|🇫🇷/.test(html));assert.match(html,/쌍봉 철탑/);assert.match(html,/결제/);assert.match(html,/src\/free-step1\/main.js/);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
test('UI IDs resolve, no inherited cheat tuning or selectable cutter patterns',()=>{
 assert(existsSync(mainFile));const main=readFileSync(mainFile,'utf8'),html=readFileSync(htmlFile,'utf8');
 for(const [,id] of main.matchAll(/\$\('([^']+)'\)/g))assert(html.includes(`id="${id}"`),id);
 assert(!/TuningStorage|tuningPanel|mountTuningPanel/.test(main));assert.match(main,/Step1Journey/);assert.match(main,/bossAdvice/);assert.match(main,/Blob/);assert(!html.includes('id="pattern"'));assert(!main.includes('selectPattern('));assert.match(html,/id="cutter-shape"/);
});
