# -*- coding: utf-8 -*-
"""v4.24：首頁暱稱提示字對比（奶油色在淺色背景上等於看不見）＋版號四處＋三份 sw.js"""
import io, os, re

D = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(D, 'index.html')
raw = io.open(P, 'r', encoding='utf-8', newline='').read()
src = raw.replace('\r\n', '\n')
assert src != raw
n = 0

# ---------- 1. 暱稱提示字：奶油色 → 深棕（淺色背景上可讀）----------
old_lb = ('<label for="playerName" style="font-size:13px;opacity:.85;color:#ffe6c2">'
          '🦸 暱稱（最多 8 字，<b>可以留空</b>）</label>')
new_lb = ('<label for="playerName" style="font-size:13px;font-weight:600;'
          'color:#7a5a2e;text-shadow:0 1px 0 rgba(255,255,255,.65)">'
          '🦸 暱稱（最多 8 字，<b>可以留空</b>）</label>')
assert src.count(old_lb) == 1, '暱稱 label 比對失敗'
src = src.replace(old_lb, new_lb); n += 1

# ---------- 2. 版號四處 ----------
assert src.count("const VERSION = '4.23';") == 1
src = src.replace("const VERSION = '4.23';", "const VERSION = '4.24';"); n += 1
assert src.count('<span id="verLogVer">4.23</span>') == 1
src = src.replace('<span id="verLogVer">4.23</span>', '<span id="verLogVer">4.24</span>'); n += 1
assert src.count('<span id="verTxt">4.23</span>') == 1
src = src.replace('<span id="verTxt">4.23</span>', '<span id="verTxt">4.24</span>'); n += 1

# ---------- 3. VERSION_LOG：插入 4.24、4.23 改 now:false ----------
old_head = "const VERSION_LOG = [\n  { v: '4.23', date: '2026-11-02', now: true, items: ["
new_head = """const VERSION_LOG = [
  { v: '4.24', date: '2026-11-02', now: true, items: [
    '<b>📝 首頁「暱稱」那行提示字看得到了</b>：它原本是<b>奶油色字壓在米色背景上</b>（對比不到 2:1），等於隱形 —— 很多人不知道那一格可以留空、系統會自動取名字。現在改成深棕字＋淡描邊，一眼就看得清。',
    '<b>🛡️ 上一版（4.23）的修正全部保留</b>：模組隔離、首頁診斷卡、寒冰地圖四元件重畫、手機兩欄選單都在。'
  ] },
  { v: '4.23', date: '2026-11-02', now: false, items: ["""
assert src.count(old_head) == 1, 'VERSION_LOG 開頭比對失敗'
src = src.replace(old_head, new_head); n += 1

# ---------- 4. 三份 sw.js ----------
for rel in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    f = os.path.join(D, rel)
    s = io.open(f, 'r', encoding='utf-8', newline='').read()
    s2 = s.replace("v4.23.0", "v4.24.0")
    assert s2 != s, rel + ' 找不到 v4.23.0'
    io.open(f, 'w', encoding='utf-8', newline='').write(s2)
    n += 1

# ---------- 5. verify-v67 第 7 段改成不綁死版號 ----------
V67 = os.path.join(D, 'test', 'verify-v67.js')
s = io.open(V67, 'r', encoding='utf-8', newline='').read().replace('\r\n', '\n')
old = """  ok(P.VERSION === '4.23', '版號 = 4.23');
  ok(html.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === '4.23' && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 4.23（now）');
  const items = P.VERSION_LOG[0].items.join(' ');
  ok(items.indexOf('一起壞掉') >= 0, '更新內容寫了「模組隔離」');
  ok(items.indexOf('寒冰') >= 0, '更新內容寫了寒冰地圖');
  ok(P.VERSION_LOG[1].v === '4.22' && P.VERSION_LOG[1].now === false, '4.22 已不是 now');"""
new = """  // v4.24：改成不綁死版號（否則每次升版都要回頭改舊測試）
  ok(html.indexOf('id="verTxt">' + P.VERSION + '<') > 0, '畫面版本文字同步 ' + P.VERSION);
  ok(P.VERSION_LOG[0].v === P.VERSION && P.VERSION_LOG[0].now === true, 'VERSION_LOG 第一筆 = 目前版號（now）');
  ok(P.VERSION_LOG.slice(1).every(function (e) { return e.now === false; }), '只有第一筆是 now');
  const e423 = P.VERSION_LOG.filter(function (e) { return e.v === '4.23'; })[0] || { items: [] };
  ok(e423.items.join(' ').indexOf('一起壞掉') >= 0, '4.23 更新內容寫了「模組隔離」');
  ok(e423.items.join(' ').indexOf('寒冰') >= 0, '4.23 更新內容寫了寒冰地圖');
  ok(P.VERSION_LOG.filter(function (e) { return e.v === '4.22'; }).every(function (e) { return e.now === false; }),
    '4.22 已不是 now');"""
assert s.count(old) == 1, 'verify-v67 第 7 段比對失敗'
s = s.replace(old, new)
io.open(V67, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n')); n += 1

io.open(P, 'w', encoding='utf-8', newline='').write(src.replace('\n', '\r\n'))
print('OK 套用 %d 條' % n)
