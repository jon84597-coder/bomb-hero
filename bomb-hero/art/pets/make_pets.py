# -*- coding: utf-8 -*-
"""
v5.0：三位隨從（刀客／投彈／格檔）多幀美術處理。

生圖是一次給「2x2 四宮格同一隻角色」（站立／跑 A／跑 B／攻擊），
這裡負責：切四格 → 白底去背 → 取最大連通塊 → 四格貼進共用畫布（腳底對齊、水平置中）
→ 縮到固定高度 → 存成 RGBA webp。

規則（踩過的坑）：
  · 白底去背用「亮度門檻 + 從邊界泛洪」，不要填洞（眼睛、深色裝備會被挖空）。
  · 只留最大連通塊 → 生圖角落的浮水印自動消失。
  · 四格共用同一塊畫布，遊戲端才能用固定 W/H 直接畫（腳底線一致、不會抽動）。

用法：python art/pets/make_pets.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, 'art', 'pets', '_raw')
OUT = os.path.join(ROOT, 'spr')
PREV = os.path.join(ROOT, 'art', 'pets')

SHEETS = [
    ('blade',  'Character_sprite_sheet_for_a_s_2026-11-04T23-00-01.png'),   # 狼 · 武士刀
    ('bomber', 'Character_sprite_sheet_for_the_2026-11-04T23-00-25.png'),   # 猴 · 炸彈
    ('guard',  'Character_sprite_sheet_for_the_2026-11-04T23-00-43.png'),   # 犀牛 · 盾
]
FRAMES = ['idle', 'run1', 'run2', 'atk']     # 左上 / 右上 / 左下 / 右下

WHITE_TOL = 232        # 三通道都 >= 這個值 → 算白底
FEATHER = 0.8
OUT_H = 320            # 共用畫布高（遊戲端再縮）


def key_out(im):
    """白底 → 透明。從四邊泛洪吃掉「連得到邊界的近白像素」，只留最大連通塊。"""
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
    # 只保留最大連通塊（浮水印、雜點會是獨立小塊）
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
    # 角色本體是全不透明的：alpha 只由「遮罩」決定，邊緣用羽化柔化。
    # （早期版本用 1-min(r,g,b)/255 當 alpha，結果整隻變半透明鬼影）
    for y in range(h):
        for x in range(w):
            if keep[y * w + x]:
                r, g, b = px[x, y]
                op[x, y] = (r, g, b, 255)
    mask = Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in keep))
    mask = mask.filter(ImageFilter.GaussianBlur(FEATHER))
    out.putalpha(mask)
    # 羽化區（0 < a < 255）把混進來的白色還原掉：c' = (c - 255*(1-a)) / a
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
    for kind, sheet in SHEETS:
        src = Image.open(os.path.join(RAW, sheet)).convert('RGB')
        w, h = src.size
        cells = [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2),
                 (0, h // 2, w // 2, h), (w // 2, h // 2, w, h)]
        cut = []
        for c in cells:
            cut.append(trim(key_out(src.crop(c))))
        # 共用畫布：寬 = 最寬那格，高 = 四格最大高度按比例留邊
        cw = max(i.width for i in cut)
        ch = max(i.height for i in cut)
        pad = int(ch * 0.04)
        canvas_w, canvas_h = cw + pad * 2, ch + pad * 2
        body_ratio = sum(i.height for i in cut) / len(cut) / canvas_h   # 角色高 / 畫布高
        frames = []
        for im in cut:
            canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
            canvas.paste(im, ((canvas_w - im.width) // 2, canvas_h - pad - im.height), im)
            frames.append(canvas)
        scale = OUT_H / canvas_h
        ow, oh = max(1, int(round(canvas_w * scale))), OUT_H
        paths = []
        for name, im in zip(FRAMES, frames):
            big = im.resize((ow, oh), Image.LANCZOS)
            p = os.path.join(OUT, 'pet-%s-%s.webp' % (kind, name))
            big.save(p, 'WEBP', quality=92, method=6)
            paths.append(p)
        report.append((kind, ow, oh, round(ow / oh, 4), round(body_ratio, 4)))
        # 檢查用預覽：四格並排
        pv = Image.new('RGBA', (ow * 4, oh), (235, 238, 244, 255))
        for i, im in enumerate(frames):
            pv.paste(im.resize((ow, oh), Image.LANCZOS), (ow * i, 0), im.resize((ow, oh), Image.LANCZOS))
        pv.save(os.path.join(PREV, '_preview_%s.png' % kind))
    for r in report:
        print('%s  %dx%d  asp=%.4f  bodyRatio=%.4f' % r)


if __name__ == '__main__':
    main()
