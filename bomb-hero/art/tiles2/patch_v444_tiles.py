# -*- coding: utf-8 -*-
"""v4.44：把 TILE_ART 整块换成新的 128px 场景贴图，并升版号。"""
import io
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
IDX = os.path.join(ROOT, 'index.html')
TILES = os.path.join(ROOT, 'art', 'tiles2', '_tiles_game.js')

MARK_A = '// ---------- 場景貼圖（自動生成'
MARK_B = '// 場景貼圖載入器'


def main():
    s = io.open(IDX, 'r', encoding='utf-8', newline='').read()
    new_block = io.open(TILES, 'r', encoding='utf-8', newline='').read().rstrip('\n')

    a = s.index(MARK_A)
    b = s.index(MARK_B)
    old = s[a:b]
    s = s[:a] + new_block + '\n' + s[b:]
    print('TILE_ART 块：%d 字元 -> %d 字元' % (len(old), len(new_block)))

    # 版本号
    for old_v, new_v in (("const VERSION = '4.43';", "const VERSION = '4.44';"),
                         ('<span id="verLogVer">4.43</span>', '<span id="verLogVer">4.44</span>'),
                         ('測試版 v<span id="verTxt">4.43</span>', '測試版 v<span id="verTxt">4.44</span>')):
        assert s.count(old_v) == 1, old_v
        s = s.replace(old_v, new_v)

    # VERSION_LOG
    old_log = "const VERSION_LOG = [\n  { v: '4.43', date: '2026-11-03', now: true, items: ["
    assert s.count(old_log) == 1
    new_log = (
        "const VERSION_LOG = [\n"
        "  { v: '4.44', date: '2026-11-03', now: true, items: [\n"
        "    '第一大關的場景整個重畫：外圍石牆、灰色石牆、紅磚牆、草地全部改成手繪材質，筆觸跟場景概念圖同一套',\n"
        "    '石磚改成「一格一塊」的大方磚，磚縫是深色的，磚角長了青苔、縫裡冒出小草和小白花',\n"
        "    '草地鋪滿整片不會再有方格接縫感，三種草地會自動交替',\n"
        "    '貼圖解析度改 128（原本 144），畫面更省記憶體、載入更快',\n"
        "  ] },\n"
        "  { v: '4.43', date: '2026-11-03', now: false, items: ["
    )
    s = s.replace(old_log, new_log)

    io.open(IDX, 'w', encoding='utf-8', newline='').write(s)
    print('字元總數：%d' % len(s))


if __name__ == '__main__':
    main()
