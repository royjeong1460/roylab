# 무료 웹 BGM 리소스 축소 · 2026-11-03

사용자가 음악 리소스를 줄이도록 요청한 수정이다. 현재 v5 곡을 원본 WAV에서 MP3 192kb/s·44.1kHz·스테레오로 한 번 인코딩하고 Godot 기존 재생 코드로 제공한다. 원본 WAV와 효과음, 기존 재생·설정·저장·물리·무료 해금 범위를 유지한다. MP3는 손실 압축이므로 청감 동일이나 루프 경계 완벽함을 측정했다고 주장하지 않는다.

| 정적 파일 | 이전 바이트 | 변경 바이트 | 감소 |
| --- | ---: | ---: | ---: |
| 음악 소스/배포용 음원 | 14,412,300 | 1,962,361 | 86.38% |
| gzip 게임 PCK | 16,202,232 | 5,432,455 | 66.47% |
| 동일 엔진+PCK | 25,671,480 | 14,901,703 | 41.95% |

- `encode.json`, `audio-frame-verification.json`: 원본·MP3 SHA256, 변환 인자, 유효 프레임3,603,064개/81.7021315초 동일. 청취·게임 실행 없음.
- `build-manifest.json`, `package-verification.json`, `pck-entry-sha256.json`: 새 `free-0534-c5a7a90dd912` 패키지290항목의 무결성. 기존 공유285항목, 모든 `.gdc`·효과음·WASM 바이트 유지. MP3 내장·native loop=true·원본 WAV 제외. UID 캐시의 과거 WAV 경로 문자열은 자산이 아니다.
- 장면 원본은 같다. 생성 장면의 유일한 차이는 `_bundled.node_ids[0]` 4바이트(503–506), 단일 루트 생성 식별자다. 나머지 장면 바이트·스크립트·노드·연결은 같다.
- `free-build.log`, `godot-logs/`: import/check-only/export/Vite/무료 정적 가드 종료0. `site-build.log`: Next 정적 빌드 최종 종료0. `site-build-initial.log`의 첫 실패는 로컬 외부 node_modules 심볼릭 링크였고, 무시되는 로컬 의존성만 실제 폴더로 복제해 해결했다. Next 설정·코드·패키지 의존성 변경 없음.
- `verify-package.py`: 파일만 읽는 정적 검증기. Godot/게임/브라우저/기기/오디오를 실행하지 않는다. 생성된 PCK import에는 remap만 남고 import 매개변수는 제거되므로 원본 import와 내장 AudioStreamMP3 속성을 각각 확인한다.
- `source-review.md`: 독립 소스·실제 PCK 리뷰, 차단 사항 없음. 게임·브라우저·기기·음악 청취·시뮬레이션·테스트와 저장 데이터 읽기는 수행하지 않았다.
- 배포 후 커밋·Cloudflare·정적 HTTP 해시·주 저장소 동기화 근거는 `delivery.json`에 추가한다. iPhone 로딩 시간·음질·반복·토글/일시정지는 사용자 확인 대기다.

음원과 압축 패키지의 정적 크기 비교다. 실제 Safari 로딩 시간이나 발열 개선 측정 결과가 아니다. 유료 앱을 변경하거나 설치하지 않았다.
