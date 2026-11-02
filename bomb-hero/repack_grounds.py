# -*- coding: utf-8 -*-
"""把所有地面貼圖重新編碼並寫回 index.html（統一尺寸與壓縮率）。

原本是每加一個主題就寫一個 patch 腳本，改一次參數就要重跑一整套；
現在統一由這支處理：art/ground/tile-*.png 是唯一真相，index.html 只是輸出。

  * 尺寸 96：遊戲裡一格 59px（手機更小），96 已經看不出差別，但 base64 少三成
  * webp q64：均勻材質壓縮率高，肉眼幾乎無損
"""
import base64
import io
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, 'index.html')
GROUND = os.path.join(HERE, 'art', 'ground')

SIZE = 96
Q = 64

GROUPS = [
    ('floor', 'tile-grass%d.png'),
    ('floorSand', 'tile-sand%d.png'),
    ('floorIce', 'tile-ice%d.png'),
    ('floorLava', 'tile-lava%d.png'),
    ('floorNeon', 'tile-neon%d.png'),
    ('floorSea', 'tile-sea%d.png'),
    ('floorSky', 'tile-sky%d.png'),
    ('floorDark', 'tile-dark%d.png'),
]


def enc(png):
    im = Image.open(png).convert('RGB')
    if im.size != (SIZE, SIZE):
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=Q, method=6)
    b = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii'), len(b)


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert '\r\n' not in s, '整檔必須是 LF'
    total = 0
    for key, pat in GROUPS:
        items = []
        for i in range(4):
            p = os.path.join(GROUND, pat % i)
            assert os.path.exists(p), '缺圖: %s' % p
            items.append(enc(p))
        total += sum(k for _, k in items)
        body = ''.join('\n    { u: "%s" },' % u for u, _ in items).rstrip(',')
        head = '\n  %s: [' % key
        assert head in s, '找不到 %s 組' % key
        i0 = s.index(head) + len(head)
        i1 = s.index('\n  ]', i0)
        s = s[:i0] + body + s[i1:]
    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('八組地面 webp 合計 %.1fKB；新檔 %d 字元，餘 %d' % (
        total / 1024.0, len(s), 3350000 - len(s)))
    print('index.html 位元組 %d（verify-v24 上限 3,500,000）' % os.path.getsize(GAME))


if __name__ == '__main__':
    main()
