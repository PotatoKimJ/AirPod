// ========== 섹션 전환 ==========
const sections = {
  landing: document.getElementById('landing'),
  gamePlay: document.getElementById('game-play'),
  result: document.getElementById('result')
};

function showSection(name) {
  Object.keys(sections).forEach(key => {
    const el = sections[key];
    if (el) el.classList.toggle('hidden', key !== name);
  });
}

// ========== 연속 게임 플로우 ==========
const GAME_ORDER = [
  { id: 'rps', name: '가위바위보' },
  { id: 'tap', name: '탭 속도' },
  { id: 'number', name: '숫자 맞추기' },
  { id: 'rhythm', name: '리듬 탭' },
  { id: 'quiz', name: '스테레오 퀴즈' },
  { id: 'message', name: '비밀 메시지' }
];

let gameResults = [];
let currentGameIndex = 0;

function updateProgress() {
  const el = document.getElementById('game-progress');
  if (el) el.textContent = `${currentGameIndex + 1}/6`;
}

function onGameEnd(result) {
  const game = GAME_ORDER[currentGameIndex];
  gameResults.push({ ...game, result });
  currentGameIndex++;

  if (currentGameIndex < GAME_ORDER.length) {
    updateProgress();
    runGame(GAME_ORDER[currentGameIndex].id);
  } else {
    showFinalResults();
  }
}

function showFinalResults() {
  showSection('result');
  const container = document.getElementById('result-container');

  const winCount = gameResults.filter(r => r.result === '승리').length;
  const loseCount = gameResults.filter(r => r.result === '패배').length;
  const scoreResults = gameResults.filter(r => typeof r.result === 'number');

  let rowsHtml = gameResults.map(r => {
    let cls = '';
    let resultText = r.result;
    if (r.result === '승리') { cls = 'win'; resultText = '✅ 승리'; }
    else if (r.result === '패배') { cls = 'lose'; resultText = '❌ 패배'; }
    else if (typeof r.result === 'number') { cls = 'score'; resultText = `점수 ${r.result}`; }
    return `<div class="result-row ${cls}"><span>${r.name}</span><span>${resultText}</span></div>`;
  }).join('');

  const total = winCount + loseCount;
  const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;

  container.innerHTML = `
    <div class="result-win">
      <div class="result-emoji">📋</div>
      <p class="result-text">전체 결과</p>
      <p class="result-sub">승 ${winCount} / 패 ${loseCount} (승률 ${winRate}%)</p>
    </div>
    <div class="result-summary">${rowsHtml}</div>
  `;
}

// ========== 상태 ==========
let selectedSide = null;

