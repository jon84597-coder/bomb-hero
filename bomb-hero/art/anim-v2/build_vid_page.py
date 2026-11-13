"""把影片循環幀整理成遊戲用素材：12 格 + GIF + 驗收頁"""
import os, json, base64, io, glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = 'frames_vid'
OUT = 'frames_game'
GAME_N = 12
REF = 'ref_clean.png'


def b64(im, fmt='PNG'):
    bio = io.BytesIO(); im.save(bio, fmt, optimize=True)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(bio.getvalue()).decode())


def prof(p):
    a = np.array(Image.open(p).convert('RGBA'))[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]
    y0, y1 = int(ys.min()), int(ys.max()); h = y1 - y0 + 1
    ext = []
    for y in range(y0, y1 + 1):
        xs = np.where(a[y] > 60)[0]
        ext.append(int(xs.max() - xs.min() + 1) if len(xs) else 0)
    ext = np.array(ext)
    xs2 = np.where((a > 8).any(axis=0))[0]
    return dict(h=h, top=y0, bot=y1, w=int(xs2.max() - xs2.min() + 1),
                head=int(ext[:int(h * .42)].max()), body=int(ext[int(h * .58):].max()))


def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(glob.glob(os.path.join(SRC, 'f*.png')))
    n = len(files)
    idx = [int(round(i * n / GAME_N)) % n for i in range(GAME_N)]
    for j, i in enumerate(idx):
        Image.open(files[i]).save(os.path.join(OUT, 'w%02d.png' % j))

    # GIF
    S = 320
    # 全部幀的聯集邊界 → 固定裁切框（所有幀同一框，GIF 才不會抖）
    ux0 = uy0 = 10 ** 9; ux1 = uy1 = -1
    for f in files:
        a = np.array(Image.open(f).convert('RGBA'))[:, :, 3]
        ys = np.where((a > 8).any(axis=1))[0]
        xs = np.where((a > 8).any(axis=0))[0]
        ux0 = min(ux0, int(xs.min())); ux1 = max(ux1, int(xs.max()))
        uy0 = min(uy0, int(ys.min())); uy1 = max(uy1, int(ys.max()))
    pad = 18
    bw, bh = ux1 - ux0 + pad * 2, uy1 - uy0 + pad * 2
    side = max(bw, bh)
    bx = ux0 - pad - (side - bw) // 2
    by = uy0 - pad - (side - bh) // 2
    gf = []
    for i in range(n):
        im = Image.open(files[i]).convert('RGBA').crop((bx, by, bx + side, by + side))
        im = im.resize((S, S), Image.LANCZOS)
        bg = Image.new('RGBA', (S, S), (24, 28, 34, 255))
        bg.alpha_composite(im)
        gf.append(bg.convert('P', palette=Image.ADAPTIVE, colors=128))
    gf[0].save('walk-video.gif', save_all=True, append_images=gf[1:], duration=int(1000 / 24),
               loop=0, disposal=2, optimize=True)

    ps = [prof(f) for f in files]
    gs = [prof(os.path.join(OUT, 'w%02d.png' % j)) for j in range(GAME_N)]
    ref = prof(REF)
    hs = np.array([p['h'] for p in ps]); hw = np.array([p['head'] for p in ps])
    bs = np.array([p['bot'] for p in ps]); bw = np.array([p['body'] for p in ps])
    m = json.load(open(os.path.join(SRC, 'meta.json')))

    cells = ''.join('<div class="cell"><img src="%s" alt=""><p>w%02d</p></div>'
                    % (b64(Image.open(os.path.join(OUT, 'w%02d.png' % j)).resize((300, 520), Image.LANCZOS)),
                       j) for j in range(GAME_N))
    strip = b64(Image.open(files[0]).resize((140, 243), Image.LANCZOS))
    ghost = b64(Image.open('/tmp/ghost.png') if os.path.exists('/tmp/ghost.png') else files[0])

    # 縮圖條
    tw = 128
    sep = Image.new('RGBA', (tw * n, int(tw * 1560 / 900)), (238, 240, 244, 255))
    for i in range(n):
        sep.alpha_composite(Image.open(files[i]).resize((tw, int(tw * 1560 / 900)), Image.LANCZOS), (tw * i, 0))
    stripall = b64(sep.convert('RGB'))

    z = []
    for nm, box in [('肩／圍巾', (170, 640, 730, 1000)), ('髖／抬腳', (150, 850, 750, 1250)), ('頭／耳根', (170, 380, 730, 720))]:
        z.append((nm, b64(Image.open(files[6]).convert('RGBA').crop(box))))
    zc = ''.join('<div class="cell zoom"><img src="%s" alt=""><p>%s</p></div>' % (s, nm) for nm, s in z)

    refimg = b64(Image.open(REF).convert('RGBA').resize((300, 472), Image.LANCZOS))
    f0 = b64(Image.open(files[0]).resize((300, 520), Image.LANCZOS))

    rows = ''.join('<tr><td>w%02d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%.3f</td><td>%.2f</td></tr>'
                   % (j, gs[j]['h'], gs[j]['head'], gs[j]['body'], gs[j]['bot'],
                      gs[j]['head'] / gs[j]['h'], gs[j]['head'] / max(1, gs[j]['body']))
                   for j in range(GAME_N))

    html = open(os.path.join(HERE, 'vid.tpl.html'), encoding='utf-8').read()
    rep = {
        '__STRIPALL__': stripall, '__GHOST__': ghost, '__CELLS__': cells, '__ZOOMS__': zc,
        '__ROWS__': rows, '__REF__': refimg, '__F0__': f0, '__F0IMG__': f0,
        '__N__': str(n), '__GAME_N__': str(GAME_N),
        '__HMIN__': str(hs.min()), '__HMAX__': str(hs.max()),
        '__HSPREAD__': '%.1f' % (100 * (hs.max() - hs.min()) / np.median(hs)),
        '__HWSPREAD__': '%.1f' % (100 * (hw.max() - hw.min()) / np.median(hw)),
        '__BOT__': '%d~%d' % (bs.min(), bs.max()),
        '__RHR__': '%.3f' % (ref['head'] / ref['h']), '__VHR__': '%.3f' % (np.median(hw) / np.median(hs)),
        '__RHB__': '%.2f' % (ref['head'] / ref['body']), '__VHB__': '%.2f' % (np.median(hw) / np.median(bw)),
        '__RH__': str(ref['h']), '__VH__': str(int(np.median(hs))),
        '__K__': '%.4f' % m['k'], '__LOOP__': str(m['loop_len']), '__SEC__': '%.2f' % (m['loop_len'] / 24.0),
    }
    for k, v in rep.items():
        html = html.replace(k, v)
    out = os.path.join(HERE, 'walk-video.html')
    open(out, 'w', encoding='utf-8').write(html)
    print(out, os.path.getsize(out) // 1024, 'KB')
    print('GIF', os.path.getsize('walk-video.gif') // 1024, 'KB')
    print('高 %d~%d (%.1f%%)  腳底 %d~%d' % (hs.min(), hs.max(), 100 * (hs.max() - hs.min()) / np.median(hs), bs.min(), bs.max()))
    print('頭/身高 遊戲 %.3f vs 影片 %.3f   頭/身 %.2f vs %.2f'
          % (ref['head'] / ref['h'], np.median(hw) / np.median(hs), ref['head'] / ref['body'], np.median(hw) / np.median(bw)))


if __name__ == '__main__':
    main()
