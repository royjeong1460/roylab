# Godot 0.5.41 통합 출시 기록 · 2026-11-06

웹과 iOS에 6개 지역, 일반 현장 36개, 보스 6개, 튜토리얼, 스킬 10개를 제공한다. 홈과 지역 목록에서 마지막 지역 뒤에 `?`를 표시한다. 플레이 가능한 지역 수와 완료 기준은 여섯이다.

- 웹은 원래 주소와 저장 슬롯을 사용한다. 이전 웹 v4 프로필은 읽을 때 신규 스킬 7개와 구매 원장 항목을 0으로 추가한다. 기존 부품·기록·해금·환급을 유지하며 다음 정상 저장 때 기존 이중 슬롯 방식을 사용한다. 기존 Phaser 키와 원본 백업도 유지한다.
- 웹 빌드 `free-0541-24c2dfba8fc8`에 전체 맵을 넣었다. 웹과 iOS의 맵 43개와 밸런스 데이터가 바이트 단위로 일치한다. Godot import/compile/export, Next 정적 빌드, iOS 빌드와 서명 검증을 완료했다.
- `Planet Patchup` iOS 0.5.41(50)은 기존 개발 번들에 덮어 설치했다. 설치 결과 success, sequence 3868. 채택 g40(49)의 빌드와 소스는 롤백에 사용한다.
- 기존 `/planet-patchup/test/paid/` 링크와 과거 직접 주소는 통합 `/planet-patchup/play/`로 연결된다. 비교용 Phaser 페이지는 `/planet-patchup/archive/paid-phaser/`에 있다.
- 코드와 배포 파일을 확인했다. 앱 실행, 웹 플레이, 저장 복원과 `?`의 실제 화면은 사용자 확인 대상이다.

[패키지 검증](package-verification.json) · [빌드 원장](build-manifest.json)
