# -*- coding: utf-8 -*-
"""v4.47：手機直放遊戲畫面滿版。

同步四處版本號（VERSION / verTxt / verLogVer / VERSION_LOG[0]）＋三份 sw.js。
"""
import io
import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(HERE, 'index.html')

NEW = '4.47'
SW = 'v4.47.0'
OLD = '4.46'

ITEMS = [
    '手機直放畫面滿版：左右貼邊、下方不再留 162px 給搖桿，畫布從 362×613 變成 390×775',
    '直放的格子大小改成「高度優先、至少留 7 格寬」，地圖蓋滿整個畫布，不會出現上下深色空帶',
    '搖桿與放彈鍵改成浮在地圖上（半透明），不再吃掉一整條畫面',
    '全面屏手機的按鈕加上安全區位移，不會貼到系統手勢條',
]


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert "const VERSION = '4.46';" in s, '版號不是 4.46'

    s = s.replace("const VERSION = '4.46';", "const VERSION = '%s';" % NEW)
    s = s.replace('<span id="verLogVer">4.46</span>', '<span id="verLogVer">%s</span>' % NEW)
    s = s.replace('<span id="verTxt">4.46</span>', '<span id="verTxt">%s</span>' % NEW)

    old_head = "const VERSION_LOG = [\n  { v: '4.46', date: '2026-11-03', now: true, items: ["
    assert s.count(old_head) == 1, 'VERSION_LOG 開頭不符'
    body = ',\n'.join("    '%s'" % t for t in ITEMS)
    new_head = ("const VERSION_LOG = [\n  { v: '%s', date: '2026-11-03', now: true, items: [\n"
                "%s,\n  ] },\n  { v: '4.46', date: '2026-11-03', now: false, items: [" % (NEW, body))
    s = s.replace(old_head, new_head)

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('index.html -> v%s' % NEW)

    for p in [os.path.join(HERE, 'sw.js'),
              os.path.join(ROOT, 'public', 'sw.js'),
              os.path.join(ROOT, 'bomberman-online', 'public', 'sw.js')]:
        if not os.path.exists(p):
            print('SKIP', p)
            continue
        t = io.open(p, encoding='utf-8', newline='').read()
        a = "var SW_VERSION = 'v%s.0';" % OLD
        assert t.count(a) == 1, '%s: SW_VERSION 不是 v%s.0' % (p, OLD)
        t = t.replace(a, "var SW_VERSION = '%s';" % SW)
        io.open(p, 'w', encoding='utf-8', newline='').write(t)
        print('sw ->', os.path.relpath(p, ROOT))

    for p in [os.path.join(ROOT, 'public', 'index.html'),
              os.path.join(ROOT, 'bomberman-online', 'public', 'index.html')]:
        if os.path.exists(p):
            shutil.copyfile(GAME, p)
            print('copy ->', os.path.relpath(p, ROOT))


if __name__ == '__main__':
    main()
