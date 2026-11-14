# 메뉴 폰트 후보 조사 · 2026-11-14

현재 Godot와 로컬 메뉴 시안은 Galmuri11 Regular를 사용한다. 픽셀 게임 톤을 위한 선택이다. 이번 작업에서는 글꼴을 교체하지 않았다. 아래의 디자인 평가는 후보에 대한 제안이며 실제 게임에서의 렌더링·가독성 검증은 아니다.

| 후보 | 디자인 제안 | 공식 근거 |
| --- | --- | --- |
| Neo둥근모 Pro | 픽셀 톤을 유지하는 설명문 후보. 문자별 폭과 자간을 조정하는 가변폭 구성 | [소개](https://neodgm.dalgona.dev/neodgm_pro.html), [앱·게임 사용 FAQ](https://neodgm.dalgona.dev/downloads/neodgm_pro.html) |
| Galmuri11 Bold | 기존 톤을 유지하는 제목·버튼 후보. 합성 bold 대신 실제 Bold 파일 사용 | [글꼴 구성](https://github.com/quiple/galmuri), [OFL](https://github.com/quiple/galmuri/blob/main/ofl.md) |
| Pretendard | 긴 설명문 가독성을 우선할 때의 비픽셀 후보. 제목의 도트 글꼴과 본문을 구분하는 방향 | [공식 저장소](https://github.com/orioncactus/pretendard), [라이선스](https://github.com/orioncactus/pretendard/blob/main/LICENSE) |

세 후보는 공식 배포처에서 SIL OFL1.1 배포를 확인했다. 무료·유료 게임에 포함할 수 있으며, 글꼴 파일을 함께 배포할 때 해당 저작권 고지와 라이선스를 유지한다. 글꼴 단독 판매나 파생 폰트 이름 조건은 각 원문을 따른다. 게임 코드를 OFL로 공개하라는 뜻은 아니다.

픽셀 폰트는 글꼴만 바꾸는 것으로 끝내지 않고 실제390px 메뉴 폭·기기 배율에서 크기와 행간을 함께 비교해야 한다. Neo둥근모 공식 가이드는 일반 PC 화면에서16px 배수를 권장하며, 임의 굵기·기울임 적용을 피하도록 안내한다. [가이드](https://neodgm.dalgona.dev/guides.html)

우선 비교 제안: Neo둥근모 Pro를 설명문에, Galmuri11 Bold를 제목에 놓은 소형 비교부터 확인한다. 실제 채택·교체는 후속 선택 사항이다.
