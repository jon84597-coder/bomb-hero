# -*- coding: utf-8 -*-
"""
由 heroes-preview.src.html（模板，src 用 TOK_RABBIT 之類的 token）
產生 heroes-preview.html（圖片內嵌成 webp data URI）。

用法：python artoes/build_heroes_preview.py
"""
import io, os, re, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'heroes-preview.src.html')
DST = os.path.join(HERE, 'heroes-preview.html')

HEROES = [
    ('RABBIT', 'rabbit', 'heroes/01-rabbit.png', 620),
    ('BEAR',   'bear',   'heroes/02-bear.png',   620),
    ('DOG',    'dog',    'heroes/03-dog.png',    620),
    ('CAT',    'cat',    'heroes/04-cat.png',    620),
    ('PIG',    'pig',    'heroes/05-pig.png',    620),
    ('PANDA',  'panda',  'heroes/06-panda.png',  620),
    ('FROG',   'frog',   'heroes/07-frog.png',   620),
    ('CHICK',  'chick',  'heroes/08-chick.png',  620),
]
EXTRA = [('CONTACT', 'heroes/_contact_heroes.png', 1000)]


def data_uri(path, maxw, q=82):
    im = Image.open(path).convert('RGBA')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    html = io.open(SRC, encoding='utf-8').read()

    # 1) 小尺寸圖（帶 width="128" 等）-> 先標記成 data-from，最後用 JS 複製大圖
    def small(m):
        return 'data-from="%s" width="%s"' % (m.group(1).lower(), m.group(2))
    html = re.sub(r'src="TOK_([A-Z]+)" width="(\d+)"', small, html)

    # 2) 剩下的是大圖 / contact，直接內嵌；順便補上 id 讓 JS 找得到
    for key, slug, rel, maxw in HEROES:
        uri = data_uri(os.path.join(HERE, rel), maxw)
        html = html.replace('src="TOK_%s"' % key,
                            'id="big-%s" src="%s"' % (slug, uri), 1)
        print('%-8s %-26s %.0f KB' % (slug, rel, len(uri) / 1024))
    for key, rel, maxw in EXTRA:
        uri = data_uri(os.path.join(HERE, rel), maxw)
        html = html.replace('src="TOK_%s"' % key, 'src="%s"' % uri, 1)

    assert 'TOK_' not in html, '還有沒替換的 token: ' + str(html.count('TOK_'))

    # 3) 小圖用大圖的 src 填回去
    inject = '''
<script>
document.querySelectorAll('img[data-from]').forEach(function (el) {
  var big = document.getElementById('big-' + el.getAttribute('data-from'));
  if (big) el.src = big.src;
});
</script>
'''
    html = html.replace('</body>', inject + '</body>')
    io.open(DST, 'w', encoding='utf-8', newline='').write(html)
    print('html', len(html.encode('utf-8')) // 1024, 'KB')


if __name__ == '__main__':
    main()