function init() {
  document.querySelectorAll('.bud-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bud-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSide = btn.dataset.side;
    });
  });

  const startBtn = document.getElementById('start-all-btn');
  if (startBtn) startBtn.addEventListener('click', () => {
    if (!selectedSide) selectedSide = 'left';
    gameResults = [];
    currentGameIndex = 0;
    updateProgress();
    showSection('gamePlay');
    runGame(GAME_ORDER[0].id);
  });

  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => {
    showSection('landing');
    const gc = document.getElementById('game-container');
    if (gc) gc.innerHTML = '';
  });

  const playAgainBtn = document.getElementById('play-again-btn');
  if (playAgainBtn) playAgainBtn.addEventListener('click', () => {
    showSection('landing');
    const rc = document.getElementById('result-container');
    if (rc) rc.innerHTML = '';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ========== 오디오 ==========
let audioCtx = null;
function initAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, duration, pan = 0, volume = 0.3) {
  const ctx = initAudio();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  osc.type = 'sine';
  osc.frequency.value = freq;
  panner.pan.value = pan;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

// ========== 게임: 가위바위보 ==========
function runRpsGame() {
  const container = document.getElementById('game-container');
  let myScore = 0;
  let oppScore = 0;
  const choices = ['✊', '✋', '✌️'];
  const choiceIds = ['rock', 'paper', 'scissors'];

  function getResult(me, opp) {
    if (me === opp) return 0;
    if ((me === 'rock' && opp === 'scissors') || (me === 'paper' && opp === 'rock') || (me === 'scissors' && opp === 'paper')) return 1;
    return -1;
  }

  function render() {
    container.innerHTML = `
      <div class="game-title">✊✋✌️ 가위바위보 - 3판 2선승</div>
      <div class="rps-score"><span>나: ${myScore}</span><span>vs</span><span>AI: ${oppScore}</span></div>
      <p style="text-align:center;margin-bottom:1rem;">선택하세요</p>
      <div class="rps-buttons">
        <button class="rps-btn" data-choice="rock">✊</button>
        <button class="rps-btn" data-choice="paper">✋</button>
        <button class="rps-btn" data-choice="scissors">✌️</button>
      </div>
      <p id="rps-round" style="text-align:center;color:var(--text-muted);"></p>
    `;

    container.querySelectorAll('.rps-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const myChoice = btn.dataset.choice;
        const oppChoice = choiceIds[Math.floor(Math.random() * 3)];
        const result = getResult(myChoice, oppChoice);
        if (result === 1) myScore++;
        else if (result === -1) oppScore++;

        const roundEl = document.getElementById('rps-round');
        roundEl.textContent = result === 0 ? '비겼다!' : result === 1 ? `이겼다!` : `졌다...`;

        if (myScore >= 2) setTimeout(() => onGameEnd('승리'), 800);
        else if (oppScore >= 2) setTimeout(() => onGameEnd('패배'), 800);
        else render();
      });
    });
  }
  render();
}

// ========== 게임: 탭 속도 ==========
function runTapGame() {
  const container = document.getElementById('game-container');
  let myTaps = 0;
  const oppTaps = Math.floor(Math.random() * 15) + 20;
  let timeLeft = 10;
  let running = false;

  container.innerHTML = `
    <div class="game-title">👆 탭 속도</div>
    <p style="text-align:center;">10초 안에 더 많이 탭하세요!</p>
    <div class="score-display">탭: <span id="tap-count">0</span></div>
    <div class="tap-big" id="tap-btn">탭!</div>
    <p id="tap-timer" style="text-align:center;font-size:1.5rem;">준비...</p>
  `;

  const tapBtn = document.getElementById('tap-btn');
  const countEl = document.getElementById('tap-count');
  const timerEl = document.getElementById('tap-timer');

  tapBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      const iv = setInterval(() => {
        timeLeft--;
        timerEl.textContent = `${timeLeft}초`;
        if (timeLeft <= 0) {
          clearInterval(iv);
          tapBtn.style.pointerEvents = 'none';
          const won = myTaps > oppTaps;
          timerEl.textContent = `끝! 나: ${myTaps} vs AI: ${oppTaps}`;
          setTimeout(() => onGameEnd(won ? '승리' : '패배'), 1500);
        }
      }, 1000);
    }
    myTaps++;
    countEl.textContent = myTaps;
  });
}

// ========== 게임: 숫자 맞추기 ==========
function runNumberGame() {
  const container = document.getElementById('game-container');
  const answer = Math.floor(Math.random() * 100) + 1;
  let low = 1;
  let high = 100;
  let myTurn = true;

  function render() {
    container.innerHTML = `
      <div class="game-title">🎲 숫자 맞추기 (1~100)</div>
      <p style="text-align:center;">범위: ${low} ~ ${high}</p>
      <div class="number-input-wrap">
        <input type="number" id="num-input" min="${low}" max="${high}" placeholder="숫자 입력">
      </div>
      <button class="quiz-submit" id="num-submit">확인</button>
      <p id="num-msg" style="text-align:center;margin-top:1rem;color:var(--text-muted);"></p>
    `;

    document.getElementById('num-submit').addEventListener('click', () => {
      const n = parseInt(document.getElementById('num-input').value, 10);
      const msg = document.getElementById('num-msg');
      if (isNaN(n) || n < low || n > high) {
        msg.textContent = '범위 안의 숫자를 입력하세요';
        return;
      }
      if (n === answer) {
        msg.textContent = '정답!';
        setTimeout(() => onGameEnd(myTurn ? '승리' : '패배'), 800);
        return;
      }
      if (n < answer) low = n + 1;
      else high = n - 1;
      msg.textContent = n < answer ? `업!` : `다운!`;

      myTurn = !myTurn;
      if (!myTurn) {
        msg.textContent += ' → AI 차례...';
        setTimeout(() => {
          const oppGuess = Math.floor((low + high) / 2);
          if (oppGuess === answer) {
            msg.textContent = `AI 정답!`;
            setTimeout(() => onGameEnd('패배'), 800);
          } else {
            if (oppGuess < answer) low = oppGuess + 1;
            else high = oppGuess - 1;
            msg.textContent = `AI: ${oppGuess} → 당신 차례`;
            render();
          }
        }, 800);
      } else render();
    });
  }
  render();
}

