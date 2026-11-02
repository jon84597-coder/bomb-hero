# -*- coding: utf-8 -*-
"""把 stage3 六隻並排貼在棋盤底上，檢查剪影差異（_contact.png）。"""
import os
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
FILES = ['01-penguin', '02-crystal', '03-bat', '04-snowball', '05-seal', '06-panda']
CELL = 300


def checker(w, h, s=24):
    im = Image.new('RGB', (w, h), (58, 58, 58))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if ((x // s) + (y // s)) % 2:
                px[x, y] = (74, 74, 74)
    return im


sheet = checker(CELL * 3, CELL * 2)
for i, f in enumerate(FILES):
    im = Image.open(os.path.join(D, f + '.png')).convert('RGBA')
    im.thumbnail((CELL - 20, CELL - 20), Image.LANCZOS)
    x = (i % 3) * CELL + (CELL - im.width) // 2
    y = (i // 3) * CELL + (CELL - im.height) // 2
    sheet.paste(im, (x, y), im)
sheet.save(os.path.join(D, '_contact.png'), 'PNG', optimize=True)
print('ok', sheet.size)
