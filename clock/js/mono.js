// ===== 单核工作法：每个小时只专注一件事（基于共用倒计时组件） =====

createCountdownTimer({
  displayEl: document.getElementById('mono-display'),
  statusEl: document.getElementById('mono-status'),
  btnEl: document.getElementById('mono-btn'),
  inputs: [
    document.getElementById('mono-h'),
    document.getElementById('mono-m'),
    document.getElementById('mono-s'),
  ],
  presetsEl: document.getElementById('mono-presets'),
  texts: {
    idle: '写下这一小时里最重要的那一件事',
    running: '单核专注中…',
    done: '单核时间到！',
    empty: '请先设置时长',
  },
});
