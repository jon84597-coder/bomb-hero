# -*- coding: utf-8 -*-
"""v4.39：恐龍蛋貼圖打包 —— 邊緣泛洪去白 → 依 alpha 裁切 → 正方形置中 → 160px webp → _egg_game.js"""
import io
import os
import base64
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, '_raw')
OUT = os.path.join(ROOT, '_egg_game.js')
SRC_TAG = 'Game_asset_cutout'
ICON_RES = 160
QUALITY = 90


def edge_flood_alpha(im, white_min=234, flat=16):
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    white = (mn >= white_min) & ((mx - mn) <= flat)
    reach = np.zeros_like(white)
    reach[0, :] = white[0, :]
    reach[-1, :] = white[-1, :]
    reach[:, 0] |= white[:, 0]
    reach[:, -1] |= white[:, -1]
    for _ in range(4000):
        grow = reach.copy()
        grow[1:, :] |= reach[:-1, :]
        grow[:-1, :] |= reach[1:, :]
        grow[:, 1:] |= reach[:, :-1]
        grow[:, :-1] |= reach[:, 1:]
        grow &= white
        if np.array_equal(grow, reach):
            break
        reach = grow
    alpha = np.where(reach, 0, 255).astype(np.uint8)
    return alpha, int(reach.sum())


def soften(alpha, r=1):
    f = alpha.astype(np.float32)
    acc = f.copy()
    n = 1
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        acc = acc + np.roll(np.roll(f, dy, axis=0), dx, axis=1)
        n += 1
    return np.clip(acc / n, 0, 255).astype(np.uint8)


def main():
    hits = [f for f in os.listdir(RAW) if SRC_TAG in f and f.lower().endswith('.png')]
    if len(hits) != 1:
        raise SystemExit('找不到唯一的蛋圖：%r' % hits)
    path = os.path.join(RAW, hits[0])
    im = Image.open(path).convert('RGBA')
    im.thumbnail((640, 640), Image.LANCZOS)
    alpha, cleared = edge_flood_alpha(im)
    alpha = soften(alpha)
    im.putalpha(Image.fromarray(alpha, 'L'))
    bb = im.getbbox()
    if not bb:
        raise SystemExit('去背後全空')
    im = im.crop(bb)
    w0, h0 = im.size
    side = max(w0, h0)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - w0) // 2, (side - h0) // 2))
    sq = sq.resize((ICON_RES, ICON_RES), Image.LANCZOS)
    sq.save(os.path.join(ROOT, 'egg.png'))
    buf = io.BytesIO()
    sq.save(buf, 'WEBP', quality=QUALITY, method=6)
    data = buf.getvalue()
    b64 = base64.b64encode(data).decode('ascii')

    js = ('// ---------- 恐龍蛋貼圖（自動生成，勿手改；來源 art/eggs/pack_eggs.py）----------\n'
          '// v4.39：恐龍蛋換成 3D 卡通蛋（奶油色蛋殼＋翡翠綠斑點），藏在軟磚裡，打出來才看得到\n'
          'const EGG_ART = {\n'
          '  egg: { u: "data:image/webp;base64,%s", w: %d, h: %d }\n'
          '};\n' % (b64, w0, h0))
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(js)

    # 預覽：深色底 ＋ 洋紅底（檢查去背邊緣）
    for bg, name in (((16, 20, 30), '_preview_dark.png'), ((255, 0, 255), '_preview_magenta.png')):
        cv = Image.new('RGBA', (300, 300), bg + (255,))
        big = sq.resize((240, 240), Image.LANCZOS)
        cv.alpha_composite(big, (30, 30))
        cv.convert('RGB').save(os.path.join(ROOT, name))
    print('蛋：bbox %dx%d 去白 %d px  成品 %.1f KB' % (w0, h0, cleared, len(data) / 1024.0))


if __name__ == '__main__':
    main()
