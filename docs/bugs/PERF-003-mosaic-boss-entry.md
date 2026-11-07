# PERF-003 · 6지역 보스 입장 로딩 지연

- 제보:2026-11-07. 상태:원인 조사·미계측. 실행 플랫폼과 첫 진입/재진입 여부는 미지정.
- 관찰:6지역 보스 로딩이 매우 길게 느껴진다. 사용자는 맵 용량을 원인 후보로 제시했다.
- 조사 기준:iPhone0.5.49(59) / 공개 웹 `free-0541-b7399322186d`의 동일 맵 데이터.
- 대상:`mosaic-boss-mosaic-terrain-frame-v1` / Patchwork Crown.

## 확인한 정적 수치

| 항목 | 수치 |
| --- | ---: |
| 파괴·수집 가능 픽셀 | 47,156 |
| 직전 하단 개구부 변경 전 픽셀 | 48,180 |
| 맵 가로×세로 | 640×512 |
| 빈칸 포함 전체 격자 | 327,680 |
| 원본 JSON | 3,597,098 bytes / 약3.60MB |
| JSON 단독 gzip 참고값 | 148,773 bytes / 약149KB |
| 구조 모듈 / 모듈 연결 | 24 /24 |

현재42개 캠페인 현장 중 파괴 가능한 픽셀 수가 가장 많다.1-1은2,000픽셀·115×157격자이므로 파괴 픽셀은 약23.6배, 전체 격자는 약18.1배다. 위 gzip은 파일 단독 비교용이며, 실제 개별 맵 다운로드량이 아니다. 현재 맵은 게임 PCK에 포함되어 있어 입장마다 별도 HTTP로 받는 구조가 아니다.

## 입장 경로에서 확인한 작업

1. `campaign/journey.gd:start`에서 저장 읽기와 맵 선택, `catalog.site(id)`의 JSON 읽기·파싱을 수행한다. 맵 캐시는2개이며 캐시 적중 시 파싱은 생략한다.
2. `app/play_view.gd:_ready`에서 World를 추가하며 초기화가 이어진다.
3. `world.gd:_ready`는 빈칸을 포함한 전체 격자의 원래 좌표 배열을 만든다.
4. `world.gd:reset`은 몸체 원본 행 정보, 점유·근접 배열, 원래 연결 그룹, 기본 지지력과 온전한 기둥의 지지력 보정을 준비한다. 초기 지지 계산은 두 보정 단계로 나뉜다.
5. 원래 픽셀 이미지 아틀라스 생성·GPU 업로드, 재료 목록 구성, 정적 사각형·충돌체·그림 메시 생성을 수행한다.
6. 문화별 배경과 카메라·VFX·UI를 준비한다.

이 작업들은 현재 입장 경로에서 동기식으로 호출된다. 파일 용량만 원인이라고 확정할 수 없고, 전체 격자 준비·연결/지지 계산·메시/충돌체 생성·첫 자산 로드가 초기 CPU/GPU 준비 비용 후보다. 각 단계의 시간이나 로딩 개선율은 아직 측정하지 않았다.

## 다음에 필요한 계측

저장 읽기/쓰기, 맵 JSON 읽기·파싱(캐시 적중 포함), 전체 좌표 배열, 원본 모듈 행, 연결 그룹, 지지 보정1/2, 아틀라스 생성/업로드, 재료 구성, 정적 충돌체/메시, 배경 자산과 최종 준비 완료를 구간별로 분리한다. 같은 기기의 첫 진입·재진입과1-1·5-Boss·6-Boss를 구분해야 한다. 현재 진단 HUD의 전투 프레임 수치만으로 입장 병목을 단정하지 않는다.

이번 작업에서는 계측 코드·로딩 방식·맵 크기·파괴 수치를 변경하지 않았다. 소스·JSON 정적 확인만 했으며 게임·씬·시뮬레이션·브라우저·기기 앱은 실행하지 않았다. 전체 맵 크기·용량과 파일 해시는 `docs/qa/2026-11-07-destruction-baseline/map-size-audit.json`에 보관한다.

## 2026-11-07 저장 형식 개선 후보

사용자 승인에 따라43개 현장/튜토리얼과 별도 fallback에서 빈칸을 저장하지 않는 occupied-runs-v1 형식을 적용했다.6보스 JSON은3,597,098 →620,584 bytes이며 픽셀47,156개와 전체640×512 좌표는 동일하다. 읽는 경계에서 기존 배열로 복원하고 원래 모듈 목록·픽셀 순서는 유지한다. 전체 파일 정적 복원 대조와 import/compile/export를 수행했다. 실제 진입 시간·메모리·FPS는 여전히 미측정이다. 최종 빌드/설치/배포 근거는 docs/qa/2026-11-07-sparse-maps/delivery.json에 별도로 기록한다.

##2026-11-07 storage optimization follow-up and reduced-pixel candidate

After0.5.50 storage changes, the user reports both map-entry pauses and explosion/collapse hitches; platform and exact map were not specified in that follow-up. These are reports, not measured regressions. Source inspection confirms occupied-runs expansion happens at map load, not in combat. Entry still restores dense grids and synchronously prepares original coordinates, support calibration, atlas, materials and colliders. Combat still processes due explosions and pending collision fractures synchronously; delayed skill actions are not a resumable per-frame work-budget scheduler.

The user approved reducing6-Boss pixels first. Comparison0.5.51(61) is installed as sequence4284:47,156 →30,394 pixels and640×512 →512×410 grid. The other42 maps remain unchanged.24 role modules/24 links/two assemblies are preserved by static data checks. Public web remains the0.5.50 data release. Timing/FPS and physical feel remain unverified pending user play. See docs/qa/2026-11-07-mosaic-lite/README.md. This is not marked resolved.

## 2026-11-07 · all-map reduced-pixel comparison

The user accepted the6-Boss reduction qualitatively and approved applying the method to other maps, retaining structure and originals, for further iPhone play. Comparison0.5.52(62) is update-installed as sequence4292. All43 campaign/tutorial maps total608,590 →391,069 occupied pixels (35.74% fewer versus original0.5.50); fallback is also reduced. All44 original module adjacency graphs are preserved by static file inspection, with no buried/cliff-attached/ungrounded cells. The accepted6-Boss output is byte-identical to0.5.51. Runtime physics/skill/economy/profile/collection source is unchanged. Exact FPS/loading/stability remains a user check. Public web is not deployed by this comparison. Original0.5.50 and boss-only0.5.51 candidates are retained. See docs/qa/2026-11-07-campaign-lite/README.md.

## 2026-11-07 · reduced-map direction adopted

The user approved continuing with the0.5.52 reduced-map direction and requested a planning summary for destruction-stat upgrades. Source registry now marks that geometry as adopted. Quantitative FPS/loading checks and new upgrade tuning remain separate; no new game parameters, prices or save values were changed. Public web deployment was not requested. The five-trait proposal remains draft in docs/destruction-traits-plan-2026-11-07.md.
