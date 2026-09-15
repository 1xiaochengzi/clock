// ===== 徒步路线图 · 累积计时法 + activeRouteId 隔离状态管理 =====
// 计时权唯一归属：hikeActiveId 标记当前激活路线，全应用同一时刻
// 只允许这一条路线处于 running，其他路线的会话一律冻结。
// 每条路线的计时数据完全隔离（会话按路线 id 各自存取，互不共享计时器）：
//   计时中：totalMs = acc + (now - seg)
//   暂停 / 待机 / 结束：totalMs = acc（时间不走、距离不动）
// 开始 / 继续：若另一条路线正在计时 → 拦截并提示先手动暂停，
//   绝不自动接管；手动暂停后才真正开始。暂停：结算本段进 acc 并清空 seg；
// 重置：只清空当前路线自己的 acc，绝不触碰其他路线的数据。
// 切换路线：仅切换展示各自的隔离会话；查看未启动的路线时展示其
//   静态路线图（圆点停在起点、时长 0），绝不自动开始计时。
// 视图绑定：全场无进行中会话时只留计时条；开始后路线淡入；
//   暂停圆点原地停住；重置圆点归零并淡出路线。

const hikeSvg = document.getElementById('hike-svg');
const hikeTabs = document.getElementById('hike-tabs');
const hikeCaption = document.getElementById('hike-caption');
const hikeStatus = document.getElementById('hike-status');
const hikeDurationTime = document.getElementById('hike-duration-time');
const hikeDurationProg = document.getElementById('hike-duration-prog');
const hikeToast = document.getElementById('hike-toast');
const hikeSpeedInput = document.getElementById('hike-speed');
const hikeSpeedVal = document.getElementById('hike-speed-val');
const hikeMainBtn = document.getElementById('hike-main-btn');
const hikeResetBtn = document.getElementById('hike-reset-btn');
const hikeSpotsEl = document.getElementById('hike-spots');
const hikeCardEl = document.getElementById('hike-card');
const hikeCardName = document.getElementById('hike-card-name');
const hikeCardMeta = document.getElementById('hike-card-meta');
const hikeCardNote = document.getElementById('hike-card-note');
const hikeCardClose = document.getElementById('hike-card-close');
const hikeAreaEl = document.getElementById('hike-area');
const hikeViewEl = document.getElementById('hike-view');

// 与 HTML 中 viewBox 保持一致
const HIKE_SVG_W = 480;
const HIKE_PAD_X = 30;   // 两端留白，避免起终点贴边
const HIKE_BASE_Y = 84;  // 路径基准线
const HIKE_AMP = 24;     // 蜿蜒幅度
const HIKE_WAVES = 2;    // 蜿蜒次数
const HIKE_SPEED_DEFAULT = 4.5;  // 成年男性平均速度 km/h

let hikeRoute = HIKE_ROUTES[0];
let hikeSpeed = hikeLoadSpeed();
let hikeTrailEl = null;       // 已走足迹（实线）
let hikeTrailLen = 0;         // 路径总长（svg 单位）
let hikeHikerEl = null;       // 徒步者
let hikeHikerLabelEl = null;  // 徒步者头顶地名
let hikeNodeEls = [];         // 景点节点
let hikeSpotBtnEls = [];      // 景点名字胶囊
let hikeSelIdx = -1;          // 当前卡片展示的景点下标
let hikeViewTimer = 0;        // 路线视图淡出动画计时器
let hikeToastTimer = 0;       // 拦截提示条自动消失计时器

/* ---------- 全局状态层：activeRouteId + 按路线隔离的会话 ---------- */
// 计时权唯一归属：hikeActiveId 是当前激活路线，任意时刻最多只有
// 这一条路线处于 running。计时数据（state / acc / seg）按路线 id
// 完全隔离，绝不共享同一个计时器。

const HIKE_VALID_STATES = ['idle', 'running', 'paused', 'finished'];

let hikeActiveId = null;         // 当前激活路线 ID（唯一计时权归属，持久化）
const hikeSessions = new Map();  // 路线 id -> 隔离会话 { state, acc, seg }

// 激活路线 ID 读写
function hikeLoadActiveId() {
  try { return localStorage.getItem('hike.active') || null; } catch (e) { return null; }
}

function hikePersistActive() {
  try { localStorage.setItem('hike.active', hikeActiveId || ''); } catch (e) {}
}

