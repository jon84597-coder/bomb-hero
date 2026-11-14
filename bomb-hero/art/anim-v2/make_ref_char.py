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
    # 貓咪：原圖是「一手垂在身側（獨立零件）＋一手叉腰（畫在軀幹裡）」的固定姿勢，
    #   所以沒有右臂零件。**不要鏡射補手**：實測會多出一隻手掌浮在尾巴旁邊（模型會混亂）。
    'cat': dict(asp=0.6908, p=[
        ('legL', 'hero-parts-cat-leg-l.webp', -0.0586, 0.7441, 0.6080, 0.2729),
        ('legR', 'hero-parts-cat-leg-r.webp', 0.4506, 0.7441, 0.6080, 0.2729),
        ('torso', 'hero-parts-cat-torso.webp', -0.0586, 0.3838, 1.1173, 0.4286),
        ('tail', 'hero-parts-cat-tail.webp', 0.6975, 0.2580, 0.3025, 0.5608),
        ('head', 'hero-parts-cat-head.webp', -0.0586, -0.0171, 1.1173, 0.4691),
        ('armL', 'hero-parts-cat-arm-l.webp', 0.0278, 0.5650, 0.1204, 0.1642),
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
    # ---- v6.0：v5.99 從 HERO_PARTS 直接轉出來的（座標一字未改，只把 px／py 拿掉） ----
    'pig': dict(asp=0.7173, p=[
        ('legL', 'hero-parts-pig-leg-l.webp', -0.0597, 0.8051, 0.6060, 0.2120),
        ('legR', 'hero-parts-pig-leg-r.webp', 0.4507, 0.8051, 0.6090, 0.2120),
        ('torso', 'hero-parts-pig-torso.webp', -0.0597, 0.4454, 1.1194, 0.4283),
        ('head', 'hero-parts-pig-head.webp', -0.0597, -0.0171, 1.1194, 0.5310),
        ('armL', 'hero-parts-pig-arm-l.webp', 0.0627, 0.5846, 0.1194, 0.1734),
        ('armR', 'hero-parts-pig-arm-r.webp', 0.8179, 0.5525, 0.1403, 0.2677),
    ]),
    # 熊貓沒有獨立手臂零件（手臂畫在軀幹裡）→ 只拼四個零件，不要硬補手
    'panda': dict(asp=0.6218, p=[
        ('legL', 'hero-parts-panda-leg-l.webp', -0.0584, 0.7842, 0.6117, 0.2329),
        ('legR', 'hero-parts-panda-leg-r.webp', 0.4433, 0.7842, 0.6151, 0.2329),
        ('torso', 'hero-parts-panda-torso.webp', -0.0584, 0.4145, 1.1168, 0.4380),
        ('head', 'hero-parts-panda-head.webp', -0.0584, -0.0171, 1.1168, 0.5000),
    ]),
    'frog': dict(asp=0.7393, p=[
        ('legL', 'hero-parts-frog-leg-l.webp', -0.0578, 0.6838, 0.6040, 0.3333),
        ('legR', 'hero-parts-frog-leg-r.webp', 0.4538, 0.6838, 0.6040, 0.3333),
        ('torso', 'hero-parts-frog-torso.webp', -0.0578, 0.3440, 1.1156, 0.4081),
        ('head', 'hero-parts-frog-head.webp', -0.0578, -0.0171, 1.1156, 0.4295),
        ('armL', 'hero-parts-frog-arm-l.webp', 0.0434, 0.5598, 0.0925, 0.1303),
        ('armR', 'hero-parts-frog-arm-r.webp', 0.8613, 0.5342, 0.1127, 0.1816),
    ]),
    'chick': dict(asp=0.6503, p=[
        ('legL', 'hero-parts-chick-leg-l.webp', -0.0590, 0.7846, 0.6098, 0.2324),
        ('legR', 'hero-parts-chick-leg-r.webp', 0.4459, 0.7846, 0.6131, 0.2324),
        ('torso', 'hero-parts-chick-torso.webp', -0.0590, 0.4648, 1.1180, 0.3881),
        ('head', 'hero-parts-chick-head.webp', -0.0590, -0.0171, 1.1180, 0.5501),
        ('armL', 'hero-parts-chick-arm-l.webp', 0.0787, 0.5800, 0.0492, 0.2004),
        ('armR', 'hero-parts-chick-arm-r.webp', 0.8689, 0.5800, 0.0820, 0.2324),
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
    for row in cfg['p']:
        name, f, dx, dy, dw, dh = row[:6]
        mx = len(row) > 6 and 'mx' in row[6]
        im = dehaze(Image.open(os.path.join(SPR, f)).convert('RGBA'))
        if mx:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
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
