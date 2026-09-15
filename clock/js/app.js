// ===== 页面导航 =====
// 主页面：时钟 / 功能 / 我的；子页面从功能页进入，
// 底部 tab 高亮归属到"功能"。

const pages = document.querySelectorAll('.page');
const tabs = document.querySelectorAll('.tab');

const TAB_OWNER = {
  'page-clock': 'page-clock',
  'page-functions': 'page-functions',
  'page-alarm': 'page-functions',
  'page-pomodoro': 'page-functions',
  'page-mono': 'page-functions',
  'page-dual': 'page-functions',
  'page-stopwatch': 'page-functions',
  'page-countdown': 'page-functions',
  'page-account': 'page-account',
};

function showPage(id) {
  pages.forEach(p => p.classList.toggle('active', p.id === id));
  const owner = TAB_OWNER[id] || 'page-clock';
  tabs.forEach(t => t.classList.toggle('active', t.dataset.page === owner));
}

tabs.forEach(t => t.addEventListener('click', () => showPage(t.dataset.page)));

// 功能页入口
document.querySelectorAll('[data-open]').forEach(el =>
  el.addEventListener('click', () => showPage(el.dataset.open)));

// 子页面返回
document.querySelectorAll('[data-back]').forEach(el =>
  el.addEventListener('click', () => showPage(el.dataset.back)));

// 闹钟法列表：展开 / 收起
const methodsToggle = document.getElementById('methods-toggle');
const methodsList = document.getElementById('methods-list');

methodsToggle.addEventListener('click', () => {
  const willOpen = methodsList.hidden;
  methodsList.hidden = !willOpen;
  methodsToggle.classList.toggle('open', willOpen);
});

// ===== 清空所有本地数据 =====
const clearDataBtn = document.getElementById('clear-data-btn');
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmOk = document.getElementById('confirm-ok');

function openConfirm() {
  confirmOverlay.hidden = false;
  void confirmOverlay.offsetWidth;  // 强制 reflow 触发过渡
  confirmOverlay.classList.add('open');
}

function closeConfirm() {
  confirmOverlay.classList.remove('open');
  setTimeout(() => { confirmOverlay.hidden = true; }, 250);
}

clearDataBtn.addEventListener('click', openConfirm);
confirmCancel.addEventListener('click', closeConfirm);
confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) closeConfirm();
});

// 确认清空：删除所有 hike.* 键，然后刷新页面恢复初始状态
confirmOk.addEventListener('click', () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('hike.'));
  keys.forEach(k => localStorage.removeItem(k));
  location.reload();
});

// ===== PWA 安装提示 =====
let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installDismiss = document.getElementById('install-dismiss');

// 浏览器触发 beforeinstallprompt 时缓存事件并显示提示条
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBanner.hidden = false;
  void installBanner.offsetWidth;  // 强制 reflow 触发过渡
  installBanner.classList.add('show');
});

// 点击安装：调用系统弹窗
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  hideInstallBanner();
});

// 点击关闭：隐藏提示条
installDismiss.addEventListener('click', hideInstallBanner);

function hideInstallBanner() {
  installBanner.classList.remove('show');
  setTimeout(() => { installBanner.hidden = true; }, 350);
}

// 已安装则隐藏提示
window.addEventListener('appinstalled', hideInstallBanner);
