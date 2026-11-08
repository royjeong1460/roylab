# BUG-016 · 로컬 웹이 시작 화면 전에 멈춤

- 제보/확인일:2026-11-08. 상태:수정 후 사용자가 ‘시작 화면이 뜸’ 확인. 로컬 시작 화면 진입 문제 해결.
- 환경:http://127.0.0.1:8805/game.html,0.5.56 좌표 수정 후보의 all-skills 로컬 실험실.
- 증상:HTML·JS·엔진/게임 WASM·PCK·확장 모듈이 HTTP200으로 내려왔지만 시작 화면 전 단계에서 멈춤.

## 원인

에이전트가 새 Web 확장 모듈을 빌드할 때 기존 `threads=no production=yes lto=full optimize=speed`를 명시하지 않고 SCons 기본값을 사용했다. 엔진은 기존 single-thread/non-shared-memory 구성인데, 새 모듈은 threads=true의 공유 메모리를 요구했다. 손상된 파일이나 서버 중단이 아니라 ABI 설정 불일치다. HTTP 상태/해시 확인은 파일 전달만 검증하므로 이 불일치를 잡지 못했다.

WASM을 실행하지 않고 import/target_features 메타데이터를 읽었다. 기존 정상 모듈은 memory flags0/no atomics, 잘못 만든 후보는 flags3/atomics, 수정 모듈은 flags0/no atomics다. 원본 실패 모듈/명령/로그는 native QA `qa/ios-static-fracture-2026-11-08/local-web-startup-fix/before/`에 보관한다.

## 수정과 확인

build-core.py의 Web 명령에 단일 스레드·production·LTO·최적화 옵션을 고정하고 동일 C++ 좌표 수정 소스를 재컴파일/링크했다. 로컬 Web export와10개 정적 HTTP 파일 해시를 다시 확인했다. 동일 origin·저장 namespace·테스트 설정·기록 수신기를 유지했고, 사용자에게 새로고침을 요청한 뒤 ‘시작 화면이 뜸’ 답변을 받았다. 물리 코드와 아이폰 앱0.5.56(66)은 이 웹 빌드 수정에서 변경하지 않았다. 플레이 체감/성능/저장 복원을 새로 검증했다는 뜻은 아니다.

수정 Web native 모듈 SHA256:667d8633d21ce1508878961ba504519990ede02b697874b42251324a7e0df18b. 무료 웹 후보 free-0541-2217fbb38ec0도 같은 모듈로 다시 준비했고8개 transport/decoded 산출물 해시를 확인했다. 이 조사 시점에는 공개 배포하지 않았다. 후속 사용자 요청에 따라 전체 업데이트 배포를 별도로 진행한다.

근거:`docs/qa/2026-11-08-static-fracture/web-startup-correction.json`. 에이전트는 게임·씬·브라우저·기기 앱을 실행하지 않았다. 시작 화면 확인은 사용자 답변에 근거한다.
