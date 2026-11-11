# Planet Patchup 공통 버전과 성능 수정 기록

현재 기준은 [버전 원장](planet-patchup-versions.json)으로 관리한다. 웹과 iPhone은6지역·일반36곳/보스6곳·튜토리얼·스킬10개를 무료 제공한다. iPhone0.5.56(66)의 고정 좌표 조회 수정과 같은 파괴 설정을 웹에 채택한다. 웹 셸 버전 표시는0.5.41을 유지하며 실제 산출물은 content-hash와 behaviorRevision으로 구분한다. 플랫폼 간 FPS·체감 일치는 사용자 확인 범위다.

## 채택 기준과 보관본

|기준|변경과 이유|검증·상태|되돌릴 곳|
|---|---|---|---|
|0.5.18~0.5.34|정지 잔해 검사 캐시, 받침 연결 중복 검사, 균열 탐색/충돌체 재사용, 작은 조각의 모래 전환, 표면 휴면, 최종 회수/강화 UI|당시 상세 검증과 후기 관측은 Godot GODOT-008/012/015 기록과 각 QA폴더 참고. 과거 Mac CPU값을 iPhone FPS로 사용하지 않는다.|각 native QA/delivery/rollback 기록|
|v35|움직인 몸체 중심 격자 갱신 실험|FPS악화 제보로 채택 제외. godot/ 과거 작업 트리는 최신 소스가 아니다.|v34보존|
|g38 ·0.5.38(47)|핵심 연산 C++이전 비교판|사용자 iPhone17Pro영상에서 압력 확산475.9ms/전체619.2ms최악 프레임 관측. C++전환만으로 반복 조회가 없어지지는 않았다.|cpp-core-2026-11-03|
|g39 ·0.5.39(48)|몸체 자세를 픽셀마다 조회하던 것을 스캔당1회로 변경, 즉시 압력 재료 재사용, 잔해 목록/렌더 증분 갱신|새 사용자영상 최악82ms. 동일 입력의 정밀 비교가 아니므로 개별 최적화 기여율/개선 배율은 확정하지 않는다. 모래12076개가 휴면인데27.6FPS, 모래0.3ms/렌더CPU참고22ms로 표시 경로 의심.|perf-g39-2026-11-03 원본/설치앱|
|g40 ·0.5.40(49)|정지 모래32×32논리칸 이미지 구역, 움직이는 모래만 MultiMesh, 이동·수집된 구역만 다시 업로드|물리/스킬/수집 코드와 ID/보상/RNG유지. 컴파일·서명·설치3716확인, 사용자는 "나쁘지 않아". 정량 FPS/전상황무오류를 확인한 것은 아니다.|g39앱과 guarded rollback|
|0.5.40-free|같은 C++코어를 Emscripten4.0.20/Godot4.6.2단일스레드WASM으로 빌드, 무료어댑터·저장·음악·콘텐츠 유지|실제 배포/HTTP 상태는 버전 원장 및 QA/delivery를 따른다. 게임/브라우저실행은 사용자 담당.|bda5601및보존된0534불변파일|

## 어디를 먼저 볼까

1. 폭파 순간 끊김: 압력 후보/탐색/손상/밀기, 큰 몸체 좌표 변환, 연결/균열/충돌체 생성. 같은 맵·장비·버전과 공격 시점을 기록한다.
2. 쌓인 모래 뒤 느려짐: 휴면/활동/낙하 수, 표시 묶음/개별/구역/갱신 누적, 렌더CPU/GPU참고값을 본다. 정지하면 개별 표시가 줄고 갱신 누적이 안정되는지를 사용자영상으로 확인한다.
3. 아무것도 안 해도 느려짐: 활성 몸체/충돌쌍/지지 계산과 렌더·대기를 분리한다. 미계측값을 GPU문제로 단정하지 않는다. 진단 자체 관찰 부하/온도/화면녹화 영향도 별도다.
4. 수집·그림 누락: 이전/새 셀, chunk경계, 깨어난 픽셀/수집/팔레트/최종 회수 전환을 확인한다. 수집 ID/보상 코드를 먼저 바꾸지 않는다.

배터리5회 터치는 진단ON/OFF이며 기본OFF다. 코드·패키지·설치/배포·사용자 실제 검증은 각각 기록한다. 진단을 켠 FPS를 일반 플레이 성능 확정값으로 쓰지 않는다.

## 미확인 제보

