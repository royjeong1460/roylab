# 청소 결과 이미지 연결 조사 · 2026-11-16

현재 결과 화면의 아치 일반맵 경관은 EnvironmentReceipt에서 이전 background.gd 기물 조합을 생성한다. 플레이 경관은 CultureRoutePanorama의 채택 구간을, 업적 보상은 restoration_art.json의 채택된 전체 그림을 사용하므로 결과 화면만 시각적으로 과거 버전이 남았다.

공개Web `free-0541-66ae4962a822`의 HTML·manifest·PCK를 정적 HTTP로 확인했다. 압축 전후 해시가 공개 manifest와 일치한다. iOS0.5.67(77) 설치용 PCK와 서명 앱 PCK도 동일하다. 관련7개 파일에서 양쪽 JSON/컴파일 GDScript payload가 같다. 현재 원본 소스도7파일이 동일하며 갤러리6그림의 원본 해시가 채택 데이터와 일치한다. 컴파일 스크립트는 실행하거나 디컴파일하지 않았다.

[조사 증거](evidence.json), [조사 스크립트](audit.py), [BUG-024](../../bugs/BUG-024-stale-cleanup-result-scenery.md).

100% 전용 이미지 조건은 아니다. regionIndex<=0의 비chapter 결과에서70%·100% 모두 옛 배경 조합을 사용한다. 다른 문화권 일반 결과는 이 이미지 분기가 없고, 보스chapter는 상태 문구만 있다. 사용자가 본 정확한 맵은 지정되지 않았다.

현재 요청은 확인만 수행했다. 제품 소스·아트·빌드·배포·설치·사용자 저장 변경 없음. Godot 게임·씬·테스트·브라우저 게임·기기 앱 실행 없음. 실제 화면·사용자 진행 상태를 재현했다고 주장하지 않는다.
