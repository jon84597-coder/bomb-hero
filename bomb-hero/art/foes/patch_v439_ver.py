# -*- coding: utf-8 -*-
# v4.39 版號：VERSION / verTxt / verLogVer / VERSION_LOG[0] ＋ 三份 sw.js
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


LOG_ITEMS = """  { v: '4.39', date: '2026-11-03', now: true, items: [
    '輸送帶橫著走出去不再「黏住」：以前站在帶子上每帧被吸回格子中心，橫向幾乎走不動，現在會被皮帶甩出去（比平常走路還快）',
    '道具圖示放大到將近一整格，外框改成圓形亮金環（像按鍵的金屬圈）—— 金環只圈在圖示外面，不會再壓到圖案',
    '金環加上金屬漸層、沿著圈跑動的星芒，道具在場上一眼就看得出來是什麼',
    '恐龍蛋重新畫過（奶油色蛋殼＋翡翠綠斑點），而且會左右搖晃、蛋緣一直閃亮光，看起來很珍貴',
    '恐龍蛋不再一開始就躺在場上 —— 現在藏在軟磚裡，打掉那塊磚才會冒出來',
    '剛從磚裡冒出來的蛋有 0.8 秒保護，不會被「炸開磚的同一發爆炸」順手燒掉',
    '推車丟進場的炸彈只在飛越牆壁時彈跳：沒碰到牆、落在陸地上時是平順滑過去的，不會一路彈個不停',
  ] },
"""

rw(os.path.join(ROOT, 'index.html'), [
    ("const VERSION = '4.38';", "const VERSION = '4.39';", 'VERSION'),
    ('<span class="vlnum">v<span id="verLogVer">4.38</span></span>',
     '<span class="vlnum">v<span id="verLogVer">4.39</span></span>', 'verLogVer'),
    ('<div class="ver beta">測試版 v<span id="verTxt">4.38</span></div>',
     '<div class="ver beta">測試版 v<span id="verTxt">4.39</span></div>', 'verTxt'),
    ("const VERSION_LOG = [\n  { v: '4.38', date: '2026-11-02', now: true, items: [",
     "const VERSION_LOG = [\n" + LOG_ITEMS + "  { v: '4.38', date: '2026-11-02', now: false, items: [", 'VERSION_LOG'),
])

for rel in ('sw.js', os.path.join('..', 'public', 'sw.js'), os.path.join('..', 'bomberman-online', 'public', 'sw.js')):
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print('skip', rel)
        continue
    s = io.open(p, encoding='utf-8', newline='').read()
    assert "v4.38.0" in s, rel
    s = s.replace("v4.38.0", "v4.39.0")
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('ok [sw] ' + rel)
