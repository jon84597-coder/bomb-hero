# -*- coding: utf-8 -*-
"""v4.45c：只換掉 TILE_ART.floorSand（沙地調高對比 + 沙紋放大版），其餘不動。"""
import base64
import io
import os
import re

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.join(HERE, 'index.html')
GROUND = os.path.join(HERE, 'art', 'ground')


def enc(png, q=70):
    buf = io.BytesIO()
    Image.open(png).convert('RGB').save(buf, 'WEBP', quality=q, method=6)
    b = buf.getvalue()
    return 'data:image/webp;base64,' + base64.b64encode(b).decode('ascii'), len(b)


def main():
    s = io.open(GAME, encoding='utf-8', newline='').read()
    assert '\r\n' not in s, '整檔必須是 LF'

    items = [enc(os.path.join(GROUND, 'tile-sand%d.png' % i)) for i in range(4)]
    print('沙地 webp 合計 %.1fKB' % (sum(k for _, k in items) / 1024.0))

    m = re.search(r'\n  floorSand: \[\n(.*?)\n  \]', s, re.S)
    assert m, '找不到 floorSand 組'
    assert m.group(1).count('u: "') == 4, '原本應該是 4 張'
    body = '\n'.join('    { u: "%s" },' % u for u, _ in items)
    s = s[:m.start(1)] + body + s[m.end(1):]

    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
    print('新檔長度 %d（額度 3,350,000，餘 %d）' % (len(s), 3350000 - len(s)))


if __name__ == '__main__':
    main()
