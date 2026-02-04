// ========== 섹션 전환 ==========
const sections = {
  landing: document.getElementById('landing'),
  matching: document.getElementById('matching'),
  matched: document.getElementById('matched'),
  gamePlay: document.getElementById('game-play'),
  result: document.getElementById('result')
};

function showSection(name) {
  Object.keys(sections).forEach(key => {
    sections[key].classList.toggle('hidden', key !== name);
  });
}

// ========== 상태 ==========
let selectedSide = null;
let opponentName = '상대방';

const OPPONENT_NAMES = [
  '에어팟찾는고양이', '한쪽잃은탱구', '왼쪽만남음', '오른쪽버린사람',
  'BudHunter', 'SingleEar', '완성하고싶어', '내기왕'
];

// ========== 이어폰 선택 ==========
document.querySelectorAll('.bud-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bud-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSide = btn.dataset.side;
  });
});

// 에어팟 기종 목록 (매칭 조건용)
const AIRPODS_MODELS = ['airpods-1', 'airpods-2', 'airpods-3', 'airpods-pro-1', 'airpods-pro-2-lightning', 'airpods-pro-2-usbc'];

let myMatchId = null;
let matchListenOff = null;

function showMatchedScreen() {
  document.getElementById('matching-loading').classList.add('hidden');
  document.getElementById('matching-waiting').classList.add('hidden');
  opponentName = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
  document.getElementById('opponent-name').textContent = opponentName;
  showSection('matched');
}

// ========== 매칭하기 ==========
document.getElementById('match-btn').addEventListener('click', async () => {
  if (!selectedSide) {
    alert('내기할 이어폰(왼쪽/오른쪽 한쪽)을 먼저 선택해주세요!');
    return;
  }
  const modelEl = document.getElementById('airpods-model');
  if (!modelEl.value) {
    alert('에어팟 기종을 선택해주세요!');
    return;
  }
  const myModel = modelEl.value;
  const oppositeSide = selectedSide === 'left' ? 'right' : 'left';

  myMatchId = 'm' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const me = { id: myMatchId, side: selectedSide, model: myModel, timestamp: Date.now() };

  showSection('matching');
  document.getElementById('matching-loading').classList.remove('hidden');
  document.getElementById('matching-fail').classList.add('hidden');
  document.getElementById('matching-waiting').classList.add('hidden');

  await Pool.add(me);
  const matchedOpponent = await Pool.findMatch(oppositeSide, myModel, myMatchId);

  if (matchedOpponent) {
    await Pool.remove(matchedOpponent.id);
    await Pool.remove(myMatchId);
    await Pool.addMatchedId(matchedOpponent.id);
    showMatchedScreen();
  } else {
    document.getElementById('matching-loading').classList.add('hidden');
    document.getElementById('matching-waiting').classList.remove('hidden');
    matchListenOff = Pool.listenMatched(myMatchId, async () => {
      if (matchListenOff) matchListenOff();
      matchListenOff = null;
      await Pool.removeMatchedId(myMatchId);
      await Pool.remove(myMatchId);
      showMatchedScreen();
    });
    const poll = async () => {
      const opp = await Pool.findMatch(oppositeSide, myModel, myMatchId);
      if (opp && matchListenOff) {
        if (typeof matchListenOff === 'function') matchListenOff();
        matchListenOff = null;
        await Pool.remove(opp.id);
        await Pool.remove(myMatchId);
        await Pool.addMatchedId(opp.id);
        showMatchedScreen();
      }
    };
    const iv = setInterval(poll, 2000);
    const origOff = matchListenOff;
    matchListenOff = () => {
      clearInterval(iv);
      if (origOff && typeof origOff === 'function') origOff();
    };
  }
});

// 매칭 취소
document.getElementById('cancel-match-btn').addEventListener('click', async () => {
  if (matchListenOff && typeof matchListenOff === 'function') matchListenOff();
  matchListenOff = null;
  await Pool.remove(myMatchId);
  document.getElementById('matching-waiting').classList.add('hidden');
  showSection('landing');
});

// 페이지 이탈 시 풀에서 제거
window.addEventListener('beforeunload', () => {
  if (myMatchId) Pool.remove(myMatchId);
});

// 매칭 실패 시 다시 시도
document.getElementById('retry-match-btn').addEventListener('click', () => {
  showSection('landing');
  document.getElementById('matching-loading').classList.remove('hidden');
  document.getElementById('matching-fail').classList.add('hidden');
});

// ========== 게임 선택 ==========
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    const gameId = card.dataset.game;
    showSection('game-play');
    runGame(gameId);
  });
});

// ========== 게임 실행 및 결과 처리 ==========
function endGame(won) {
  showSection('result');
  const container = document.getElementById('result-container');
  if (won) {
    container.innerHTML = `
      <div class="result-win">
        <div class="result-emoji">🎉</div>
        <p class="result-text">승리!</p>
        <p class="result-sub">상대의 에어팟 한쪽을 획득했습니다.<br>이제 한 쌍이에요! 🎧</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="result-lose">
        <div class="result-emoji">😢</div>
        <p class="result-text">패배...</p>
        <p class="result-sub">에어팟 한쪽을 내기에서 잃었습니다.<br>다음엔 이겨봐요!</p>
      </div>
    `;
  }
}

