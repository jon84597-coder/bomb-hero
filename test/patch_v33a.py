# -*- coding: utf-8 -*-
# v3.3：把「Failed to fetch」翻成人話 —— 線上配對必須有 Node 後端（server.js）
#   - file:// 直接雙擊開 index.html → 明確提示要先跑 node server.js
#   - 後端不存在（404，例如 GitHub Pages）→ 提示純靜態空間無法線上配對
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()

old1 = """  // ---------- 基礎 ----------
  api: function (path, body, cb) {
    if (!hasFetch()) { cb(new Error('這個環境不支援網路連線')); return; }
    const opt = body == null ? { method: 'GET', cache: 'no-store' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store'
    };
    fetch(path, opt).then(function (r) {
      return r.text().then(function (t) {
        let j = null;
        try { j = JSON.parse(t); } catch (e) {}
        return { ok: r.ok, status: r.status, json: j };
      });
    }).then(function (r) {
      if (r.ok) cb(null, r.json || {});
      else cb(new Error((r.json && r.json.err) || ('HTTP ' + r.status)), r.json);
    }).catch(function (e) { cb(e); });
  },"""
new1 = """  // ---------- 基礎 ----------
  // v3.3：把「Failed to fetch」翻成人話 —— 線上配對一定要有 Node 後端（server.js）
  netErrText: function (e, status) {
    if (status === 404)
      return '找不到線上配對後端（/api/*）：請先執行「node server.js」再用瀏覽器開 http://localhost:3000（GitHub Pages 等純靜態空間沒有後端，無法線上配對）';
    if (location.protocol === 'file:')
      return '目前是直接雙擊開啟 index.html（file://），沒有後端可連線：請先執行「node server.js」再用瀏覽器開 http://localhost:3000，或改用線上版連結（單人闖關、本機對戰不受影響）';
    return (e && e.message) ? e.message : '網路連線失敗';
  },
  api: function (path, body, cb) {
    if (!hasFetch()) { cb(new Error('這個環境不支援網路連線')); return; }
    const opt = body == null ? { method: 'GET', cache: 'no-store' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store'
    };
    fetch(path, opt).then(function (r) {
      return r.text().then(function (t) {
        let j = null;
        try { j = JSON.parse(t); } catch (e) {}
        return { ok: r.ok, status: r.status, json: j };
      });
    }).then(function (r) {
      if (r.ok) cb(null, r.json || {});
      else cb(new Error((r.json && r.json.err) || Net.netErrText(null, r.status)), r.json);
    }).catch(function (e) { cb(new Error(Net.netErrText(e, 0))); });
  },"""
if src.count(old1) != 1:
    print('FAIL old1', src.count(old1)); sys.exit(1)
src = src.replace(old1, new1, 1)

old2 = "const VERSION = '3.2';"
new2 = "const VERSION = '3.3';"
if src.count(old2) != 1:
    print('FAIL ver', src.count(old2)); sys.exit(1)
src = src.replace(old2, new2, 1)

old3 = '<div class="ver beta">測試版 v<span id="verTxt">3.2</span></div>'
new3 = '<div class="ver beta">測試版 v<span id="verTxt">3.3</span></div>'
if src.count(old3) != 1:
    print('FAIL verTxt', src.count(old3)); sys.exit(1)
src = src.replace(old3, new3, 1)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v3.3a OK')
