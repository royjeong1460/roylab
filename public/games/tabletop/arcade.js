'use strict';

(() => {
  const byId = (id) => document.getElementById(id);
  const tabs = Array.from(document.querySelectorAll('.lab-tabs a:not([data-section=lab])'));
  const rules = {
    croc: '돌아가며 이빨을 하나씩 눌러요. 악어가 입을 덥석 닫으면 당첨!',
    bingo: '종이 빙고판을 준비해요. 다음을 누르면 1부터 25까지 한 번씩 불러줘요.',
    quiz: '문제를 보고 답을 말한 뒤 정답 보기를 눌러 확인해요.',
    charades: '단어를 본 사람이 말없이 몸으로 표현해요. 가족이 맞히면 다음을 눌러요.'
  };

  function shuffled(items) {
    const deck = [...items];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  const numberAudio = new Audio();
  let voiceTurn = 0;
  function stopVoice() {
    voiceTurn++;
    numberAudio.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  let utterance = null;
  const speech = window.speechSynthesis;
  if (speech) speech.getVoices();
  function sayNumber(number) {
    stopVoice();
    const turn = voiceTurn;
    const notice = byId('bingo-notice');
    notice.textContent = '';
    const playRecording = () => {
      if (turn !== voiceTurn) return;
      numberAudio.src = '/games/tabletop/audio/' + number + '.wav';
      numberAudio.play().catch(() => {
        if (turn === voiceTurn) notice.textContent = '기기의 소리 재생 설정을 확인해 주세요.';
      });
    };
    const voice = speech?.getVoices().find((v) => /^ko(?:[-_]|$)/i.test(v.lang));
    if (!voice || !window.SpeechSynthesisUtterance) {
      playRecording();
      return;
    }
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const tens = ['', '십', '이십'];
    utterance = new SpeechSynthesisUtterance(tens[Math.floor(number / 10)] + digits[number % 10] + ' 번');
    utterance.lang = 'ko-KR';
    utterance.voice = voice;
    utterance.rate = 0.88;
    const current = utterance;
    utterance.onerror = (event) => {
      if (current === utterance && !['canceled','interrupted'].includes(event.error)) {
        playRecording();
      }
    };
    try { speech.speak(utterance); } catch { playRecording(); }
  }

  let bag = [];
  const history = byId('draw-log');
  function resetBingo() {
    utterance = null;
    stopVoice();
    bag = shuffled(Array.from({length:25}, (_, i) => i + 1));
    history.replaceChildren();
    byId('draw-count').textContent = '0 / 25';
    byId('number').textContent = '빙고';
    byId('ball').className = 'bingo-ball';
    byId('draw').disabled = false;
    byId('bingo-notice').textContent = '';
  }

  byId('draw').addEventListener('click', () => {
    if (!bag.length) return;
    const n = bag.pop();
    const item = document.createElement('li');
    item.textContent = String(n);
    history.append(item);
    byId('draw-count').textContent = (25 - bag.length) + ' / 25';
    byId('number').textContent = String(n);
    byId('draw').disabled = !bag.length;
    const ball = byId('ball');
    ball.classList.remove('pulse');
    void ball.offsetWidth;
    ball.classList.add('drawn', 'pulse');
    sayNumber(n);
  });
  byId('bingo-reset').addEventListener('click', resetBingo);

  const quizText = byId('quiz-text');
  const fitBox = byId('quiz-fit');
  const quizAction = byId('quiz-action');
  const sourceLink = byId('quiz-source');
  let questions = [], position = 0, revealed = false;
  let quizFrame = 0;

  function fitQuiz() {
    cancelAnimationFrame(quizFrame);
    quizFrame = requestAnimationFrame(() => {
      if (!fitBox.clientWidth || !fitBox.clientHeight) return;
      let low = 13;
      let high = Math.floor(Math.min(fitBox.clientHeight * .87, fitBox.clientWidth * .43));
      quizText.style.fontSize = low + 'px';
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        quizText.style.fontSize = middle + 'px';
        if (quizText.offsetHeight <= fitBox.clientHeight && quizText.scrollWidth <= fitBox.clientWidth) low = middle;
        else high = middle - 1;
      }
      quizText.style.fontSize = low + 'px';
    });
  }

  function showQuiz() {
    const entry = questions[position];
    sourceLink.hidden = true;
    sourceLink.removeAttribute('href');
    quizAction.disabled = !questions.length;
    byId('quiz-progress').textContent = questions.length ? Math.min(position + 1, questions.length) + ' / ' + questions.length : '';
    if (!entry) {
      byId('quiz-meta').textContent = '';
      quizText.textContent = questions.length ? '모두 풀었어요!' : '준비된 문제가 없어요.';
      quizAction.textContent = '다시';
    } else {
      byId('quiz-meta').textContent = (revealed ? '정답' : entry.topic) + ' · 난이도 ' + entry.level;
      quizText.textContent = revealed ? entry.a : entry.q;
      quizAction.textContent = revealed ? (position + 1 === questions.length ? '마치기' : '다음') : '정답 보기';
      if (revealed && entry.source) {
        sourceLink.href = entry.source;
        sourceLink.textContent = entry.sourceTitle || '방송 출처';
        sourceLink.hidden = false;
      }
    }
    fitQuiz();
  }
  function resetQuiz() {
    const level = byId('difficulty').value;
    questions = shuffled((window.FAMILY_QUIZ || []).filter((item) => !level || item.level === level));
    position = 0;
    revealed = false;
    showQuiz();
  }
  byId('difficulty').addEventListener('change', resetQuiz);
  quizAction.addEventListener('click', () => {
    if (!questions[position]) { resetQuiz(); return; }
    if (revealed) position++;
    revealed = !revealed;
    showQuiz();
  });
  if (window.ResizeObserver) new ResizeObserver(fitQuiz).observe(fitBox);
  window.addEventListener('resize', fitQuiz);
  byId('quiz').addEventListener('gameshow', fitQuiz);

  function selectGame(key) {
    if (!Object.hasOwn(rules,key)) key = 'croc';
    if (byId('bingo').hidden === false && key !== 'bingo') {
      utterance = null;
      stopVoice();
    }
    for (const tab of tabs) {
      const active = tab.dataset.section === key;
      if (active) {
        tab.setAttribute('aria-current', 'page');
        byId('game-name').textContent = tab.textContent;
        document.title = tab.textContent + ' · roylab';
      } else tab.removeAttribute('aria-current');
      byId(tab.dataset.section).hidden = !active;
    }
    byId('rule').textContent = rules[key];
    byId(key).dispatchEvent(new Event('gameshow'));
  }
  function selectFromUrl() {
    const path = location.pathname.replace(/[/]?(?:index[.]html)?$/, '/');
    const tab = tabs.find(item => item.pathname === path);
    selectGame(tab?.dataset.section || 'croc');
  }
  for (const tab of tabs) {
    tab.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.pathname !== tab.pathname) window.history.pushState(null, '', tab.href);
      selectFromUrl();
    });
  }
  window.addEventListener('popstate', selectFromUrl);

  const fullButton = byId('fullscreen');
  const element = document.documentElement;
  const nativeFull = (element.requestFullscreen && document.fullscreenEnabled) ||
    (element.webkitRequestFullscreen && document.webkitFullscreenEnabled);
  function fullLabel() {
    const native = document.fullscreenElement || document.webkitFullscreenElement;
    const enlarged = document.body.classList.contains('enlarged');
    fullButton.lastElementChild.textContent = native ? '전체 화면 닫기' : enlarged ? '화면 확대 해제' : nativeFull ? '전체 화면' : '화면 확대';
    fullButton.setAttribute('aria-pressed',String(Boolean(native || enlarged)));
  }
  fullButton.addEventListener('click', async () => {
    const fallback = () => document.body.classList.toggle('enlarged');
    if (!nativeFull || document.body.classList.contains('enlarged')) fallback();
    else {
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else await (element.requestFullscreen || element.webkitRequestFullscreen).call(element);
      } catch { fallback(); }
    }
    fullLabel();
  });
  document.addEventListener('fullscreenchange', fullLabel);
  document.addEventListener('webkitfullscreenchange', fullLabel);
  window.initCroc(byId('croc'));
  window.initCharades(byId('charades'));
  resetBingo();
  resetQuiz();
  fullLabel();
  selectFromUrl();
})();
