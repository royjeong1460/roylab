import {installTestEdition} from '../free30/edition.js';
installTestEdition({touchTap:true,findMap:()=>null,modalOpen:()=>false});
await import('../free30/main.js');
document.title='Planet Patchup · 모바일 튜토리얼 2';
document.querySelector('.home-title p').textContent='모바일 튜토리얼 2 · 톡 터치';
document.getElementById('test-label').textContent='모바일 튜토리얼 2 · 기존판과 별도 저장';
document.getElementById('home-map-maker').href='../planet-patchup-free/free30-map-editor.html';
document.getElementById('original-version').href='../planet-patchup-free/';
document.getElementById('original-version').textContent='← 기존 무료판';
document.querySelector('#home-options-dialog p.fine').textContent='모바일은 한 손가락으로 톡 터치하면 그 자리에 폭파 · 두 손가락 이동·확대는 폭파 취소 · 한 손가락으로 끌면 수집만 해요. PC는 기존 클릭 조작 그대로예요.';

for(const link of document.querySelectorAll('a[href="./free30-map-editor.html"]'))link.href='../planet-patchup-free/free30-map-editor.html';
document.querySelector('#pause-dialog p.fine').textContent='PC: 클릭 즉시 사용 · 모바일: 한 손가락으로 톡 터치한 위치에 폭파. 두 손가락은 폭파 없이 이동·확대. 끌면 민트색 잔해를 수집해요.';
