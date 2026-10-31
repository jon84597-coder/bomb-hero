# -*- coding: utf-8 -*-
"""
v3.8 補丁 E：後端完整移除「瀏覽人數 ＋ 按讚」統計 API（使用者要求撤掉）

刪除：
  1. https require（只有 STATS_RESTORE_URL 在用）
  2. 統計區塊：STATS_FILE/DATA_DIR/STATS… loadStats/saveStats/flushStatsSync/tryRestoreStats/statsOut
  3. handleStatsGet/View/Like
  4. /api/stats/* 四條路由
  5. /api/health 裡的 views/likes/dayViews
  6. 落盤 setInterval、SIGTERM/SIGINT/SIGHUP 處理、uncaughtException 攔截
  7. 啟動日誌的 [stats] 那行
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRV = os.path.join(ROOT, 'bomberman-online', 'server.js')

lines = io.open(SRV, encoding='utf-8').read().split('\n')


def find_line(pred, start=0):
    for i in range(start, len(lines)):
        if pred(lines[i]):
            return i
    return -1


def block_delete(start_mark, end_mark, tag, contain_end=True):
    i1 = find_line(lambda l: start_mark in l)
    if i1 < 0:
        sys.exit('[FAIL] 找不到起始標記：%s' % tag)
    i2 = find_line(lambda l: end_mark in l, i1)
    if i2 < 0:
        sys.exit('[FAIL] 找不到結束標記：%s' % tag)
    if not contain_end:
        i2 -= 1
    n = i2 - i1 + 1
    del lines[i1:i2 + 1]
    print('  OK  %s（刪了 %d 行）' % (tag, n))


# ---- 1. 統計區塊（常量 + load/save/flush/restore + statsOut），到 MIME 表之前 ----
block_delete('// ============ v3.6：全域統計（瀏覽人數 / 按讚）============',
             'const MIME = {', '統計區塊（常量+存讀檔+還原+statsOut）', contain_end=False)

# ---- 2. handler 三兄弟 ----
block_delete('// ---- v3.6 統計 handler ----', 'function handleStatsLike', 'handler 開頭', contain_end=False)  # handleStatsLike 本體下一步刪
# handleStatsLike 本體：從剩下的檔案再找
i1 = find_line(lambda l: 'function handleStatsLike' in l)
if i1 < 0:
    sys.exit('[FAIL] handleStatsLike 不見了')
i2 = find_line(lambda l: l.strip() == '}', i1)
if i2 < 0:
    sys.exit('[FAIL] handleStatsLike 結尾')
del lines[i1:i2 + 1]
print('  OK  handleStatsLike 本體（刪了 %d 行）' % (i2 - i1 + 1))

s = '\n'.join(lines)
orig = s


def rep(old, new, tag, count=1):
    global s
    if s.count(old) != count:
        sys.exit('[FAIL] 目標出現 %d 次（預期 %d）：%s' % (s.count(old), count, tag))
    s = s.replace(old, new, count)
    print('  OK  ' + tag)


# ---- 3. 四條路由（含 v3.7 snapshot）----
rep("""  // v3.6：瀏覽人數 / 按讚
  // v3.7：完整快照（含訪客 id 清單），把內容貼到任何靜態空間就能當 STATS_RESTORE_URL
  if (url.pathname === '/api/stats/snapshot' && req.method === 'GET') {
    sendJSON(res, 200, {
      ok: true, views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
      vids: STATS.vids, likers: STATS.likers, file: STATS_FILE, savedAt: Date.now()
    });
    return;
  }
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    return handleStatsGet(url.searchParams, res);
  }
  if (url.pathname === '/api/stats/view' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsView(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/stats/like' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsLike(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
""",
    "", '四條 /api/stats/* 路由')

# ---- 4. health 裡的 views/likes ----
rep("""      ok: true,
      views: STATS.views, likes: STATS.likes, dayViews: STATS.dayViews,
      rooms: rooms.size,""",
    """      ok: true,
      rooms: rooms.size,""", '/api/health 移除 views/likes')

# ---- 5. 落盤定時器 + 結束訊號 + uncaughtException ----
rep("""// v3.6：統計定期落盤（v3.7 縮短為 3 秒，縮小意外遺失的窗口）
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

""",
    "", '落盤定時器 + 結束訊號處理')

# ---- 6. 啟動日誌 ----
rep("""  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
  console.log('[stats] 存檔位置：' + STATS_FILE + '（目前 ' + STATS.views + ' 瀏覽 / ' + STATS.likes + ' 讚）');
});""",
    """  console.log('炸彈超人 Online 啟動：http://0.0.0.0:' + PORT);
});""", '啟動日誌移除 [stats]')

# ---- 7. https require（只有 STATS_RESTORE_URL 在用）----
rep("""const http = require('http');
const https = require('https');
""",
    """const http = require('http');
""", '移除 https require')

if s != orig:
    io.open(SRV, 'w', encoding='utf-8').write(s)
    print('[OK] server.js 已更新')
else:
    print('[SKIP] 沒有變動')
