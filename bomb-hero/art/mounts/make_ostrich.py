# -*- coding: utf-8 -*-
"""
v4.87：鴕鳥神獸（紫蛋／坐騎）素材處理。
生圖回來是「黑底 RGB」，跟既有 spr/*.webp 一樣要轉成 RGBA webp。

做法：
  1) 從畫面四邊泛洪，只吃掉「連得到邊界的近黑像素」——角色內部的黑眼珠、
     深色鞍布不會被挖洞（它們被角色包住，泛洪走不進去）。
  2) 只保留最大的一塊連通區（生圖右下角的 AI 浮水印是獨立小塊 → 一起被丟掉）。
  3) 邊緣羽化 0.6px、去黑前乘（unpremultiply against black），避免縮圖出現黑邊。
  4) 依內容 bbox 裁切，等比縮到指定高度，存成 webp（alpha）。

用法：
  python art/mounts/make_ostrich.py
"""
import os
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.join(ROOT, 'art')
OUT = os.path.join(ROOT, 'spr')

BLACK_TOL = 56          # 每個通道都 <= 這個值 → 算背景黑
FEATHER = 0.8


def cut_black(src, dst):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()
    # 1) 背景遮罩：near-black 且連得到邊界
    bg = bytearray(w * h)
    q = deque()

    def is_black(x, y):
        r, g, b = px[x, y]
        return r <= BLACK_TOL and g <= BLACK_TOL and b <= BLACK_TOL

    for x in range(w):
        for y in (0, h - 1):
            if is_black(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_black(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                k = ny * w + nx
                if not bg[k] and is_black(nx, ny):
                    bg[k] = 1
                    q.append((nx, ny))

    # 2) 只留最大的前景連通塊（丟浮水印／碎屑）
    seen = bytearray(w * h)
    best, best_size = [], 0
    for y in range(h):
        for x in range(w):
            k = y * w + x
            if bg[k] or seen[k]:
                continue
            comp = []
            q = deque([(x, y)])
            seen[k] = 1
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        kk = ny * w + nx
                        if not bg[kk] and not seen[kk]:
                            seen[kk] = 1
                            q.append((nx, ny))
            if len(comp) > best_size:
                best_size, best = len(comp), comp

    # 3) 組 alpha
    a = Image.new('L', (w, h), 0)
    ap = a.load()
    for (x, y) in best:
        ap[x, y] = 255
    a = a.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(FEATHER))

    # 4) 去黑前乘：抗鋸齒像素是「角色色 × a + 黑 × (1-a)」→ 除以 a 還原純色
    out = im.convert('RGBA')
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, al = op[x, y]
            if 0 < al < 255:
                k = 255.0 / al
                op[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)), al)
    out.putalpha(a)
    out = out.crop(a.getbbox())
    out.save(dst)
    print('cut ->', dst, out.size)
    return out


def fit(im, height, dst, square=False):
    w, h = im.size
    nh = height
    nw = max(1, int(round(w * nh / float(h))))
    im = im.resize((nw, nh), Image.LANCZOS)
    if square:
        side = max(nw, nh)
        cv = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        cv.paste(im, ((side - nw) // 2, (side - nh) // 2), im)
        im = cv
    im.save(dst, 'WEBP', quality=92, method=6)
    print('webp ->', dst, im.size, 'asp=%.4f' % (im.size[0] / float(im.size[1])))
    return im


if __name__ == '__main__':
    ostrich = cut_black(os.path.join(ART, 'mounts', '_raw', 'Repaint_this_creature_as_a_com_2026-11-04T16-26-22.png'),
                        os.path.join(ART, 'mounts', 'ostrich-cut.png'))
    fit(ostrich, 256, os.path.join(OUT, 'mount-art-ostrich.webp'))

    egg = cut_black(os.path.join(ART, 'eggs', '_raw', 'Keep_this_exact_egg__same_size_2026-11-04T16-26-41.png'),
                    os.path.join(ART, 'eggs', 'egg-purple-cut.png'))
    fit(egg, 160, os.path.join(OUT, 'egg-art-purple.webp'), square=True)
