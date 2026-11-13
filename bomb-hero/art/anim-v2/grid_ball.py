# -*- coding: utf-8 -*-
"""grid_ball.py — 12 格各出一张带 20px 網格的放大圖，方便人工讀球心座標

輸出 shots/grid/g00.png … g11.png，每張標上「畫布座標」——左上角是 (310,150)，
所以讀到的格內像素 (gx,gy) → 畫布 (310+gx, 150+gy)。
"""
import glob
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'shots', 'grid')
os.makedirs(OUT, exist_ok=True)

X0, Y0, W, H = 310, 150, 300, 560
SC = 2  # 放大 2 倍，網格 40px（= 原圖 20px）

files = sorted(glob.glob(os.path.join(HERE, 'frames_anim', 'hold', '*.png')))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGBA').crop((X0, Y0, X0 + W, Y0 + H))
    bg = Image.new('RGBA', im.size, (235, 240, 246, 255))
    bg.alpha_composite(im)
    g = bg.convert('RGB').resize((W * SC, H * SC), Image.LANCZOS)
    d = ImageDraw.Draw(g)
    for gx in range(0, W, 20):
        c = (255, 0, 0) if (X0 + gx) % 100 == 0 else (140, 160, 200)
        d.line((gx * SC, 0, gx * SC, H * SC), fill=c, width=1)
        if (X0 + gx) % 100 == 0:
            d.text((gx * SC + 2, 2), str(X0 + gx), fill=(200, 0, 0))
    for gy in range(0, H, 20):
        c = (255, 0, 0) if (Y0 + gy) % 100 == 0 else (140, 160, 200)
        d.line((0, gy * SC, W * SC, gy * SC), fill=c, width=1)
        if (Y0 + gy) % 100 == 0:
            d.text((2, gy * SC + 1), str(Y0 + gy), fill=(200, 0, 0))
    d.text((6, H * SC - 14), 'frame %02d   canvas 310..610 x 150..710' % i, fill=(0, 0, 0))
    g.save(os.path.join(OUT, 'g%02d.png' % i))
print('saved 12 張到 shots/grid/')