// ========== 게임: 리듬 탭 (20초 제한) ==========
function runRhythmGame() {
  const container = document.getElementById('game-container');
  const pan = selectedSide === 'left' ? -1 : 1;
  const sideLabel = selectedSide === 'left' ? '왼쪽' : '오른쪽';
  let score = 0;
  let gameActive = false;
  let nextBeatTime = 0;
  const BPM = 90;
  const beatDuration = 60 / BPM;
  const GAME_DURATION = 20;

  container.innerHTML = `
    <div class="game-title">🥁 리듬 탭 - ${sideLabel} 이어폰</div>
    <div class="warning-banner">20초 동안 비트에 맞춰 탭하세요!</div>
    <div class="score-display">점수: <span id="rhythm-score">0</span> | <span id="rhythm-timer">${GAME_DURATION}초</span></div>
    <div class="tap-area ${selectedSide}-bud" id="rhythm-tap">탭!</div>
  `;

  const tapArea = document.getElementById('rhythm-tap');
  const scoreEl = document.getElementById('rhythm-score');
  const timerEl = document.getElementById('rhythm-timer');

  function playBeat() {
    const freq = selectedSide === 'left' ? 440 : 554;
    playTone(freq, 0.1, pan, 0.25);
  }

  let beatIv = null;
  tapArea.addEventListener('click', () => {
    if (!gameActive) {
      gameActive = true;
      const ctx = initAudio();
      nextBeatTime = ctx.currentTime + 0.5;
      beatIv = setInterval(() => {
        if (!gameActive) { clearInterval(beatIv); return; }
        if (initAudio().currentTime >= nextBeatTime - 0.01) {
          playBeat();
          nextBeatTime += beatDuration;
        }
      }, 50);
      let timeLeft = GAME_DURATION;
      const timerIv = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.textContent = `${timeLeft}초`;
        if (timeLeft <= 0) {
          clearInterval(timerIv);
          if (beatIv) clearInterval(beatIv);
          gameActive = false;
          if (tapArea) tapArea.style.pointerEvents = 'none';
          if (timerEl) timerEl.textContent = '끝!';
          setTimeout(() => onGameEnd(score), 1000);
        }
      }, 1000);
    } else {
      const ctx = initAudio();
      const diff = Math.abs(ctx.currentTime - (nextBeatTime - beatDuration));
      if (diff < beatDuration * 0.4) {
        score += Math.max(1, Math.round(10 * (1 - diff / beatDuration)));
        if (scoreEl) scoreEl.textContent = score;
        tapArea.classList.add('hit');
        setTimeout(() => tapArea.classList.remove('hit'), 150);
      }
    }
  });
}

// ========== 게임: 스테레오 퀴즈 ==========
const QUIZ_DATA = [
  { question: '한국의 수도는?', hint: '청와대가 있는 도시', answer: '서울' },
  { question: '지구에서 가장 큰 대양?', hint: '아메리카와 아시아 사이', answer: '태평양' },
  { question: '빛의 삼원색에 없는 색?', hint: '검정, 흰색, 노랑 중', answer: '검정' }
];