hikeActiveId = hikeLoadActiveId();

// 激活路线若已不存在于路线表中（路线数据变更过），回归无激活状态，
// 避免拦截逻辑被"幽灵路线"永久卡死
if (hikeActiveId && !HIKE_ROUTES.some(r => r.id === hikeActiveId)) {
  hikeActiveId = null;
  hikePersistActive();
}

function hikeValidState(s) {
  return HIKE_VALID_STATES.includes(s) ? s : 'idle';
}

// 读取某条路线的隔离会话（首次访问时从 localStorage 恢复）。
// 铁律：非激活路线一律不允许处于 running —— 若存储里残留 running
// （旧版本 bug / 数据异常），立即降级为暂停并丢弃悬挂段，不补算时间。
// 唯例外：id === hikeActiveId 且段起点完整（"计时中刷新页面"的合法恢复）。
function hikeSession(id) {
  let s = hikeSessions.get(id);
  if (s) return s;
  try {
    s = {
      acc: parseFloat(localStorage.getItem('hike.acc.' + id)) || 0,
      state: hikeValidState(localStorage.getItem('hike.state.' + id)),
      seg: parseFloat(localStorage.getItem('hike.seg.' + id)) || 0,
    };
  } catch (e) {
    s = { acc: 0, state: 'idle', seg: 0 };
  }
  if (s.state === 'running' && (id !== hikeActiveId || !s.seg)) {
    s.seg = 0;
    s.state = 'paused';
  }
  if (s.state !== 'running') s.seg = 0;
  hikeSessions.set(id, s);
  return s;
}

// 会话持久化：每条路线各自的 acc / state / seg 独立存取
function hikePersistSession(id) {
  const s = hikeSessions.get(id);
  if (!s) return;
  try {
    localStorage.setItem('hike.acc.' + id, String(s.acc));
    localStorage.setItem('hike.state.' + id, s.state);
    localStorage.setItem('hike.seg.' + id, String(s.seg || 0));
    localStorage.removeItem('hike.start.' + id);  // 清理旧版真实时间法残留
  } catch (e) {}
}

// 把某条正在计时的路线结算并冻结为暂停（激活权移交 / 兜底时使用）
function hikeFreezeRunning(id) {
  const s = hikeSession(id);
  if (s.state !== 'running') return;
  s.acc += Math.max(0, Date.now() - s.seg);
  s.seg = 0;
  s.state = 'paused';
  hikePersistSession(id);
}

// 激活权接管：任何路线开始 / 继续前必须先经过这里。
// 正常流程下，"另一条路线计时中"的开始请求已被 UI 拦截 + 数据层
// 双重拒绝，不会走到旧路线仍在 running 的分支；此处的冻结结算
// 仅作为最后兜底，确保任何时候都只有一条路线在计时。
function hikeTakeover() {
  if (hikeActiveId !== hikeRoute.id) {
    if (hikeActiveId) hikeFreezeRunning(hikeActiveId);
    hikeActiveId = hikeRoute.id;
    hikePersistActive();
  }
  return hikeSession(hikeRoute.id);
}

// 是否存在进行中 / 暂停中的徒步会话（与当前显示哪条路线无关）。
// 只要还有会话没走完也没放弃，徒步区视图就保持展开；
// 全场都处于待机时才收起为纯计时条。
function hikeHasLiveSession() {
  return !!(hikeActiveId && hikeSession(hikeActiveId).state !== 'idle');
}

/* ---------- 状态迁移（全部只作用于激活路线的隔离会话） ---------- */

// 待机 / 暂停 → 计时中：接管激活权并记录段起点
// 数据层兜底拦截：另一条路线正在计时时拒绝开始（UI 层会先提示）
function hikeStartWalk() {
  if (hikeActiveId && hikeActiveId !== hikeRoute.id &&
      hikeSession(hikeActiveId).state === 'running') return;
  const s = hikeTakeover();
  if (s.state !== 'idle' && s.state !== 'paused') return;
  s.seg = Date.now();
  s.state = 'running';
  hikePersistSession(hikeRoute.id);
}

// 计时中 → 暂停：结算本段进累积值，清空段起点（时间停走）
function hikePauseWalk() {
  if (hikeRoute.id !== hikeActiveId) return;   // 只有激活路线可暂停
  hikeFreezeRunning(hikeRoute.id);
}

