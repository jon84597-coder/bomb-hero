# -*- coding: utf-8 -*-
"""v4.22 patch B：版號四處 ＋ VERSION_LOG 新條目 ＋ SW 新版自動套用 ＋ 三份 sw.js"""
import io

P = 'index.html'
s = io.open(P, encoding='utf-8').read().replace('\r\n', '\n')

def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] 找到 %d 次' % (tag, n)
    s = s.replace(old, new)
    print('ok  ' + tag)

# ---------------------------------------------------------------- 版號四處
rep('const VERSION = \'4.21\';', "const VERSION = '4.22';", 'VERSION')
rep('<span id="verLogVer">4.21</span>', '<span id="verLogVer">4.22</span>', 'verLogVer')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.21</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.22</span></div>', 'verTxt')

# ---------------------------------------------------------------- VERSION_LOG
old_log = "const VERSION_LOG = [\n  { v: '4.21', date: '2026-11-02', now: true, items: ["
new_log = """const VERSION_LOG = [
  { v: '4.22', date: '2026-11-02', now: true, items: [
    '<b>🔧 又抓到兩個「按鈕點不進去」的真兇</b>：① <b>第一次碰螢幕時整頁會偷偷往上跳 14px</b> —— 手指底下的按鈕跟著移走，那一下 click 就沒發生（商店特別容易中）；② 手機右上角<b>擠了 8 顆小圖示，「帳號」只有 35px 高</b>，手指根本點不準。兩個都修好了。',
    '<b>👤 首頁多了「帳號登入」大按鈕</b>：就在「商店」下面，跟其他選項一樣大顆，不用再去右上角找那小顆圖示。',
    '<b>📱 手機右上角改成「👤 帳號 ＋ ⋮」</b>：音樂／語言／音效／全視窗／信箱／下載 App 收進 ⋮ 選單，每一顆都放大到 <b>44px</b>（手指好按的標準尺寸）。',
    '<b>👑 BOSS 挑戰不再被擋</b>：手機直式進去時那張「橫著玩更過癮」的提示，<b>點過一次「直式繼續玩」之後就不再出現</b>；也可以直接點卡片外的黑底關掉。',
    '<b>🔄 新版上線會自己套用</b>：以前伺服器在睡覺（冷啟動要 30～60 秒）時，瀏覽器會先拿舊的下載檔，玩家就一直在玩舊版。現在會自己比對版本，<b>在首頁時自動換成新版</b>（遊戲中不打斷，回主選單再換）。',
  ] },
  { v: '4.21', date: '2026-11-02', now: false, items: ["""
rep(old_log, new_log, 'VERSION_LOG 4.22')

# 4.21 的 now:true 已在上面字串內改成 false，這裡不用再動

# ---------------------------------------------------------------- SW 新版自動套用
rep("""  /* ---- 5. 註冊 Service Worker（file:// 直接跳過，不然 console 會噴錯） ---- */
  P.register = function () {""",
"""  /* ---- 4.5. v4.22：新版上線就自己換掉 ----
     以前新 SW 接手時完全靜默（P.onUpdate 沒人接），玩家可能一直停在舊版。
     現在：在首頁就自動重新載入一次（5 分鐘內只做一次，避免無限迴圈）；
     遊戲中不打斷，只提示「回主選單會更新」。 */
  P.applyUpdate = function () {
    try {
      var last = Number(sessionStorage.getItem('bh-auto-reload') || 0) || 0;
      if (Date.now() - last < 300000) return;
      sessionStorage.setItem('bh-auto-reload', String(Date.now()));
      var busy = false;
      try { busy = !!(window.Screen && Screen.current && Screen.current !== 'title'); } catch (e) {}
      if (busy) {
        try { toast('🎉 有新版本，回主選單後會自動更新', 3.4); } catch (e2) {}
        return;
      }
      location.reload();
    } catch (e) {}
  };
  P.onUpdate = P.applyUpdate;
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (e) {
        var d = e.data || {};
        if (d.type === 'NEW_VERSION') P.applyUpdate();
      });
    }
  } catch (e) {}

  /* ---- 5. 註冊 Service Worker（file:// 直接跳過，不然 console 會噴錯） ---- */
  P.register = function () {""", 'SW 新版自動套用')

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html 寫回')

# ---------------------------------------------------------------- 三份 sw.js
SW_OLD_TIMEOUT = "var NAV_TIMEOUT = 3500;"
SW_NEW_TIMEOUT = "var NAV_TIMEOUT = 2200;   // v4.22：Render 冷啟動一定超過，早點回快取讓畫面先出來"

SW_OLD_NAV = """/* 導覽：網路優先（有逾時）→ 快取 → 首頁 */
function navFetch(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(res) { if (settled) return; settled = true; resolve(res); }

    var timer = setTimeout(function () {
      caches.match('./index.html').then(function (c) { if (c) done(c); });
    }, NAV_TIMEOUT);
"""
SW_NEW_NAV = """/* v4.22：退回快取後，背景繼續等伺服器。真的拿到新版（ETag 不同）就通知頁面換掉，
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
"""
SW_OLD_FALLBACK = """      caches.match(req).then(function (r1) {
        if (r1) return done(r1);"""
SW_NEW_FALLBACK = """      caches.match(req).then(function (r1) {
        if (r1) { done(r1); watchForNewer(r1, req); return; }"""

for path in ['sw.js', 'public/sw.js', 'bomberman-online/public/sw.js']:
    t = io.open(path, encoding='utf-8').read().replace('\r\n', '\n')
    changed = 0
    for old, new, name in [
        (SW_OLD_TIMEOUT, SW_NEW_TIMEOUT, 'NAV_TIMEOUT'),
        (SW_OLD_NAV, SW_NEW_NAV, 'watchForNewer'),
        (SW_OLD_FALLBACK, SW_NEW_FALLBACK, 'offline fallback'),
        ("var SW_VERSION = 'v4.21.0';", "var SW_VERSION = 'v4.22.0';", 'SW_VERSION'),
    ]:
        n = t.count(old)
        assert n == 1, '[%s/%s] 找到 %d 次' % (path, name, n)
        t = t.replace(old, new)
        changed += 1
    io.open(path, 'w', encoding='utf-8', newline='').write(t.replace('\n', '\r\n'))
    print('ok  %s（%d 條）' % (path, changed))
