/* ================================================================
   爆爆英雄 BOMB HERO — Service Worker（v4.6 新增）
   目的只有兩個：
     1. 讓瀏覽器認為這個網站「可以安裝」→ 桌面／手機主畫面捷徑
     2. 第一次開過之後，就算沒網路也能先把遊戲打開

   快取策略（刻意不對稱，避免玩家卡在舊版）：
     · 開網頁（導覽請求）→ 先跟伺服器要，3.5 秒沒回應才退回快取
       → 改版後玩家重新整理就是新版，不會被舊的 index.html 黏住
     · 圖示／manifest 等靜態檔 → 先給快取（秒開），背景順便更新
       → 下次開就是新的
     · /api/ 一律不攔（帳號、雲端存檔、線上配對都必須即時）
   ================================================================ */

var SW_VERSION = 'v5.12.0';
var CORE_CACHE = 'bh-core-' + SW_VERSION;   // 遊戲本體（離線也要開得起來）
var ASSET_CACHE = 'bh-asset-' + SW_VERSION; // 圖示等靜態資源
var NAV_TIMEOUT = 2200;   // v4.22：Render 冷啟動一定超過，早點回快取讓畫面先出來

var CORE = [
  './',
  './index.html',
  './bg/title.webp',
  './spr/title-logo.webp?v=59',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/pwa-logo.png',
  './icons/favicon-32.png'
];

/* v4.79：美術拆成 175 個 spr/*.webp。
   安裝時只抓首頁必需的那張（CORE），其餘在啟用後「背景慢慢預熱」——
   不阻塞啟用，也不讓玩家第一次進關卡時看到程式繪製的替代圖。
   預熱狀態記在 ASSET_CACHE 裡：已經有 150 張以上就不再抓。 */
function warmSprites() {
  caches.open(ASSET_CACHE).then(function (cache) {
    return Promise.all([cache.keys(), fetch('./spr/_list.json').then(function (r) { return r.json(); }).catch(function () { return null; })])
      .then(function (res) {
        var keys = res[0] || [], list = res[1];
        if (!list || !list.length) return;
        var have = 0;
        keys.forEach(function (k) { if (k.url.indexOf('/spr/') >= 0) have++; });
        if (have >= 150) return;
        var i = 0;
        function next() {
          if (i >= list.length) return;
          var batch = list.slice(i, i + 6);
          i += 6;
          Promise.all(batch.map(function (f) {
            var url = './spr/' + f;
            return cache.match(url).then(function (hit) {
              if (hit) return null;
              return fetch(url).then(function (r) { if (r && r.ok) return cache.put(url, r); return null; }).catch(function () { return null; });
            });
          })).then(next, next);
        }
        next();
      });
  }).catch(function () {});
}

/* v5.11：八張關卡底圖一定要進快取。
   以前只有 './bg/title.webp' 在 CORE 裡，其餘 8 張靠「用的時候才抓」——
   離線、或飯店／捷運那種斷斷續續的網路，assetFetch 回 504 就整批載不到，
   玩家看到的就是「每個關卡的底圖都不見了」（其他美術都在，因為 spr/ 有預熱）。
   這裡照 warmSprites 的做法：不阻塞安裝，一張一張慢慢補進 ASSET_CACHE。 */
var BG_LIST = ['forest', 'sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark'];

function warmBg() {
  caches.open(ASSET_CACHE).then(function (cache) {
    var i = 0;
    function next() {
      if (i >= BG_LIST.length) return;
      var url = './bg/' + BG_LIST[i] + '.webp';
      i++;
      cache.match(url).then(function (hit) {
        if (hit) return null;
        return fetch(url).then(function (r) { if (r && r.ok) return cache.put(url, r); return null; }).catch(function () { return null; });
      }).then(next, next);
    }
    next();
  }).catch(function () {});
}

