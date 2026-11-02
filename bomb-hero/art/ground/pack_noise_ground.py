# -*- coding: utf-8 -*-
"""
五個主題的地面貼圖（無結構材質版，程式生成）
================================================================
走過的三條死路（都實測過，不要再回去）：
  1. AI 母圖：石地很容易生成成雜訊／拼貼方格。
  2. 拿 v4.44 的 hard/outer 貼圖重著色：那些是「一格 = 一塊方磚」，
     鋪到地上就是棋盤格（每格一塊，四角漸暗）。
  3. 從 8 張風格圖裁地面：都是 45° 等角，地面被磚塊切碎，怎麼裁都有磚角。

結論：地面只能用「無結構材質」——細顆粒 + 幾乎沒有低頻。低頻一大，
貼圖一格一格獨立貼，格邊必然對不上，就變成一格一格的磁磚（雪地實測）。

配方（跟雪地同一套）：
  * 主體 = 細顆粒（3~9px，多尺度），提供「材質感」
  * 低頻只保留「色相偏移」（不改亮度）→ 有色彩變化但沒有明暗格子
  * 亮度標準差壓到 3~9（深色主題可以高一點，淺色主題必須極低）

輸出：tile-lava/neon/sea/sky/dark 0..3.png（128x128）
"""
import io
import json
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

OUT_SIZE = 96          # 遊戲裡一格 59px，96 已經足夠（128 只是浪費 base64 額度）
TILE_N = 4

# 主題配方：base 底色 / std 亮度標準差 / grains 顆粒尺度與強度 / hue 低頻色偏
RECIPE = {
    'lava': dict(base=(104, 78, 66), std=8.5, grains=[(3.0, 1.00), (7.5, 0.55)],
                 hue=(3.4, 1.6, -0.4), hue_scale=150.0, seed=7100),
    'neon': dict(base=(98, 90, 158), std=7.5, grains=[(3.0, 1.00), (8.0, 0.50)],
                 hue=(0.6, 0.4, 3.2), hue_scale=140.0, seed=7300),
    'sea':  dict(base=(116, 160, 162), std=7.5, grains=[(3.2, 1.00), (7.0, 0.60)],
                 hue=(-1.2, 2.2, 0.2), hue_scale=130.0, seed=7500),
    'sky':  dict(base=(232, 239, 249), std=3.2, grains=[(3.5, 1.00), (9.0, 0.45)],
                 hue=(-0.6, -0.2, 1.4), hue_scale=160.0, seed=7700),
    'dark': dict(base=(88, 66, 80), std=7.0, grains=[(3.0, 1.00), (7.5, 0.55)],
                 hue=(2.6, -0.8, 1.2), hue_scale=140.0, seed=7900),
}


# ---------------------------------------------------------------- 噪聲
def value_noise(h, w, cell, rng):
    cw = max(2, int(round(cell)))
    gh = int(np.ceil((h + 3 * cw) / float(cw))) + 1
    gw = int(np.ceil((w + 3 * cw) / float(cw))) + 1
    g = (rng.rand(gh, gw) * 255).astype(np.uint8)
    im = Image.fromarray(g).resize((gw * cw, gh * cw), Image.BICUBIC)
    a = np.asarray(im, np.float32) / 255.0
    oy = cw + rng.randint(0, cw)
    ox = cw + rng.randint(0, cw)
    return a[oy:oy + h, ox:ox + w]


def unit_noise(h, w, cell, rng, blur=0.0):
    """零均值、單位標準差的平滑噪聲。blur 讓顆粒變成柔和的斑點而不是雜訊。"""
    n = value_noise(h, w, cell, rng)
    if blur > 0:
        im = Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8))
        im = im.filter(ImageFilter.GaussianBlur(blur))
        n = (np.asarray(im, np.float32) - 128) / 40.0
    n = n - n.mean()
    return n / max(float(n.std()), 1e-6)


# ---------------------------------------------------------------- 主流程
def make_tile(theme, i, cfg):
    rng = np.random.RandomState(cfg['seed'] + i * 41)
    h = w = OUT_SIZE
    base = np.array(cfg['base'], np.float32)

    # 1) 顆粒：多尺度疊起來，才不會像電視雜訊
    grain = np.zeros((h, w), np.float32)
    for cell, am in cfg['grains']:
        grain += unit_noise(h, w, cell, rng, blur=max(0.4, cell * 0.22)) * am
    grain = grain - grain.mean()
    grain /= max(float(grain.std()), 1e-6)

    # 2) 低頻：只改色相、不改亮度（改亮度 = 格邊對不上 = 磁磚）
    hue = unit_noise(h, w, cfg['hue_scale'], rng, blur=2.0)

    lum = grain * cfg['std']
    scale = 1.0 + lum / max(float(base.mean()), 1.0)
    rgb = base[None, None, :] * scale[:, :, None]
    rgb += hue[:, :, None] * np.array(cfg['hue'], np.float32)[None, None, :]

    # 3) 四張之間只差 1.5 灰階（跟草地/沙地/雪地一致）
    rgb += (i % 3 - 1) * 0.75
    return Image.fromarray(np.clip(rgb + .5, 0, 255).astype(np.uint8))


def make_preview(tiles, path, cols=13, rows=11, T=59, scale=2, flips=True):
    rng = np.random.RandomState(37)
    variants = []
    for t in tiles:
        if flips:
            variants += [t, t.transpose(Image.FLIP_LEFT_RIGHT),
                         t.transpose(Image.FLIP_TOP_BOTTOM), t.transpose(Image.ROTATE_180)]
        else:
            variants.append(t)
    cv = Image.new('RGB', (cols * T, rows * T))
    for gy in range(rows):
        for gx in range(cols):
            t = variants[rng.randint(len(variants))]
            cv.paste(t.resize((T, T), Image.LANCZOS), (gx * T, gy * T))
    cv.resize((cv.width * scale, cv.height * scale), Image.LANCZOS).save(path)
    return cv


if __name__ == '__main__':
    allinfo = {}
    for theme, cfg in RECIPE.items():
        tiles, info = [], []
        for i in range(TILE_N):
            im = make_tile(theme, i, cfg)
            p = os.path.join(HERE, 'tile-%s%d.png' % (theme, i))
            im.save(p)
            tiles.append(im)
            a = np.asarray(im, np.float32)
            info.append(dict(i=i,
                             mean=[round(float(v), 1) for v in a.reshape(-1, 3).mean(axis=0)],
                             L=round(float(a.mean()), 2),
                             std=round(float(a.mean(axis=2).std()), 2),
                             kb=round(os.path.getsize(p) / 1024.0, 1)))
        make_preview(tiles, os.path.join(HERE, '_test-%s-2x.png' % theme))
        allinfo[theme] = info
        Ls = [d['L'] for d in info]
        print('%-5s L %5.1f~%5.1f  std %.1f  %.1f KB' % (
            theme, min(Ls), max(Ls), info[0]['std'], sum(d['kb'] for d in info)))
    io.open(os.path.join(HERE, '_stats-ground.json'), 'w', encoding='utf-8').write(
        json.dumps(allinfo, ensure_ascii=False, indent=1))
