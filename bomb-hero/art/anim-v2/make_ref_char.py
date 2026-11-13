# -*- coding: utf-8 -*-
"""make_ref_char.py — 用遊戲零件拼「乾淨」全身參考圖（0 點）

與 make_ref.py（兔兔專用）同一套規則，只是改成多角色查表：
  座標取自 js/main.js 的 HERO_PARTS.<key>，畫布 900x1560、腳底基線 1360、寬高比 asp。
  層序＝裝配序 legL,legR,torso,[tail],head,armL,armR（與 drawRigChar 一致）。
  零件 alpha 有 39 的矩形薄霧（dehaze 壓成 0），最後做 3px 閉運算磨平零件接縫。

用法：python make_ref_char.py dog
輸出：ref_<key>.png（透明）、ref_<key>_magenta.png（鋪洋紅，直接餵模型）
"""
import os
import sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, '..', '..', 'spr')

# 角色表：asp ＝ 內容 bbox 寬/高；p ＝ 零件（x,y,w,h 都是相對 bbox 的比例）
CHARS = {
    'rabbit': dict(asp=0.6333, p=[
        ('legL', 'hero-parts-rabbit-leg-l.webp', -0.0572, 0.7740, 0.6094, 0.2431),
        ('legR', 'hero-parts-rabbit-leg-r.webp', 0.4444, 0.7740, 0.6128, 0.2431),
        ('torso', 'hero-parts-rabbit-torso.webp', -0.0572, 0.5139, 1.1145, 0.3284),
        ('head', 'hero-parts-rabbit-head.webp', -0.0572, -0.0171, 1.1145, 0.5991),
    ]),
    'bear': dict(asp=0.6695, p=[
        ('legL', 'hero-parts-bear-leg-l.webp', -0.0573, 0.7655, 0.6083, 0.2516),
        ('legR', 'hero-parts-bear-leg-r.webp', 0.4490, 0.7655, 0.6083, 0.2516),
        ('torso', 'hero-parts-bear-torso.webp', -0.0573, 0.3945, 1.1146, 0.4392),
        ('head', 'hero-parts-bear-head.webp', -0.0573, -0.0171, 1.1146, 0.4797),
        ('armL', 'hero-parts-bear-arm-l.webp', 0.0064, 0.4606, 0.2102, 0.2964),
        ('armR', 'hero-parts-bear-arm-r.webp', 0.7803, 0.4606, 0.1624, 0.2964),
    ]),
    'dog': dict(asp=0.6716, p=[
        ('legL', 'hero-parts-dog-leg-l.webp', -0.0571, 0.7846, 0.6063, 0.2324),
        ('legR', 'hero-parts-dog-leg-r.webp', 0.4476, 0.7846, 0.6095, 0.2324),
        ('torso', 'hero-parts-dog-torso.webp', -0.0571, 0.4158, 1.1143, 0.4371),
        ('tail', 'hero-parts-dog-tail.webp', 0.6571, 0.2793, 0.3429, 0.4200),
        ('head', 'hero-parts-dog-head.webp', -0.0571, -0.0171, 1.1143, 0.5011),
        ('armL', 'hero-parts-dog-arm-l.webp', 0.0000, 0.5778, 0.1841, 0.2601),
        ('armR', 'hero-parts-dog-arm-r.webp', 0.8127, 0.5778, 0.1810, 0.2601),
    ]),
}


def dehaze(im):
    """alpha 39 的矩形薄霧 → 0（邊緣平滑保留）。"""
    a = np.array(im).astype(np.float32)
    al = a[:, :, 3]
    al = np.clip((al - 72.0) / 128.0, 0.0, 1.0) * 255.0
    a[:, :, 3] = al
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main(key):
    cfg = CHARS[key]
    H = 1000.0
    W = H * cfg['asp']
    CANVAS = (900, 1560)
    OX = (CANVAS[0] - W) / 2.0
    OY = CANVAS[1] - 40 - H          # 腳底基線 1360
    cv = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    for name, f, dx, dy, dw, dh in cfg['p']:
        im = dehaze(Image.open(os.path.join(SPR, f)).convert('RGBA'))
        tw, th = int(round(dw * W)), int(round(dh * H))
        im = im.resize((tw, th), Image.LANCZOS)
        cv.alpha_composite(im, (int(round(OX + dx * W)), int(round(OY + dy * H))))
    # 輪廓微整：3px 閉運算磨平零件邊緣（不改形狀、不動內部）
    a0 = np.array(cv)
    al = Image.fromarray(a0[:, :, 3])
    al = al.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5))
    a0[:, :, 3] = np.array(al)
    cv = Image.fromarray(a0, 'RGBA')
    out = os.path.join(HERE, 'ref_%s.png' % key)
    cv.save(out)
    a = np.array(cv)[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]
    xs = np.where((a > 8).any(axis=0))[0]
    print(out, cv.size, 'h', ys.max() - ys.min() + 1, 'w', xs.max() - xs.min() + 1,
          'aspect', round((xs.max() - xs.min() + 1) / float(ys.max() - ys.min() + 1), 4))
    pad = 60
    bg = Image.new('RGBA', (xs.max() - xs.min() + pad * 2, ys.max() - ys.min() + pad * 2), (255, 0, 200, 255))
    bg.alpha_composite(cv.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), (pad, pad))
    o2 = os.path.join(HERE, 'ref_%s_magenta.png' % key)
    bg.convert('RGB').save(o2)
    print(o2, bg.size)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'dog')
