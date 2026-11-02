# -*- coding: utf-8 -*-
"""v4.40：藏人場景物件貼圖打包 —— 邊緣泛洪去白 → 依 alpha 裁切 → 保比例 → 160px webp → _hides_game.js

五種：bush 灌木叢 / hut 破木屋 / rock 石堆 / jar 陶甕 / crate 木箱堆
輸出 HIDE_ART = { kind: { u, w, h, asp } }，asp = 寬/高，遊戲端用它算高度。
"""
import io
import os
import base64
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, '_raw')
OUT = os.path.join(ROOT, '_hides_game.js')
RES = 176          # 長邊像素（場上約 1.26 格，夠清楚又不會撐爆單檔）
QUALITY = 88

# 檔名時間戳 → 種類（依生成順序：1 灌木 2 破屋 3 石堆 4 陶甕 5 木箱）
MAP = [
    ('bush', '17-22-08'),
    ('hut', '17-22-28'),
    ('rock', '17-22-44'),
    ('jar', '17-22-58'),
    ('crate', '17-23-18'),
]


def edge_flood_alpha(im, white_min=238, flat=14):
    """只清「連到畫面邊緣」的近白像素 → 物件內部的高光不會被挖掉。"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    white = (mn >= white_min) & ((mx - mn) <= flat)
    reach = np.zeros_like(white)
    reach[0, :] = white[0, :]
    reach[-1, :] = white[-1, :]
    reach[:, 0] |= white[:, 0]
    reach[:, -1] |= white[:, -1]
    for _ in range(6000):
        grow = reach.copy()
        grow[1:, :] |= reach[:-1, :]
        grow[:-1, :] |= reach[1:, :]
        grow[:, 1:] |= reach[:, :-1]
        grow[:, :-1] |= reach[:, 1:]
        grow &= white
        if np.array_equal(grow, reach):
            break
        reach = grow
    return np.where(reach, 0, 255).astype(np.uint8), int(reach.sum())


def soften(alpha, r=1):
    f = alpha.astype(np.float32)
    acc = f.copy()
    n = 1
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        acc = acc + np.roll(np.roll(f, dy, axis=0), dx, axis=1)
        n += 1
    return np.clip(acc / n, 0, 255).astype(np.uint8)


def main():
    files = os.listdir(RAW)
    entries = []
    total = 0
    for kind, tag in MAP:
        hit = [f for f in files if tag in f and f.lower().endswith('.png')]
        if len(hit) != 1:
            raise SystemExit('找不到 %s 的圖（tag=%s）：%r' % (kind, tag, hit))
        im = Image.open(os.path.join(RAW, hit[0])).convert('RGBA')
        im.thumbnail((720, 720), Image.LANCZOS)
        alpha, cleared = edge_flood_alpha(im)
        alpha = soften(alpha)
        im.putalpha(Image.fromarray(alpha, 'L'))
        bb = im.getbbox()
        if not bb:
            raise SystemExit('%s 去背後全空' % kind)
        im = im.crop(bb)
        w0, h0 = im.size
        # 等比縮到長邊 RES（不要拉成正方形 —— 物件本身的高矮要保留）
        k = RES / float(max(w0, h0))
        nw, nh = max(1, int(round(w0 * k))), max(1, int(round(h0 * k)))
        im = im.resize((nw, nh), Image.LANCZOS)
        im.save(os.path.join(ROOT, 'hide-%s.png' % kind))
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        total += len(data)
        entries.append((kind, base64.b64encode(data).decode('ascii'), nw, nh))
        print('%-6s bbox %4dx%-4d → %3dx%-3d  去白 %6d px  %5.1f KB'
              % (kind, w0, h0, nw, nh, cleared, len(data) / 1024.0))

    lines = ['// ---------- 藏人場景物件貼圖（自動生成，勿手改；來源 art/hides/pack_hides.py）----------',
             '// v4.40：五種可躲人的場景物件（灌木叢／破木屋／石堆／陶甕／木箱堆），比一格再大一點',
             'const HIDE_ART = {']
    for kind, b64, nw, nh in entries:
        lines.append('  %s: { u: "data:image/webp;base64,%s", w: %d, h: %d, asp: %.4f },'
                     % (kind, b64, nw, nh, nw / float(nh)))
    lines.append('};')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')

    # 目檢預覽：深底 ／ 洋紅底
    for bg, name in (((18, 22, 34), '_preview_dark.png'), ((255, 0, 255), '_preview_magenta.png')):
        cw, chh = 260 * len(entries), 300
        cv = Image.new('RGBA', (cw, chh), bg + (255,))
        for i, e in enumerate(entries):
            im = Image.open(os.path.join(ROOT, 'hide-%s.png' % e[0])).convert('RGBA')
            im.thumbnail((230, 250), Image.LANCZOS)
            cv.alpha_composite(im, (i * 260 + (260 - im.width) // 2, (300 - im.height) // 2))
        cv.convert('RGB').save(os.path.join(ROOT, name))
    print('五張合計 %.1f KB（base64 後約 %.0f KB 字元）' % (total / 1024.0, total * 4 / 3 / 1024.0))


if __name__ == '__main__':
    main()
