# -*- coding: utf-8 -*-
"""
v4.6：從使用者提供的「爆爆英雄」炸彈 LOGO 插畫，產生 PWA 需要的全套圖示。

來源：使用者貼的插畫（奶油底＋圓角方形炸彈圖）
輸出（bomb-hero/icons/ 與 bomberman-online/public/icons/）：
  icon-192.png           一般用途（圓角、四角透明）
  icon-512.png           一般用途（高解析）
  icon-maskable-192.png  Android 遮罩版（滿版深底＋中央 78% 圖，安全區內）
  icon-maskable-512.png
  apple-touch-icon.png   180x180、不透明（iOS 不支援透明，會填黑）
  favicon-32.png         瀏覽器分頁小圖
  pwa-logo.png           首頁按鈕用的迷你 LOGO（128，透明圓角）

座標說明：來源圖 1920x1177，圓角方形本體實測 x 579~1379、y 214~1056；
高度比寬度多 42px（AI 生成圖不是正方的），所以取寬度為邊長、垂直置中裁切，
避免把炸彈拉扁。
"""
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = r'C:\Users\jon84\.workbuddy\clipboard-images\clipboard-2026-11-01T02-51-20-749Z-83bda2dd.jpg'

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # bomb-hero
PRJ = os.path.dirname(ROOT)
OUT_DIRS = [os.path.join(ROOT, 'icons'),
            os.path.join(PRJ, 'bomberman-online', 'public', 'icons')]

# 圓角方形實測邊界
X0, X1 = 579, 1380          # 801 px
Y0, Y1 = 214, 1057          # 843 px
SIDE = X1 - X0              # 以寬度為邊長
CY = (Y0 + Y1) // 2
TOP = CY - SIDE // 2        # 垂直置中

RADIUS_RATIO = 0.216        # 圓角半徑約佔邊長 21.6%（目測這張插畫的 squircle）


def rounded_mask(size, radius, ss=4):
    """抗鋸齒圓角遮罩：先畫 4 倍大再縮小"""
    big = size * ss
    m = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(radius * ss), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def bg_color(img):
    """取內縮邊框一圈的「暗部」中位數當滿版底色。

    這張插畫的四角是深色漸層，但橘色光圈會貼到邊緣，
    所以不能直接平均（會混進橘光變成土黃色）→ 只收亮度 < 95 的樣本取中位數。
    """
    a = np.asarray(img.convert('RGB')).astype(int)
    n = a.shape[0]
    t = max(3, int(n * 0.03))
    pts = []
    pts.append(a[t:t * 2, :].reshape(-1, 3))          # 上緣
    pts.append(a[n - t * 2:n - t, :].reshape(-1, 3))  # 下緣
    pts.append(a[:, t:t * 2].reshape(-1, 3))          # 左緣
    pts.append(a[:, n - t * 2:n - t].reshape(-1, 3))  # 右緣
    allp = np.concatenate(pts, axis=0)
    lum = allp.mean(axis=1)
    dark = allp[lum < 95]
    if len(dark) < 20:
        dark = allp
    v = np.median(dark, axis=0)
    return tuple(int(round(c)) for c in v)


def main():
    src = Image.open(SRC).convert('RGB')
    base = src.crop((X0, TOP, X0 + SIDE, TOP + SIDE))     # 801x801 正方形
    print('來源裁切：%dx%d' % base.size)

    far = base.resize((512, 512), Image.LANCZOS)          # 高品質基準
    bg = bg_color(far)
    print('滿版底色：rgb%s  #%02x%02x%02x' % (str(bg), bg[0], bg[1], bg[2]))

    for d in OUT_DIRS:
        os.makedirs(d, exist_ok=True)

    def save(img, name, **kw):
        for d in OUT_DIRS:
            img.save(os.path.join(d, name), 'PNG', optimize=True, **kw)
        p = os.path.join(OUT_DIRS[0], name)
        print('  + %-24s %4d KB  %s' % (name, os.path.getsize(p) // 1024, img.size))

    # ---- 一般用途（圓角、四角透明）----
    for s in (192, 512):
        im = far.resize((s, s), Image.LANCZOS).convert('RGBA')
        im.putalpha(rounded_mask(s, s * RADIUS_RATIO))
        save(im, 'icon-%d.png' % s)

    # ---- Android 遮罩版（滿版底 ＋ 中央 78% 圖，落在安全區內）----
    for s in (192, 512):
        canvas = Image.new('RGB', (s, s), bg)
        inner = int(s * 0.78)
        tile = far.resize((inner, inner), Image.LANCZOS).convert('RGBA')
        tile.putalpha(rounded_mask(inner, inner * RADIUS_RATIO))
        off = (s - inner) // 2
        canvas.paste(tile, (off, off), tile)
        save(canvas, 'icon-maskable-%d.png' % s)

    # ---- iOS（180、不透明，圓角交給 iOS 自己切）----
    s = 180
    canvas = Image.new('RGB', (s, s), bg)
    inner = int(s * 0.92)
    tile = far.resize((inner, inner), Image.LANCZOS).convert('RGBA')
    tile.putalpha(rounded_mask(inner, inner * RADIUS_RATIO))
    off = (s - inner) // 2
    canvas.paste(tile, (off, off), tile)
    save(canvas, 'apple-touch-icon.png')

    # ---- favicon ----
    save(far.resize((32, 32), Image.LANCZOS).convert('RGBA')
         .resize((32, 32), Image.LANCZOS), 'favicon-32.png')

    # ---- 首頁按鈕迷你 LOGO（128，透明圓角）----
    s = 128
    tile = far.resize((s, s), Image.LANCZOS).convert('RGBA')
    tile.putalpha(rounded_mask(s, s * RADIUS_RATIO))
    save(tile, 'pwa-logo.png')


if __name__ == '__main__':
    main()
