// ===== 提示音：浏览器原生合成，无需音频文件 =====
// 用法：AudioFX.beep(次数)。AudioContext 需要用户点击后才能出声，
// 而本应用的响铃都由点击"开始"触发，因此满足条件。

const AudioFX = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function beep(times = 1) {
    try {
      const ac = ensure();
      for (let i = 0; i < times; i++) {
        const t = ac.currentTime + i * 0.35;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain).connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch (e) {
      // 无法发声的环境（如无音频设备）静默忽略
    }
  }

  return { beep };
})();
