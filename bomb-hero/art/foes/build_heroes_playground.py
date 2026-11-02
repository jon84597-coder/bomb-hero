# -*- coding: utf-8 -*-
"""
由 heroes-playground.src.html 生成 heroes-playground.html：
把 8 隻 × 各層 PNG 壓成 webp 內嵌，並注入 SRC / THUMB / LAYERS / FACE。
用法：python bomb-hero/art/foes/build_heroes_playground.py
"""
import io, json, os, base64
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HEROES = os.path.join(HERE, 'heroes')
SRC_HTML = os.path.join(HERE, 'heroes-playground.src.html')
DST_HTML = os.path.join(HERE, 'heroes-playground.html')

IDS = ['01-rabbit', '02-bear', '03-dog', '04-cat',
       '05-pig', '06-panda', '07-frog', '08-chick']
LAYER_NAMES = ['head', 'torso', 'torsoB', 'legL', 'legR', 'armL', 'armR', 'tail']


def enc(path, maxw, q=80):
    im = Image.open(path).convert('RGBA')
    if im.width > maxw:
        im = im.resize((maxw, max(1, round(im.height * maxw / im.width))), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


def main():
    html = io.open(SRC_HTML, encoding='utf-8').read()
    layers = json.load(io.open(os.path.join(HEROES, 'layers', '_layers.json'), encoding='utf-8'))
    face = json.load(io.open(os.path.join(HEROES, '_face.json'), encoding='utf-8'))

    src, thumb = {}, {}
    total = 0
    for rid in IDS:
        thumb[rid] = enc(os.path.join(HEROES, rid + '.png'), 120, 78)
        n = 0
        for name in LAYER_NAMES:
            p = os.path.join(HEROES, 'layers', rid, name + '.png')
            if not os.path.exists(p):
                continue
            uri = enc(p, 340)
            src['%s_%s' % (rid, name)] = uri
            total += len(uri)
            n += 1
        print('%-11s %d 層' % (rid, n))

    data = (
        'var SRC = ' + json.dumps(src, ensure_ascii=False) + ';\n'
        'var THUMB = ' + json.dumps(thumb, ensure_ascii=False) + ';\n'
        'var LAYERS = ' + json.dumps({k: v for k, v in layers.items() if k in IDS},
                                     ensure_ascii=False) + ';\n'
        'var FACE = ' + json.dumps({k: v for k, v in face.items() if k in IDS and v},
                                   ensure_ascii=False) + ';\n'
    )

    assert '/*__SRC__*/' in html and '/*__DATA__*/' in html, '模板佔位符不見了'
    html = html.replace('/*__SRC__*/', '')
    html = html.replace('/*__DATA__*/', data)

    io.open(DST_HTML, 'w', encoding='utf-8', newline='').write(html)
    print('圖 %.0f KB / html %.0f KB' % (total / 1024, len(html.encode('utf-8')) / 1024))


if __name__ == '__main__':
    main()
