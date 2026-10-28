import {drawArchEnvironment,restorationTier} from './art-background.js';
export function renderEnvironmentReceipt(doc,images,result){
 let figure=doc.getElementById('arch-environment-result');
 if(!figure){figure=doc.createElement('figure');figure.id='arch-environment-result';figure.innerHTML='<canvas width="576" height="256" role="img"></canvas><figcaption></figcaption>';doc.getElementById('run-receipt').append(figure);}
 const tier=restorationTier(result.ratio),canvas=figure.querySelector('canvas');
 const label=tier===1?'100% 복원':tier===.7?'70% 복원':'복원 전';
 drawArchEnvironment(canvas.getContext('2d'),images,{width:576,height:256,floor:224,restoration:tier});
 canvas.setAttribute('aria-label',`${result.siteName} · ${label}`);figure.querySelector('figcaption').textContent=label;
 figure.dataset.restoration=String(tier);
}
