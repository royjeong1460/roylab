import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../demo.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/free-step1/main.js',import.meta.url),'utf8');
test('demo provides every shared game control exactly once',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const [,id] of main.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(id),id);
 assert.match(html,/viewport-fit=cover/);assert.match(html,/data-demo="planet"/);
 assert.match(html,/data-tool="cutter"/);assert.match(html,/data-tool="bomb"/);assert.match(html,/data-tool="blackhole"/);
 assert(!html.includes('data-tool="hammer"'));
});

test('demo reserves no touch apron beside or below the field',()=>{
 assert(!html.includes('touch-surface'));assert(!html.includes('touch-apron'));
 const css=readFileSync(new URL('../src/demo/style.css',import.meta.url),'utf8');
 assert(!css.includes('#touch-surface'));assert(!/right:32px|bottom:64px/.test(css));
});
