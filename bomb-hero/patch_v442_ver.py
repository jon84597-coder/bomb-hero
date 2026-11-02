# -*- coding: utf-8 -*-
"""v4.42 patch 2：版號 4.41 → 4.42（四處）＋ 版本紀錄 ＋ 三份 sw.js"""
import io
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, 'index.html')
s = io.open(HTML, encoding='utf-8', newline='').read()


def one(old, new, tag):
    global s
    assert s.count(old) == 1, '%s 出現 %d 次' % (tag, s.count(old))
    s = s.replace(old, new)


one("const VERSION = '4.41';", "const VERSION = '4.42';", 'VERSION')
one('<span id="verLogVer">4.41</span>', '<span id="verLogVer">4.42</span>', 'verLogVer')
one('測試版 v<span id="verTxt">4.41</span>', '測試版 v<span id="verTxt">4.42</span>', 'verTxt')

one("""const VERSION_LOG = [
  { v: '4.41', date: '2026-11-03', now: true, items: [""",
    """const VERSION_LOG = [
  { v: '4.42', date: '2026-11-03', now: true, items: [
    '藏人的場景物件再重畫一次：顏色回到「有精神的中高彩度」，光影層次也做出來了，遠看就知道是樹叢、木屋還是陶甕',
    '地面影子加深一點，物件不會再像貼紙浮在草地上',
    '細高的陶甕不再被壓成小不點（高度上限放寬到 1.26 格）',
    '推車投擲：集氣 1／2／3 格，正前方是石牆也照樣丟得上去，炸彈會坐在牆頂上等你引爆',
    '丟在牆上的炸彈只炸自己那一格，不會穿過石牆燒到裡面',
  ] },
  { v: '4.41', date: '2026-11-03', now: false, items: [""",
    'VERSION_LOG')

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('版本 → 4.42 OK')

for p in ('sw.js', '../public/sw.js', '../bomberman-online/public/sw.js'):
    f = os.path.normpath(os.path.join(ROOT, p))
    if not os.path.exists(f):
        print('skip', p)
        continue
    t = io.open(f, encoding='utf-8', newline='').read()
    n = t.replace('v4.41.0', 'v4.42.0')
    assert n != t, p + ' 找不到 v4.41.0'
    io.open(f, 'w', encoding='utf-8', newline='').write(n)
    print('sw →', p)
