# BUG-004 · 시작 화면 출동 시 저장 오류로 진입 차단

- 제보일: 2026-11-03 (Asia/Seoul).
- 상태: 재제보 · 화면 정리와 상세 사유 표시 수정 · 원래 저장 차단 사유 확인 대기.
- 대상: 현재 무료 웹 대화에서 제보. 이번 이미지에는 주소·브라우저·버전이 없어 실제 실행 환경은 별도 미확인.
- 사용자 관찰: 시작 화면에서 출동을 누르면 “진행을 저장하지 못했습니다. 이전 데이터는 유지됩니다.” 표시.
- 기대: 기존 진행을 보존하면서 정상적으로 출동하고, 불가능하면 실제 복구 원인을 안내한다.

## 소스에서 확인한 경로

- `demos/planet-patchup/godot-free/app/screens.gd`: 홈 출동 버튼은 tutorial=intro이면 `app.start_run("tutorial")`, 그 외에는 맵 선택으로 이동한다.
- `app/app.gd`: `start_run()`이 `journey.start()` 실패를 `_failure_text()`로 표시한다. reason=storage를 위의 일반 저장 오류 문구로 바꾼다.
- `campaign/journey.gd`: `_begin()`은 기존 프로필 `store.read()` 실패 또는 `store.blocked`이면 새 저장 전부터 reason=storage를 반환한다. 이 경로에서는 출동과 후속 저장을 중단한다.
- `campaign/profile_store.gd`: JSON 파싱/스키마 검증 실패, 같은 revision의 서로 다른 내용, 복구 사본만 존재, 기존 recovery_notice 등이 읽기 차단 조건이다. 기존 Phaser 진행 이전이 실패해 recovery_notice가 설정된 경우도 가능하다. 어느 조건인지 사용자의 실제 저장을 읽지 않았으므로 확정하지 않는다.
- 이 문구만으로 저장 용량·브라우저 권한·세이브 충돌·음악 변경을 원인으로 단정하지 않는다. 원래 저장 쓰기 후 readback 실패는 별도의 storage-readback 사유이며 이번 일반 storage 문구와 구분한다.

## 확인 범위와 남은 작업

이미지와 사용자 응답, 현재 무료 소스만 조사했다. 게임·브라우저·기기·테스트·시뮬레이션을 실행하지 않았으며 사용자 저장을 읽거나 초기화·이전·수정하지 않았다. 실제 차단 사유 확인과 기존 진행을 보존하는 수정은 아직 수행하지 않았다. 사용자 완료 확인 없음.


## 2026-11-06 · Chrome 재제보

사용자가 Mac Chrome의 공개 웹 `free-0541-24c2dfba8fc8`에서 출동을 눌렀을 때 같은 저장 오류를 확인했다. 콘솔에 `can_process`, `!is_inside_tree()`와 `touch_cb`가 나타났다. Godot의 해당 검사는 이미 트리에서 제거된 노드를 입력 처리 중 접근했을 때 반환한다. 출동 실패 경고를 보여줄 때 기존 화면을 즉시 분리하는 경로를 확인했다.

- 화면은 먼저 숨기고 `queue_free()`가 입력 처리 이후 정리한다.
- 저장 읽기 차단 시 기존 상세 경고를 화면과 `Planet Patchup storage:` 콘솔 경고에 표시한다.
- 웹 import, compile, export, Next 빌드와 정적 PCK 확인을 완료했다. 원래 브라우저의 저장 차단 원인과 출동 성공은 사용자 확인 대기다.
