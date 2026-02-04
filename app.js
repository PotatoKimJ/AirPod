// ========== 설정 ==========
const RESULT_EMAIL = 'ekfmfmd2412@gmail.com'; // 게임 결과 자동 전송 주소

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
  { id: 'coin', name: '동전 던지기' },
  { id: 'luckyNum', name: '행운 숫자' },
  { id: 'luckyTap', name: '행운 탭' },
  { id: 'roulette', name: '운 룰렛' },
  { id: 'luckyCard', name: '운 카드' }
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

function getEmailBody() {
  const sideLabel = selectedSide === 'left' ? '왼쪽 이어폰' : '오른쪽 이어폰';
  const modelLabel = MODEL_LABELS[selectedModel] || selectedModel;
  const winCount = gameResults.filter(r => r.result === '승리').length;
  const detail = gameResults.map(r => {
    const res = r.result === '승리' ? '승' : r.result === '패배' ? '패' : `점수${r.result}`;
    return `  - ${r.name}: ${res}`;
  }).join('\n');
  return `[한쪽씩 게임 결과 - 취합용]

사용자 (${sideLabel} 걸고 참여)
에어팟 기종: ${modelLabel}
총 ${winCount}게임 승리 / 6게임 중

상세 결과:
${detail}

---
이 결과를 모아 왼쪽 vs 오른쪽 승패를 가립니다.
예) 사용자1(왼쪽) 3승 > 사용자2(오른쪽) 2승`;
}

async function sendResultsEmail() {
  const sideLabel = selectedSide === 'left' ? '왼쪽 이어폰' : '오른쪽 이어폰';
  const winCount = gameResults.filter(r => r.result === '승리').length;
  const body = getEmailBody();
  const subject = `[한쪽씩] ${sideLabel} - ${winCount}게임 승리`;

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${RESULT_EMAIL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        _captcha: 'false',
        '이어폰': sideLabel,
        '에어팟 기종': MODEL_LABELS[selectedModel] || selectedModel,
        '승리수': winCount,
        '결과': body
      })
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    console.error('이메일 전송 실패:', e);
    return false;
  }
}

function showFinalResults() {
  showSection('result');
  const container = document.getElementById('result-container');

  container.innerHTML = `
    <div class="result-win">
      <div class="result-emoji">📧</div>
      <p class="result-text">게임 종료</p>
      <p id="email-status" class="result-sub">결과를 ${RESULT_EMAIL} 로 전송 중...</p>
    </div>
  `;

  sendResultsEmail().then(success => {
    const statusEl = document.getElementById('email-status');
    if (statusEl) {
      statusEl.innerHTML = success
        ? `결과가 ${RESULT_EMAIL} 로 전송되었습니다.<br>결과는 이메일에서 확인해주세요.`
        : `전송 실패. 처음 사용 시 해당 이메일로 FormSubmit 인증 메일이 갈 수 있어요. 인증 후 다시 시도해주세요.`;
    }
  });
}

// ========== 상태 ==========
let selectedSide = null;
let selectedModel = '';

const MODEL_LABELS = {
  'airpods-1': 'AirPods (1세대)',
  'airpods-2': 'AirPods (2세대)',
  'airpods-3': 'AirPods (3세대)',
  'airpods-pro-1': 'AirPods Pro (1세대)',
  'airpods-pro-2-lightning': 'AirPods Pro (2세대, Lightning)',
  'airpods-pro-2-usbc': 'AirPods Pro (2세대, USB-C)'
};

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
    const modelEl = document.getElementById('airpods-model');
    selectedModel = modelEl?.value || '';
    if (!selectedModel) {
      alert('에어팟 기종을 선택해주세요!');
      return;
    }
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

