# -*- coding: utf-8 -*-
"""把「腳下那圈貼地陰影」清掉。

生圖有時會在角色腳下畫一塊淺灰／近白的橢圓陰影，它被兩條腿包住 → 從邊界泛洪
到不了，一般的去背流程會留下來。

作法：只看圖的下半段（預設最底 38%），把「中性色＋夠亮」的像素清成透明，
再沿著透明區往內剝 2 圈（清掉邊緣的灰邊）。角色的腳通常是暖色或有陰影的深色，
不會被這條規則誤傷。

用法：python fix_feet.py stage5/02-scavenger.png [更多檔案...]
"""
import sys, os
from PIL import Image, ImageFilter, ImageChops

Y0 = float(os.environ.get('FEET_Y0', '0.62'))     # 從高度的幾成開始看
LUM = float(os.environ.get('FEET_LUM', '196'))    # 亮度門檻（以上＝可能是陰影／白底）
SAT = float(os.environ.get('FEET_SAT', '20'))     # 彩度上限（超過就是角色身上的顏色）
PEEL = 2


def fix(path, dst=None):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()
    y0 = int(h * Y0)
    n = 0
    for y in range(y0, h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if max(r, g, b) - min(r, g, b) <= SAT and (r + g + b) / 3.0 >= LUM:
                px[x, y] = (255, 255, 255, 0)
                n += 1
    # 剝掉剩下的灰邊：貼著透明 + 夠亮 → 再清 2 圈（只在下半段）
    if PEEL:
        T = im.split()[3].point(lambda v: 255 - v)
        wm = bytearray(w * h)
        for y in range(y0, h):
            for x in range(w):
                r, g, b, a = px[x, y]
                wm[y * w + x] = 255 if (a and max(r, g, b) - min(r, g, b) <= 26 and (r + g + b) / 3.0 >= 180) else 0
        W = Image.frombytes('L', (w, h), bytes(wm))
        for _ in range(PEEL):
            near = T.filter(ImageFilter.MaxFilter(3))
            add = ImageChops.multiply(W, near.point(lambda v: 255 if v == 255 else 0))
            if add.getbbox() is None:
                break
            T = ImageChops.lighter(T, add)
        im.putalpha(T.point(lambda v: 255 - v))
    im.save(dst or path, 'PNG', optimize=True)
    print('%-30s 清掉 %d px' % (os.path.basename(path), n))


if __name__ == '__main__':
    for p in sys.argv[1:]:
        fix(p)
