# -*- coding: utf-8 -*-
# v4.40 版號：VERSION / verTxt / verLogVer / VERSION_LOG[0] ＋ 三份 sw.js
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def rw(path, pairs):
    s = io.open(path, encoding='utf-8', newline='').read()
    CRLF = '\r\n' in s
    for old, new, tag in pairs:
        o, n = old, new
        if CRLF:
            o = o.replace('\n', '\r\n')
            n = n.replace('\n', '\r\n')
        assert s.count(o) == 1, '[%s] %s 對不上（%d 次）' % (os.path.basename(path), tag, s.count(o))
        s = s.replace(o, n)
        print('ok [%s] %s' % (os.path.basename(path), tag))
    io.open(path, 'w', encoding='utf-8', newline='').write(s)


LOG_ITEMS = """  { v: '4.40', date: '2026-11-03', now: true, items: [
    '道具的圓形底改成「淺色半透明」的磨砂玻璃 —— 以前的近黑底會把圖示的暗部吃掉，看不出是什麼',
    '淺色底上的圖示加了一層柔和陰影，淺色的手套／骷髏也不會糊在底上',
    '藏人的場景物件換成精緻美術圖，一共五種：灌木叢、破木屋、石堆、大陶甕、木箱堆',
    '每一大關會挑合主題的幾種（草原多灌木、沙漠多陶甕、城市多貨箱），不再只有草叢跟破屋兩種',
    '藏人物件比一格再大一點、高度往上長，躲進去更好認',
    '小怪吐元素彈會「先集氣」：全身抖動、身上聚起一顆越來越大的元素球、落點出現大預告圈與瞄準線，看完才射',
    '元素彈飛行速度砍半（0.55 → 1.1 秒），第一關新手有時間走開',
  ] },
"""

rw(os.path.join(ROOT, 'index.html'), [
    ("const VERSION = '4.39';", "const VERSION = '4.40';", 'VERSION'),
    ('<span class="vlnum">v<span id="verLogVer">4.39</span></span>',
     '<span class="vlnum">v<span id="verLogVer">4.40</span></span>', 'verLogVer'),
    ('<div class="ver beta">測試版 v<span id="verTxt">4.39</span></div>',
     '<div class="ver beta">測試版 v<span id="verTxt">4.40</span></div>', 'verTxt'),
    ("const VERSION_LOG = [\n  { v: '4.39', date: '2026-11-03', now: true, items: [",
     "const VERSION_LOG = [\n" + LOG_ITEMS + "  { v: '4.39', date: '2026-11-03', now: false, items: [", 'VERSION_LOG'),
])

for rel in ('sw.js', os.path.join('..', 'public', 'sw.js'), os.path.join('..', 'bomberman-online', 'public', 'sw.js')):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print('skip', rel)
        continue
    s = io.open(p, encoding='utf-8', newline='').read()
    assert "v4.39.0" in s, rel
    s = s.replace("v4.39.0", "v4.40.0")
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('ok [sw] ' + rel)
