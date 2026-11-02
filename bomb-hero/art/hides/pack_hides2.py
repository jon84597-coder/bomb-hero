# -*- coding: utf-8 -*-
"""v4.41：藏人場景物件貼圖重打包（淺色版）

v4.40 的五張顏色太重（深綠／深木頭／深陶土），且木箱堆高達 1.83 格會蓋掉上一格。
v4.41 重生成：淺色低飽和、矮胖（寬 > 高），場上寬 1.14 格、高不超過 1.10 格。

流程：邊緣泛洪去白 → 依 alpha 裁切 → 保比例 → 176px webp → _hides_game.js
"""
import io
import os
import base64
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, '_raw2')
OUT = os.path.join(ROOT, '_hides_game.js')
RES = 176          # 長邊像素（場上約 1.14 格）
QUALITY = 86

# 檔名時間戳 → 種類（依生成順序）
MAP = [
    ('bush', '17-49-20'),
    ('hut', '17-49-33'),
    ('rock', '17-51-40'),
    ('jar', '17-51-49'),
    ('crate', '17-50-07'),
]


def edge_flood_alpha(im, white_min=240, flat=12):
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
    """把「貼在物件外圈的淡灰投影」也吃掉。

    判準：亮度高（>=205）、飽和度極低（max-min <= 22）、而且距離不透明區 <= HALO 像素。
    只動外圈，不會傷到石頭的灰色本體（本體亮度多半 < 200 或飽和度更高）。
    """
    a = np.asarray(im.convert('RGB')).astype(np.int16)
    v = a.mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    cand = (v >= 208) & (sat <= 12) & (alpha > 0)
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
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        total += len(data)
        entries.append((kind, base64.b64encode(data).decode('ascii'), nw, nh))
        print('%-6s bbox %4dx%-4d → %3dx%-3d  asp %.2f  去白 %6d 去灰 %5d  %5.1f KB'
              % (kind, w0, h0, nw, nh, nw / float(nh), cleared, killed, len(data) / 1024.0))

    lines = ['// ---------- 藏人場景物件貼圖（自動生成，勿手改；來源 art/hides/pack_hides2.py）----------',
             '// v4.41：五種可躲人的場景物件（灌木叢／破木屋／石堆／陶甕／木箱堆）',
             '//   淺色低飽和、矮胖（寬 > 高）→ 場上寬約 1.14 格、高不超過 1.10 格',
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
