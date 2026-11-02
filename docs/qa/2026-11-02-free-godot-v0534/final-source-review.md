# 무료 웹 0.5.34 최종 소스 검토

검토일: 2026-11-02. 검토자: 독립 소스 리뷰 에이전트.

## 판정

최종 통합 소스에서 남은 P1/P2 결함을 찾지 못했다. 승인한 무료판 경계와 공통 v34 변경에 부합하므로 **소스 검토 게이트를 통과**한다. 이는 빌드 산출물, 배포 성공 또는 사용자 게임플레이 검증을 대신하지 않는다.

검토 대상은 격리 작업 트리 `/private/tmp/planet-audio-release-20261029`, 기준 커밋 `80297fc`, 브랜치 `codex/free-godot-v0534-20261102`이다. 새 공통 소스는 유료판 `qa/workshop-wallet-skip-2026-11-02/project` 동결본과 비교했고, 이전 유료 기준은 `/private/tmp/pp-music-v5-v059-20261101/godot`을 사용했다. 유료 live v35 게임 코드는 사용하지 않았다.

## 발견 후 해소된 문제

- **P1: 보존된 무료 배경 코드와 새 호출의 불일치.** 초기 `app/play_view.gd`는 `CultureBackdrop.setup(world, region, restoration)`과 `environment_style()`을 호출했지만, 보존한 무료 `presentation/culture_backdrop.gd`는 2인자 `setup`만 제공했다. 정적 타입 호출 오류가 생길 수 있었다. 최종 소스는 기존 2인자 호출과 `GameSkin.culture_style(CultureBackdrop.THEMES[region])`로 돌아왔으며 양쪽 인터페이스가 일치한다. 유료 문화 자산이나 새 문화 렌더러를 추가하지 않았다.

## 확인한 경계

- **무료 콘텐츠와 저장:** Arch 튜토리얼·일반 6맵·보스, `aftershock/relay/orbital`, 패시브·액티브 각 1칸과 나머지 5지역 잠금이 유지된다. 독립 경계 검토에서 해금·경제·프로필·이전·브리지 코드, 8개 맵과 160개 에셋 파일은 기준 커밋과 동일했다. `PlanetPatchupGodotFreeWeb`, 무료 저장·설정 키, 원본 브라우저 저장 보존, 백업 및 Web Locks 경로도 유지된다. 셸의 변경은 빌드 표기이며 telemetry/feedback 계약은 바뀌지 않았다.
- **v35 제외:** `grain_physics`, `structure_physics`, `impact_physics`, `blackhole_physics`, `piece`, `source_random`, `section_graph`, `fracture_connectivity`, `grain_surface`, `collection_overlay`, `play_camera`, `play_layout`는 지정한 v34 동결본과 바이트가 동일했다. 수집 세션의 유료판 대비 차이는 무료 액티브 스킬 사용 목록이다. 무료 `world`의 기본 fixture 경로와 스킬 허용 범위는 유지된다. 문자 그대로 지정된 `preload/load` 리소스 경로 누락은 없었다.
- **수집과 UI:** 의미 있는 몸체 이동·새 파손·실제 구조 이벤트를 관찰하며, 정상 안정 조건과 무진행 2초 안전장치를 유지한다. 총 foreground 대기 3초 뒤 수동 시작이 가능하고 일시정지 시간을 제외한다. 자동·수동은 같은 시작 경로를 사용하며 중복 시작을 거부한다. 수동 시작은 즉시 결과 처리가 아닌 기존 흡수를 시작한다. 준비 중 회수율은 공백이고 중앙 카운터는 수집 시작 이후만 보인다. 페이드는 일시정지 시 멈추며 재개 뒤 이어진다.
- **강화 화면:** 보유 부품은 기존 정밀 금액 포맷터를 통해 헤더에 표시된다. 구매 성공 뒤 최신 프로필로 화면을 다시 만들며 가격·구매 검증은 보존된다. 긴 헤더에는 말줄임과 전체 툴팁이 있고 마우스 필터는 `PASS`다. 고정 하단 두 버튼 및 스크롤의 하단 예약 공간이 일치한다.
- **공개 진단 OFF:** `project.godot`의 `diagnostics/performance_overlay=false`와 `performance_probe.gd`의 실제 `enabled` 설정 경로를 함께 확인했다. 숨긴 패널만 끄는 방식이 아니다. `begin/end/frame/note_input`과 HUD 보고 수집은 enable 조건을 따른다. probe 파일 자체는 v34와 동일하다.
- **배포 구성:** 프로젝트·화면·셸 빌드 표기는 `0.5.34`, manifest는 `0.5.34-free`, 새 engine stem은 `free-0534-<hash>`다. builder는 이전 `free-059-*`와 새 stem의 gzip 헤더를 함께 유지하며 공개 target이나 기존 Phaser archive를 삭제하지 않는다. gzip payload 왕복 검사, 25 MiB 제한, 기존 exact-URL 압축 해제와 안정된 persistent path가 유지된다. 실제 산출물 검증은 별도 release gate다.
- **문구와 음원:** 신규 공유 한글 7개와 무료 0.5.34 빌드 정보 번역이 추가됐으며 기존 번역 값은 바뀌지 않았다. quiet v5 음원과 음악 음량식은 기준판 그대로다. 무료 AGENTS/README는 v34 기준, v35 제외, 저장 및 사용자 검증 경계를 설명한다.

## 검토 범위와 남은 검증

파일 읽기, diff, 해시 비교와 정적 리소스 경로 확인만 수행했다. 제품 소스는 수정하지 않았고 이 QA 보고서만 기록했다. 게임·씬·테스트·Godot 실행·브라우저·기기·telemetry 호출을 하지 않았다.

컴파일/내보내기/PCK 및 HTTP 검증은 릴리스 담당의 별도 기록을 따른다. 실제 터치·렌더링·저장 지속성·오디오·성능·게임 종료 체감은 사용자 확인이 필요하며, 이 소스 검토로 FPS 개선이나 이전 튜토리얼 멈춤 해결을 주장하지 않는다.
