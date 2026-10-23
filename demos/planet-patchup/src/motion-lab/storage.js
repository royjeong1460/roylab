import {OPTIONS_KEY,TUNING_KEY,DEFAULT_OPTIONS,loadIdeaTuning} from '../ideas-lab/options.js';
// Seed from support first, then ideas; every write belongs only to the motion trial.
export function motionStorage(storage){
 const target=key=>{if(key!==OPTIONS_KEY&&key!==TUNING_KEY)throw Error('Unexpected key');return key.replace('ideas','motion');};
 return {getItem(key){
  const own=target(key),saved=storage.getItem(own);if(saved!==null)return saved;
  const seed=storage.getItem(key.replace('ideas','support'))??storage.getItem(key)??JSON.stringify({version:1,...(key===OPTIONS_KEY?{options:DEFAULT_OPTIONS}:{settings:loadIdeaTuning({getItem:()=>null}).settings})});
  try{storage.setItem(own,seed);}catch{/* Browsers with read-only storage can still run the trial. */}return seed;
 },setItem(key,value){storage.setItem(target(key),value);}};
}
