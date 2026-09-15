// ===== 双闹钟法：第一声轻唤提醒，间隔一到第二声强制响起 =====
// 阶段流转：待机 → 第一闹钟倒计时 → 轻唤（间隔倒计时）→ 强制响铃

const dualDisplay = document.getElementById('dual-display');
const dualStatus = document.getElementById('dual-status');
const dualH = document.getElementById('dual-h');
const dualM = document.getElementById('dual-m');
const dualS = document.getElementById('dual-s');
const dualGaps = document.getElementById('dual-gaps');
const dualBtn = document.getElementById('dual-btn');

const DUAL_IDLE = '--:--:--';
const DUAL_IDLE_TEXT = '设好第一闹钟时长，点开始';

let gapMin = 5;                                  // 两次闹钟的间隔（分钟）
let stage = 'idle';                              // idle | toFirst | gentle | ringing
let firstEnd = 0;
let secondEnd = 0;
let dualTickTimer = null;
let dualRingTimer = null;

function dualPad(n) {
  return String(n).padStart(2, '0');
}

function dualFmt(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${dualPad(h)}:${dualPad(m)}:${dualPad(s)}`;
}

function clampNum(v, min, max) {
  v = parseInt(v, 10);
  if (isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function dualBusy() {
  return stage !== 'idle';
}

function setDisabled(disabled) {
  [dualH, dualM, dualS].forEach(el => el.disabled = disabled);
  dualGaps.querySelectorAll('button').forEach(b => b.disabled = disabled);
}

function dualReset() {
  clearInterval(dualTickTimer); dualTickTimer = null;
  clearInterval(dualRingTimer); dualRingTimer = null;
  stage = 'idle';
  setDisabled(false);
  dualDisplay.textContent = DUAL_IDLE;
  dualStatus.textContent = DUAL_IDLE_TEXT;
  dualBtn.textContent = '开始';
}

function dualStartRinging() {
  stage = 'ringing';
  dualDisplay.textContent = '00:00:00';
  dualStatus.textContent = '第二声闹钟！必须起床！';
  dualBtn.textContent = '停止响铃';
  if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
  AudioFX.beep(3);
  dualRingTimer = setInterval(() => AudioFX.beep(3), 1200);
}

function dualTick() {
  const now = Date.now();

  if (stage === 'toFirst') {
    const r1 = Math.ceil((firstEnd - now) / 1000);
    if (r1 <= 0) {
      stage = 'gentle';
      AudioFX.beep(1);   // 第一声：轻唤
      dualStatus.textContent = '第一声已响，赶紧起身！';
      dualBtn.textContent = '我起了';
    } else {
      dualDisplay.textContent = dualFmt(r1);
      return;
    }
  }

  if (stage === 'gentle') {
    const r2 = Math.ceil((secondEnd - now) / 1000);
    if (r2 <= 0) {
      dualStartRinging();
    } else {
      dualDisplay.textContent = dualFmt(r2);
    }
  }
}

// 第二闹钟间隔选择
dualGaps.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-gap]');
  if (!btn || dualBusy()) return;
  gapMin = parseInt(btn.dataset.gap, 10);
  dualGaps.querySelectorAll('button').forEach(b =>
    b.classList.toggle('sel', b === btn));
});

dualBtn.addEventListener('click', () => {
  if (dualBusy()) {
    dualReset();   // 取消 / 我起了 / 停止响铃
    return;
  }

  const total =
    clampNum(dualH.value, 0, 23) * 3600 +
    clampNum(dualM.value, 0, 59) * 60 +
    clampNum(dualS.value, 0, 59);

  if (total <= 0) {
    dualStatus.textContent = '请先设置时长';
    return;
  }

  setDisabled(true);
  firstEnd = Date.now() + total * 1000;
  secondEnd = firstEnd + gapMin * 60000;
  stage = 'toFirst';
  dualStatus.textContent = '第一声倒计时中…';
  dualBtn.textContent = '取消';
  dualTick();
  dualTickTimer = setInterval(dualTick, 250);
});
