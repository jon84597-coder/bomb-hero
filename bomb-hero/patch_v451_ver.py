# -*- coding: utf-8 -*-
# v4.51 ④：版號 4.50 → 4.51（VERSION / #verTxt / #verLogVer / VERSION_LOG[0]）＋ 三份 sw.js
import io, os, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
orig = len(s)


def rep(old, new, optional=False, tag=''):
    global s
    if old not in s:
        if optional:
            print('  · skip ' + (tag or old[:40]))
            return
        sys.exit('MISS: ' + (tag or '') + ' -> ' + old[:120].replace('\n', '\\n'))
    s = s.replace(old, new, 1)
    print('  ✓ ' + (tag or old[:40]))


rep('''const VERSION = '4.50';''', '''const VERSION = '4.51';''', optional=True, tag='VERSION')

rep('''<span id="verTxt">4.50</span>''', '''<span id="verTxt">4.51</span>''',
    optional=True, tag='#verTxt')

rep('''<span id="verLogVer">4.50</span>''', '''<span id="verLogVer">4.51</span>''',
    optional=True, tag='#verLogVer')

rep('''const VERSION_LOG = [
  { v: '4.50', date: '2026-11-03', now: true, items: [''',
'''const VERSION_LOG = [
  { v: '4.51', date: '2026-11-03', now: true, items: [
    '地圖生成器大改：改成「可走格數」驅動（100／150／200／250／300 格），形狀真正不規則、只有一層外牆',
    '出生點改成隨機，旁邊一定留得出路；出口大門隨機藏在遠處的軟磚下面，不再固定在某個角落',
    '新增「怪物聚集房」：一圈歪斜的硬石牆圍起來，入口封 2~3 塊軟磚 —— 炸開才進得去，裡面藏一群怪',
    '首頁設定移除「地圖尺寸」；說明頁最下方多了開發用的地圖測試關 T1~T5（不公開，驗收生成器用）',
  ] },
  { v: '4.50', date: '2026-11-03', now: false, items: [''',
    optional=True, tag='VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('index.html 字元 %d → %d（%+d）' % (orig, len(s), len(s) - orig))

# ---- 三份 sw.js ----
for p in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    if not os.path.exists(p):
        print('  · 找不到 ' + p)
        continue
    t = io.open(p, encoding='utf-8', newline='').read()
    if "SW_VERSION = 'v4.51.0'" in t:
        print('  · ' + p + ' 已是 v4.51.0')
        continue
    t2 = t.replace("var SW_VERSION = 'v4.50.0';", "var SW_VERSION = 'v4.51.0';", 1)
    if t2 == t:
        print('  ! ' + p + ' 沒找到 v4.50.0')
        continue
    io.open(p, 'w', encoding='utf-8', newline='').write(t2)
    print('  ✓ ' + p + ' → v4.51.0')