/* ---------- 安裝：先把本體抓下來（單一檔案失敗不影響其他） ---------- */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CORE_CACHE).then(function (cache) {
      return Promise.all(CORE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { return null; });
      }));
    }).then(function () {
      self.skipWaiting();   // 新版立刻接手，不用關掉所有分頁
      warmSprites();        // v4.79：背景預熱 spr/*.webp（不阻塞）
      warmBg();             // v5.11：背景預熱 bg/*.webp（八張關卡底圖）
    })
  );
});

/* ---------- 啟用：清掉舊版本快取 ---------- */
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CORE_CACHE && k !== ASSET_CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- 前端可以叫 SW 立刻接手（例如按「重新載入」） ---------- */
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'VERSION' && e.source && e.source.postMessage) {
    e.source.postMessage({ type: 'VERSION', version: SW_VERSION });
  }
});

function isHTML(req) {
  if (req.mode === 'navigate') return true;
  var acc = req.headers.get('accept') || '';
  return acc.indexOf('text/html') >= 0;
}

function putSafe(cacheName, key, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  var copy = res.clone();
  caches.open(cacheName).then(function (c) { c.put(key, copy); }).catch(function () {});
}

/* v4.22：退回快取後，背景繼續等伺服器。真的拿到新版（ETag 不同）就通知頁面換掉，
   否則玩家會一直停在舊版（Render 免費方案冷啟動 30~60 秒，一定超過導覽逾時）。 */
function watchForNewer(cachedRes, req) {
  var oldTag = '';
  try { oldTag = (cachedRes && cachedRes.headers.get('etag')) || ''; } catch (e) {}
  fetch(new Request(req.url, { cache: 'no-store' })).then(function (res) {
    if (!res || !res.ok) return;
    var newTag = '';
    try { newTag = res.headers.get('etag') || ''; } catch (e) {}
    if (oldTag && newTag && oldTag === newTag) return;    // 一樣 → 不用吵
    putSafe(CORE_CACHE, './index.html', res);
    return self.clients.matchAll({ type: 'window' }).then(function (list) {
      list.forEach(function (c) { try { c.postMessage({ type: 'NEW_VERSION' }); } catch (e) {} });
    });
  }).catch(function () {});
}

/* 導覽：網路優先（有逾時）→ 快取 → 首頁 */
function navFetch(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(res) { if (settled) return; settled = true; resolve(res); }

    var timer = setTimeout(function () {
      caches.match('./index.html').then(function (c) {
        if (c) { done(c); watchForNewer(c, req); }   // 先讓玩家看到畫面，背景確認有沒有新版
      });
    }, NAV_TIMEOUT);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) putSafe(CORE_CACHE, './index.html', res);
      done(res);
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req).then(function (r1) {
        if (r1) { done(r1); watchForNewer(r1, req); return; }
        caches.match('./index.html').then(function (r2) {
          done(r2 || new Response(
            '<!doctype html><meta charset="utf-8"><title>離線</title>' +
            '<body style="background:#0d1220;color:#e8eefc;font-family:sans-serif;text-align:center;padding:60px 20px">' +
            '<h2>目前沒有網路</h2><p>連上網路後重新整理即可繼續玩《爆爆英雄》。</p></body>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          ));
        });
      });
    });
  });
}

/* 靜態資源：快取優先，背景順便更新 */
function assetFetch(req) {
  return caches.match(req).then(function (hit) {
    if (hit) {
      fetch(req).then(function (res) { putSafe(ASSET_CACHE, req, res); }).catch(function () {});
      return hit;
    }
    return fetch(req).then(function (res) {
      putSafe(ASSET_CACHE, req, res);
      return res;
    }).catch(function () {
      return new Response('', { status: 504, statusText: 'offline' });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;          // 第三方（OAuth 等）不碰
  if (url.pathname.indexOf('/api/') === 0) return;          // 後端 API 絕不快取

  if (isHTML(req)) e.respondWith(navFetch(req));
  else e.respondWith(assetFetch(req));
});
