# -*- coding: utf-8 -*-
"""v4.46：八個主題的地面全部換新 + 第一大關牆面回溯。

同步四處版本號（VERSION / verTxt / verLogVer / VERSION_LOG[0]）＋三份 sw.js。
"""
import io
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAME = os.path.join(HERE, 'index.html')

NEW = '4.46'
SW = 'v4.46.0'

ITEMS = [
    '八個關卡的地面全部重做：草原細草、沙漠風紋沙地、冰雪雪面、熔岩岩地、霓虹紫地、深海水底、天空雲石、魔王城暗地',
    '地板加了場景裝飾：雪地有冰晶與冰水窪、熔岩有發光岩縫和火星、深海有水草貝殼、魔王城有血跡碎骨、霓虹有光斑、天空有雲影',
    '第一大關除了草地，石牆與可炸的磚塊全部回到原本的手繪風格（不再是貼圖，立體厚度回來了）',
    '地面貼圖每關四張自動交替＋翻轉，鋪滿整片也不會出現方格接縫',
    '沙漠沙紋更清楚、冰雪地面不再是死白一片，八關的明暗階梯重新對齊',
]


def sync(path, subs, must=True):
    if not os.path.exists(path):
        if must:
            raise SystemExit('缺檔: %s' % path)
        return False
    s = io.open(path, encoding='utf-8', newline='').read()
    for a, b, cnt in subs:
        assert s.count(a) == cnt, '%s: 預期 %d 處，實際 %d —— %r' % (os.path.basename(path), cnt, s.count(a), a[:40])
        s = s.replace(a, b)
    io.open(path, 'w', encoding='utf-8', newline='').write(s)
    return True


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert 'const VERSION = \'4.44\';' in s

    # 1) 版本號三處
    s = s.replace("const VERSION = '4.44';", "const VERSION = '%s';" % NEW)
    s = s.replace('<span id="verLogVer">4.44</span>', '<span id="verLogVer">%s</span>' % NEW)
    s = s.replace('<span id="verTxt">4.44</span>', '<span id="verTxt">%s</span>' % NEW)

    # 2) VERSION_LOG：舊的第一筆取消 now，插入新的一筆
    old_head = "const VERSION_LOG = [\n  { v: '4.44', date: '2026-11-03', now: true, items: ["
    assert s.count(old_head) == 1, 'VERSION_LOG 開頭不符'
    body = ',\n'.join("    '%s'" % t for t in ITEMS)
    new_head = ("const VERSION_LOG = [\n  { v: '%s', date: '2026-11-03', now: true, items: [\n"
                "%s,\n  ] },\n  { v: '4.44', date: '2026-11-03', now: false, items: [" % (NEW, body))
    s = s.replace(old_head, new_head)

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('index.html -> v%s' % NEW)

    # 3) 三份 sw.js
    for p in [os.path.join(HERE, 'sw.js'),
              os.path.join(ROOT, 'public', 'sw.js'),
              os.path.join(ROOT, 'bomberman-online', 'public', 'sw.js')]:
        ok = sync(p, [("var SW_VERSION = 'v4.44.0';", "var SW_VERSION = '%s';" % SW, 1)], must=False)
        print('%s -> %s' % (os.path.relpath(p, ROOT), 'ok' if ok else 'SKIP(不存在)'))

    # 4) 副本 index.html
    for p in [os.path.join(ROOT, 'public', 'index.html'),
              os.path.join(ROOT, 'bomberman-online', 'public', 'index.html')]:
        if os.path.exists(p):
            import shutil
            shutil.copyfile(GAME, p)
            print('copy -> %s' % os.path.relpath(p, ROOT))


if __name__ == '__main__':
    main()
