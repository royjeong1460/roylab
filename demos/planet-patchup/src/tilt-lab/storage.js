// This experiment never reads or writes earlier editions' settings.
export function tiltStorage(storage){
 const target=key=>{if(!key.startsWith('planet-patchup-'))throw Error('Unexpected key');return key.replace('planet-patchup-','planet-patchup-tilt-');};
 return {getItem:key=>storage.getItem(target(key)),setItem:(key,value)=>storage.setItem(target(key),value)};
}
