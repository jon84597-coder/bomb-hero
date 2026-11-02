# -*- coding: utf-8 -*-
# v3.6a：後端 server.js 新增「瀏覽人數 / 按讚」統計 API
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRV = os.path.join(ROOT, 'bomberman-online', 'server.js')

s = io.open(SRV, encoding='utf-8').read()
orig = s
n = 0

def rep(old, new, tag):
    global s, n
    if old not in s:
        sys.exit('[v36a] 找不到錨點：' + tag)
    if s.count(old) > 1:
        sys.exit('[v36a] 錨點不唯一：' + tag)
    s = s.replace(old, new)
    n += 1

# ---------- 1. 統計模組（插在 MIME 之前）----------
STATS_MOD = u'''// ============ v3.6：全域統計（瀏覽人數 / 按讚）============
// 存成 data/stats.json（不存在就從 0 開始；寫入失敗也不影響遊戲）
const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const STATS_VID_KEEP = 5000;               // 最多記住多少個訪客 id，避免檔案無限長大
const STATS = { views: 0, likes: 0, day: '', dayViews: 0, vids: [], likers: [] };
let statsDirty = false;
let statsSaving = false;

function dayKey() {
  const d = new Date();
  const p = function (x) { return (x < 10 ? '0' : '') + x; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function trimArr(a) { if (a.length > STATS_VID_KEEP) a.splice(0, a.length - STATS_VID_KEEP); }
function rollStatsDay() {
  const k = dayKey();
  if (STATS.day !== k) { STATS.day = k; STATS.dayViews = 0; }
  return k;
}
function loadStats() {
  try {
    if (!fs.existsSync(STATS_FILE)) return;
    const j = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    if (isFinite(j.views)) STATS.views = j.views | 0;
    if (isFinite(j.likes)) STATS.likes = j.likes | 0;
    if (typeof j.day === 'string') STATS.day = j.day;
    if (isFinite(j.dayViews)) STATS.dayViews = j.dayViews | 0;
    if (Array.isArray(j.vids)) STATS.vids = j.vids.slice(-STATS_VID_KEEP).map(String);
    if (Array.isArray(j.likers)) STATS.likers = j.likers.slice(-STATS_VID_KEEP).map(String);
  } catch (e) { /* 讀不到就從 0 開始，不影響遊戲 */ }
}
function saveStats() {
  if (statsSaving) return;
  statsSaving = true;
  const data = JSON.stringify({
    views: STATS.views, likes: STATS.likes, day: STATS.day, dayViews: STATS.dayViews,
    vids: STATS.vids.slice(-STATS_VID_KEEP), likers: STATS.likers.slice(-STATS_VID_KEEP),
    savedAt: Date.now()
  });
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  const tmp = STATS_FILE + '.tmp';
  fs.writeFile(tmp, data, 'utf8', function (err) {
    if (err) { statsSaving = false; return; }
    fs.rename(tmp, STATS_FILE, function (e2) {
      statsSaving = false;
      if (!e2) statsDirty = false;
    });
  });
}
loadStats();
rollStatsDay();

function statsOut(extra) {
  const o = { ok: true, views: STATS.views, likes: STATS.likes, dayViews: STATS.dayViews, day: STATS.day };
  if (extra) { for (const k in extra) o[k] = extra[k]; }
  return o;
}

'''
rep("const MIME = {", STATS_MOD + "const MIME = {", 'MIME 錨點')

# ---------- 2. 三個路由（插在 /api/health 之前）----------
ROUTES = u'''  // v3.6：瀏覽人數 / 按讚
  if (url.pathname === '/api/stats' && req.method === 'GET') {
    return sendJSON(res, 200, statsOut());
  }
  if (url.pathname === '/api/stats/view' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsView(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
  if (url.pathname === '/api/stats/like' && req.method === 'POST') {
    return readBody(req, function (b) { b ? handleStatsLike(b, res) : sendJSON(res, 400, { ok: false, err: 'bad body' }); });
  }
'''
rep("  if (url.pathname === '/api/health') {", ROUTES + "  if (url.pathname === '/api/health') {", 'health 路由錨點')

# ---------- 3. handler（插在 server 建立之前）----------
HANDLERS = u'''// ---- v3.6 統計 handler ----
function handleStatsView(b, res) {
  rollStatsDay();
  const vid = String((b && b.vid) || '').slice(0, 40);
  let fresh = false;
  if (!vid) {                                  // 沒帶 id：算一次瀏覽（不重複計算）
    STATS.views++; STATS.dayViews++; fresh = true;
  } else if (STATS.vids.indexOf(vid) < 0) {    // 同一個訪客只算一次
    STATS.vids.push(vid); trimArr(STATS.vids);
    STATS.views++; STATS.dayViews++; fresh = true;
  }
  statsDirty = true;
  sendJSON(res, 200, statsOut({ fresh: fresh, liked: vid ? STATS.likers.indexOf(vid) >= 0 : false }));
}
function handleStatsLike(b, res) {
  const vid = String((b && b.vid) || '').slice(0, 40);
  const undo = !!(b && (b.undo === true || b.d === -1));
  let liked = vid ? STATS.likers.indexOf(vid) >= 0 : false;
  if (undo) {
    if (liked) {
      const i = STATS.likers.indexOf(vid);
      if (i >= 0) STATS.likers.splice(i, 1);
      STATS.likes = Math.max(0, STATS.likes - 1);
      liked = false;
    }
  } else if (!liked) {                         // 同一個訪客只能按一次讚
    if (vid) { STATS.likers.push(vid); trimArr(STATS.likers); }
    STATS.likes++;
    liked = true;
  }
  statsDirty = true;
  sendJSON(res, 200, statsOut({ liked: liked }));
}

'''
rep("const server = http.createServer(", HANDLERS + "const server = http.createServer(", 'createServer 錨點')

# ---------- 4. /api/health 加統計 ----------
rep("      ok: true,\n      rooms: rooms.size,",
    "      ok: true,\n      views: STATS.views, likes: STATS.likes, dayViews: STATS.dayViews,\n      rooms: rooms.size,",
    'health 內容')

# ---------- 5. 定時落盤 ----------
rep("server.listen(PORT, '0.0.0.0', function () {",
    "// v3.6：統計每 10 秒落盤一次（有變動才寫）\nsetInterval(function () { if (statsDirty) saveStats(); }, 10000);\n\nserver.listen(PORT, '0.0.0.0', function () {",
    'listen 錨點')

io.open(SRV, 'w', encoding='utf-8', newline='\n').write(s)
print('[v36a] server.js 修補 %d 處，%d → %d bytes' % (n, len(orig), len(s)))
