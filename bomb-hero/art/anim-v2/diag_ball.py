# -*- coding: utf-8 -*-
"""diag_ball.py — 把 12 格和「擬合出來的圓」畫在一起，肉眼一眼看出哪幾格量錯"""
import glob
import os

import numpy as np
from PIL import Image, ImageDraw

import measure_ball as MB

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'shots')
os.makedirs(OUT, exist_ok=True)

files = sorted(glob.glob(os.path.join(HERE, 'frames_anim', 'hold', '*.png')))
W, H = 280, 620
cols, rows = 4, 3
cv = Image.new('RGB', (W * cols, H * rows), (235, 240, 246))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGBA')
    # 統一裁：以腳底 1360 為基準，往上 400px，水平中心 450
    box = (450 - 140, 150, 450 + 140, 770)
    t = im.crop(box)
    bg = Image.new('RGBA', t.size, (235, 240, 246, 255))
    bg.alpha_composite(t)
    g = bg.convert('RGB')
    d = ImageDraw.Draw(g)
    fit = MB.fit_ball(f)
    if fit:
        cx, cy, r = fit['cx'] - box[0], fit['cy'] - box[1], fit['r']
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 0, 0), width=2)
        d.line((cx - 8, cy, cx + 8, cy), fill=(255, 0, 0), width=2)
        d.line((cx, cy - 8, cx, cy + 8), fill=(255, 0, 0), width=2)
        up = (226.38 - (fit['cy'] - 150.0) * (200.0 / 1069.0)) / 200.0
        d.text((6, 6), '%02d  up=%.3f r=%.0f' % (i, up, r), fill=(200, 0, 0))
    else:
        d.text((6, 6), '%02d  FAIL' % i, fill=(200, 0, 0))
    cv.paste(g, ((i % cols) * W, (i // cols) * H))
cv.save(os.path.join(OUT, 'ball-diag.png'))
print('saved shots/ball-diag.png')
