# -*- coding: utf-8 -*-
"""逐只去背：从裁切框四边做「邻域色差」泛洪，白贴纸描边会成为天然屏障"""
import os, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'animals-src.jpg')
OUT = os.path.join(ROOT, 'art', 'chars')
os.makedirs(OUT, exist_ok=True)
NAMES = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']

im = Image.open(SRC).convert('RGB')
W, H = im.size
print('src', W, H)

# 8 等分栏位（动物在图中均匀排开），y 取动物主体范围
X0, X1 = 0, W
TOP, BOT = int(H * 0.29), int(H * 0.80)
cellw = (X1 - X0) / 8.0
TOL = 16

def cut(x0, y0, x1, y1, tol=TOL):
    sub = im.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(sub).astype(np.int16)
    h, w = a.shape[:2]
    bg = np.zeros((h, w), bool)
    dq = deque()
    def push(y, x):
        if not bg[y, x]:
            bg[y, x] = True; dq.append((y, x))
    for x in range(w):
        push(0, x); push(h - 1, x)
    for y in range(h):
        push(y, 0); push(y, w - 1)
    while dq:
        y, x = dq.popleft()
        c = a[y, x]
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx]:
                d = a[ny, nx] - c
                if abs(d[0]) <= tol and abs(d[1]) <= tol and abs(d[2]) <= tol:
                    bg[ny, nx] = True; dq.append((ny, nx))
    fg = ~bg
    # 只留最大连通块
    lab = np.zeros((h, w), np.int32); cur = 0; best = (0, -1)
    for yy in range(h):
        for xx in range(w):
            if fg[yy, xx] and lab[yy, xx] == 0:
                cur += 1; q = deque([(yy, xx)]); lab[yy, xx] = cur; cnt = 0
                while q:
                    y, x = q.popleft(); cnt += 1
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and fg[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = cur; q.append((ny, nx))
                if cnt > best[0]:
                    best = (cnt, cur)
    if best[1] > 0:
        fg = lab == best[1]
    # 填洞（动物内部被误判成背景的区块）
    bg2 = ~fg
    lab2 = np.zeros((h, w), np.int32); c2 = 0; holes = []
    for yy in range(h):
        for xx in range(w):
            if bg2[yy, xx] and lab2[yy, xx] == 0:
                c2 += 1; q = deque([(yy, xx)]); lab2[yy, xx] = c2; cnt = 0; edge = False
                while q:
                    y, x = q.popleft(); cnt += 1
                    if y == 0 or x == 0 or y == h - 1 or x == w - 1: edge = True
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < h and 0 <= nx < w and bg2[ny, nx] and lab2[ny, nx] == 0:
                            lab2[ny, nx] = c2; q.append((ny, nx))
                if not edge:
                    holes.append((c2, cnt))
    for cid, cnt in holes:
        if cnt < (h * w) * 0.06:
            fg = fg | (lab2 == cid)
    return sub, fg

results = []
for i, name in enumerate(NAMES):
    x0 = int(X0 + cellw * i) - 6
    x1 = int(X0 + cellw * (i + 1)) + 6
    x0 = max(0, x0); x1 = min(W, x1)
    sub, fg = cut(x0, TOP, x1, BOT)
    ys, xs = np.where(fg)
    if len(ys) == 0:
        print(name, 'EMPTY'); continue
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    print(name, 'bbox', bx0, by0, bx1, by1, 'size', bx1 - bx0, by1 - by0, 'fill%.1f' % (fg.mean() * 100))
    rgb = np.asarray(sub).copy()
    alpha = (fg * 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
    alpha[~fg] = np.where(alpha[~fg] < 60, 0, alpha[~fg])
    out = np.dstack([rgb, alpha])
    img = Image.fromarray(out, 'RGBA')
    pad = 3
    img = img.crop((max(0, bx0 - pad), max(0, by0 - pad), min(img.size[0], bx1 + 1 + pad), min(img.size[1], by1 + 1 + pad)))
    results.append((name, img))

# 统一高度 300
maxh = max(r[1].size[1] for r in results)
SC = 300.0 / maxh
for name, img in results:
    w = max(1, int(round(img.size[0] * SC))); h = max(1, int(round(img.size[1] * SC)))
    s = img.resize((w, h), Image.LANCZOS)
    s.save(os.path.join(OUT, name + '.png'))
    s.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)
    print('saved', name, s.size, os.path.getsize(os.path.join(OUT, name + '.webp')))

pw = sum(r[1].size[0] for r in results) + 16 * (len(results) + 1)
sheet = Image.new('RGB', (pw, 340), (255, 0, 255))
x = 16
for name, img in results:
    h = int(round(img.size[1] * SC)); w = int(round(img.size[0] * SC))
    s = img.resize((w, h), Image.LANCZOS)
    sheet.paste(s, (x, 320 - h), s)
    x += w + 16
sheet.save(os.path.join(ROOT, 'art', '_chars-preview.png'))
print('preview', sheet.size)
