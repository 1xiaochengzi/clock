// ===== 番茄钟：经典 25 + 5，每 4 轮长休 15 分钟 =====

const FOCUS_SEC = 25 * 60;
const SHORT_SEC = 5 * 60;
const LONG_SEC = 15 * 60;

const PHASE_META = {
  focus: { label: '专注', secs: FOCUS_SEC },
  short: { label: '短休息', secs: SHORT_SEC },
  long:  { label: '长休息', secs: LONG_SEC },
};

const pomoSection = document.getElementById('page-pomodoro');
const pomoPhaseEl = document.getElementById('pomo-phase');
const pomoDisplay = document.getElementById('pomo-display');
const pomoRoundEl = document.getElementById('pomo-round');
const pomoBtn = document.getElementById('pomo-btn');
const pomoReset = document.getElementById('pomo-reset');

let pomoPhase = 'focus';   // focus | short | long
let pomoRound = 1;         // 第几个番茄，1~4
let pomoRunning = false;
let pomoEndTs = 0;
let pomoRemain = FOCUS_SEC;
let pomoTimer = null;

function pad2(n) {
  return String(n).padStart(2, '0');
}

function pomoRender() {
  const meta = PHASE_META[pomoPhase];
  pomoPhaseEl.textContent = meta.label;
  pomoDisplay.textContent = `${pad2(Math.floor(pomoRemain / 60))}:${pad2(pomoRemain % 60)}`;

  pomoRoundEl.textContent = pomoPhase === 'focus'
    ? `第 ${pomoRound} / 4 个番茄`
    : '休息一下，远离屏幕';

  pomoSection.dataset.phase = pomoPhase;
  pomoBtn.textContent = pomoRunning
    ? '暂停'
    : (pomoRemain === meta.secs ? '开始' : '继续');
}

// 阶段流转：专注→短休→专注→短休→…→第4个专注后→长休→新循环
function pomoNextPhase() {
  if (pomoPhase === 'focus') {
    pomoPhase = pomoRound >= 4 ? 'long' : 'short';
  } else if (pomoPhase === 'short') {
    pomoPhase = 'focus';
    pomoRound = Math.min(pomoRound + 1, 4);
  } else {
    pomoPhase = 'focus';
    pomoRound = 1;
  }
  pomoRemain = PHASE_META[pomoPhase].secs;
}

function pomoTick() {
  pomoRemain = Math.ceil((pomoEndTs - Date.now()) / 1000);
  if (pomoRemain <= 0) {
    AudioFX.beep(3);
    pomoNextPhase();
  }
  pomoRender();
  // 阶段切换后继续自动计时
  if (pomoRunning) pomoEndTs = Date.now() + pomoRemain * 1000;
}

function pomoStart() {
  pomoRunning = true;
  pomoEndTs = Date.now() + pomoRemain * 1000;
  clearInterval(pomoTimer);
  pomoTimer = setInterval(pomoTick, 250);
  pomoRender();
}

function pomoPause() {
  pomoRunning = false;
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoRender();
}

pomoBtn.addEventListener('click', () => pomoRunning ? pomoPause() : pomoStart());

pomoReset.addEventListener('click', () => {
  pomoRunning = false;
  clearInterval(pomoTimer);
  pomoTimer = null;
  pomoPhase = 'focus';
  pomoRound = 1;
  pomoRemain = FOCUS_SEC;
  pomoRender();
});

pomoRender();
