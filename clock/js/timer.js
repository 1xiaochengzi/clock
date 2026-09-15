// ===== 通用倒计时组件（闹钟 / 倒计时共用） =====
// 单按钮三态：开始 → 取消 → 停止响铃
// 用法：createCountdownTimer({ displayEl, statusEl, btnEl, inputs, presetsEl, texts })

function createCountdownTimer(opts) {
  const { displayEl, statusEl, btnEl, inputs, presetsEl, texts } = opts;

  let endTs = 0;
  let tickTimer = null;   // 倒计时循环
  let ringTimer = null;   // 响铃循环
  let ringing = false;

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fmt(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function clampNum(v, min, max) {
    v = parseInt(v, 10);
    if (isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function busy() {
    return tickTimer !== null || ringing;
  }

  function setDisabled(disabled) {
    inputs.forEach(el => el.disabled = disabled);
    if (presetsEl) {
      presetsEl.querySelectorAll('button').forEach(b => b.disabled = disabled);
    }
  }

  function stopAll() {
    clearInterval(tickTimer); tickTimer = null;
    clearInterval(ringTimer); ringTimer = null;
    ringing = false;
    setDisabled(false);
    displayEl.textContent = '--:--:--';
    statusEl.textContent = texts.idle;
    btnEl.textContent = '开始';
  }

  function startRinging() {
    ringing = true;
    displayEl.textContent = '00:00:00';
    statusEl.textContent = texts.done;
    btnEl.textContent = texts.stopBtn || '停止响铃';
    if (navigator.vibrate) navigator.vibrate([300, 200, 300]);
    AudioFX.beep(2);
    ringTimer = setInterval(() => AudioFX.beep(2), 1500);
  }

  function tick() {
    const remain = Math.ceil((endTs - Date.now()) / 1000);
    if (remain <= 0) {
      clearInterval(tickTimer);
      tickTimer = null;
      startRinging();
    } else {
      displayEl.textContent = fmt(remain);
    }
  }

  btnEl.addEventListener('click', () => {
    if (busy()) {
      stopAll();
      return;
    }

    const [hEl, mEl, sEl] = inputs;
    const total =
      clampNum(hEl.value, 0, 23) * 3600 +
      clampNum(mEl.value, 0, 59) * 60 +
      clampNum(sEl.value, 0, 59);

    if (total <= 0) {
      statusEl.textContent = texts.empty;
      return;
    }

    setDisabled(true);
    endTs = Date.now() + total * 1000;
    statusEl.textContent = texts.running;
    btnEl.textContent = '取消';
    tick();
    tickTimer = setInterval(tick, 250);
  });

  // 快捷时长胶囊：data-min 单位为分钟
  if (presetsEl) {
    presetsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-min]');
      if (!btn || busy()) return;
      const min = parseInt(btn.dataset.min, 10);
      inputs[0].value = Math.floor(min / 60);
      inputs[1].value = min % 60;
      inputs[2].value = 0;
    });
  }

  return { stopAll };
}