// 暂停 → 计时中：重新记录段起点（数据层兜底拦截同 hikeStartWalk）
function hikeResumeWalk() {
  if (hikeActiveId && hikeActiveId !== hikeRoute.id &&
      hikeSession(hikeActiveId).state === 'running') return;
  const s = hikeTakeover();
  if (s.state !== 'paused') return;
  s.seg = Date.now();
  s.state = 'running';
  hikePersistSession(hikeRoute.id);
}

// 计时中走完全程 → 结束：结算本段并冻结（由 updateHike 检测触发）
function hikeFinishWalk(now) {
  if (hikeRoute.id !== hikeActiveId) return;   // 只有激活路线可走完结算
  const s = hikeSession(hikeRoute.id);
  if (s.state !== 'running') return;
  s.acc += Math.max(0, now - s.seg);
  s.seg = 0;
  s.state = 'finished';
  hikePersistSession(hikeRoute.id);
}

// 任意状态 → 待机：只清空当前路线自己的累积时长，不碰其他路线
function hikeResetWalk() {
  const s = hikeSession(hikeRoute.id);
  s.acc = 0;
  s.seg = 0;
  s.state = 'idle';
  hikePersistSession(hikeRoute.id);
}

/* ---------- 速度持久化 ---------- */

function hikeLoadSpeed() {
  try {
    const v = parseFloat(localStorage.getItem('hike.speed'));
    return (v >= 3 && v <= 7) ? v : HIKE_SPEED_DEFAULT;
  } catch (e) { return HIKE_SPEED_DEFAULT; }
}

function hikeSaveSpeed() {
  try { localStorage.setItem('hike.speed', String(hikeSpeed)); } catch (e) {}
}

/* ---------- 几何：横向比例 t(0~1) → 路径坐标 ---------- */

// 正弦蜿蜒，保证节点与徒步者正好落在路径上
function hikeCurveY(t) {
  return HIKE_BASE_Y - HIKE_AMP * Math.sin(t * Math.PI * HIKE_WAVES);
}

function hikeNodeX(t) {
  return HIKE_PAD_X + t * (HIKE_SVG_W - HIKE_PAD_X * 2);
}

/* ---------- 进度计算：完全基于累积专注时长 ---------- */

function hikeElapsedMs(now) {
  const s = hikeSession(hikeRoute.id);
  // 严格绑定 activeRouteId：只有激活路线的 running 段会推进时间
  const seg = (hikeRoute.id === hikeActiveId && s.state === 'running' && s.seg)
    ? Math.max(0, now - s.seg) : 0;
  return s.acc + seg;
}

function hikeElapsedKm(now) {
  return hikeElapsedMs(now) / 3600000 * hikeSpeed;
}

// 当前里程已到达的最远景点下标
function hikeSpotIndex(km) {
  let idx = 0;
  for (let i = 0; i < hikeRoute.spots.length; i++) {
    if (hikeRoute.spots[i].km <= km) idx = i; else break;
  }
  return idx;
}

function hikeFmtHours(h) {
  if (h < 1) return Math.round(h * 60) + ' 分钟';
  let hh = Math.floor(h);
  let mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh += 1; mm = 0; }
  return mm ? `${hh} 小时 ${mm} 分` : `${hh} 小时`;
}

