# -*- coding: utf-8 -*-
"""从使用者提供的选角图裁出 8 只动物（去背 → 透明 PNG/WEBP）"""
import io, os, sys
import numpy as np
from PIL import Image, ImageFilter

SRC = r'C:\Users\jon84\.workbuddy\clipboard-images\clipboard-2026-10-30T15-15-44-005Z-9d5c7cb8.jpg'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chars')
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert('RGB')
W, H = im.size
print('src', W, H)
a = np.asarray(im).astype(np.int16)

# 1) 白色描邊遮罩（貼紙外框）：RGB 都很亮
white = (a[:, :, 0] > 226) & (a[:, :, 1] > 226) & (a[:, :, 2] > 226)
# 稍微膨脹白邊，堵住 JPEG 造成的細縫
wm = Image.fromarray((white * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
white_d = np.asarray(wm) > 127

# 2) 从四边泛洪：在「非白」像素上连通 → 判为背景
from collections import deque
bg = np.zeros((H, W), bool)
dq = deque()
for x in range(W):
    for y in (0, H - 1):
        if not white_d[y, x] and not bg[y, x]:
            bg[y, x] = True; dq.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if not white_d[y, x] and not bg[y, x]:
            bg[y, x] = True; dq.append((x, y))
while dq:
    x, y = dq.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not bg[ny, nx] and not white_d[ny, nx]:
            bg[ny, nx] = True; dq.append((nx, ny))

fg = ~bg
# 去掉小岛（背景里的白色气泡、碎叶）
lab = np.zeros((H, W), np.int32)
cur = 0
comps = []
for y0 in range(H):
    for x0 in range(W):
        if fg[y0, x0] and lab[y0, x0] == 0:
            cur += 1
            q = deque([(x0, y0)]); lab[y0, x0] = cur
            cnt = 0; minx = maxx = x0; miny = maxy = y0
            while q:
                x, y = q.popleft(); cnt += 1
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < W and 0 <= ny < H and fg[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = cur; q.append((nx, ny))
            comps.append((cur, cnt, minx, miny, maxx, maxy))
comps.sort(key=lambda c: -c[1])
print('components', len(comps), comps[:12])

# 保留前 8 大（依 x 排序 → 就是 Rabbit..Chick 的顺序）
big = [c for c in comps if c[1] > (W * H) * 0.004]
big = sorted(big, key=lambda c: c[2])
print('kept', len(big))
for c in big:
    print('  comp', c, 'w', c[4] - c[2], 'h', c[5] - c[3])

names = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']
if len(big) < 8:
    print('!! 只找到', len(big), '隻，改用固定欄位切法')
alpha = np.zeros((H, W), np.uint8)
for i, c in enumerate(big[:8]):
    alpha[lab == c[0]] = 255

# 3) 边缘羽化
am = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6))
rgba = im.convert('RGBA')
rgba.putalpha(am)
arr = np.asarray(rgba).copy()
arr[alpha == 0, 3] = 0
rgba = Image.fromarray(arr)

# 4) 依 8 个连通块切出、统一高度
targets = big[:8]
ys = [t[5] for t in targets]
base_h = int(np.median(ys))  # placeholder
crops = []
for i, c in enumerate(targets):
    name = names[i] if i < len(names) else 'c%d' % i
    pad = 4
    x0 = max(0, c[2] - pad); y0 = max(0, c[3] - pad)
    x1 = min(W, c[4] + 1 + pad); y1 = min(H, c[5] + 1 + pad)
    sp = rgba.crop((x0, y0, x1, y1))
    crops.append((name, sp, (x0, y0, x1, y1)))
    print(name, sp.size)

# 统一缩放：以最大高度为准，等比缩放到 H=260
maxh = max(sp.size[1] for _, sp, _ in crops)
SCALE = 260.0 / maxh
for name, sp, box in crops:
    w = max(1, int(round(sp.size[0] * SCALE)))
    h = max(1, int(round(sp.size[1] * SCALE)))
    sp = sp.resize((w, h), Image.LANCZOS)
    sp.save(os.path.join(OUT, name + '.png'))
    sp.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=88, method=6)
    print('saved', name, sp.size, os.path.getsize(os.path.join(OUT, name + '.webp')), 'bytes webp')

# 预览：把 8 只排在洋红底上，方便目检去背品质
pw = sum(c[1].size[0] for c in crops) + 20 * 9
ph = 300
sheet = Image.new('RGB', (pw, ph), (255, 0, 255))
x = 20
for name, sp, box in crops:
    h = sp.size[1]; w = sp.size[0]
    sheet.paste(sp, (x, ph - h - 20), sp)
    x += w + 20
sheet.save(os.path.join(OUT, '_preview.png'))
print('preview', sheet.size)
