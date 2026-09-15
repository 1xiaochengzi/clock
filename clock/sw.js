// ===== Service Worker · 多功能时钟离线缓存 =====
// 预缓存核心文件（HTML / CSS / JS），运行时缓存图片（含景点图和图标）。
// 断网时回退到缓存，保证时钟和徒步功能可离线使用。

const CACHE_NAME = 'clock-v1';

// 预缓存列表：核心文件 + 占位图标（图片后续放入后也会被运行时缓存捕获）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/audio.js',
  './js/clock.js',
  './js/timer.js',
  './js/alarm.js',
  './js/countdown.js',
  './js/mono.js',
  './js/dual.js',
  './js/stopwatch.js',
  './js/pomodoro.js',
  './js/routes.js',
  './js/hike.js',
  './images/icon-192.png',
  './images/icon-512.png',
];

// 安装：逐个缓存，单个失败不影响其余文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {})  // 图标等占位文件不存在时静默跳过
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// 激活：清理旧缓存，立即接管
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：
//  - 图片请求 → 缓存优先，命中则返回缓存，未命中则去网络并回填缓存
//  - 其他请求 → 缓存优先，未命中时回退到网络
self.addEventListener('fetch', e => {
  const req = e.request;

  // 只处理 GET 请求
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 图片：运行时缓存（cache-first）
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // 核心文件：缓存优先，未命中走网络
  e.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).catch(() => caches.match('./index.html'))
    )
  );
});
