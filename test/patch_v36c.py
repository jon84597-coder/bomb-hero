# -*- coding: utf-8 -*-
# v3.6c：index.html 的 JS（統計模組、初始化、API 路徑、版本號、__BH 導出）
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HTML = os.path.join(ROOT, 'bomb-hero', 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s
n = 0

def rep(old, new, tag):
    global s, n
    if old not in s:
        sys.exit('[v36c] 找不到錨點：' + tag)
    if s.count(old) > 1:
        sys.exit('[v36c] 錨點不唯一：' + tag)
    s = s.replace(old, new)
    n += 1

# =========================================================
# 1. 統計模組（插在 v3.0 公告欄 JS 之前）
# =========================================================
MOD = u'''/* ================================================================
   v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」
   · 有後端（server.js）→ 走 /api/stats/* ，全部玩家共用的真實數字
     （同一個訪客只算一次瀏覽、只能按一次讚，存在 data/stats.json）
   · 沒有後端（GitHub Pages、file://）→ 自動退回本機統計並標「本機」
   ================================================================ */
const ST_VID = 'bombhero.vid';
const ST_LIKED = 'bombhero.liked';
const ST_LOCAL = 'bombhero.stat.local';
const ST_SEEN = 'bombhero.stat.seen';

function stGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function stSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function stSGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function stSSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

function fmtNum(n) {
  n = Math.max(0, Math.round(Number(n) || 0));
  if (n >= 10000) {
    const w = n / 10000;
    return (w >= 10 ? String(Math.round(w)) : w.toFixed(1).replace(/\\.0$/, '')) + t('st.wan');
  }
  return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
}

const Stats = {
  views: 0, likes: 0, dayViews: 0, liked: false,
  mode: 'local', ready: false, busy: false, _timer: null,

  // 這台裝置的匿名 id（只用来去重，不含任何個資）
  vid: function () {
    let v = stGet(ST_VID);
    if (!v) {
      v = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      stSet(ST_VID, v);
    }
    return v;
  },
  localRead: function () {
    let j = null;
    try { j = JSON.parse(stGet(ST_LOCAL) || '{}'); } catch (e) { j = {}; }
    return { views: (j && j.views) | 0, likes: (j && j.likes) | 0 };
  },
  localWrite: function (o) { stSet(ST_LOCAL, JSON.stringify(o || {})); },
  localBumpView: function () {
    const o = Stats.localRead();
    o.views++;
    Stats.localWrite(o);
  },
  localSetLike: function (on) {
    const o = Stats.localRead();
    const has = stGet(ST_LIKED) === '1';
    if (on && !has) { o.likes++; stSet(ST_LIKED, '1'); }
    if (!on && has) { o.likes = Math.max(0, o.likes - 1); stSet(ST_LIKED, '0'); }
    Stats.localWrite(o);
  },
  useLocal: function (bump) {
    if (bump) Stats.localBumpView();
    const o = Stats.localRead();
    Stats.mode = 'local';
    Stats.views = o.views; Stats.likes = o.likes; Stats.dayViews = 0;
    Stats.liked = stGet(ST_LIKED) === '1';
  },
  sync: function (j) {
    Stats.mode = 'net'; Stats.ready = true;
    Stats.views = j.views | 0; Stats.likes = j.likes | 0; Stats.dayViews = j.dayViews | 0;
    Stats.liked = !!j.liked;
    stSet(ST_LIKED, Stats.liked ? '1' : '0');
    Stats.render();
  },
  render: function () {
    const box = $id('statBox');
    if (!box) return;
    const vn = $id('stViews'), ln = $id('stLikes'), btn = $id('stLike'),
      heart = $id('stHeart'), loc = $id('stLocal'), vi = $id('stViewItem');
    const wait = !Stats.ready;
    if (vn) { vn.textContent = wait ? '--' : fmtNum(Stats.views); vn.className = wait ? 'stwait' : ''; }
    if (ln) { ln.textContent = wait ? '--' : fmtNum(Stats.likes); ln.className = wait ? 'stwait' : ''; }
    if (loc) {
      loc.className = (wait || Stats.mode !== 'local') ? 'stlocal hide' : 'stlocal';
      loc.textContent = t('st.local');
      loc.title = t('st.localTip');
    }
    if (vi && !wait) vi.title = t('st.viewTip', { n: fmtNum(Stats.views), d: fmtNum(Stats.dayViews || 0) });
    if (btn) {
      btn.title = Stats.liked ? t('st.likedTip') : t('st.likeTip');
      if (btn.classList) btn.classList.toggle('on', !!Stats.liked);
    }
    if (heart) heart.textContent = Stats.liked ? '\u2764\ufe0f' : '\U0001f44d';
  },
  // 進首頁時回報一次（同一個分頁只回報一次）
  report: function () {
    if (!hasFetch()) {
      Stats.useLocal(!stSGet(ST_SEEN)); stSSet(ST_SEEN, '1');
      Stats.ready = true; Stats.render();
      return;
    }
    const hit = function (path, body) {
      Net.api(path, body, function (err, j) {
        if (!err && j && j.ok) { Stats.sync(j); return; }
        Stats.useLocal(!stSGet(ST_SEEN)); stSSet(ST_SEEN, '1');
        Stats.ready = true; Stats.render();
      });
    };
    if (stSGet(ST_SEEN)) { hit('/api/stats', null); return; }
    stSSet(ST_SEEN, '1');
    hit('/api/stats/view', { vid: Stats.vid() });
  },
  // 每 60 秒把按讚數更新到最新（只在首頁）
  refresh: function () {
    if (Stats.mode !== 'net' || !hasFetch()) return;
    Net.api('/api/stats', null, function (err, j) {
      if (!err && j && j.ok) Stats.sync(j);
    });
  },
  toggleLike: function () {
    if (Stats.busy) return;
    const want = !Stats.liked;
    const back = Stats.likes;
    Stats.liked = want;
    Stats.likes = Math.max(0, back + (want ? 1 : -1));
    Stats.render();
    try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
    if (Stats.mode !== 'net' || !hasFetch()) {
      Stats.localSetLike(want); Stats.useLocal(false); Stats.render();
      return;
    }
    Stats.busy = true;
    Net.api('/api/stats/like', { vid: Stats.vid(), undo: !want }, function (err, j) {
      Stats.busy = false;
      if (!err && j && j.ok) { Stats.sync(j); return; }
      Stats.likes = back; Stats.liked = !want; Stats.render();
    });
  },
  init: function () {
    const box = $id('statBox');
    if (!box) return;
    const btn = $id('stLike');
    if (btn && typeof btn.addEventListener === 'function') {
      btn.addEventListener('click', function (ev) {
        if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
        Stats.toggleLike();
      });
    }
    Stats.useLocal(false);   // 先秀本機數字，連到後端後會被蓋過去
    Stats.render();
    Stats.report();
    try { if (typeof refreshers !== 'undefined' && refreshers.push) refreshers.push(Stats.render); } catch (e) {}
    if (Stats._timer) { try { clearInterval(Stats._timer); } catch (e) {} }
    Stats._timer = setInterval(function () {
      const sc = $id('scr-title');
      if (!sc || !sc.classList || !sc.classList.contains('on')) return;
      Stats.refresh();
    }, 60000);
  }
};

function initStats() { Stats.init(); }

'''
rep(u'''/* ---- v3.0：作者公告欄（作者的話 + FB 連結） ---- */''',
    MOD + u'''/* ---- v3.0：作者公告欄（作者的話 + FB 連結） ---- */''',
    'Stats 模組插入點')

# 初始化：緊接 initAnn()
rep(u'''  initAnn();
''', u'''  initAnn();
  initStats();
''', 'initStats 呼叫')

# =========================================================
# 2. API 帶 sharecode（線上平台才會把 /api/* 導到 Node 後端）
# =========================================================
APIPATH = u'''// v3.6：線上平台要在 URL 帶 sharecode，才會把 /api/* 導到 Node 後端
function apiPath(p) {
  try {
    const m = /[?&]sharecode=([^&#]+)/.exec(String(location.search || ''));
    if (m) return p + (p.indexOf('?') >= 0 ? '&' : '?') + 'sharecode=' + m[1];
  } catch (e) {}
  return p;
}

'''
rep(u'''const Net = {''', APIPATH + u'''const Net = {''', 'apiPath 插入')

rep(u'''  api: function (path, body, cb) {
    if (!hasFetch()) { cb(new Error('這個環境不支援網路連線')); return; }
    const opt =''',
    u'''  api: function (path, body, cb) {
    if (!hasFetch()) { cb(new Error('這個環境不支援網路連線')); return; }
    path = apiPath(path);
    const opt =''',
    'Net.api 使用 apiPath')

# =========================================================
# 3. 版本號 3.5 → 3.6
# =========================================================
rep(u'''const VERSION = '3.5';''', u'''const VERSION = '3.6';''', 'VERSION 常數')
rep(u'''<span id="verTxt">3.5</span>''', u'''<span id="verTxt">3.6</span>''', '版本徽章')

# =========================================================
# 4. __BH 導出（給測試用）
# =========================================================
rep(u'''  Net: Net, pname: pname,''', u'''  Net: Net, Stats: Stats, apiPath: apiPath, fmtNum: fmtNum, initStats: initStats,
  ST_VID: ST_VID, ST_LIKED: ST_LIKED, ST_LOCAL: ST_LOCAL, ST_SEEN: ST_SEEN,
  pname: pname,''', '__BH 導出')

io.open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
print('[v36c] index.html 修補 %d 處，%d → %d bytes' % (n, len(orig), len(s)))
