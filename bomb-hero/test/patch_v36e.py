# -*- coding: utf-8 -*-
# v3.6e：重新整理後要記得「我按過讚」
#   GET /api/stats 要能帶 ?vid= → 後端才回傳這個人有沒有按過讚
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRV = os.path.join(ROOT, 'bomberman-online', 'server.js')
HTML = os.path.join(ROOT, 'bomb-hero', 'index.html')

n = 0

def patch(fp, old, new, tag):
    global n
    s = io.open(fp, encoding='utf-8').read()
    if old not in s:
        sys.exit('[v36e] 找不到錨點：' + tag)
    if s.count(old) > 1:
        sys.exit('[v36e] 錨點不唯一：' + tag)
    s = s.replace(old, new)
    io.open(fp, 'w', encoding='utf-8', newline='\n').write(s)
    n += 1

# ---------- server.js ----------
patch(SRV,
      u'''  if (url.pathname === '/api/stats' && req.method === 'GET') {
    return sendJSON(res, 200, statsOut());
  }''',
      u'''  if (url.pathname === '/api/stats' && req.method === 'GET') {
    return handleStatsGet(url.searchParams, res);
  }''',
      'server 路由')

patch(SRV,
      u'''// ---- v3.6 統計 handler ----''',
      u'''// ---- v3.6 統計 handler ----
function handleStatsGet(sp, res) {
  const vid = String(sp.get('vid') || '').slice(0, 40);
  sendJSON(res, 200, statsOut({ liked: vid ? STATS.likers.indexOf(vid) >= 0 : false }));
}''',
      'server handler')

# ---------- index.html ----------
patch(HTML,
      u'''    if (stSGet(ST_SEEN)) { hit('/api/stats', null); return; }''',
      u'''    if (stSGet(ST_SEEN)) { hit('/api/stats?vid=' + encodeURIComponent(Stats.vid()), null); return; }''',
      'report 帶 vid')

patch(HTML,
      u'''    Net.api('/api/stats', null, function (err, j) {
      if (!err && j && j.ok) Stats.sync(j);
    });''',
      u'''    Net.api('/api/stats?vid=' + encodeURIComponent(Stats.vid()), null, function (err, j) {
      if (!err && j && j.ok) Stats.sync(j);
    });''',
      'refresh 帶 vid')

print('[v36e] 修補 %d 處' % n)
