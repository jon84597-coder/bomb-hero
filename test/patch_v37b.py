# -*- coding: utf-8 -*-
"""
v3.7 前端補丁：統計請求帶逾時 + 背景重試（針對 Render 免費方案的冷啟動）

Render 免費用「一段時間沒人來就休眠」，第一個請求要等 30~60 秒才醒。
原本 fetch 沒有逾時 → 左上角會卡在「--」很久。
改法：
  1. Stats.hit()：自己的請求函式，12 秒逾時（AbortController，不影響 Net.api／線上配對）
  2. 逾時或失敗 → 先退回本機數字（使用者立刻看得到東西），同時背景每 20 秒重試
  3. 後端醒來後自動切成真實的全域數字（最多試 6 次 ≈ 2 分鐘）
  4. Stats.refresh() 也改用帶逾時的請求
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s


def rep(old, new, tag):
    global s
    if s.count(old) != 1:
        sys.exit('[FAIL] 找不到唯一目標（%d 處）：%s' % (s.count(old), tag))
    s = s.replace(old, new, 1)
    print('  OK  ' + tag)


# 1) 在 Stats 物件裡插入 hit() / 重試機制
rep("""  // 進首頁時回報一次（同一個分頁只回報一次）
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
    if (stSGet(ST_SEEN)) { hit('/api/stats?vid=' + encodeURIComponent(Stats.vid()), null); return; }
    stSSet(ST_SEEN, '1');
    hit('/api/stats/view', { vid: Stats.vid() });
  },
  // 每 60 秒把按讚數更新到最新（只在首頁）
  refresh: function () {
    if (Stats.mode !== 'net' || !hasFetch()) return;
    Net.api('/api/stats?vid=' + encodeURIComponent(Stats.vid()), null, function (err, j) {
      if (!err && j && j.ok) Stats.sync(j);
    });
  },""",
    """  // ---------- v3.7：帶逾時的請求 ----------
  // 為什麼不直接用 Net.api：Render 免費用首訪會冷啟動 30~60 秒，
  // 沒有逾時的話左上角會一直卡在「--」；逾時後先退回本機數字，背景再慢慢重試。
  hit: function (path, body, cb) {
    if (!hasFetch()) { cb(new Error('no fetch')); return; }
    let done = false, ac = null, tm = null;
    const fin = function (err, j) {
      if (done) return;
      done = true;
      if (tm) clearTimeout(tm);
      if (ac) { try { ac.abort(); } catch (e) {} }
      cb(err, j);
    };
    const opt = body == null ? { method: 'GET', cache: 'no-store' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store'
    };
    try {
      if (typeof AbortController === 'function') { ac = new AbortController(); opt.signal = ac.signal; }
    } catch (e) {}
    tm = setTimeout(function () { fin(new Error('timeout')); }, 12000);
    fetch(apiPath(path), opt).then(function (r) {
      return r.text().then(function (txt) {
        let j = null;
        try { j = JSON.parse(txt); } catch (e) {}
        return { ok: r.ok, json: j };
      });
    }).then(function (r) {
      if (r.ok) fin(null, r.json || {});
      else fin(new Error((r.json && r.json.err) || 'http ' + r.status));
    }).catch(function (e) { fin(e); });
  },
  // 後端在休眠時的自動重試：每 20 秒試一次，最多 6 次（約 2 分鐘）
  _rn: 0, _rt: null,
  retryStop: function () {
    Stats._rn = 0;
    if (Stats._rt) { clearInterval(Stats._rt); Stats._rt = null; }
  },
  retryStart: function (needView) {
    if (Stats._rt) return;
    Stats._rn = 0;
    Stats._rt = setInterval(function () {
      Stats._rn++;
      if (Stats._rn > 6) { Stats.retryStop(); return; }
      const p = needView ? '/api/stats/view' : ('/api/stats?vid=' + encodeURIComponent(Stats.vid()));
      Stats.hit(p, needView ? { vid: Stats.vid() } : null, function (err, j) {
        if (!err && j && j.ok) { Stats.sync(j); Stats.retryStop(); }
      });
    }, 20000);
  },
  // 進首頁時回報一次（同一個分頁只回報一次）
  report: function () {
    if (!hasFetch()) {
      Stats.useLocal(!stSGet(ST_SEEN)); stSSet(ST_SEEN, '1');
      Stats.ready = true; Stats.render();
      return;
    }
    const fresh = !stSGet(ST_SEEN);
    if (fresh) stSSet(ST_SEEN, '1');
    const p = fresh ? '/api/stats/view' : ('/api/stats?vid=' + encodeURIComponent(Stats.vid()));
    Stats.hit(p, fresh ? { vid: Stats.vid() } : null, function (err, j) {
      if (!err && j && j.ok) { Stats.sync(j); Stats.retryStop(); return; }
      // 失敗或逾時：先秀本機數字（不要讓使用者乾等），背景持續重試
      Stats.useLocal(fresh);
      Stats.ready = true;
      Stats.render();
      Stats.retryStart(fresh);
    });
  },
  // 每 60 秒把按讚數更新到最新（只在首頁）
  refresh: function () {
    if (Stats.mode !== 'net' || !hasFetch()) return;
    Stats.hit('/api/stats?vid=' + encodeURIComponent(Stats.vid()), null, function (err, j) {
      if (!err && j && j.ok) Stats.sync(j);
    });
  },""",
    'Stats.hit 逾時 + 背景重試')

if s != orig:
    io.open(HTML, 'w', encoding='utf-8').write(s)
    print('[OK] index.html 已更新')
else:
    print('[SKIP] 沒有變動')
