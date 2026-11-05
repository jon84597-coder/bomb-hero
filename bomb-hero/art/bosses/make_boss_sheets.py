# -*- coding: utf-8 -*-
"""
v5.0b：八位 BOSS 的多幀美術處理（每位四幀：站立／跑A／跑B／出招）。

流程跟 art/pets/make_pets.py 一樣：
  生圖是「2x2 四宮格、同一隻角色、白底」→ 切四格 → 白底泛洪去背 → 只留最大連通塊
  → 四格貼進共用畫布（腳底對齊、水平置中）→ 縮到固定高度 → 存 RGBA webp。

差別：
  · BOSS 體型大、出招會有地面震波／冰柱 → 畫布取「四格最大」，四格都不縮放貼上，
    避免出招那一幀整隻縮水。
  · 白底容忍值放寬到 238（BOSS 圖邊緣常帶一點灰）。

輸出：spr/boss-b{1..8}-{idle,run1,run2,cast}.webp
用法：python art/bosses/make_boss_sheets.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'art', 'bosses', '_raw')
OUT = os.path.join(ROOT, 'spr')
PREV = os.path.join(ROOT, 'art', 'bosses')

SHEETS = [
    ('b1', 'A_character_sprite_sheet__a_2x_2026-11-04T23-54-23.png'),   # 咩霸 · 牧草巨獸
    ('b2', 'Use_the_reference_image_ONLY_a_2026-11-04T23-54-56.png'),   # 妮芙 · 沙蟲女王
    ('b3', 'Use_the_reference_image_ONLY_a_2026-11-04T23-55-20.png'),   # 咕嘰 · 冰霜雪人
    ('b4', 'Use_the_reference_image_ONLY_a_2026-11-04T23-55-38.png'),   # 赫菲 · 熔核巨像
    ('b5', 'Use_the_reference_image_ONLY_a_2026-11-04T23-55-55.png'),   # BPM-9 · 電音 DJ
    ('b6', 'Use_the_reference_image_ONLY_a_2026-11-04T23-56-14.png'),   # 露米 · 深海海妖
    ('b7', 'Use_the_reference_image_ONLY_a_2026-11-04T23-56-32.png'),   # 疾空 · 風暴鷹王
    ('b8', 'Use_the_reference_image_ONLY_a_2026-11-04T23-56-51.png'),   # 黯 · 魔王
]
FRAMES = ['idle', 'run1', 'run2', 'cast']

WHITE_TOL = 238
FEATHER = 0.8
OUT_H = 280


def key_out(im):
    """白底 → 透明（從四邊泛洪吃掉連得到邊界的近白像素，只留最大連通塊）"""
    im = im.convert('RGB')
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    q = deque()

    def is_white(x, y):
        r, g, b = px[x, y]
        return r >= WHITE_TOL and g >= WHITE_TOL and b >= WHITE_TOL

    for x in range(w):
        for y in (0, h - 1):
            if is_white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and is_white(nx, ny):
                bg[ny * w + nx] = 1
                q.append((nx, ny))

    fg = [not v for v in bg]
    seen = bytearray(w * h)
    best, best_n = None, 0
    for sy in range(h):
        for sx in range(w):
            i0 = sy * w + sx
            if not fg[i0] or seen[i0]:
                continue
            comp = []
            q.append((sx, sy))
            seen[i0] = 1
            while q:
                x, y = q.popleft()
                comp.append(y * w + x)
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if fg[j] and not seen[j]:
                            seen[j] = 1
                            q.append((nx, ny))
            if len(comp) > best_n:
                best_n, best = len(comp), comp
    keep = bytearray(w * h)
    for i in (best or []):
        keep[i] = 1

    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if keep[y * w + x]:
                r, g, b = px[x, y]
                op[x, y] = (r, g, b, 255)
    mask = Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in keep))
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    out.putalpha(mask)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            a = mp[x, y]
            if a == 0 or a == 255:
                continue
            r, g, b = px[x, y]
            k = a / 255.0
            op[x, y] = (max(0, min(255, int((r - 255 * (1 - k)) / k))),
                        max(0, min(255, int((g - 255 * (1 - k)) / k))),
                        max(0, min(255, int((b - 255 * (1 - k)) / k))), a)
    return out


def trim(im):
    bb = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop(bb) if bb else im


def main():
    report = []
    for key, sheet in SHEETS:
        src = Image.open(os.path.join(RAW, sheet)).convert('RGB')
        w, h = src.size
        cells = [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2),
                 (0, h // 2, w // 2, h), (w // 2, h // 2, w, h)]
        cut = [trim(key_out(src.crop(c))) for c in cells]
        cw = max(i.width for i in cut)
        ch = max(i.height for i in cut)
        pad = int(ch * 0.03)
        canvas_w, canvas_h = cw + pad * 2, ch + pad * 2
        body_ratio = sum(i.height for i in cut) / len(cut) / canvas_h
        frames = []
        for im in cut:
            canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
            canvas.paste(im, ((canvas_w - im.width) // 2, canvas_h - pad - im.height), im)
            frames.append(canvas)
        scale = OUT_H / canvas_h
        ow, oh = max(1, int(round(canvas_w * scale))), OUT_H
        for name, im in zip(FRAMES, frames):
            big = im.resize((ow, oh), Image.LANCZOS)
            big.save(os.path.join(OUT, 'boss-%s-%s.webp' % (key, name)), 'WEBP', quality=82, method=6)
        report.append((key, ow, oh, round(ow / oh, 4), round(body_ratio, 4)))
        pv = Image.new('RGBA', (ow * 4, oh), (235, 238, 244, 255))
        for i, im in enumerate(frames):
            s = im.resize((ow, oh), Image.LANCZOS)
            pv.paste(s, (ow * i, 0), s)
        pv.save(os.path.join(PREV, '_preview_%s.png' % key))
    for r in report:
        print('%s  %dx%d  asp=%.4f  bodyRatio=%.4f' % r)


if __name__ == '__main__':
    main()