// 已徒步时长 HH:MM:SS：只由累积专注毫秒数换算，暂停 / 待机 / 结束时冻结
function hikeFmtHMS(ms) {
  const total = Math.floor(ms / 1000);
  const p = n => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600))}:${p(Math.floor(total % 3600 / 60))}:${p(total % 60)}`;
}

// 6:00-18:00 为白天，其余为夜晚
function hikeIsNight(now) {
  const h = new Date(now).getHours();
  return h < 6 || h >= 18;
}

/* ---------- 视图显隐：待机收起路线视图，开始后淡入 ---------- */

function hikeShowView() {
  clearTimeout(hikeViewTimer);
  hikeViewEl.classList.remove('closing');
  hikeAreaEl.classList.remove('compact');
}

// 收起视图：先播放淡出动画，再整体隐藏（计时条始终保留）
function hikeHideView() {
  if (hikeAreaEl.classList.contains('compact')) return;
  hikeViewEl.classList.add('closing');
  clearTimeout(hikeViewTimer);
  hikeViewTimer = setTimeout(() => {
    hikeAreaEl.classList.add('compact');
    hikeViewEl.classList.remove('closing');
  }, 320);
}

/* ---------- 拦截提示条 ---------- */

// 显示提示条并在约 2.6 秒后自动淡出（重复调用会重新计时）
function hikeShowToast(msg) {
  hikeToast.textContent = msg;
  hikeToast.hidden = false;
  hikeToast.classList.remove('out');
  clearTimeout(hikeToastTimer);
  hikeToastTimer = setTimeout(() => {
    hikeToast.classList.add('out');
    hikeToastTimer = setTimeout(() => {
      hikeToast.hidden = true;
      hikeToast.classList.remove('out');
    }, 300);
  }, 2600);
}

/* ---------- 渲染 ---------- */

function renderHikeRoute() {
  hikeCloseSpot();  // 切换路线时收起旧注解
  const sess = hikeSession(hikeRoute.id);  // 各路线会话彼此隔离，切换 = 读取自己的会话

  // 视图同步：
  //  - 当前路线有会话（进行中 / 暂停 / 已结束）→ 显示它的路线图与进度
  //  - 当前路线未启动、但另一条路线正在计时 → 同样正常展示路线图，
  //    新路线以"未启动"姿态呈现（圆点停在起点、时长 0），绝不自动计时
  //  - 全场无任何进行中会话（初始状态 / 重置后）→ 只留计时条
  if (sess.state === 'idle' && !hikeHasLiveSession()) hikeAreaEl.classList.add('compact');
  else hikeShowView();

  // 1. 蜿蜒的主路径（虚线底道 + 实线足迹用同一 d）
  let d = '';
  const STEPS = 60;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    d += (i === 0 ? 'M ' : ' L ') +
      hikeNodeX(t).toFixed(1) + ' ' + hikeCurveY(t).toFixed(1);
  }

  // 2. 景点节点：x 位置 = 景点公里数 / 总里程，按比例分布
  //    外层 g 承担点击事件，透明大圆扩大手指触控范围
  const last = hikeRoute.spots.length - 1;
  const nodes = hikeRoute.spots.map((s, i) => {
    const t = s.km / hikeRoute.totalKm;
    const cx = hikeNodeX(t).toFixed(1);
    const cy = hikeCurveY(t).toFixed(1);
    const r = (i === 0 || i === last) ? 6 : 4.5;
    return `<g class="hike-node-g" data-idx="${i}">` +
      `<title>${i + 1}. ${s.name} · ${s.km} km · 海拔 ${s.elevation} m</title>` +
      `<circle class="hike-node-hit" cx="${cx}" cy="${cy}" r="11"/>` +
      `<circle class="hike-node" cx="${cx}" cy="${cy}" r="${r}"/>` +
      `</g>`;
  }).join('');

  // 3. 昼夜背景：天空 / 草地 / 星星 / 日月（夜间元素靠 CSS 透明度交叉淡入）
  let stars = '';
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 137 + 23) % 464) + 8;   // 固定伪随机分布，重渲染不跳动
    const sy = ((i * 89 + 17) % 44) + 6;
    const sr = [0.9, 1.2, 1.6][i % 3];
    stars += `<circle class="hike-star" cx="${sx}" cy="${sy}" r="${sr}"` +
      ` style="animation-delay:${(i * 0.37).toFixed(2)}s"/>`;
  }

  const backdrop =
    `<defs>` +
    `<linearGradient id="hike-sky-day-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#9fd8f9"/><stop offset="1" stop-color="#d9f2ff"/></linearGradient>` +
    `<linearGradient id="hike-sky-night-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#0d1630"/><stop offset="1" stop-color="#1a2440"/></linearGradient>` +
    `<linearGradient id="hike-ground-day-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#8fd377"/><stop offset="1" stop-color="#5fa94e"/></linearGradient>` +
    `<linearGradient id="hike-ground-night-g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#1b2f26"/><stop offset="1" stop-color="#101d2e"/></linearGradient>` +
    `<radialGradient id="hike-torch-g">` +
    `<stop offset="0" stop-color="#fff3b0" stop-opacity="0.9"/>` +
    `<stop offset="0.45" stop-color="#ffe680" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="#ffe680" stop-opacity="0"/></radialGradient>` +
    `</defs>` +
    `<rect class="hike-sky-day" width="${HIKE_SVG_W}" height="140"/>` +
    `<rect class="hike-sky-night" width="${HIKE_SVG_W}" height="140"/>` +
    `<rect class="hike-ground-day" y="122" width="${HIKE_SVG_W}" height="18"/>` +
    `<rect class="hike-ground-night" y="122" width="${HIKE_SVG_W}" height="18"/>` +
    `<g class="hike-stars">${stars}</g>` +
    `<circle class="hike-sun" cx="444" cy="24" r="12"/>` +
    `<g class="hike-moon"><circle cx="444" cy="24" r="10"/>` +
    `<circle class="hike-moon-shadow" cx="449" cy="20" r="9"/></g>`;

  // 4. 起终点地名 + 徒步者（自带夜间手电筒光晕，随组平移）
  hikeSvg.innerHTML =
    backdrop +
    `<path class="hike-path" d="${d}"/>` +
    `<path class="hike-trail" d="${d}"/>` +
    nodes +
    `<text class="hike-label" x="${HIKE_PAD_X}" y="130" text-anchor="start">${hikeRoute.spots[0].name}</text>` +
    `<text class="hike-label" x="${HIKE_SVG_W - HIKE_PAD_X}" y="130" text-anchor="end">${hikeRoute.spots[last].name}</text>` +
    `<g class="hike-hiker" transform="translate(${HIKE_PAD_X} ${HIKE_BASE_Y})">` +
    `<circle class="hike-torch" r="17" fill="url(#hike-torch-g)"/>` +
    `<text id="hike-hiker-label" y="-14" text-anchor="middle"></text>` +
    `<circle class="hike-hiker-circle" r="5.5"/>` +
    `</g>`;

  hikeTrailEl = hikeSvg.querySelector('.hike-trail');
  hikeHikerEl = hikeSvg.querySelector('.hike-hiker');
  hikeHikerLabelEl = document.getElementById('hike-hiker-label');
  hikeNodeEls = Array.from(hikeSvg.querySelectorAll('.hike-node'));

  // 手动按折线计算路径总长，视图隐藏（display:none）时同样可靠
  hikeTrailLen = 0;
  {
    let prevX = null, prevY = null;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const nx = hikeNodeX(t), ny = hikeCurveY(t);
      if (i > 0) hikeTrailLen += Math.hypot(nx - prevX, ny - prevY);
      prevX = nx; prevY = ny;
    }
  }

  // 5. 路线说明
  hikeCaption.innerHTML =
    `<b>${hikeRoute.region} · 全程 ${hikeRoute.totalKm} km · ${hikeRoute.spots.length} 个景点</b><br>${hikeRoute.desc}`;

  // 6. 景点名字胶囊（与节点同下标，点击打开注解卡片）
  hikeSpotsEl.innerHTML = hikeRoute.spots.map((s, i) =>
    `<button data-idx="${i}">${s.name}</button>`).join('');
  hikeSpotBtnEls = Array.from(hikeSpotsEl.querySelectorAll('button'));

  updateHike();
}

// 每秒调用：按状态推进主题 / 位置 / 文案
function updateHike() {
  if (!hikeHikerEl) return;

  const now = Date.now();

  // 昼夜主题：按系统小时切换，SVG 内元素用 CSS 过渡平滑更替
  hikeSvg.classList.toggle('hike-night', hikeIsNight(now));

  const sess = hikeSession(hikeRoute.id);   // 当前显示路线的隔离会话

  // 计时中走完全程 → 自动结算并进入"已结束"（仅激活路线可能处于 running）
  let km = hikeElapsedKm(now);
  if (hikeRoute.id === hikeActiveId && sess.state === 'running' && km >= hikeRoute.totalKm) {
    hikeFinishWalk(now);
    km = hikeElapsedKm(now);
  }
  const t = Math.min(km / hikeRoute.totalKm, 1);
  const x = hikeNodeX(t);
  const y = hikeCurveY(t);

  // 徒步者沿线移动 + 足迹实线随之延伸（暂停时因 km 冻结而原地不动）
  hikeHikerEl.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  hikeTrailEl.setAttribute('stroke-dasharray',
    `${(hikeTrailLen * t).toFixed(1)} ${hikeTrailLen.toFixed(1)}`);

  // 当前景点与节点高亮
  const idx = hikeSpotIndex(km);
  const spot = hikeRoute.spots[idx];
  hikeHikerLabelEl.textContent = spot.name;
  hikeHikerLabelEl.setAttribute('text-anchor',
    t < 0.12 ? 'start' : (t > 0.88 ? 'end' : 'middle'));
  hikeNodeEls.forEach((el, i) => el.classList.toggle('reached', i <= idx));
  hikeSpotBtnEls.forEach((el, i) => el.classList.toggle('reached', i <= idx));

  // 主按钮文案随状态切换
  hikeMainBtn.textContent = {
    idle: '开始计时', running: '暂停', paused: '继续', finished: '再走一次',
  }[sess.state];

  // 已徒步时长（HH:MM:SS）+ 徒步进度：严格取自累积计时值
  // running 时含当前段（acc + now - seg），其余状态只显示 acc（冻结）
  const elapsedMs = hikeElapsedMs(now);
  hikeDurationTime.textContent = hikeFmtHMS(elapsedMs);
  hikeDurationProg.textContent = `${km.toFixed(1)} km · ${(t * 100).toFixed(1)}%`;

  // 状态行
  const last = hikeRoute.spots.length - 1;
  const hours = elapsedMs / 3600000;
  let line1, line2 = '';
  switch (sess.state) {
    case 'running': {
      line1 = `计时中 · 已走 <b>${km.toFixed(1)} km</b> · 到达：<b>${spot.name}</b>`;
      const next = hikeRoute.spots[idx + 1];
      if (next) {
        const remain = next.km - km;
        line2 = `下一景点：${next.name}（还剩 ${remain.toFixed(1)} km，约 ${hikeFmtHours(remain / hikeSpeed)}）`;
      }
      break;
    }
    case 'paused':
      line1 = `已暂停 · 已走 <b>${km.toFixed(1)} km</b> · 到达：<b>${spot.name}</b>`;
      line2 = `时间不走、距离不变，点「继续」接着走`;
      break;
    case 'finished':
      line1 = `今日徒步完成 · 已抵达「${hikeRoute.spots[last].name}」`;
      line2 = `累计 ${hikeFmtHours(hours)} · 点「再走一次」重新启程`;
      break;
    default:  // idle
      line1 = `待机 · 全程 ${hikeRoute.totalKm} km`;
      line2 = `点「开始计时」启程，按 ${hikeSpeed.toFixed(1)} km/h 预计 ${hikeFmtHours(hikeRoute.totalKm / hikeSpeed)} 走完`;
  }
  hikeStatus.innerHTML = line1 + (line2 ? `<i>${line2}</i>` : '');
}

/* ---------- 景点注解卡片 ---------- */

function hikeOpenSpot(i) {
  const s = hikeRoute.spots[i];
  const reached = s.km <= hikeElapsedKm(Date.now());
  hikeCardName.textContent = `${i + 1}. ${s.name}`;
  hikeCardMeta.innerHTML =
    `距起点 ${s.km} km · 海拔 ${s.elevation} m · ` +
    `<span class="${reached ? 'ok' : 'no'}">${reached ? '已到达' : '尚未到达'}</span>`;
  hikeCardNote.textContent = s.note;
  hikeSelIdx = i;
  hikeCardEl.classList.add('open');
  hikeSpotBtnEls.forEach((el, j) => el.classList.toggle('sel', j === i));

  // 让对应名字胶囊滚入视野
  const btn = hikeSpotBtnEls[i];
  if (btn && btn.scrollIntoView) {
    btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
}

function hikeCloseSpot() {
  hikeSelIdx = -1;
  hikeCardEl.classList.remove('open');
  hikeSpotBtnEls.forEach(el => el.classList.remove('sel'));
}

// 同一景点再次点击则收起，点击不同景点则切换注解内容
function hikeToggleSpot(i) {
  if (hikeCardEl.classList.contains('open') && hikeSelIdx === i) {
    hikeCloseSpot();
  } else {
    hikeOpenSpot(i);
  }
}

/* ---------- 初始化 ---------- */

function initHike() {
  // 页面加载定位：刷新前若有进行中 / 暂停中的路线，直接回到那条路线，
  // 避免停在默认路线、而真正在走的路线在后台"隐形"计时
  if (hikeActiveId) {
    const active = HIKE_ROUTES.find(r => r.id === hikeActiveId);
    const ast = active && hikeSession(active.id).state;
    if (ast === 'running' || ast === 'paused') hikeRoute = active;
  }

  // 路线切换按钮
  hikeTabs.innerHTML = HIKE_ROUTES.map(r =>
    `<button data-route="${r.id}"${r.id === hikeRoute.id ? ' class="sel"' : ''}>${r.name}</button>`
  ).join('');

  hikeTabs.addEventListener('click', e => {
    const btn = e.target.closest('button[data-route]');
    if (!btn) return;
    hikeRoute = HIKE_ROUTES.find(r => r.id === btn.dataset.route) || hikeRoute;
    hikeTabs.querySelectorAll('button').forEach(b =>
      b.classList.toggle('sel', b === btn));
    renderHikeRoute();
  });

  // 速度滑块：重写累积时长使位置不变，此后按新速度行进
  hikeSpeedInput.value = hikeSpeed;
  hikeSpeedVal.textContent = hikeSpeed.toFixed(1);
  hikeSpeedInput.addEventListener('input', () => {
    const now = Date.now();
    const km = hikeElapsedKm(now);   // 旧速度下的当前位置
    hikeSpeed = parseFloat(hikeSpeedInput.value) || HIKE_SPEED_DEFAULT;
    const sess = hikeSession(hikeRoute.id);
    sess.acc = Math.round(km / hikeSpeed * 3600000);   // 重写累积时长 → 位置锁定
    if (sess.state === 'running') sess.seg = now;      // 段起点重锚定
    hikeSaveSpeed();
    hikePersistSession(hikeRoute.id);
    hikeSpeedVal.textContent = hikeSpeed.toFixed(1);
    updateHike();
  });

  // 主按钮：按状态分发 开始 / 暂停 / 继续 / 再走一次
  // 拦截：另一条路线正在计时（running）时，开始 / 继续 / 再走一律拒绝
  // 并提示，用户必须先手动暂停当前路线；数据层 hikeStartWalk /
  // hikeResumeWalk 内有相同守卫兜底
  hikeMainBtn.addEventListener('click', () => {
    const st = hikeSession(hikeRoute.id).state;
    const otherRunning = hikeActiveId && hikeActiveId !== hikeRoute.id &&
      hikeSession(hikeActiveId).state === 'running';
    if (st !== 'running' && otherRunning) {
      hikeShowToast('请先暂停当前路线的徒步，才能开始新的路线。');
      return;
    }
    if (st === 'running') hikePauseWalk();
    else if (st === 'paused') hikeResumeWalk();
    else if (st === 'finished') { hikeResetWalk(); hikeStartWalk(); }
    else hikeStartWalk();
    if (hikeSession(hikeRoute.id).state !== 'idle') hikeShowView();
    updateHike();
  });

  // 重置：清零当前路线的累积时长，圆点退回起点。
  // 仅当重置后全场没有任何进行中会话时才收起视图；
  // 若另一条路线仍在计时，视图保持展开（当前路线以未启动姿态显示）
  hikeResetBtn.addEventListener('click', () => {
    hikeResetWalk();
    if (!hikeHasLiveSession()) hikeHideView();
    updateHike();
  });

  // 点击 SVG 节点（圆圈）→ 打开 / 收起注解卡片
  hikeSvg.addEventListener('click', e => {
    const g = e.target.closest('.hike-node-g');
    if (g) hikeToggleSpot(Number(g.dataset.idx));
  });

  // 点击景点名字胶囊 → 打开 / 收起注解卡片
  hikeSpotsEl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-idx]');
    if (!btn) return;
    hikeToggleSpot(Number(btn.dataset.idx));
  });

  // 卡片右上角 × 关闭
  hikeCardClose.addEventListener('click', hikeCloseSpot);

  // 从休眠 / 后台恢复时立即校正
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) updateHike();
  });

  // 离开时钟页时自动收起卡片
  const pageClock = document.getElementById('page-clock');
  new MutationObserver(() => {
    if (!pageClock.classList.contains('active')) hikeCloseSpot();
  }).observe(pageClock, { attributes: true, attributeFilter: ['class'] });

  renderHikeRoute();
  setInterval(updateHike, 1000);
}

initHike();
