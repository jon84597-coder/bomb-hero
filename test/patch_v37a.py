# -*- coding: utf-8 -*-
"""
v3.7 後端補丁（只改 server.js，前端 index.html 維持 3.6）

目標：讓統計數據在 Render 這種「容器會重啟 / 磁碟會歸零」的平台上活久一點
  1. STATS_PATH 環境變數：可把 stats.json 指到 Render Persistent Disk（/var/data/stats.json）
  2. SIGTERM / SIGINT 優雅存檔：Render 休眠或重新部署時保住資料（同步 flush，不等 10 秒）
  3. STATS_RESTORE_URL：容器重建後自動把數字抓回來（Render 免費用不到磁碟時的保命方案）
  4. GET /api/stats/snapshot：回傳完整存檔（含 vids / likers），方便手動備份
  5. 落盤間隔 10 秒 → 3 秒，縮小意外掉電的遺失窗口
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRV = os.path.join(ROOT, 'bomberman-online', 'server.js')

s = io.open(SRV, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


# 1) 加 https 依賴（STATS_RESTORE_URL 要用）
rep("const http = require('http');\nconst fs = require('fs');",
    "const http = require('http');\nconst https = require('https');\nconst fs = require('fs');",
    'require https')

# 2) 存檔路徑可由環境變數指定（Render Persistent Disk 掛在 /var/data）
rep("""const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');""",
    """// v3.7：Render 免費方案的磁碟會歸零 → 可用 STATS_PATH 指到 Persistent Disk（例如 /var/data/stats.json）
const STATS_FILE = process.env.STATS_PATH || path.join(__dirname, 'data', 'stats.json');
const DATA_DIR = path.dirname(STATS_FILE);""",
    'STATS_PATH 環境變數')

# 3) saveStats 之外再加一個「同步立即存檔」，給結束訊號用
rep("""loadStats();
rollStatsDay();""",
    """loadStats();
rollStatsDay();

// v3.7：同步立刻落盤（Render 休眠 / 重新部署會送 SIGTERM，只剩幾秒鐘，不能等 10 秒的定時器）
function flushStatsSync() {
  try {
    const data = JSON.stringify({
      views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
      vids: STATS.vids.slice(-STATS_VID_KEEP), likers: STATS.likers.slice(-STATS_VID_KEEP),
      savedAt: Date.now()
    });
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    fs.writeFileSync(STATS_FILE, data, 'utf8');
    statsDirty = false;
    return true;
  } catch (e) { return false; }
}

// v3.7：容器重建後把數字抓回來（設了 STATS_RESTORE_URL 才做；失敗就安靜從 0 開始）
const STATS_RESTORE_URL = String(process.env.STATS_RESTORE_URL || '').trim();
function tryRestoreStats() {
  if (!STATS_RESTORE_URL || STATS.views > 0) return;
  const mod = STATS_RESTORE_URL.indexOf('https:') === 0 ? https : http;
  let done = false;
  try {
    const req = mod.get(STATS_RESTORE_URL, function (r) {
      let buf = '';
      r.on('data', function (c) { buf += c; });
      r.on('end', function () {
        if (done) return;
        done = true;
        try {
          const j = JSON.parse(buf);
          if (isFinite(j.views)) STATS.views = Math.max(STATS.views, j.views | 0);
          if (isFinite(j.likes)) STATS.likes = Math.max(STATS.likes, j.likes | 0);
          if (typeof j.day === 'string' && j.day === STATS.day && isFinite(j.dayViews)) {
            STATS.dayViews = Math.max(STATS.dayViews, j.dayViews | 0);
          }
          if (Array.isArray(j.vids)) STATS.vids = j.vids.slice(-STATS_VID_KEEP).map(String);
          if (Array.isArray(j.likers)) STATS.likers = j.likers.slice(-STATS_VID_KEEP).map(String);
          rollStatsDay();
          console.log('[stats] 已從 STATS_RESTORE_URL 還原：' + STATS.views + ' 瀏覽 / ' + STATS.likes + ' 讚');
        } catch (e) { /* 抓到不是 JSON 就當沒這回事 */ }
      });
    });
    req.on('error', function () { done = true; });
    req.setTimeout(8000, function () { done = true; try { req.destroy(); } catch (e) {} });
  } catch (e) { /* 設了怪網址也不影響遊戲 */ }
}
tryRestoreStats();""",
    'flushStatsSync + STATS_RESTORE_URL')

# 4) 落盤間隔縮短 + 結束訊號優雅存檔
rep("""// v3.6：統計每 10 秒落盤一次（有變動才寫）
setInterval(function () { if (statsDirty) saveStats(); }, 10000);

server.listen(PORT, '0.0.0.0', function () {
  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
});""",
    """// v3.6：統計定期落盤（v3.7 縮短為 3 秒，縮小意外遺失的窗口）
setInterval(function () { if (statsDirty) saveStats(); }, 3000);

// v3.7：收到結束訊號時同步存檔（Render 休眠、或每次 git push 重新部署都會送 SIGTERM）
['SIGTERM', 'SIGINT', 'SIGHUP'].forEach(function (sig) {
  process.on(sig, function () {
    try { flushStatsSync(); } catch (e) {}
    process.exit(0);
  });
});
process.on('uncaughtException', function (e) {
  console.error('[uncaughtException]', e && e.message);
  try { flushStatsSync(); } catch (e2) {}
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
  console.log('[stats] 存檔位置：' + STATS_FILE + '（目前 ' + STATS.views + ' 瀏覽 / ' + STATS.likes + ' 讚）');
});""",
    '優雅存檔 + 啟動日誌')

# 5) GET /api/stats/snapshot：完整備份（含 vids / likers），供手動備份或 STATS_RESTORE_URL 使用
rep("""  if (url.pathname === '/api/stats' && req.method === 'GET') {""",
    """  // v3.7：完整快照（含訪客 id 清單），把內容貼到任何靜態空間就能當 STATS_RESTORE_URL
  if (url.pathname === '/api/stats/snapshot' && req.method === 'GET') {
    sendJSON(res, 200, {
      ok: true, views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
      vids: STATS.vids, likers: STATS.likers, file: STATS_FILE, savedAt: Date.now()
    });
    return;
  }
  if (url.pathname === '/api/stats' && req.method === 'GET') {""",
    '/api/stats/snapshot')

if s != orig:
    io.open(SRV, 'w', encoding='utf-8').write(s)
    print('[OK] server.js 已更新')
else:
    print('[SKIP] 沒有變動')