function runQuizGame() {
  const container = document.getElementById('game-container');
  const q = QUIZ_DATA[currentGameIndex % QUIZ_DATA.length];
  const isLeft = selectedSide === 'left';

  container.innerHTML = `
    <div class="game-title">🧩 스테레오 퀴즈</div>
    <div class="warning-banner">각자 정보를 합쳐서 정답을 맞춰보세요!</div>
    <div class="quiz-question">${isLeft ? `질문: ${q.question}` : '파트너에게서 질문을 들으세요'}</div>
    <div class="quiz-hint">${!isLeft ? `힌트: ${q.hint}` : '파트너에게서 힌트를 들으세요'}</div>
    <input type="text" class="quiz-answer-input" id="quiz-answer" placeholder="정답 입력">
    <button class="quiz-submit" id="quiz-submit">확인</button>
    <button class="quiz-submit cta-secondary" id="quiz-skip" style="margin-top:0.5rem;">건너뛰기</button>
    <p id="quiz-result" style="text-align:center;margin-top:1rem;"></p>
  `;

  document.getElementById('quiz-submit').addEventListener('click', () => {
    const input = document.getElementById('quiz-answer').value.trim().toLowerCase();
    const result = document.getElementById('quiz-result');
    if (input === q.answer.toLowerCase()) {
      result.innerHTML = '<span style="color:var(--accent-teal)">✅ 정답!</span>';
      setTimeout(() => onGameEnd('승리'), 1000);
    } else result.innerHTML = '<span style="color:var(--accent-coral)">❌ 다시 시도</span>';
  });

  document.getElementById('quiz-skip').addEventListener('click', () => {
    onGameEnd('패배');
  });
}

// ========== 게임: 비밀 메시지 ==========
const MESSAGE_DATA = [
  { left: '첫 단어: 사과', right: '둘째 단어: 바나나', answer: '사과바나나' },
  { left: '앞: 12', right: '뒤: 34', answer: '1234' }
];

function runMessageGame() {
  const container = document.getElementById('game-container');
  const m = MESSAGE_DATA[currentGameIndex % MESSAGE_DATA.length];
  const isLeft = selectedSide === 'left';
  const myMsg = isLeft ? m.left : m.right;

  container.innerHTML = `
    <div class="game-title">📢 비밀 메시지</div>
    <div class="warning-banner">각자 메시지를 합쳐서 암호를 맞추세요!</div>
    <div class="message-box ${isLeft ? 'left' : 'right'}">${myMsg}<br><small>파트너에게 전달</small></div>
    <input type="text" class="quiz-answer-input" id="msg-answer" placeholder="합친 암호 입력">
    <button class="quiz-submit" id="msg-submit">확인</button>
    <button class="quiz-submit cta-secondary" id="msg-skip" style="margin-top:0.5rem;">건너뛰기</button>
    <p id="msg-result" style="text-align:center;margin-top:1rem;"></p>
  `;

  document.getElementById('msg-submit').addEventListener('click', () => {
    const input = document.getElementById('msg-answer').value.trim().replace(/\s/g, '');
    const result = document.getElementById('msg-result');
    if (input === m.answer.replace(/\s/g, '')) {
      result.innerHTML = '<span style="color:var(--accent-teal)">✅ 성공!</span>';
      setTimeout(() => onGameEnd('승리'), 1000);
    } else result.innerHTML = '<span style="color:var(--accent-coral)">❌ 다시</span>';
  });

  document.getElementById('msg-skip').addEventListener('click', () => {
    onGameEnd('패배');
  });
}

// ========== 게임 라우터 ==========
function runGame(gameId) {
  const container = document.getElementById('game-container');
  if (container) container.innerHTML = '';
  if (gameId === 'rps') runRpsGame();
  else if (gameId === 'tap') runTapGame();
  else if (gameId === 'number') runNumberGame();
  else if (gameId === 'rhythm') runRhythmGame();
  else if (gameId === 'quiz') runQuizGame();
  else if (gameId === 'message') runMessageGame();
}
