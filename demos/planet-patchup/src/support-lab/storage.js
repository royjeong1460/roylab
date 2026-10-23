import {OPTIONS_KEY,TUNING_KEY,DEFAULT_OPTIONS,loadIdeaTuning} from '../ideas-lab/options.js';

export function comparisonStorage(storage){
 const keyFor=key=>{
  if(key!==OPTIONS_KEY&&key!==TUNING_KEY)throw Error('Unexpected comparison key');
  return key.replace('ideas','support');
 };
 return {
  getItem(key){
   const target=keyFor(key),saved=storage.getItem(target);if(saved!==null)return saved;
   const original=storage.getItem(key)??JSON.stringify({version:1,...(key===OPTIONS_KEY
    ?{options:DEFAULT_OPTIONS}:{settings:loadIdeaTuning({getItem:()=>null}).settings})});
   // Snapshot on first use so later changes to the original lab cannot change this comparison.
   try{storage.setItem(target,original);}catch{/* Reading remains usable with storage writes disabled. */}
   return original;
  },
  setItem(key,value){storage.setItem(keyFor(key),value);},
 };
}
