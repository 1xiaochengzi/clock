// ===== 闹钟：设定时长后响铃（基于共用倒计时组件） =====

createCountdownTimer({
  displayEl: document.getElementById('alarm-display'),
  statusEl: document.getElementById('alarm-status'),
  btnEl: document.getElementById('alarm-btn'),
  inputs: [
    document.getElementById('alarm-h'),
    document.getElementById('alarm-m'),
    document.getElementById('alarm-s'),
  ],
  presetsEl: document.getElementById('alarm-presets'),
  texts: {
    idle: '设好时长，点开始',
    running: '倒计时中…',
    done: '时间到！',
    empty: '请先设置时长',
  },
});
