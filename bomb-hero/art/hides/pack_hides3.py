# -*- coding: utf-8 -*-
"""v4.42：藏人場景物件貼圖重打包（提高飽和度／對比／自體陰影版）

v4.41 的版本「顏色太淡、對比與陰影太弱」，在草地上一眼看不出是什麼。
v4.42 重生成：色彩回到中高飽和（春綠／蜂蜜木／暖磚／暖石灰），
自體明暗（亮面→中間調→陰影）拉開，但仍不接近黑。

流程：邊緣泛洪去白 → 淡灰光暈清除 → 依 alpha 裁切 → 保比例 → 176px webp → _hides_game.js
"""
import io
import json
import os
import base64
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, '_raw3')
OUT = os.path.join(ROOT, '_hides_game.js')
RES = 176          # 長邊像素（場上約 1.14 格）
QUALITY = 86

# 檔名時間戳 → 種類（依生成順序）
MAP = [
    ('bush', '18-17-12'),
    ('hut', '18-17-20'),
    ('rock', '18-17-34'),
    ('jar', '18-17-57'),
    ('crate', '18-19-16'),
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


def kill_halo(im, alpha):
    """把「貼在物件外圈的淡灰投影」也吃掉（只動外圈，不傷本體）。"""
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    v = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    cand = (v >= 206) & (sat <= 14) & (alpha > 0)
    solid = alpha >= 250
    near = np.zeros_like(solid)
    for r in (1, 2, 3, 4, 5):
        sh = solid.copy()
        for dy in range(-r, r + 1):
            for dx in (-r, r):
                sh = sh | np.roll(np.roll(solid, dy, axis=0), dx, axis=1)
        for dx in range(-r, r + 1):
            for dy in (-r, r):
                sh = sh | np.roll(np.roll(solid, dy, axis=0), dx, axis=1)
        near |= sh
    kill = cand & near
    out = alpha.copy()
    out[kill] = 0
    return out, int(kill.sum())


def soften(alpha, r=1):
    f = alpha.astype(np.float32)
    acc = f.copy()
    n = 1
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        acc = acc + np.roll(np.roll(f, dy, axis=0), dx, axis=1)
        n += 1
    return np.clip(acc / n, 0, 255).astype(np.uint8)


def stats(im):
    """平均亮度／平均飽和度／暗部 p5（越亮越大 → 對比越弱）。"""
    a = np.asarray(im.convert('RGBA')).astype(np.float32)
    m = a[:, :, 3] > 200
    rgb = a[:, :, :3][m]
    if not len(rgb):
        return (0, 0, 0)
    lum = rgb[:, 0] * .299 + rgb[:, 1] * .587 + rgb[:, 2] * .114
    sat = rgb.max(axis=1) - rgb.min(axis=1)
    return (lum.mean(), sat.mean(), np.percentile(lum, 5))


def main():
    files = os.listdir(RAW)
    entries = []
    total = 0
    stat_map = {}
    for kind, tag in MAP:
        hit = [f for f in files if tag in f and f.lower().endswith('.png')]
        if len(hit) != 1:
            raise SystemExit('找不到 %s 的圖（tag=%s）：%r' % (kind, tag, hit))
        im = Image.open(os.path.join(RAW, hit[0])).convert('RGBA')
        im.thumbnail((720, 720), Image.LANCZOS)
        alpha, cleared = edge_flood_alpha(im)
        alpha, killed = kill_halo(im, alpha)
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
        lum, sat, p5 = stats(im)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        total += len(data)
        entries.append((kind, base64.b64encode(data).decode('ascii'), nw, nh))
        stat_map[kind] = {'lum': round(float(lum), 1), 'sat': round(float(sat), 1),
                          'p5': round(float(p5), 1), 'asp': round(nw / float(nh), 4)}
        print('%-6s bbox %4dx%-4d → %3dx%-3d  asp %.2f  L %5.1f  sat %4.1f  p5 %5.1f  '
              '去白 %6d 去灰 %5d  %5.1f KB'
              % (kind, w0, h0, nw, nh, nw / float(nh), lum, sat, p5, cleared, killed, len(data) / 1024.0))

    io.open(os.path.join(ROOT, '_stats.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(stat_map, ensure_ascii=False, indent=1, sort_keys=True) + '\n')

    lines = ['// ---------- 藏人場景物件貼圖（自動生成，勿手改；來源 art/hides/pack_hides3.py）----------',
             '// v4.42：五種可躲人的場景物件（灌木叢／破木屋／石堆／陶甕／木箱堆）',
             '//   中高飽和＋拉開明暗（自體陰影），矮胖（寬 > 高）→ 場上寬約 1.14 格、高不超過 1.10 格',
             'const HIDE_ART = {']
    for kind, b64, nw, nh in entries:
        lines.append('  %s: { u: "data:image/webp;base64,%s", w: %d, h: %d, asp: %.4f },'
                     % (kind, b64, nw, nh, nw / float(nh)))
    lines.append('};')
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')

    # 目檢預覽：深底 ／ 洋紅底（去背乾淨度）
    for bg, name in (((18, 22, 34), '_preview_dark.png'), ((255, 0, 255), '_preview_magenta.png')):
        cw, chh = 240 * len(entries), 260
        cv = Image.new('RGBA', (cw, chh), bg + (255,))
        for i, e in enumerate(entries):
            im = Image.open(os.path.join(ROOT, 'hide-%s.png' % e[0])).convert('RGBA')
            im.thumbnail((220, 230), Image.LANCZOS)
            cv.alpha_composite(im, (i * 240 + (240 - im.width) // 2, (260 - im.height) // 2))
        cv.convert('RGB').save(os.path.join(ROOT, name))

    # 草地底模擬圖：物件擺在現行第 1 關地板色上，看「會不會太暗／太搶」
    try:
        GRASS = (169, 207, 136)
        GRASS2 = (156, 198, 123)
        cv = Image.new('RGB', (240 * len(entries), 260), GRASS)
        px = cv.load()
        for yy in range(260):
            for xx in range(0, 240 * len(entries)):
                if ((xx // 60) + (yy // 60)) % 2 == 0:
                    px[xx, yy] = GRASS2
        for i, e in enumerate(entries):
            im = Image.open(os.path.join(ROOT, 'hide-%s.png' % e[0])).convert('RGBA')
            im.thumbnail((200, 200), Image.LANCZOS)
            cv.paste(im, (i * 240 + (240 - im.width) // 2, (260 - im.height) // 2), im)
        cv.save(os.path.join(ROOT, '_preview_grass.png'))
    except Exception as ex:                     # 預覽失敗不影響打包
        print('草地預覽略過：', ex)
    print('五張合計 %.1f KB（base64 後約 %.0f KB 字元）' % (total / 1024.0, total * 4 / 3 / 1024.0))


if __name__ == '__main__':
    main()
