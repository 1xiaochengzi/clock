// ===== 倒计时：为任务设定时限（基于共用倒计时组件） =====

createCountdownTimer({
  displayEl: document.getElementById('countdown-display'),
  statusEl: document.getElementById('countdown-status'),
  btnEl: document.getElementById('countdown-btn'),
  inputs: [
    document.getElementById('countdown-h'),
    document.getElementById('countdown-m'),
    document.getElementById('countdown-s'),
  ],
  presetsEl: document.getElementById('countdown-presets'),
  texts: {
    idle: '设置时长，点开始',
    running: '倒计时中…',
    done: '倒计时结束！',
    empty: '请先设置时长',
  },
});
