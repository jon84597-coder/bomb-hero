# -*- coding: utf-8 -*-
"""v4.38：道具圖示打包 —— 去白底 → 裁切 → 縮到 128 → webp base64 → _items_game.js"""
import io
import os
import json
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, '_raw')
OUT = os.path.join(ROOT, '_items_game.js')
ICON_RES = 128
QUALITY = 88

# 檔名片段 → 道具 key（生成順序不可靠，用片段配對最穩）
MAP = [
    ('single_glowi', 'fire'),
    ('chunky_round', 'bomb'),
    ('T16-30-11', 'speed'),
    ('chunky_brown', 'kick'),
    ('chunky_white', 'glove'),
    ('chunky_red_b', 'punch'),
    ('chunky_dark_', 'remote'),
    ('chunky_viole', 'pierce'),
    ('chunky_gloss', 'heart'),
    ('three_small_ch', 'line'),
    ('T16-32-23', 'skull'),
]


def pick_file(tag):
    hits = [f for f in os.listdir(RAW) if tag in f and f.lower().endswith('.png')]
    if len(hits) != 1:
        raise SystemExit('找不到唯一的圖: %s → %r' % (tag, hits))
    return os.path.join(RAW, hits[0])


def edge_flood_alpha(im, white_min=238, flat=14):
    """只清「連到圖片邊緣」的白色 —— 手套／骷髏本身的白色不會被挖掉"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    mn = a.min(axis=2)
    mx = a.max(axis=2)
    white = (mn >= white_min) & ((mx - mn) <= flat)
    # 從四邊往內膨脹（純 numpy，置換後收斂）
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
    """對 alpha 做一次 3x3 均值，邊緣 1px 羽化（不會有硬鋸齒）"""
    f = alpha.astype(np.float32)
    acc = f.copy()
    n = 1
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        sh = np.roll(np.roll(f, dy, axis=0), dx, axis=1)
        acc = acc + sh
        n += 1
    return np.clip(acc / n, 0, 255).astype(np.uint8)


def main():
    rows = []
    total = 0
    report = []
    for tag, key in MAP:
        path = pick_file(tag)
        im = Image.open(path).convert('RGBA')
        # 先縮到 512 再處理（去背是 O(像素)，縮小 4 倍快很多，成品只要 128）
        im.thumbnail((512, 512), Image.LANCZOS)
        alpha, cleared = edge_flood_alpha(im)
        alpha = soften(alpha)
        im.putalpha(Image.fromarray(alpha, 'L'))
        bb = im.getbbox()          # 依 alpha 裁掉空白
        if not bb:
            raise SystemExit('去背後全空: ' + key)
        im = im.crop(bb)
        w0, h0 = im.size
        side = max(w0, h0)
        # 置中放進正方形（避免長寬比被拉歪）
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(im, ((side - w0) // 2, (side - h0) // 2))
        sq = sq.resize((ICON_RES, ICON_RES), Image.LANCZOS)
        name = os.path.join(ROOT, 'item-%s.png' % key)
        sq.save(name)
        buf = io.BytesIO()
        sq.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        total += len(data)
        b64 = __import__('base64').b64encode(data).decode('ascii')
        rows.append('  %s: { u: "data:image/webp;base64,%s" },' % (key, b64))
        report.append('%-8s %-44s 去白 %6d px  bbox %dx%d  %5.1f KB'
                      % (key, os.path.basename(path)[:42], cleared, w0, h0, len(data) / 1024.0))

    js = ('// ---------- 道具圖示（自動生成，勿手改；來源 art/items/pack_items.py）----------\n'
          '// v4.38：11 個道具全部換成 3D 卡通圖示（原本是 emoji），場上以「圓角外框 + 光暈」呈現\n'
          'const ITEM_ART = {\n' + '\n'.join(rows) + '\n};\n')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
    print('\n'.join(report))
    print('---- 合計 base64 %.0f KB ▸ %s' % (total / 1024.0, os.path.basename(OUT)))


if __name__ == '__main__':
    main()