// 다시 매칭하기
document.getElementById('play-again-btn').addEventListener('click', () => {
  showSection('landing');
  document.getElementById('result-container').innerHTML = '';
});

// ========== 게임: 가위바위보 (3판 2선승) ==========
function runRpsGame() {
  const container = document.getElementById('game-container');
  let myScore = 0;
  let oppScore = 0;

  const choices = ['✊', '✋', '✌️'];
  const choiceIds = ['rock', 'paper', 'scissors'];

  function getResult(me, opp) {
    if (me === opp) return 0;
    if ((me === 'rock' && opp === 'scissors') ||
        (me === 'paper' && opp === 'rock') ||
        (me === 'scissors' && opp === 'paper')) return 1;
    return -1;
  }

  function updateScore() {
    const scoreEl = container.querySelector('.rps-score');
    if (scoreEl) scoreEl.innerHTML = `<span>나: ${myScore}</span><span>vs</span><span>${opponentName}: ${oppScore}</span>`;
  }

  function render() {
    container.innerHTML = `
      <div class="game-title">✊✋✌️ 가위바위보 - 3판 2선승</div>
      <div class="rps-score">
        <span>나: ${myScore}</span>
        <span>vs</span>
        <span>${opponentName}: ${oppScore}</span>
      </div>
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
        const msg = result === 0 ? '비겼다!' : result === 1 ? `이겼다! (상대: ${choices[choiceIds.indexOf(oppChoice)]})` : `졌다... (상대: ${choices[choiceIds.indexOf(oppChoice)]})`;
        if (roundEl) roundEl.textContent = msg;
        updateScore();

        if (myScore >= 2) setTimeout(() => endGame(true), 800);
        else if (oppScore >= 2) setTimeout(() => endGame(false), 800);
      });
    });
  }
  render();
}

// ========== 게임: 탭 속도 (10초) ==========
function runTapGame() {
  const container = document.getElementById('game-container');
  let myTaps = 0;
  let oppTaps = Math.floor(Math.random() * 15) + 20;
  let timeLeft = 10;
  let running = false;

  container.innerHTML = `
    <div class="game-title">👆 탭 속도 대결</div>
    <p style="text-align:center;">10초 안에 더 많이 탭하세요!</p>
    <div class="score-display">탭: <span id="tap-count">0</span></div>
    <div class="tap-big" id="tap-btn">탭!</div>
    <p id="tap-timer" style="text-align:center;font-size:1.5rem;">준비...</p>
  `;

  const tapBtn = document.getElementById('tap-btn');
  const countEl = document.getElementById('tap-count');
  const timerEl = document.getElementById('tap-timer');

  const startGame = () => {
    if (running) return;
    running = true;
    const interval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = `${timeLeft}초`;
      if (timeLeft <= 0) {
        clearInterval(interval);
        tapBtn.style.pointerEvents = 'none';
        const won = myTaps > oppTaps;
        timerEl.textContent = `끝! 나: ${myTaps} vs 상대: ${oppTaps}`;
        setTimeout(() => endGame(won), 1500);
      }
    }, 1000);
  };

  tapBtn.addEventListener('click', () => {
    startGame();
    myTaps++;
    countEl.textContent = myTaps;
  });
}

// ========== 게임: 숫자 맞추기 (1~100, 번갈아가며) ==========
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

    const input = document.getElementById('num-input');
    const submit = document.getElementById('num-submit');
    const msg = document.getElementById('num-msg');

    submit.addEventListener('click', () => {
      const n = parseInt(input.value, 10);
      if (isNaN(n) || n < low || n > high) {
        msg.textContent = '범위 안의 숫자를 입력하세요';
        return;
      }

      if (n === answer) {
        endGame(myTurn);
        return;
      }

      if (n < answer) {
        low = n + 1;
        msg.textContent = `업! (${n}보다 큼)`;
      } else {
        high = n - 1;
        msg.textContent = `다운! (${n}보다 작음)`;
      }

      myTurn = !myTurn;
      if (!myTurn) {
        msg.textContent += ' → 상대 차례...';
        setTimeout(() => {
          const oppGuess = Math.floor((low + high) / 2);
          if (oppGuess === answer) {
            endGame(false);
          } else if (oppGuess < answer) {
            low = oppGuess + 1;
            msg.textContent = `상대: ${oppGuess} (업) → 당신 차례`;
            render();
          } else {
            high = oppGuess - 1;
            msg.textContent = `상대: ${oppGuess} (다운) → 당신 차례`;
            render();
          }
        }, 800);
      } else {
        render();
      }
    });
  }
  render();
}

// ========== 게임 라우터 ==========
function runGame(gameId) {
  if (gameId === 'rps') runRpsGame();
  else if (gameId === 'tap') runTapGame();
  else if (gameId === 'number') runNumberGame();
}
