(() => {
  const decks = [
    {
      id: "lower", label: "초등 저학년", words: [
        "토끼", "코끼리", "펭귄", "기린", "원숭이",
        "개구리", "고양이", "강아지", "거북이", "나비",
        "캥거루", "오리", "닭", "악어", "문어",
        "게", "뱀", "다람쥐", "물개", "공룡",
        "양치질", "세수하기", "머리 감기", "기지개 켜기", "하품하기",
        "줄넘기", "공 차기", "자전거 타기", "수영하기", "훌라후프",
        "비눗방울 불기", "풍선 불기", "손뼉 치기", "바닥 쓸기", "책 읽기",
        "우산 쓰기", "양말 신기", "문 두드리기", "안경 쓰기", "모자 쓰기",
        "아이스크림 먹기", "바나나 까기", "주스 마시기", "케이크 촛불 끄기", "도시락 먹기",
        "눈사람 만들기", "모래성 쌓기", "그네 타기", "미끄럼틀 타기", "꽃향기 맡기",
      ],
    },
    {
      id: "upper", label: "초등 고학년", words: [
        "양궁", "탁구", "볼링", "배드민턴", "농구 자유투",
        "야구 투수", "높이뛰기", "피겨 스케이팅", "스키 타기", "암벽 등반",
        "바이올린 켜기", "피아노 치기", "드럼 치기", "기타 치기", "오케스트라 지휘",
        "마술사", "미용사", "사진작가", "버스 운전사", "발레리나",
        "피자 반죽 돌리기", "달걀 깨기", "국수 뽑기", "김밥 말기", "프라이팬으로 전 뒤집기",
        "텐트 치기", "노 젓기", "연날리기", "보물지도 따라가기", "망원경 보기",
        "신발 끈 묶기", "목도리 뜨기", "빨래 널기", "창문 닦기", "선물 포장하기",
        "종이비행기 날리기", "팽이 돌리기", "제기차기", "딱지치기", "줄다리기",
        "두더지", "고릴라", "달팽이", "공작새", "박쥐",
        "얼음판에서 미끄러지기", "바람에 우산 뒤집히기", "비밀 일기 감추기", "나무 열매 따기", "무거운 상자 옮기기",
      ],
    },
    {
      id: "teen", label: "청소년", words: [
        "버스를 놓친 학생", "알람 끄고 다시 잠들기", "몰래 간식 먹기", "체육복 뒤집어 입기", "시험 종료 직전 답 쓰기",
        "발표 순서 기다리기", "까치발로 칠판 지우기", "졸다가 고개 떨구기", "친구와 자리 바꾸기", "지각해서 살금살금 들어오기",
        "단체 사진 타이머 맞추기", "단체 안무 센터 서기", "친구와 반쪽 하트 만들기", "이어폰 줄 풀기", "휴대폰 액정 필름 붙이기",
        "얼굴 인식 잠금 풀기", "충전기 꽂을 곳 찾기", "셀카 각도 찾기", "헤드폰 낀 채 춤추기", "방송 시작하는 진행자",
        "무음으로 응원하기", "승부차기 막는 골키퍼", "역전 골 세리머니", "배구 블로킹", "농구 심판의 타임아웃",
        "우주에서 둥둥 떠다니기", "로봇의 배터리 방전", "투명 벽에 갇힌 마임", "비행기 유도하는 직원", "현장 중계하는 기상 캐스터",
        "슬로모션으로 달리기", "뒤로 감기는 댄서", "레드 카펫 걷기", "런웨이에서 포즈 잡기", "냉면 가위로 자르기",
        "팝콘 먹다 영화에 놀라기", "매운 떡볶이 식히기", "마지막 과자 눈치 보기", "유리컵 탑 쌓기", "젓가락으로 콩 집기",
        "인형 뽑기 실패", "엘리베이터 문 잡기", "회전문 타이밍 놓치기", "빗속에서 택시 잡기", "바람에 날린 영수증 잡기",
        "물웅덩이 피해 걷기", "무거운 여행 가방 닫기", "잠결에 안경 찾기", "거울 속 친구 따라 하기", "생일 깜짝 파티 들키기",
      ],
    },
    { id: "custom", label: "커스텀", words: [] },
  ];
  const storageKey = "royworld.family-arcade.charades.v1";

  function parseWords(text) {
    return [...new Set(text.split(/[\r\n,，、]+/u).map(word => word.trim().normalize()).filter(Boolean))];
  }

  function shuffle(words) {
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    return words;
  }

  window.initCharades = function initCharades(root) {
    if (root.querySelector(".char-game")) return;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch {
      // Lists still work in a session when the browser disallows storage.
    }
    const lists = Object.fromEntries(decks.map(({ id, words }) => [
      id, typeof saved.lists?.[id] === "string" ? saved.lists[id] : words.join("\n"),
    ]));
    let selected = decks.find(deck => deck.id === saved.selected) || decks[0];
    let round = [];
    let index = 0;

    root.insertAdjacentHTML("beforeend", `
      <div class="char-game">
        <div class="char-config">
          <h2>제시어 고르기</h2>
          <div class="char-choices" role="group" aria-label="제시어 목록">
            ${decks.map(({ id, label }) => `<button type="button" data-char-tab="${id}" aria-pressed="false">
              <span>${label}</span><span class="char-deck-count"></span>
            </button>`).join("")}
          </div>
          <details class="char-editor">
            <summary>제시어 편집</summary>
            <label><span class="char-draft-label"></span><textarea rows="5" spellcheck="false" placeholder="예: 토끼, 피아노 치기, 연날리기"></textarea></label>
            <p>줄바꿈이나 쉼표로 제시어를 나누세요. 같은 제시어는 한 번만 뽑아요.</p>
            <p class="char-save-error" role="status" hidden>이 브라우저에서는 변경한 목록을 다음 방문까지 저장할 수 없어요.</p>
          </details>
          <button type="button" class="btn primary char-start" data-char-start>게임 시작</button>
        </div>
        <div class="char-play" hidden>
          <div class="char-stage" aria-live="polite" aria-atomic="true">
            <div class="char-word" data-char-word><span></span></div>
          </div>
          <div class="char-stage-footer">
            <button type="button" class="char-list-link" aria-label="제시어 목록으로 돌아가기">목록</button>
            <button type="button" class="btn primary char-next" data-char-next>다음</button>
          </div>
        </div>
        <div class="char-done" hidden>
          <h2>제시어를 모두 봤어요!</h2>
          <p class="char-finished-list"></p>
          <button type="button" class="btn primary" data-char-setup>목록으로 돌아가기</button>
        </div>
      </div>`);
    const find = selector => root.querySelector(selector);
    const setup = find(".char-config");
    const play = find(".char-play");
    const done = find(".char-done");
    const editor = find(".char-editor");
    const input = editor.querySelector("textarea");
    const start = find("[data-char-start]");
    const next = find("[data-char-next]");
    const word = find("[data-char-word]");
    const wordText = word.firstElementChild;
    const back = find("[data-char-setup]");
    const tabs = [...root.querySelectorAll("[data-char-tab]")];

    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ selected: selected.id, lists }));
        find(".char-save-error").hidden = true;
      } catch {
        find(".char-save-error").hidden = false;
      }
    }

    function updateCounts() {
      tabs.forEach(tab => {
        const count = parseWords(lists[tab.dataset.charTab]).length;
        tab.querySelector(".char-deck-count").textContent = `${count}개`;
        if (tab.dataset.charTab === selected.id) start.disabled = count === 0;
      });
    }

    function showList() {
      tabs.forEach(tab => tab.setAttribute("aria-pressed", String(tab.dataset.charTab === selected.id)));
      find(".char-draft-label").textContent = `${selected.label} 제시어 목록`;
      input.value = lists[selected.id];
      if (selected.id === "custom" && !input.value.trim()) editor.open = true;
      updateCounts();
    }
    tabs.forEach(tab => tab.addEventListener("click", () => {
      selected = decks.find(deck => deck.id === tab.dataset.charTab);
      showList();
      save();
    }));
    input.addEventListener("input", () => {
      lists[selected.id] = input.value;
      updateCounts();
      save();
    });

    // Measure real line wraps so user-written prompts also fit after a rotation.
    function fitWord() {
      if (play.hidden || !word.clientWidth || !word.clientHeight) return;
      let low = 1;
      let high = Math.ceil(word.clientHeight / 1.16);
      while (low < high) {
        const size = Math.ceil((low + high) / 2);
        word.style.fontSize = `${size}px`;
        if (wordText.scrollWidth <= word.clientWidth && wordText.offsetHeight <= word.clientHeight) low = size;
        else high = size - 1;
      }
      word.style.fontSize = `${low}px`;
    }
    function showWord() {
      wordText.textContent = round[index];
      word.classList.toggle("char-single-line", [...round[index]].length <= 7);
      fitWord();
    }
    start.addEventListener("click", () => {
      round = shuffle(parseWords(lists[selected.id]));
      if (!round.length) return;
      index = 0;
      setup.hidden = true;
      play.hidden = false;
      showWord();
      next.focus({ preventScroll: true });
    });
    next.addEventListener("click", () => {
      index++;
      if (index < round.length) {
        showWord();
        return;
      }
      play.hidden = true;
      done.hidden = false;
      find(".char-finished-list").textContent = `${selected.label} · 제시어 ${round.length}개`;
      back.focus({ preventScroll: true });
    });
    function returnToSetup() {
      play.hidden = true;
      done.hidden = true;
      setup.hidden = false;
      start.focus({ preventScroll: true });
    }
    find(".char-list-link").addEventListener("click", returnToSetup);
    back.addEventListener("click", returnToSetup);
    root.addEventListener("gameshow", fitWord);
    window.addEventListener("resize", fitWord);
    if (window.ResizeObserver) new ResizeObserver(fitWord).observe(word);
    document.fonts?.ready.then(fitWord);
    showList();
  };
})();
