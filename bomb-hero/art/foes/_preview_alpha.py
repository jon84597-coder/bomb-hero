# -*- coding: utf-8 -*-
"""把 RGBA 貼圖鋪在洋紅底上放大，檢查去背乾淨度（白邊/白底會立刻現形）。"""
import sys, os
from PIL import Image
def show(p, out, k=2.0):
    im = Image.open(p).convert('RGBA')
    w, h = int(im.width*k), int(im.height*k)
    im = im.resize((w, h), Image.LANCZOS)
    bg = Image.new('RGBA', (w, h), (255, 0, 255, 255))
    bg.alpha_composite(im)
    bg.convert('RGB').save(out)
    print(out, bg.size)
for p in sys.argv[1:]:
    root, ext = os.path.splitext(p)
    show(p, root + '_key.png')
