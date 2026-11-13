# -*- coding: utf-8 -*-
"""make_first_frame.py — 把去背好的全身參考圖貼成「影片首幀」

規則（與兔子首幀完全一致，改任何一項都會讓新角色比例跟兔子不同）：
  1024x1024、純洋紅 #FF00C8、角色佔畫面高 84%、水平置中、腳底基線固定在下方。

用法：python make_first_frame.py <角色key>
"""
import os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CANVAS = 1024
BG = (255, 0, 200)
OCCUPY = 0.84


def main(key):
    src = os.path.join(HERE, 'ref_%s.png' % key)
    im = Image.open(src).convert('RGBA')
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 8)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    body = im.crop((x0, y0, x1 + 1, y1 + 1))
    h = body.height
    k = (CANVAS * OCCUPY) / float(h)
    body = body.resize((max(1, int(round(body.width * k))), int(round(h * k))), Image.LANCZOS)

    cv = Image.new('RGBA', (CANVAS, CANVAS), BG + (255,))
    px = int(round((CANVAS - body.width) / 2.0))
    # 垂直：置中。兔子首幀實測非洋紅 bbox 為 y 83~941（→ 就是 (1024-859)/2），
    #   所以「垂直置中」才是原始規則，改成靠下會讓新角色跟兔子對不上。
    py = int(round((CANVAS - body.height) / 2.0))
    cv.alpha_composite(body, (px, py))
    out = os.path.join(HERE, 'first_%s.png' % key)
    cv.convert('RGB').save(out, quality=96)
    print(out, cv.size, 'char h', body.height, 'foot y', py + body.height)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'bear')
