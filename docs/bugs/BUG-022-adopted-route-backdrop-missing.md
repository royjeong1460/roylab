# BUG-022 · 70% cleared site does not show adopted six-section backdrop

- Reported: 2026-11-14.
- User: “여섯구간 지금 아치지구에서 1-1 들어가봤는데 70프로 해금 된 상태인데 이미지가 안보여”.
- Version inspected: native0.5.62(72), Web free-0541-b59b561881d2.
- Target: User confirmed the scenery behind breakable structures on entering1-1.
- Expected: the selected stage's adopted panorama section appears after its best record reaches70%, with remaining decorative waste; at100% waste disappears. Normal1·2 outer,3·4 inner,5·6 central halves; boss central monument whole.
- Confirmed source cause: v0.5.62 added full panoramas only to the achievement gallery. app/play_view.gd still passes just region+best ratio to CultureBackdrop; culture_backdrop.gd uses the previous random object layout and has no adopted stage panorama mapping. This is a missing play-layer connection, not evidence of a bad70% record or cache.
- Implemented correction: copy the six adopted transparent architecture layers, map all42site IDs to exact source sections, retain terrain-aware decorative trash/ground and weather, select the section on entry using the existing per-site best-record snapshot.
- Preserve: gallery unlock/ledger, maps, physics, camera behavior, app/save IDs, economy, skills and records.
- Validation: source inspection performed. Runtime/scenes/browser/device play are user-only. Import/compile/export/package/source/HTTP/install evidence will be recorded separately.
- Status: native0.5.63(73) update-installed without launch (sequence4956). Web publication pending: Cloudflare login confirmed but project/deployment APIs return503. Same-package retry82659fc pushed; current public Web still serves previous stem and new manifest returns404. User confirmation pending.

## 2026-11-14 · 전체 메뉴 릴리스에 포함

배경 연결 수정은 iOS0.5.64(74)에 포함되어 업데이트 설치됐다(sequence4964, 실행 안 함). Web `free-0541-468c4227e5a1`도 공개됐으며 진입 HTML과 전체 payload의 압축 전후 HTTP 해시가 일치한다. 이전 실패 패키지를 따로 공개한 것은 아니다. 실제 아치1-1의70% 기록 배경, 구간 crop과 지형 가림은 사용자 확인 대기로 유지한다.

- 현재 상태: 웹·앱 전달 완료 · 사용자 확인 대기.
