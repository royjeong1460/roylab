# Roylab / Planet Patchup

## 작업 범위와 완료 기준

- 변경 전에 기존 수정과 요청한 실행판을 확인한다. 하나의 관찰 가능한 목표를 기준으로 수정하고, 관련 구현과 검증을 요청한 완료 기준까지 진행한다.
- 화면에 표시한 위치, 참고 이미지, 유지할 요소를 요구사항으로 사용한다. 음성 피드백은 관찰·기대 동작·재현 조건으로 정리하고, 불명확한 대상이나 수치만 확인한다.
- 시각 변경은 같은 맵·화면 크기·진행 상태로 전후를 비교한다. 물리 문제는 맵·부품 번호·시점과 실행 로그를 연결해 조사한다.
- 정적 시안, 실행 게임 적용, 자동 검사, 브라우저 확인, 실제 기기 플레이, 배포는 각각 확인한 범위로 보고한다. 진단 도구의 관찰 부하가 있는 실행을 FPS 측정에 쓰지 않는다.
- 기존 작업과 저장 데이터를 보존한다. 실험과 특정 실행판의 동작은 해당 설정·어댑터에 한정하고, 공통 코드 변경 시 이를 사용하는 무료판과 유료 앱의 영향을 확인한다.

## 소스와 실행판

- `app/`은 Next.js 사이트다. 현재 무료 웹은 `demos/planet-patchup/godot-free/`의 Godot 0.5.9 프로젝트이며, 브라우저 연결부는 `src/godot-free/`다. 기존 Vite/Phaser 소스와 `paid-app/`은 보존한다. 현재 유료 네이티브 Godot는 상위 작업 폴더의 `variants/godot-paid-port/` 지침을 먼저 확인한다.
- 무료판은 웹버전, 유료판은 앱버전이다. 큰 디자인·기능 업데이트와 공용 코드 변경은 두 판에 함께 반영한다.
- 유료판은 웹 미리보기나 Vite 빌드만으로 업데이트를 완료하지 않는다. 최신 자산을 네이티브 프로젝트에 동기화하고 iOS 앱 빌드까지 확인한다. 무료 웹 공개 배포와 유료 앱 기기 설치 여부는 각각 별도로 보고한다.
- 유료판을 수정하면 사용자의 연결된 개발용 iPhone에 업데이트 설치까지 기본으로 진행한다. 기존 앱 ID와 저장 데이터를 유지하고 앱 삭제·초기화 없이 덮어 설치한다. 설치와 실행 여부를 확인하며, 연결·잠금·개발 서명 문제로 설치할 수 없으면 기기용 빌드 준비 상태와 막힌 이유를 구체적으로 보고한다.
- 현재 무료판 빌드는 `demos/planet-patchup/scripts/build-godot-free.mjs`다. `npm run build:game -- --free`가 이를 실행한다. `vite.free.config.js`와 `src/arch/main.js`는 이전 Phaser 무료판 보관본이다. 무료판 범위, 저장 이전과 배포는 [무료 Godot README](demos/planet-patchup/godot-free/README.md)를 따른다.
- Godot의 게임플레이·브라우저·기기·체감·발열 검증은 사용자가 한다. 에이전트는 테스트·씬·시뮬레이션·브라우저·기기 앱을 실행하지 않는다. 소스 검토, import/compile/export, 정적 패키지·HTTP 확인과 배포만 수행하고 확인 범위를 구분해 보고한다.
- 무료판은 첫 지역의 일반 6맵·보스·튜토리얼, 기존 3스킬, 패시브/액티브 각 1칸을 유지한다. 다른 5지역은 잠긴 미리보기이며 유료 맵·스킬 데이터는 무료 패키지에 포함하지 않는다. 원래 브라우저 저장을 보존하고 별도 Godot 저장 영역으로 검증 이전한다.
- 주소와 별칭의 기준은 `scripts/planet-routes.mjs`, 설명은 [주소 문서](docs/planet-addresses.md)다. 생성된 진입 HTML과 리다이렉트는 생성 스크립트로 갱신한다.
- QA는 해당 실행판의 별도 저장 영역을 사용하고 같은 origin을 유지한다. `localhost`와 `127.0.0.1`은 저장소가 다르다. 초기화·마이그레이션은 해당 판의 키만 다룬다.
- 게임 배포 작업에는 `scripts/build-planet-demo.mjs`의 판별 옵션과 출력 경로를 확인한다. 사이트 빌드는 체크인된 `public/games/` 결과를 사용한다. 소스 수정만으로 배포된 게임이 갱신되지는 않는다.

## 변경에 맞는 검증

아래 명령은 각 작업 디렉터리에서 실행한다. 먼저 영향을 받는 검사를 고르고, 실패나 변경 범위가 요구할 때 넓힌다. 문구·지침만 수정할 때는 경로·명령·차이를 확인하면 된다.

| 변경 대상 | 작업 디렉터리 | 관련 명령과 안내 |
| --- | --- | --- |
| 사이트·주소 | 이 저장소 루트 | `npm test`, `npm run lint`, `npm run build` 중 해당 검사 |
| 현재 무료 Godot | `demos/planet-patchup/` | `npm run build:free`: import/compile/export 및 정적 패키지 확인. 플레이 검증은 사용자만 수행 |
| 초기 데모·실험판 | `demos/planet-patchup/` | `package.json`의 해당 판 테스트와 빌드; 기본 `npm test`는 초기 데모 검사 |
| 유료 앱 | `demos/planet-patchup/paid-app/` | `npm test`, `npm run build`; 기기·저장·네이티브 작업은 [앱 README](demos/planet-patchup/paid-app/README.md) |
| 캠페인 물리 진단 | `demos/planet-patchup/` | [캠페인 진단 README](demos/planet-patchup/src/campaign-debug/README.md) |
| 맵 1 물리 비교 | `demos/planet-patchup/` | [맵 1 진단 README](demos/planet-patchup/src/arch-debug/README.md) |

## 지침 유지보수

- 사용자 제보 버그는 `docs/bugs/README.md`에 등록하고 개별 기록에 재현 조건, 원인, 수정 내용, 검증 범위를 남긴다. 수정 후에는 사용자 확인 대기로 두고, 사용자가 완료를 확인하면 날짜와 확인 내용을 추가해 완료 처리한다.

반복해서 필요한 프로젝트 규칙은 이 파일에 짧게 남기고, 상세 절차는 관련 문서로 연결한다. 모델이나 실행 구조가 바뀌면 중복·충돌·낡은 경로를 정리한다. 과거 실험 수치와 임시 작업 내역을 상시 규칙으로 누적하지 않는다. `CLAUDE.md`는 이 파일을 참조하는 진입점으로 유지한다.

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 변경에 적용

사이트의 Next.js 코드·설정·프레임워크 의존성을 수정할 때는 설치된 버전의 `node_modules/next/dist/docs/`에서 해당 기능의 안내와 변경 사항을 확인한다.
<!-- END:nextjs-agent-rules -->
