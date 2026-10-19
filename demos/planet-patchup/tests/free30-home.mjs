import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {initHome} from '../src/free30/home.js';
const main=readFileSync(new URL('../src/free30/main.js',import.meta.url),'utf8');

test('home dialogs open, close, and release before changing to the workshop',()=>{
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{open:false,hidden:false,close(){this.open=false},showModal(){this.open=true},querySelector(){return this.closeButton||= {}},getBoundingClientRect(){return {top:0,width:0,height:0}}});return nodes.get(id)};
 const doc={getElementById:get,querySelectorAll:()=>[get('home-options-dialog'),get('home-zones-dialog')].filter(d=>d.open)};
 const previous=globalThis.ResizeObserver;let observed=false,disconnected=false;
 globalThis.ResizeObserver=class {constructor(fn){this.fn=fn}observe(){observed=true;this.fn()}disconnect(){disconnected=true}};
 try{
  const destroy=initHome(doc);assert(observed);
  get('home-options').onclick();assert(get('home-options-dialog').open);
  get('home-options-dialog').closeButton.onclick();assert(!get('home-options-dialog').open);
  get('home-zone-link').onclick();assert(get('home-zones-dialog').open);
  get('home-zones-dialog').closeButton.onclick();get('home-zones').onclick();assert(get('home-zones-dialog').open);
  const context={document:doc,dispose:()=>{},screen:id=>{assert(!get('home-zones-dialog').open);assert.equal(id,'workshop')},profile:()=>{},renderOffers:()=>{}};
  vm.createContext(context);
  const close=main.match(/function closeDialogs\(\)\{[^\n]+/)[0];
  const workshop=main.match(/function workshop\(\)\{[^\n]+/)[0];
  vm.runInContext(close+'\n'+workshop,context);context.workshop();
  destroy();assert(disconnected);
 }finally{globalThis.ResizeObserver=previous}
});

test('every controller target remains unique and available after moving home details',()=>{
 const html=readFileSync(new URL('../free30.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const m of main.matchAll(/\$\('([^']+)'\)/g))assert(ids.includes(m[1]),m[1]);
 for(const id of ['home-zones','home-options','dispatch','workshop-open'])assert(ids.includes(id));
});
