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

var SW_VERSION = 'v5.66.0';
var CORE_CACHE = 'bh-core-' + SW_VERSION;   // 遊戲本體（離線也要開得起來）
var ASSET_CACHE = 'bh-asset-' + SW_VERSION; // 圖示等靜態資源
var NAV_TIMEOUT = 2200;   // v4.22：Render 冷啟動一定超過，早點回快取讓畫面先出來
var HARD_TIMEOUT = 10000; // v5.55：硬上限。到這裡還沒拿到任何回應就給「喚醒中」頁，絕不讓玩家無限轉圈

var CORE = [
  './',
  './index.html',
  './js/i18n-src.js',
  './js/version-log.js',
  './js/main.js',
  './js/keys-ui.js',
  './js/onboard.js',
  './bg/title.webp',
  './spr/title-logo.webp?v=59',
  './spr/nuke-missile.webp',
  './spr/flame-tongue.webp',
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

   v5.53：改成「分級預熱」。以前是照 _list.json 的檔案順序無差別抓 219 張（約 3 MB），
   只打單人關的玩家也要付大逃殺／BOSS 的流量，而且會跟正在玩的那場搶頻寬。

   v5.63：P0 再收窄一次。實測首屏 240 個請求 / 3.4 MB，其中 218 張圖佔 2.5 MB，
   而 P0 桶居然有 184 張 / 1.7 MB 且「全速無延遲」—— 等於跟 main.js 搶頻寬。
   分桶規則只有 br- 與 boss- 兩條，剩下的全部掉進 P0，連「買了隨從才看得到」的
   pet-（327 KB）、「打了 RPG 才有」的 mount-（131 KB）、
   「RPG 王／坐騎拼裝件」img-parts-（230 KB）都在裡面。
   現在四桶：
     P0  地形／火焰／蛋／道具／UI／角色拼裝（約 107 張 / 0.4 MB）—— 首頁＋第一關真的會畫到
     P1  怪物與 BOSS（約 80 張）—— 第一關只遇到其中幾種，每批 80ms 很快跟上
     P2  大逃殺、RPG 王／坐騎拼裝件 —— 沒玩那個模式就永遠用不到，400ms
     P3  隨從／坐騎 —— 沒買、沒進 RPG 就永遠用不到，1200ms
   排序只影響「先抓哪張」，最終仍會補滿全部 —— 離線完整性不變。 */
function warmBucket(f) {
  if (/^(pet-|mount-)/.test(f)) return 3;              /* 隨從／坐騎：買了才看得到 */
  if (/^(br-|nuke-|drop-)/.test(f)) return 2;          /* 大逃殺專用 */
  if (/^img-parts-/.test(f)) return 2;                 /* RPG 的王／龍坐騎拼裝件 */
  if (/^(foe-|boss-)/.test(f)) return 1;               /* 怪物：第一關只遇得到幾種 */
  return 0;                                            /* 地形／火焰／道具／UI／角色 */
}

function warmSprites() {
  caches.open(ASSET_CACHE).then(function (cache) {
    return Promise.all([cache.keys(), fetch('./spr/_list.json').then(function (r) { return r.json(); }).catch(function () { return null; })])
      .then(function (res) {
        var keys = res[0] || [], list = res[1];
        if (!list || !list.length) return;
        var have = 0;
        keys.forEach(function (k) { if (k.url.indexOf('/spr/') >= 0) have++; });
        // v5.53：原本寫死 150 張就停 —— 現在分級抓，數量會停在「只抓到 P0」的中間值，
        // 用比例判斷才不會每次 SW 啟動都重跑一輪。
        if (have >= Math.floor(list.length * 0.95)) return;

        var buckets = [[], [], [], []];
        list.forEach(function (f) { buckets[warmBucket(f)].push(f); });
        var order = buckets[0].concat(buckets[1], buckets[2], buckets[3]);
        var len0 = buckets[0].length;
        var len1 = len0 + buckets[1].length;
        var len2 = len1 + buckets[2].length;
        var i = 0;
        function next() {
          if (i >= order.length) return;
          var at = i;
          var batch = order.slice(i, i + 6);
          i += 6;
          Promise.all(batch.map(function (f) {
            var url = './spr/' + f;
            return cache.match(url).then(function (hit) {
              if (hit) return null;
              return fetch(url).then(function (r) { if (r && r.ok) return cache.put(url, r); return null; }).catch(function () { return null; });
            });
          })).then(function () {
            /* P0 全速（首屏就要）；其餘讓出頻寬，避免跟正在玩的那場搶圖。
               P1 只有 80ms —— 怪物圖晚 1 秒才到就會看到程序繪製的替代圖。 */
            if (at < len0) { next(); return; }
            setTimeout(next, at < len1 ? 80 : at < len2 ? 400 : 1200);
          }, next);
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

/* 導覽：網路優先（有逾時）→ 快取 → 喚醒頁 → 離線頁
   v5.55：舊版只有三個出口（2.2 秒查快取「有才 resolve」＋ fetch 成功／失敗），
   而「沒快取 ＋ 網路整個掛住」時它們全都不成立 → Promise 永不 resolve
   → 瀏覽器一直轉圈，玩家以為遊戲壞了。2026-11-08 Render 免費實例假死時，
   沒快取的裝置（新機／無痕／清過資料）就是卡在這裡，白屏十幾分鐘。
   現在多一道硬上限：時間到就給一張「會自己重試」的頁面，Promise 保證 settle。 */
function wakePage() {
  var zh = true, offline = false;
  try { zh = !navigator.language || /^zh/i.test(navigator.language); } catch (e) {}
  try { offline = navigator.onLine === false; } catch (e) {}
  var msg;
  if (offline) {
    msg = zh ? '<h1>目前沒有網路</h1><p>連上網路後重新整理即可繼續玩《爆爆英雄》。</p>'
             : '<h1>You are offline</h1><p>Reconnect and reload to keep playing Bomb Hero.</p>';
  } else {
    msg = zh ? '<h1>伺服器正在喚醒</h1><p>免費主機睡着後要 30~60 秒才會醒。<br>畫面會自己重試，不用重新整理。</p>'
             : '<h1>Waking the server</h1><p>The free host sleeps when idle and needs 30-60 s to wake.<br>This page retries automatically.</p>';
  }
  var html = '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + (zh ? '連線中' : 'Connecting') + ' · 爆爆英雄</title>' +
    '<style>html,body{margin:0;height:100%}' +
    'body{background:#0d1220;color:#e8eefc;font-family:-apple-system,"Segoe UI","Noto Sans TC",system-ui,sans-serif;' +
    'display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;box-sizing:border-box}' +
    '.b{max-width:320px}' +
    '.s{width:32px;height:32px;margin:0 auto 16px;border:3px solid #22314d;border-top-color:#7cb4ff;' +
    'border-radius:50%;animation:r 1s linear infinite}@keyframes r{to{transform:rotate(360deg)}}' +
    'h1{font-size:17px;margin:0 0 8px;font-weight:700}' +
    'p{font-size:13px;line-height:1.6;color:#93a7c4;margin:0 0 16px}' +
    'button{padding:11px 26px;border:0;border-radius:12px;color:#fff;background:#e2603a;' +
    'font:600 14px/1 inherit;cursor:pointer}</style>' +
    '<div class="b"><div class="s"></div>' + msg +
    '<button onclick="location.reload()">' + (zh ? '立即重試' : 'Retry now') + '</button></div>' +
    '<script>(function(){var n=0;try{n=+sessionStorage.getItem("bhwake")||0}catch(e){}' +
    'if(n<8){try{sessionStorage.setItem("bhwake",n+1)}catch(e){}setTimeout(function(){location.reload()},3000)}})()</script>';
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function navFetch(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(res) { if (settled) return; settled = true; resolve(res); }

    // 第 1 層：2.2 秒還沒回來，有快取就先給快取（冷啟動時玩家先看到畫面，背景再確認新版）
    var timer = setTimeout(function () {
      caches.match('./index.html').then(function (c) {
        if (c) { done(c); watchForNewer(c, req); }
      }).catch(function () {});
    }, NAV_TIMEOUT);

    /* 第 2 層（v5.55）：硬上限。刻意不 clearTimeout —— 它就是最後一道保險，
       保證這個 Promise 在 HARD_TIMEOUT 之內一定會 settle。 */
    var hard = setTimeout(function () { done(wakePage()); }, HARD_TIMEOUT);

    fetch(req).then(function (res) {
      clearTimeout(timer);
      clearTimeout(hard);
      if (res && res.ok) { putSafe(CORE_CACHE, './index.html', res); done(res); return; }
      /* 5xx＝主機沒醒／路由壞掉：與其讓瀏覽器丟一張看不懂的錯誤頁，不如給可重試的畫面 */
      if (res && res.status >= 500) { done(wakePage()); return; }
      done(res);
    }).catch(function () {
      clearTimeout(timer);
      caches.match(req).then(function (r1) {
        if (r1) { done(r1); watchForNewer(r1, req); return; }
        caches.match('./index.html').then(function (r2) {
          done(r2 || wakePage());
        }).catch(function () { done(wakePage()); });
      }).catch(function () { done(wakePage()); });
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
