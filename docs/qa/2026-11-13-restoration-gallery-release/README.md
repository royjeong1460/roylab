# Restoration picture rewards · 2026-11-13

사용자가 로컬 보상·복원 기록 시안을 그대로 실제 게임에 적용하도록 승인했다.

각 문화권의 일반6맵과 보스1개, 서로 다른7개 최고기록이 정확히 recovered==total일 때 전체 경관1장을 해금한다. 총6장이다. 70% 이상 기록이 있으면 그림의 한 부분만 선명하게 보여주고, 전체 그림은 아직 잠긴 상태다. 홈의 업적 버튼에서 복원 기록6장·완전 복원 현장수·전체보기/확대를 제공한다. 새 그림의 첫 보상창은 결과 정산 저장에 성공한 뒤 표시한다.

기존 저장의 완전 복원 기록도 즉시 감상할 수 있다. optional artworkAwards ledger를 검증·추가하고, 첫 보상표시 플래그를 보상·최고기록·정산 receipt와 같은 저장 트랜잭션으로 기록한다. 체크포인트는 알림 플래그를 미리 소비하지 않는다. 기존 버전·잔액·업그레이드·맵ID·저장 경로·사용자 앱ID를 유지한다. 지역6 표시명은 Rock Sanctuary / 암벽 성역이며 내부 mosaic ID는 유지했다.

채택된 전체 경관6장과 가벼운 썸네일12자산만 추가했다. 실제 플레이 배경·지도형태·물리·스킬·강화/보상 수치·기존 수집 흐름은 이번 갤러리 범위에서 변경하지 않았다. 이전 소스와 바이너리는 롤백용으로 보존한다. 웹의 저장 이전·피드백·텔레메트리 어댑터는 유지했고, 피드백은 옵션·일시정지·결과에서 계속 접근한다. 새로운 웹 광고를 활성화하지 않았다.

네이티브0.5.62(72)는 import/compile-only/pack/Xcode Release/deep strict서명을 확인하고, 기존 com.roy.planetpatchup.godotcompare에 삭제·초기화·실행 없이 업데이트 설치했다(sequence4948). 처음 누락된 provisioning profile을 기존 개발계정의 Xcode 자동 갱신으로 해결했다.

웹 import/compile/export와 정적 사이트 webpack build를 확인했다. 실제 배포와 공개HTTP 결과는 delivery.json과 http-verification.json에서 별도로 확인한다. Web shell버전은 기존0.5.41을 유지하며 immutable package stem으로 이번 내용을 구별한다.

독립 정적 검토 후 포커스 복귀 시 화면이 닫히는 문제, 모달 키보드 포커스와 중첩 팝업 해제 흐름을 수정하고 재검토했다. 게임·씬·시뮬레이션·자동리플레이·브라우저 조작·기기 앱을 실행하지 않았다. 실제 화면·저장·최초 해금시점·터치/확대·성능은 사용자 확인 대기다.

- 공개 웹: https://roylab.pages.dev/planet-patchup/play/
- 네이티브 후보: variants/godot-paid-port/qa/ios-restoration-gallery-2026-11-13/
- 롤백: native0.5.61(71) / Web free-0541-86669d993e76.
- 그림 해금 기록을 유지하려면 롤백 시 프로필을 초기화하지 않는다. 이전 v4 스키마는 추가 필드를 보존한다.

[source checks](source-verification.json), [native package](native-package.json), [web package](release-manifest.json), [delivery](delivery.json).

## Final delivery

Web free-0541-b59b561881d2 / commit 1eb848471e42ea3823a90479a770dfdc7602f5ad / Pages 202a02db-5967-4b94-b6b0-55767f1314c3 succeeded.15production HTTP responses and encoded/decoded hashes match. iPhone0.5.62(72) update-installed sequence4948 without launch. Runtime/save/UI/feel verification remains user-owned.
