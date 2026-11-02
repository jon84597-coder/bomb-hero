# -*- coding: utf-8 -*-
"""v4.41 patch 2：版號 4.40 → 4.41（四處）＋ 版本紀錄 ＋ __BH 匯出"""
import io
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, 'index.html')
s = io.open(HTML, encoding='utf-8', newline='').read()


def one(old, new, tag):
    global s
    assert s.count(old) == 1, '%s 出現 %d 次' % (tag, s.count(old))
    s = s.replace(old, new)


one("const VERSION = '4.40';", "const VERSION = '4.41';", 'VERSION')
one('<span id="verLogVer">4.40</span>', '<span id="verLogVer">4.41</span>', 'verLogVer')
one('測試版 v<span id="verTxt">4.40</span>', '測試版 v<span id="verTxt">4.41</span>', 'verTxt')

one("""const VERSION_LOG = [
  { v: '4.40', date: '2026-11-03', now: true, items: [""",
    """const VERSION_LOG = [
  { v: '4.41', date: '2026-11-03', now: true, items: [
    '藏人的場景物件全部重畫：顏色改淺（低飽和粉彩）、影子更淡，不會再像一塊深色的石頭擋在草地上',
    '五種物件都變矮胖 —— 寬度只比一格多一點點，高度最多 1.1 格，疊起來的木箱也不會遮住上面那一格',
    '推車投擲距離改成硬上限：集氣三段就是 1／2／3 格，不會再無視標示一路飛到 5～16 格',
    '炸彈撞到石牆就當場停住，不再「一格一格彈過牆」，落點預告也跟實際落點一致',
    '3 格內全是石牆／已經有炸彈時會直接告訴你換個位置，不再按了沒反應',
    '丟在軟磚上會把那塊磚砸碎（以前會有一顆炸彈卡在磚裡）',
  ] },
  { v: '4.40', date: '2026-11-03', now: false, items: [""",
    'VERSION_LOG')

# 匯出給測試：HIDE_ART_MAXH
one("HideArt: HideArt, HIDE_ART: HIDE_ART, HIDE_KINDS: HIDE_KINDS, HIDE_ART_SCALE: HIDE_ART_SCALE,",
    "HideArt: HideArt, HIDE_ART: HIDE_ART, HIDE_KINDS: HIDE_KINDS, HIDE_ART_SCALE: HIDE_ART_SCALE,\n"
    "  HIDE_ART_MAXH: HIDE_ART_MAXH,",
    'export MAXH')

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('版本 → 4.41 OK')

for p in ('sw.js', 'public/sw.js', 'bomberman-online/public/sw.js'):
    f = os.path.join(ROOT, p)
    if not os.path.exists(f):
        print('skip', p)
        continue
    t = io.open(f, encoding='utf-8', newline='').read()
    n = t.replace('v4.40.0', 'v4.41.0')
    assert n != t or 'v4.41.0' in t, p + ' 找不到 v4.40.0'
    io.open(f, 'w', encoding='utf-8', newline='').write(n)
    print('sw →', p)