2026-11-03 사용자가 g40에서 잠깐 멈춘 듯한 사례를 언급했으나 영상/재현 근거가 없어 이번에는 건너뛰기로 했다. 원인 확정·수정 완료·반복 발생으로 취급하지 않는다. 재발 시 버전/맵/스킬/공격 전후영상부터 수집한다. 정지 몸체18개의 지속 지지 검사와 큰 동시 붕괴의60FPS유지는 후속 관찰 항목이다.

## 보존한 증거

[QA 색인](qa/2026-11-03-common-g40/README.md)에 원본 소스 해시, 변경 패치, 웹코어/템플릿/SDK출처, 무료 제한 보존과 빌드·배포·HTTP검증을 연결한다. 실제 영상과 기기 식별정보/저장파일은 공개 저장소·웹 패키지에 넣지 않는다. 네이티브 원본 QA와 장치 설치 영수증은 로컬 variants/godot-paid-port에 보관한다.


## 2026-11-06 · 0.5.41 unified free campaign

The g40 release now includes all six regions, 42 campaign sites plus the tutorial, and ten skills on both platforms. The home and region list show `?` after the sixth region. The previous web test entry leads to the unified game. iOS build 50 installed as sequence 3868. The preceding web release and iOS g40(49) are the rollback reference.

[Release evidence](qa/2026-11-06-unified-godot/README.md)


## 2026-11-07 · occupied-only map storage / iOS0.5.50(60)

All43 campaign/tutorial maps and the standalone fallback now omit empty cells using `occupied-runs-v1`. Decode restores the exact original fields, pixel IDs, colors, role/module arrays and module order before existing physics.44/44 full static file roundtrips matched. The43 campaign JSONs total44,480,199 →7,531,845bytes;6-Boss3,597,098 →620,584bytes while retaining47,156 occupied pixels. Physics, skills, upgrades, collection, rewards and save paths are unchanged.

Web `free-0541-ae30a3e88329` published;13 static HTTP responses plus transport/decoded payload hashes verified. Engine cache stem stays `godot-web-ec83eba66e3c`. iOS0.5.50(60) was signed and update-installed as sequence4276 without launch. Smaller plain data is not a measured loading-speed improvement; compressed web PCK is278,708bytes larger. Rollback: native0.5.49(59), web `free-0541-b7399322186d`; restore loader and map format together.

[Storage and delivery evidence](qa/2026-11-07-sparse-maps/README.md)

## 2026-11-08 · 고정 건물 좌표 조회 수정 채택

고정/분리 상태의 압력·주변 균열 좌표 조회를 동일하게 적용하도록 C++의 읽기 전용 Dictionary 참조 오류 두 곳을 수정했다. 폭파 반경/스킬 강도 수치는 유지한다. 이미 승인한 reduced-map/중간값/압력 scope도 현재 로컬·iPhone과 같은 설정으로 웹에 반영한다.0.5.56(66)은 iPhone에 sequence4372로 설치되어 있으며, 사용자가 현재 로컬 상태의 전체 업데이트를 승인했다.

로컬 Web에서 공유 메모리를 요구하는 모듈을 non-threaded 엔진과 혼용한 빌드 오류(BUG-016)는 threads=no/production/LTO 옵션 고정으로 복구했다. 사용자 시작 화면 진입 확인을 받았다. 공개 Web 배포·HTTP 결과는 별도 [전달 기록](qa/2026-11-08-static-fracture-release/README.md)에 남긴다. 기존 저장 경로·진행은 초기화하지 않는다.

공개 전달 완료: release96f9626 / Pages84347a84-322b-4632-b96a-f0c583311bb7 / web free-0541-6ee74427fb5e.15개 정적 HTTP 및 encoded/decoded 해시 확인. iPhone0.5.56(66) 설치본은 동일하게 유지.

## 2026-11-11 · 상단 진단 정보 기본 숨김

무료 웹과 iPhone의 진단 UI를 기본 숨김으로 요청받았다. 강제 attack_trace를 끄고 성능 표시 기본false를 유지하며, 기존 diagnostics.cfg의 visible=true는 새 visibility_revision1이 없으면 읽지 않는다. 배터리5회 터치의 이후 선택은 revision1과 함께 저장된다. 진행·강화·물리·스킬·수집 코드는 유지하며 숨김 설정만 바꾼다. iPhone0.5.57(67) 빌드/서명 준비와 실제 설치 상태는 [전달 기록](qa/2026-11-11-diagnostics-hidden/README.md)에 구분한다.

전달 완료: web free-0541-cfbbdac90df2 / release4706b99 / Pages284aa495-0ee7-44ab-8301-1e383f38d60c,15개 정적 HTTP/decoded hash 확인. iPhone0.5.57(67) sequence4512 설치. 앱/브라우저 시각·플레이 확인은 사용자 범위.
