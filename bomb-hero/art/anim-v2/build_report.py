"""驗收報告頁：技術面 vs 比例面
"""
import os, json, base64, io
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FR = ['frames/walk_%d.png' % i for i in range(4)]
REF = 'ref_clean.png'


def b64(im, fmt='PNG'):
    bio = io.BytesIO(); im.save(bio, fmt, optimize=True)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(bio.getvalue()).decode())


def trim(p):
    im = Image.open(p).convert('RGBA')
    a = np.array(im)[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]; xs = np.where((a > 8).any(axis=0))[0]
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def fit(im, h):
    w = max(1, int(round(im.width * h / im.height)))
    return im.resize((w, h), Image.LANCZOS)


def side(a, b, h=430, gap=26, pad=16, bg=(248, 249, 251)):
    A, B = fit(trim(a), h), fit(trim(b), h)
    W = A.width + B.width + gap + pad * 2
    c = Image.new('RGBA', (W, h + pad * 2), bg + (255,))
    c.alpha_composite(A, (pad, pad)); c.alpha_composite(B, (pad + A.width + gap, pad))
    return c


def metrics(p):
    a = np.array(Image.open(p).convert('RGBA'))[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]; xs = np.where((a > 8).any(axis=0))[0]
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    h = y1 - y0 + 1
    ext = []
    for y in range(y0, y1 + 1):
        xx = np.where(a[y] > 60)[0]
        ext.append(int(xx.max() - xx.min() + 1) if len(xx) else 0)
    ext = np.array(ext)
    head = int(ext[:int(h * 0.42)].max())
    body = int(ext[int(h * 0.58):].max())
    corners = [a[y0:y0 + 26, x0:x0 + 26], a[y0:y0 + 26, x1 - 25:x1 + 1],
               a[y1 - 25:y1 + 1, x0:x0 + 26], a[y1 - 25:y1 + 1, x1 - 25:x1 + 1]]
    return dict(h=h, w=x1 - x0 + 1, top=y0, bot=y1, x0=x0,
                solid=int((a > 200).sum()), head=head, body=body,
                hr=round(head / h, 3), br=round(body / h, 3),
                hb=round(head / max(1, body), 3),
                corner=max(int(c.max()) for c in corners))


def main():
    meta = json.load(open('frames/meta.json'))
    ms = [metrics(p) for p in FR]
    ref = metrics(REF)

    ab = b64(side(REF, FR[0]))
    ab_small = b64(side(REF, FR[0], h=140, gap=14, pad=8))

    sm = [b64(fit(trim(p), 780) if False else Image.open(p).convert('RGBA').resize((450, 780), Image.LANCZOS)) for p in FR]
    zooms = []
    for p, box, name in [(FR[0], (150, 600, 750, 1000), '肩／圍巾'),
                         (FR[1], (120, 780, 720, 1180), '髖／抬腳'),
                         (FR[2], (150, 300, 750, 700), '頭／耳根')]:
        zooms.append((name, b64(Image.open(p).convert('RGBA').crop(box))))

    hs = [m['h'] for m in ms]
    spread = 100.0 * (max(hs) - min(hs)) / (sum(hs) / len(hs))
    jumps = [abs(ms[i + 1]['top'] - ms[i]['top']) for i in range(3)] + [abs(ms[0]['top'] - ms[3]['top'])]

    rows = ''.join(
        '<tr><td>walk_%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%.3f</td><td>%.3f</td><td>%.2f</td><td>%d</td></tr>'
        % (i, ms[i]['h'], ms[i]['w'], ms[i]['head'], ms[i]['body'], ms[i]['hr'], ms[i]['br'],
           ms[i]['hb'], ms[i]['corner']) for i in range(4))
    refrow = ('<tr><td>遊戲原角色</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%.3f</td><td>%.3f</td><td>%.2f</td><td>%d</td></tr>'
              % (ref['h'], ref['w'], ref['head'], ref['body'], ref['hr'], ref['br'], ref['hb'], ref['corner']))

    cells = ''.join('<div class="cell"><img src="%s" alt=""><p>walk_%d</p></div>' % (sm[i], i) for i in range(4))
    zc = ''.join('<div class="cell zoom"><img src="%s" alt=""><p>%s</p></div>' % (s, n) for n, s in zooms)

    html = open(os.path.join(HERE, 'report.tpl.html'), encoding='utf-8').read()
    rep = {
        '__AB__': ab, '__ABSMALL__': ab_small, '__F0__': sm[0], '__CELLS__': cells, '__ZOOMS__': zc,
        '__ROWS__': rows, '__REFROW__': refrow,
        '__SPREAD__': '%.2f' % spread, '__JUMP__': str(max(jumps)),
        '__K__': str(meta['k']), '__MED__': str(int(meta['median_h'])),
        '__REFHR__': '%.3f' % ref['hr'], '__NEWHR__': '%.3f' % (sum(m['hr'] for m in ms) / 4),
        '__REFHB__': '%.2f' % ref['hb'], '__NEWHB__': '%.2f' % (sum(m['hb'] for m in ms) / 4),
    }
    for k, v in rep.items():
        html = html.replace(k, v)
    out = os.path.join(HERE, 'walk-check.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(out, os.path.getsize(out) // 1024, 'KB')
    print('spread %.2f%%  jumps %s' % (spread, jumps))
    print('REF  頭/身高 %.3f  頭/身 %.2f' % (ref['hr'], ref['hb']))
    print('NEW  頭/身高 %.3f  頭/身 %.2f' % (sum(m['hr'] for m in ms) / 4, sum(m['hb'] for m in ms) / 4))


if __name__ == '__main__':
    main()
