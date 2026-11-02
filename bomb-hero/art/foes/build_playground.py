# -*- coding: utf-8 -*-
"""
把 6 隻小怪的 PNG 內嵌進 stage1-playground.html（可重複執行）。
改圖後跑一次即可：python art/foes/build_playground.py
"""
import io, os, re, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, 'stage1-playground.html')
MAP = {
    'slime':  ('stage1/01-slime.png', 240),
    'bunny':  ('stage1/02-bunny.png', 240),
    'frog':   ('stage1/03-frog.png', 240),
    'cater':  ('stage1/04-cater.png', 240),
    'mush':   ('stage1/05-mush.png', 240),
    'beetle': ('stage1/06-beetle.png', 240),
}


def uri(rel, maxw, q=86):
    im = Image.open(os.path.join(HERE, rel)).convert('RGBA')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), im.size


def main():
    html = io.open(HTML, encoding='utf-8').read()
    for k, (rel, maxw) in MAP.items():
        u, size = uri(rel, maxw)
        token = '__IMG_%s__' % k
        n = html.count(token)
        assert n >= 1, '找不到 token %s' % token
        # 第二個出現位置是卡片縮圖；兩處都換成同一份 data URI 沒問題（瀏覽器會快取）
        html = html.replace(token, u)
        print('%-7s %-26s %s  x%d' % (k, rel, size, n))
    io.open(HTML, 'w', encoding='utf-8', newline='').write(html)
    print('html %.0f KB' % (len(html.encode('utf-8')) / 1024))


if __name__ == '__main__':
    main()
