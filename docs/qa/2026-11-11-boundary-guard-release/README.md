# Fragment boundary guard release · 2026-11-11

사용자는 로컬8806후보를 무료 웹·아이폰 모두에 반영하도록 승인했다. 최신0.5.60배경 디자인을 기준으로 경계 보정만 채택했다. 기존 물리 벽 상단(y=-height)에 천장을 추가하고, 충돌/힌지 적분이 영역을 뚫으면 동일한 몸체·픽셀ID를 최소 이동으로 안쪽에 유지한다. 모양·질량·위력·보상 수치는 유지하며, 비정상 보정 시 바깥 방향 속도만 취소한다. 카메라 끝을 물리 벽으로 쓰지 않는다. 최근16회 경계 보정을 기존 journal 체크포인트에 덧붙인다.

원래 아이폰1-3에서 보이지 않았던28픽셀이 실제 이탈했는지는 아직 미확정이다. 이번 변경은 확인한 열린 천장/복구 부재를 보완한 것이며, 해당 간헐 버그 해결을 입증한 것은 아니다.

웹과 네이티브의 경계 구현4파일은 바이트 동일. 로컬 fixture·QA능력치·진단UI설정은 가져오지 않았다. 기존 개인 진행·앱ID·저장 경로·숨김진단 스위치 기본OFF 유지. 맵·아트·강화·스킬·수집·종료·광고·네이티브 C++모듈은 이전판과 동일하다.

네이티브0.5.61(71) import/compile/pack/Xcode Release와 deep strict 서명 검증 통과. 기존앱 com.roy.planetpatchup.godotcompare에 삭제/초기화/실행 없이 덮어 설치, sequence4676. 무료웹 import/compile/export 및 site webpack build 통과. 배포/실제 정적HTTP 결과는 delivery.json에 별도 기록한다. 게임·씬·시뮬레이션·브라우저·기기 앱을 실행하지 않았다. 물리 느낌·화면·FPS·저장 동작은 사용자 확인 대기.

- 공개 URL: <https://roylab.pages.dev/planet-patchup/play/>
- 로컬 후보: <http://127.0.0.1:8806/game.html?v=boundary-1>
- 새 네이티브 후보: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-boundary-guard-2026-11-11/`
- 롤백: native0.5.60(70), `qa/ios-layered-backdrop-2026-11-11/delivery.json`; Web free-0541-de43994c2e71. 이전 source/app/assets/manifest는 보존한다.

[소스범위](source-verification.json), [네이티브패키지](native-package.json), [웹패키지](release-manifest.json), [전달](delivery.json). 개인 프로필 fixture와 원본 기기 로그는 공개 저장소에 올리지 않는다.
