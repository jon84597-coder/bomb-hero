# -*- coding: utf-8 -*-
"""
重建 art/foes/stage1-preview.html 的內嵌圖（可重複執行）。

用法：改完 stage1/*.png 後跑  python art/foes/build_preview.py
原理：用 <img alt="..."> 當鍵，把該張圖重新壓成 webp 並覆寫它的 src，
      所以不管現在 src 是 token 還是舊的 data URI 都能更新。
"""
import io, os, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, 'stage1-preview.html')

# alt -> (檔案, 最大寬度)
MAP = {
    '史萊姆':   ('stage1/01-slime.png', 620),
    '蹦蹦兔':   ('stage1/02-bunny.png', 620),
    '小青蛙':   ('stage1/03-frog.png', 620),
    '毛毛蟲':   ('stage1/04-cater.png', 620),
    '毒菇怪':   ('stage1/05-mush.png', 620),
    '鐵甲蟲':   ('stage1/06-beetle.png', 620),
    '史萊姆拆件示意': ('stage1/00-rig-sheet-slime.png', 1180),
}


def data_uri(path, maxw, q=84):
    im = Image.open(path).convert('RGBA')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), im.size


def main():
    html = io.open(HTML, encoding='utf-8').read()
    for alt, (rel, maxw) in MAP.items():
        uri, size = data_uri(os.path.join(HERE, rel), maxw)
        key = 'alt="%s"' % alt
        i = html.find(key)
        assert i > 0, '找不到 alt=%s' % alt
        # 往回找這個 img 標籤的 src="
        s = html.rfind('src="', 0, i)
        assert s > 0, 'alt=%s 前面沒有 src' % alt
        e = html.find('"', s + 5)
        html = html[:s + 5] + uri + html[e:]
        print('%-16s %-30s %s' % (alt, rel, size))
    io.open(HTML, 'w', encoding='utf-8', newline='').write(html)
    print('html', len(html.encode('utf-8')) // 1024, 'KB')


if __name__ == '__main__':
    main()
