# BUG-015 · 가까운 지점 재폭파 시 반경이 갑자기 커지는 제보

- 제보일:2026-11-08. 상태:소스 경로 조사 완료·관찰 원인 미확정. 게임 코드는 변경하지 않음.
- 관찰:폭파한 뒤 그 주변을 다시 폭파했을 때, 작은 폭파 반경이 한 번 매우 커진 것으로 보임.
- 미확인:아이폰/공개 웹/로컬 여부, 맵·장비·패시브·타수, 실제 픽셀 제거 범위인지 애니메이션만 커졌는지. 사용자에게 플랫폼과 실제 파괴/표시 여부를 질문함.
- 조사 기준:CURRENT.json의 iPhone0.5.53(63), `qa/ios-destruction-midpoint-2026-11-07/project`와 해당 C++ 소스. 공개 웹 기록의 releaseCommit95d6c6d 원본도 대조함.

## 확인한 데이터 흐름

1. `world.gd:attack`은 매번 stats.bombRadius / bombPower의 숫자를 새 폭파 Dictionary에 넣음. `blast_unprofiled`가 그 radius를 로컬 숫자로 받아 `cut_at`과 blast 이벤트에 각각 전달함. 앞선 폭파의 반경을 더하거나 덮어쓰는 경로는 조사 범위에서 발견하지 못함.
2. `PPWorldKernel::cut`은 각 픽셀 현재 좌표와 클릭점 사이 거리 <= radius인 것만 직접 제거함. `PPWorldKernel::blast`는 별도의 stats.blastReach 안 조각/움직이는 모래에 힘을 줌. 직접 제거 반경과 밀치는 범위를 구분해야 함.
3. `skill_vfx.gd:process_events/_push`는 폭파 이벤트를 복사함. 기본 blast/shockwave/smoke는 전달된 radius로 그려지며, 이웃 공격의 반경을 누적하지 않음. 스프라이트 자체의 프레임 확장/이벤트 겹침은 실기 화면 확인이 필요함.
4. `impact_physics.gd:blast_halo_unprofiled`는 직접 제거 원보다 큰 범위에 별도 결합 손상을 줌. force=clamp((power/efficiency−1)*4,0,5), reach=radius+2+force*1.6. 같은 판·동일 장비라면 이 reach 자체도 클릭마다 고정임.
5. `PPEffectKernel::halo_bonds`는 world.bonds의 기존 손상 old에 added를 더함. `PPPixelKernel::groups`는 결합 손상이1에 도달하면 연결을 끊음. 따라서 이웃 클릭의 halo가 겹치는 곳은 첫 공격에서 버티다가 후속 공격에서 넓게 분리될 수 있음. 이것은 기본 반경 증가와 별도이며, 제보가 실제 넓은 파괴라면 우선 확인할 경로임.
6. 분리 후16픽셀 이하의 연결 없는 작은 조각은 모래가 됨. 몸체가18개를 넘으면 큰 순으로18개를 남기고 나머지 조각 전체를 모래로 바꾸는 기존 처리도 있음. 이 추가 전환은 직접 제거 원으로 제한하지 않음. 따라서 직접 제거 count와 전체 새 모래 수를 같다고 보면 안 됨.
7. Pressure Bloom(팽창 압력) 장착 시 유효 공격5회마다(해당 기본 구간 Lv5는4회) 반경2→11의 별도 필드가1.6초간 생김. 후속 폭파는3타마다 반경2.5의 추가 폭파를 주변에 배치함. 장착/타수 확인 없이 이들을 원인으로 단정할 수 없음.

## 최근 변경과의 관계

직접 폭파 반경, 패시브 처리와 VFX는0.5.53 중간값 변경에서 손대지 않았음. skill_physics.gd / presentation/skill_vfx.gd / impact_physics.gd는 공개 웹 releaseCommit95d6c6d의 소스와 byte-identical임. 직전 변경은 충돌 반응·연쇄·낙하 내부 균열5개 수치이며, 폭파 radius를 순간 증폭하는 코드는 추가하지 않았음.

## 다음 확인의 구분

- 기본 blast 이벤트의 radius가 달라지는지: 같은 업그레이드로 연속 공격 이벤트 radius 비교.
- radius는 같은데 직접 cut 후보만 원 밖인지: 픽셀 좌표·클릭점·거리와 radius 비교.
- 직접 제거는 정상인데 넓게 픽셀화되는지: blast-halo 결합 단절, fall/speed-fracture, chain-impact, 작은 파편 전환,18몸체 초과 전환을 분리.
- 이펙트만 커지는지: 기본 blast와 expand/echo/relay/orbital의 이벤트 종류·반경·동시 재생·카메라 줌 구분.

위는 향후 확인 항목이며 이번에 진단 코드를 추가하거나 게임을 실행한 결과가 아님. 소스 읽기와 파일 대조만 수행했고, 테스트·씬·시뮬레이션·브라우저·기기 앱 실행, 빌드/설치/배포는 하지 않았음. 버그 확정/수정 완료로 표시하지 않음.
