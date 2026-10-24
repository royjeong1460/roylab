export const HUB='/planet-patchup/';
export const routes=[
 ['free','play/','planet-patchup-free','무료 플레이','6개 현장과 보스 · 설정에서 기존/터치 조작 비교','play'],
 ['paid','test/paid/','planet-patchup-paid-test','유료판 테스트','문화권 6개 맵 + 보스 · 화력 프리셋과 수치 조절','test'],
 ['ideas','lab/maps/','planet-patchup-ideas','맵·스킬 실험','가로·세로·확장형 맵 · 폭파와 블랙홀 효과','test'],
 ['structure','lab/structure/','planet-patchup-structure','구조·하중 실험','기둥·몸통·지붕 구분 · 무료/유료 전체 맵 비교','test'],
 ['touch','lab/touch/','planet-patchup-tutorial2','모바일 터치 실험','손가락 위치에서 폭파 · 별도 진행 저장','test'],
 ['editor','tools/map-editor/','planet-patchup-free','맵 제작','로컬 파일 저장·불러오기 · 도형·픽셀 편집','test','free30-map-editor.html'],
 ['tilt','archive/tilt/','planet-patchup-tilt','기울어짐 보정','받침이 연결된 동안만 회전 보정','archive'],
 ['ramp','archive/rotation-ramp/','planet-patchup-ramp','시간별 회전 보정','시간에 따른 회전 배수 비교','archive'],
 ['bearing','archive/pillar-width/','planet-patchup-bearing','기둥 두께 비교','남은 기둥 두께·무게·무게중심 실험','archive'],
 ['motion','archive/motion/','planet-patchup-motion','낙하·회전 수치','중력·회전 반응·속도 제한 조절','archive'],
 ['support','archive/support/','planet-patchup-support','받침 분리','받침 손상 후 연결이 끊어지는 시점 비교','archive'],
 ['blast','archive/blast/','planet-patchup-blast','초기 폭파 데모','초기 폭파·블랙홀 플레이 버전','archive'],
 ['original','archive/original/','planet-patchup','초기 데모','초기 게임 비교용 보관본','archive'],
].map(([id,path,folder,title,description,group,file='index.html'])=>({id,url:HUB+path,folder,title,description,group,file,legacy:'/games/'+folder+'/'+(file==='index.html'?'':file)}));
export function aliases(route){return route.file==='index.html'?[route.legacy,route.legacy.slice(0,-1),route.legacy+'index.html']:[route.legacy,route.legacy.replace(/\.html$/,'')];}
export const routeAliases=()=>Object.fromEntries(routes.flatMap(r=>aliases(r).map(path=>[path,r.url])));
