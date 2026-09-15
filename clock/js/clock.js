// ===== 主时钟 · 支持多时区切换 =====
// 默认显示北京时间（Asia/Shanghai），用户可在世界时钟弹窗中切换城市。
// 使用 Intl.DateTimeFormat 按选中时区计算准确时间，不再依赖 new Date() 本地时间。

const timeEl = document.getElementById('time');
const dateEl = document.getElementById('date');
const tzLabelEl = document.querySelector('.tz-label');

// 世界时钟弹窗元素
const wcOverlay = document.getElementById('wc-overlay');
const wcOpenBtn = document.getElementById('wc-open-btn');
const wcCloseBtn = document.getElementById('wc-sheet-close');
const wcList = document.getElementById('wc-list');

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

// 当前选中的时区与城市名
let clockTz = 'Asia/Shanghai';
let clockCity = '北京';

// 用 Intl.DateTimeFormat 获取指定时区的各时间分量
function getZonedParts(tz) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',   // zh-CN 下 weekday short 为"周一"形式
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  // weekday 形如 "周一"，取末尾汉字
  let week = (map.weekday || '').slice(-1);
  const weekMap = { '一': '一', '二': '二', '三': '三', '四': '四', '五': '五', '六': '六', '日': '日' };
  week = weekMap[week] || week;
  return {
    h: map.hour === '24' ? '00' : String(map.hour).padStart(2, '0'),
    m: map.minute,
    s: map.second,
    year: map.year,
    month: String(map.month).padStart(2, '0'),
    day: String(map.day).padStart(2, '0'),
    week,
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// 渲染主时钟（按 clockTz / clockCity）
function render() {
  const t = getZonedParts(clockTz);
  timeEl.textContent = `${t.h}:${t.m}:${t.s}`;
  dateEl.textContent = `${t.year}年${t.month}月${t.day}日 星期${t.week}`;
  tzLabelEl.textContent = `${clockCity}时间`;
}

// 刷新弹窗内各城市时间（打开弹窗时调用）
function renderWcList() {
  wcList.querySelectorAll('.wc-item').forEach(li => {
    const tz = li.dataset.tz;
    if (!tz) return;
    const t = getZonedParts(tz);
    li.querySelector('.wc-time').textContent = `${t.h}:${t.m}`;
    // 高亮当前选中的城市
    li.classList.toggle('active', tz === clockTz);
  });
}

// 打开 / 关闭弹窗
function openWc() {
  wcOverlay.hidden = false;
  // 强制 reflow 后添加 open 类，触发 CSS 过渡
  void wcOverlay.offsetWidth;
  wcOverlay.classList.add('open');
  renderWcList();
}

function closeWc() {
  wcOverlay.classList.remove('open');
  // 等过渡结束再 hidden
  setTimeout(() => { wcOverlay.hidden = true; }, 300);
}

// 点击城市项：切换主时钟到该城市并关闭弹窗
wcList.addEventListener('click', e => {
  const item = e.target.closest('.wc-item');
  if (!item) return;
  clockTz = item.dataset.tz;
  clockCity = item.dataset.city;
  render();
  closeWc();
});

// 弹窗交互
wcOpenBtn.addEventListener('click', openWc);
wcCloseBtn.addEventListener('click', closeWc);
wcOverlay.addEventListener('click', e => {
  if (e.target === wcOverlay) closeWc();  // 点击遮罩空白处关闭
});

// 对齐到整秒触发，避免固定 1s 间隔带来的累积漂移
function tick() {
  render();
  setTimeout(tick, 1000 - (Date.now() % 1000));
}

tick();