// ========== 게임 1: 가위바위보 (운 기반 - 50%) ==========
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
      <div class="game-title">✊✋✌️ 가위바위보</div>
      <p class="warning-banner">선택하세요</p>
      <div class="rps-buttons">
        <button class="rps-btn" data-choice="rock">✊</button>
        <button class="rps-btn" data-choice="paper">✋</button>
        <button class="rps-btn" data-choice="scissors">✌️</button>
      </div>
    `;

    container.querySelectorAll('.rps-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const myChoice = btn.dataset.choice;
        const oppChoice = choiceIds[Math.floor(Math.random() * 3)];
        const result = getResult(myChoice, oppChoice);
        if (result === 1) myScore++;
        else if (result === -1) oppScore++;

        if (myScore >= 2) setTimeout(() => onGameEnd('승리'), 400);
        else if (oppScore >= 2) setTimeout(() => onGameEnd('패배'), 400);
        else render();
      });
    });
  }
  render();
}

// ========== 게임 2: 동전 던지기 (50%) ==========
function runCoinGame() {
  const container = document.getElementById('game-container');
  const result = Math.random() < 0.5 ? '앞' : '뒤';

  container.innerHTML = `
    <div class="game-title">🪙 동전 던지기</div>
    <p class="warning-banner">앞 또는 뒤를 선택하세요</p>
    <div class="rps-buttons" style="margin:2rem 0;">
      <button class="rps-btn" data-choice="앞">앞</button>
      <button class="rps-btn" data-choice="뒤">뒤</button>
    </div>
  `;

  container.querySelectorAll('.rps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choice = btn.dataset.choice;
      const won = choice === result;
      container.querySelectorAll('.rps-btn').forEach(b => b.disabled = true);
      setTimeout(() => onGameEnd(won ? '승리' : '패배'), 500);
    });
  });
}

// ========== 게임 3: 행운 숫자 (10%) ==========
function runLuckyNumGame() {
  const container = document.getElementById('game-container');
  const answer = Math.floor(Math.random() * 10) + 1;

  container.innerHTML = `
    <div class="game-title">🎲 행운 숫자</div>
    <p class="warning-banner">1~10 중 선택하세요</p>
    <div class="rps-buttons" style="flex-wrap:wrap;gap:0.5rem;margin:1.5rem 0;">
      ${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="rps-btn" data-num="${n}" style="min-width:50px;">${n}</button>`).join('')}
    </div>
  `;

  container.querySelectorAll('[data-num]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.num, 10);
      const won = n === answer;
      container.querySelectorAll('[data-num]').forEach(b => b.disabled = true);
      setTimeout(() => onGameEnd(won ? '승리' : '패배'), 500);
    });
  });
}

// ========== 게임 4: 행운 탭 (탭당 40% 확률) ==========
function runLuckyTapGame() {
  const container = document.getElementById('game-container');
  let score = 0;
  let taps = 0;
  const TARGET_TAPS = 5;

  container.innerHTML = `
    <div class="game-title">👆 행운 탭</div>
    <p class="warning-banner">버튼을 5번 탭하세요</p>
    <div class="tap-big" id="lucky-tap">탭!</div>
  `;

  const tapBtn = document.getElementById('lucky-tap');

  tapBtn.addEventListener('click', () => {
    if (taps >= TARGET_TAPS) return;
    taps++;
    if (Math.random() < 0.4) score++;
    if (taps >= TARGET_TAPS) {
      const aiScore = Math.floor(Math.random() * (TARGET_TAPS + 1));
      const won = score > aiScore || (score === aiScore && Math.random() < 0.5);
      tapBtn.style.pointerEvents = 'none';
      setTimeout(() => onGameEnd(won ? '승리' : '패배'), 500);
    }
  });
}

// ========== 게임 5: 운 룰렛 (4칸, 50% 승리) ==========
function runRouletteGame() {
  const container = document.getElementById('game-container');
  const outcomes = ['승리', '패배', '승리', '패배'];
  const result = outcomes[Math.floor(Math.random() * 4)];

  container.innerHTML = `
    <div class="game-title">🎡 운 룰렛</div>
    <p class="warning-banner">1~4 중 선택하세요</p>
    <div class="rps-buttons" style="margin:2rem 0;">
      <button class="rps-btn" data-idx="0">1</button>
      <button class="rps-btn" data-idx="1">2</button>
      <button class="rps-btn" data-idx="2">3</button>
      <button class="rps-btn" data-idx="3">4</button>
    </div>
  `;

  container.querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const won = outcomes[idx] === '승리';
      container.querySelectorAll('[data-idx]').forEach(b => b.disabled = true);
      setTimeout(() => onGameEnd(won ? '승리' : '패배'), 500);
    });
  });
}

// ========== 게임 6: 운 카드 (4장 중 1장, 25%) ==========
function runLuckyCardGame() {
  const container = document.getElementById('game-container');
  const winIdx = Math.floor(Math.random() * 4);

  container.innerHTML = `
    <div class="game-title">🃏 운 카드</div>
    <p class="warning-banner">A~D 중 선택하세요</p>
    <div class="rps-buttons" style="margin:2rem 0;">
      <button class="rps-btn" data-idx="0">A</button>
      <button class="rps-btn" data-idx="1">B</button>
      <button class="rps-btn" data-idx="2">C</button>
      <button class="rps-btn" data-idx="3">D</button>
    </div>
  `;

  container.querySelectorAll('[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const won = idx === winIdx;
      container.querySelectorAll('[data-idx]').forEach(b => b.disabled = true);
      setTimeout(() => onGameEnd(won ? '승리' : '패배'), 500);
    });
  });
}

// ========== 게임 라우터 ==========
function runGame(gameId) {
  const container = document.getElementById('game-container');
  if (container) container.innerHTML = '';
  if (gameId === 'rps') runRpsGame();
  else if (gameId === 'coin') runCoinGame();
  else if (gameId === 'luckyNum') runLuckyNumGame();
  else if (gameId === 'luckyTap') runLuckyTapGame();
  else if (gameId === 'roulette') runRouletteGame();
  else if (gameId === 'luckyCard') runLuckyCardGame();
}
