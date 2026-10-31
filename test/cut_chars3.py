# -*- coding: utf-8 -*-
"""用 GrabCut 逐只去背 → art/chars/*.png|webp"""
import os
import numpy as np
import cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'animals-src.jpg')
OUT = os.path.join(ROOT, 'art', 'chars')
os.makedirs(OUT, exist_ok=True)
NAMES = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']

bgr = cv2.imread(SRC)
H, W = bgr.shape[:2]
print('src', W, H)
TOP, BOT = int(H * 0.275), int(H * 0.815)
cell = W / 8.0

def grab(img, iters=8):
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    mx, my = int(w * 0.07), int(h * 0.05)
    rect = (mx, my, w - 2 * mx, h - 2 * my)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, rect, bgd, fgd, iters, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # 形态学收边 + 只留最大块
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        idx = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = (lab == idx).astype(np.uint8) * 255
    # 填洞
    ff = m.copy()
    hh, ww = m.shape
    mask2 = np.zeros((hh + 2, ww + 2), np.uint8)
    cv2.floodFill(ff, mask2, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    return m

res = []
HALF = 140
for i, name in enumerate(NAMES):
    cx = int(round(W * 0.0974 + W * 0.1177 * i))     # 每只动物在图中的中心
    x0 = max(0, cx - HALF); x1 = min(W, cx + HALF)
    img = bgr[TOP:BOT, x0:x1].copy()
    m = grab(img)
    ys, xs = np.where(m > 0)
    if len(ys) == 0:
        print(name, 'EMPTY'); continue
    print(name, 'cx', cx, 'area%.2f%%' % (100.0 * (m > 0).mean()))
    a = cv2.GaussianBlur(m, (3, 3), 0.7).astype(np.float32) / 255.0
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
    pil = Image.fromarray(rgba, 'RGBA')
    pad = 3
    bx0, bx1 = max(0, xs.min() - pad), min(pil.size[0], xs.max() + 1 + pad)
    by0, by1 = max(0, ys.min() - pad), min(pil.size[1], ys.max() + 1 + pad)
    res.append((name, pil.crop((bx0, by0, bx1, by1))))

maxh = max(r[1].size[1] for r in res)
SC = 320.0 / maxh
sheet_items = []
for name, img in res:
    w = max(1, int(round(img.size[0] * SC))); h = max(1, int(round(img.size[1] * SC)))
    s = img.resize((w, h), Image.LANCZOS)
    sheet_items.append((name, s))
    s.save(os.path.join(OUT, name + '.png'))
    s.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=92, method=6)
    print('saved', name, s.size)

pw = sum(s.size[0] for _, s in sheet_items) + 18 * (len(sheet_items) + 1)
sheet = Image.new('RGB', (pw, 380), (255, 0, 255))
x = 18
for name, s in sheet_items:
    sheet.paste(s, (x, 350 - s.size[1]), s)
    x += s.size[0] + 18
sheet.save(os.path.join(ROOT, 'art', '_chars-preview.png'))
print('preview', sheet.size)
