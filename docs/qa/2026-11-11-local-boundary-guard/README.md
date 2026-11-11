# Local fragment boundary guard · 2026-11-11

상태: 로컬 후보 반영 · 사용자 플레이 확인 대기. 공개 웹·아이폰 미반영.

사용자는 조각이 맵 밖으로 사라지면 안 된다고 정정했다. 기존 지형·좌우 충돌체는 유지하고, 기존 좌우 벽 상단(y=-height)에 천장을 추가했다. 카메라 끝을 새 벽으로 만들지 않으며, 기존 하늘 여유 공간은 유지한다.

`boundary_guard.gd`는 각 몸체의 점유 사각형 convex hull을 한 번 만들고 회전별 범위를 재사용한다. 실제 충돌이나 사용자 정의 힌지 적분이 경계를 뚫더라도 같은 몸체·픽셀 ID를 최소 거리만큼 안쪽으로 이동한다. 바깥 방향 속도 성분만 취소한다. 회전한 몸체가 영역에 들어갈 수 없으면 마지막으로 들어갔던 회전을 사용하고, 잘못된 좌표/속도는 마지막 안전 위치로 복원한다. 비정상 보정 직후에는 이전 위치 접촉으로 가짜 충격을 만들지 않도록 해당 틱 접촉 처리를 건너뛴다. 최근16개 보정을 기존 journal 체크포인트에 기록한다.

맵43개 지형 가로 범위에 빈 틈이 없으며 구조물의 원래 픽셀이 global floor_y보다 위에 있는지 정적으로 확인했다. 프레임마다 전체 픽셀을 스캔하는 로직은 추가하지 않았다. 물리 느낌·경계 반응·FPS는 플레이 미검증이다. 아이폰1-3의 숨은28픽셀이 실제로 맵 밖에 있었는지는 여전히 미확정이다.

## 후보와 검증

- 후보: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/local-boundary-guard-2026-11-11/`
- 로컬: <http://127.0.0.1:8806/game.html?v=boundary-1>
- 실행 서버: 이전 `local-finish-residue-2026-11-11` 서버의 `public/`만 교체. origin과 `PlanetPatchupFinishRepro20261111` 저장 영역, records 유지.
- import/compile/export 통과.10개 정적 파일HTTP200과 SHA256 일치. [검증](static-checks.json), [HTTP](http-verification.json), [패키지](build-manifest.json).
- 프로젝트 수정4개·추가2개. 나머지1377개 입력 파일, 개인 강화/장착 fixture, 맵, 스킬·경제·네이티브 모듈 해시 동일. 개인 fixture와 PCK는 저장소에 올리지 않는다.
- [물리 경계 변경 패치](source.patch). 이 패치는 로컬 후보에만 적용한 기록이며 공개 소스 반영을 뜻하지 않는다.

## 롤백

후보의 `before/live-public`이 교체 전8806패키지다. `before/project`의4개 파일과 `before/build.py`, `before/build-manifest.json`, `before/README.md`를 기존8806루트로 복원하고 새 `boundary_guard.gd`·UID를 제거한다. records와 브라우저 저장은 건드리지 않는다. 현재 공개 웹·아이폰은 다른 채팅에서 변경될 수 있어 CURRENT.json을 덮어쓰지 않았다.

사용자 확인: 1-3에서 고공 비행·좌우 경계 폭파 후 조각이 남거나 보이지 않는 경우 일시정지하고 알려주면 records의 `boundaryGuard`와 잔여 픽셀 좌표를 함께 확인한다. 에이전트는 게임·브라우저·기기를 실행하지 않았다.
