// ===== 秒表：开始 / 暂停 / 计次 / 重置 =====
// 时间基于 Date.now() 差值计算，切后台也能保持精确；
// 显示用 requestAnimationFrame 刷新，隐藏时自动停刷、回来即追上。

const swDisplay = document.getElementById('sw-display');
const swBtn = document.getElementById('sw-btn');       // 开始 / 暂停 / 继续
const swLapBtn = document.getElementById('sw-lap');    // 计次
const swResetBtn = document.getElementById('sw-reset');
const swLaps = document.getElementById('sw-laps');

let swStartTs = 0;   // 本次启动时刻
let swAccum = 0;     // 暂停前累计毫秒
let swRunning = false;
let swRAF = null;
let laps = [];       // 每次计次时的累计毫秒

function swElapsed() {
  return swAccum + (swRunning ? Date.now() - swStartTs : 0);
}

function swFmt(ms) {
  const p = n => String(n).padStart(2, '0');
  const cs = Math.floor(ms / 10) % 100;
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${p(m)}:${p(s)}.${p(cs)}`;
}

function swRender() {
  swDisplay.textContent = swFmt(swElapsed());
  if (swRunning) swRAF = requestAnimationFrame(swRender);
}

function swStart() {
  swRunning = true;
  swStartTs = Date.now();
  swBtn.textContent = '暂停';
  swLapBtn.disabled = false;
  swRender();
}

function swPause() {
  swRunning = false;
  swAccum += Date.now() - swStartTs;
  cancelAnimationFrame(swRAF);
  swBtn.textContent = '继续';
  swRender();
}

function swReset() {
  swRunning = false;
  swAccum = 0;
  laps = [];
  cancelAnimationFrame(swRAF);
  swDisplay.textContent = '00:00.00';
  swBtn.textContent = '开始';
  swLapBtn.disabled = true;
  swLaps.innerHTML = '';
}

function swAddLap() {
  if (!swRunning) return;
  const total = swElapsed();
  const prev = laps.length ? laps[laps.length - 1] : 0;
  laps.push(total);

  const row = document.createElement('div');
  row.className = 'lap-row';
  row.innerHTML =
    `<span>第 ${laps.length} 圈</span>` +
    `<span>${swFmt(total - prev)}</span>` +
    `<span>${swFmt(total)}</span>`;
  swLaps.prepend(row);
}

swBtn.addEventListener('click', () => swRunning ? swPause() : swStart());
swResetBtn.addEventListener('click', swReset);
swLapBtn.addEventListener('click', swAddLap);
