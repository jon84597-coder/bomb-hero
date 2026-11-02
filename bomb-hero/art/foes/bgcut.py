# -*- coding: utf-8 -*-
"""
把生圖結果的背景摳掉 -> 真正的 RGBA PNG。

背景有兩種情況（同一批圖可能混著）：
  1) 純白底         (253~255)
  2) 烘焙進圖裡的棋盤格（深灰兩階，約 58 / 74）

做法：從四邊泛洪（BFS），顏色接近「邊框取樣出來的背景色叢集」且與目前像素連通才吃掉，
      所以怪物內部的同色區域（眼睛、深色甲殼）不會被挖洞。
"""
import sys, os, glob
from collections import deque
from PIL import Image, ImageFilter

TOL = float(os.environ.get('BGCUT_TOL', '30'))   # 顏色距離容差
FEATHER = 1                                      # 邊緣羽化半徑


def bg_palette(px, w, h):
    """從邊框取樣，聚出最多 3 個背景色。"""
    samples = []
    step = max(1, w // 96)
    for x in range(0, w, step):
        samples.append(px[x, 0]); samples.append(px[x, h - 1])
    for y in range(0, h, step):
        samples.append(px[0, y]); samples.append(px[w - 1, y])

    clusters = []
    for c in samples:
        for cl in clusters:
            if sum(abs(c[i] - cl[0][i]) for i in range(3)) / 3 < 18:
                cl[1].append(c); break
        else:
            clusters.append([c, [c]])
    clusters.sort(key=lambda cl: -len(cl[1]))
    pal = []
    for c, group in clusters[:3]:
        n = len(group)
        pal.append(tuple(sum(g[i] for g in group) // n for i in range(3)))
    return pal


def dist(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def cut(src, dst, tol=TOL):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    px = im.load()
    pal = bg_palette(px, w, h)

    def is_bg(c):
        return min(dist(c, p) for p in pal) <= tol

    mask = bytearray(w * h)          # 1 = 背景
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(px[x, y]) and not mask[y * w + x]:
                mask[y * w + x] = 1; q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(px[x, y]) and not mask[y * w + x]:
                mask[y * w + x] = 1; q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not mask[i] and is_bg(px[nx, ny]):
                    mask[i] = 1; q.append((nx, ny))

    a = Image.frombytes('L', (w, h), bytes(255 if not m else 0 for m in mask))
    if FEATHER:
        a = a.filter(ImageFilter.GaussianBlur(FEATHER))

    # 右下角「AI生成 WORKBUDDY」浮水印：低飽和灰字，只在該角落失效 alpha
    #   注意：split() 拿到的是副本，改它不會影響原圖 -> 一定要改在 putalpha 之前
    ap = a.load()
    for y in range(int(h * 0.84), h):
        for x in range(int(w * 0.60), w):
            r, g, b = px[x, y]
            if max(r, g, b) - min(r, g, b) <= 34 and ap[x, y] > 0:
                ap[x, y] = 0

    out = im.convert('RGBA')
    out.putalpha(a)

    bbox = out.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if bbox:
        pad = 12
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad),
                min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        out = out.crop(bbox)

    out.save(dst, 'PNG', optimize=True)
    cover = 100.0 * sum(1 for m in mask if m) / (w * h)
    return out.size, cover, pal


if __name__ == '__main__':
    args = sys.argv[1:]
    pairs = []
    for i in range(0, len(args), 2):
        pairs.append((args[i], args[i + 1]))
    for s, d in pairs:
        size, cover, pal = cut(s, d)
        print('%-46s -> %-22s %s  bg %.0f%%  pal %s' % (os.path.basename(s), os.path.basename(d), size, cover, pal))
