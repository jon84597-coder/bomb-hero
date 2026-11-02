# -*- coding: utf-8 -*-
"""
第三大關（冰雪原）地面貼圖管線（自包含）
================================================================
雪地跟沙地／草地的問題完全不同：
  1. 雪是「幾乎純白」的材質，AI 母圖一畫就變藍色斑塊或橫條紋（試過兩張都不行）
     → 雪脊的形狀其實不需要 AI：程式分形噪聲（各向同性、無週期）就是雪丘
  2. 雪面不能有「硬的邊」。所有銳化／UnsharpMask 都會讓它變碎冰，一律不用
  3. 明暗幅度必須壓到極低：std 5~6 灰階（草地 15、沙地 10），
     太高會變成藍色迷彩；0 又會像純白填充板
  4. 陰影要偏藍（R 降最多、B 降最少），這是雪在戶外的真實色偏

輸出：tile-ice0..3.png（128x128）
"""
import io
import os
import json

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))

OUT_SIZE = 128
TILE_N = 4
SEED0 = 4200

# 目標色：THEMES[2].floor '#eef5fa' = (238,245,250)
BASE_RGB = np.array([228.0, 238.0, 247.0], np.float32)
TARGET_STD = 3.1          # 灰階標準差：雪地是「低反差 + 大而柔的起伏」；7 以上變藍色迷彩

# 分形噪聲的尺度（像素）。cell 越大 = 雪丘越大。
#   110/55 -> 大而寬的雪堆起伏（59px 格子裡約 25~50px，看得出來但不成圖案）
#   26     -> 小雪堆、風吹的邊緣
#   7      -> 雪面的細微不規則
# 雪地的做法跟沙地不同：先在 **512 的母場**上一次畫出大而柔的雪堆起伏，再四等分
# 切 256 -> 128。四塊同源，色調天生一致。低頻幅度只要 ±4 灰階，格邊的階差就看不見
# （第一版失敗是因為幅度 ±20，變成藍白磁磚）。
FIELD = 512
CELLS = (210.0, 105.0, 48.0)
AMPS = (1.00, 0.58, 0.30)
LOW_W = 0.00              # 低頻歸零：雪地近乎純白，任何格內大結構都會暴露成「一格一塊」
GRAIN_AMP = 1.00          # 極細雪粒（1~2px），只加一點點，否則像雜訊


# ---------------------------------------------------------------- 噪聲
def value_noise(h, w, cell, rng):
    """格點隨機 + 雙三次插值 = 平滑的值噪聲，天然各向同性、無週期。"""
    cw = max(2, int(round(cell)))
    gh = int(np.ceil((h + 3 * cw) / float(cw))) + 1
    gw = int(np.ceil((w + 3 * cw) / float(cw))) + 1
    g = (rng.rand(gh, gw) * 255).astype(np.uint8)
    im = Image.fromarray(g).resize((gw * cw, gh * cw), Image.BICUBIC)
    a = np.asarray(im, np.float32) / 255.0
    # 從插值結果裡取一個「不會碰到格點邊界」的視窗
    oy = cw + rng.randint(0, cw)
    ox = cw + rng.randint(0, cw)
    return a[oy:oy + h, ox:ox + w]


def fbm(h, w, rng):
    out = np.zeros((h, w), np.float32)
    for c, am in zip(CELLS, AMPS):
        n = value_noise(h, w, c, rng)
        n = (n - n.mean()) / max(float(n.std()), 1e-6)
        out += n * am
    out -= out.mean()
    out /= max(float(out.std()), 1e-6)
    return out


# ---------------------------------------------------------------- 主流程
def build_field():
    """512 的雪堆明暗場：大而柔的起伏，一次生成、四塊共用（切完色調天生一致）。"""
    rng = np.random.RandomState(SEED0)
    f = fbm(FIELD, FIELD, rng)
    n = Image.fromarray(((f * 40) + 128).clip(0, 255).astype(np.uint8))
    n = n.filter(ImageFilter.GaussianBlur(1.2))     # 雪面沒有硬邊
    f = (np.asarray(n, np.float32) - 128) / 40.0
    return (f - f.mean()) / max(float(f.std()), 1e-6)


def make_tile(i, field):
    rng = np.random.RandomState(SEED0 + i * 37)
    h = w = OUT_SIZE
    c = FIELD // 2
    sub = field[(i // 2) * c:(i // 2) * c + c, (i % 2) * c:(i % 2) * c + c]
    low = np.asarray(Image.fromarray(((sub * 40) + 128).clip(0, 255).astype(np.uint8))
                     .resize((w, h), Image.BICUBIC), np.float32)
    low = (low - 128) / 40.0
    low = (low - low.mean()) / max(float(low.std()), 1e-6)
    # ★ 關鍵：貼圖是一格一格獨立貼的，低頻在格邊與鄰格對不上 -> 一片「藍白磁磚」。
    #   把起伏乘一個「中心 1、邊緣 0」的窗，每格邊緣都回到底色（純白），接縫就沒了，
    #   格心仍留一團柔和的雪堆明暗。
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - w * .5) / (w * .5)
    ny = (yy - h * .5) / (h * .5)
    r = np.sqrt(nx ** 2 + ny ** 2) / 1.4142
    win = np.clip((1.0 - r) / 0.55, 0.0, 1.0)
    win = win * win * (3.0 - 2.0 * win)          # smoothstep，邊緣平滑收掉
    # 邊緣不要收到 0：全部收成純白的話，每格四邊都是白線 -> 整片地板浮現白色網格。
    # 留 0.45 的底，格邊仍有極小起伏，肉眼就看不到線了。
    low = low * (0.45 + 0.55 * win)

    # 細雪粒（1.5px）：只在高頻留一點質感，縮到 59px 還在
    g = rng.normal(0, 1, (h, w)).astype(np.float32)
    gi = Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8))
    gi = gi.filter(ImageFilter.GaussianBlur(2.0))    # 顆粒約 6px：59px 格子裡看得見，又細到不成圖案
    grain = (np.asarray(gi, np.float32) - 128) / 40.0
    grain = (grain - grain.mean()) / max(float(grain.std()), 1e-6)

    lum = low * TARGET_STD * LOW_W + grain * GRAIN_AMP
    lum = lum - lum.mean()

    # 色偏：明亮處接近純白，陰影處「一點點」偏藍（R 降最多、B 降最少）。
    # 幅度一大就變藍色迷彩，係數不要超過 0.6。
    t = lum / 56.0                        # 約 -0.07 ~ +0.07
    gain = np.stack([1.0 + t * 0.58, 1.0 + t * 0.36, 1.0 + t * 0.16], axis=2)
    rgb = BASE_RGB[None, None, :] * gain
    # 亮度基準對齊（乘完 base 已經接近目標亮度，這裡只做微調）
    lum2 = rgb.mean(axis=2)
    lum2 = (lum2 - lum2.mean()) * (TARGET_STD / max(float(lum2.std()), 1e-6)) + BASE_RGB.mean() + lum.mean()
    rgb *= (lum2 / np.maximum(rgb.mean(axis=2), 1.0))[:, :, None]
    rgb += (BASE_RGB.mean() - lum2.mean())
    # 四張互相只差 1~2 灰階
    rgb += (i % 3 - 1) * 0.8
    return Image.fromarray(np.clip(rgb + .5, 0, 255).astype(np.uint8))


def make_sheet(tiles, path, T=128, pad=10, scale=2):
    cv = Image.new('RGB', (len(tiles) * (T + pad) + pad, T + 2 * pad), (30, 30, 32))
    for i, t in enumerate(tiles):
        cv.paste(t, (pad + i * (T + pad), pad))
    cv.resize((cv.width * scale, cv.height * scale), Image.LANCZOS).save(path)


def make_preview(tiles, path, cols=13, rows=11, T=59, scale=2, flips=True):
    """模擬遊戲裡一格一格貼：4 張 × 四向翻轉 = 16 組合，隨機挑。"""
    rng = np.random.RandomState(23)
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
    tiles, info = [], []
    field = build_field()
    for i in range(TILE_N):
        im = make_tile(i, field)
        p = os.path.join(HERE, 'tile-ice%d.png' % i)
        im.save(p)
        tiles.append(im)
        a = np.asarray(im, np.float32)
        info.append(dict(i=i,
                         mean=[round(float(v), 1) for v in a.reshape(-1, 3).mean(axis=0)],
                         L=round(float(a.mean()), 2),
                         std=round(float(a.mean(axis=2).std()), 2),
                         kb=round(os.path.getsize(p) / 1024.0, 1)))
    make_sheet(tiles, os.path.join(HERE, 'sheet-ice.png'))
    make_preview(tiles, os.path.join(HERE, 'test-ice-2x.png'))
    make_preview(tiles, os.path.join(HERE, 'test-ice-1x.png'), scale=1)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    Ls = [d['L'] for d in info]
    print('\n共 %d 張，亮度差 %.2f 灰階，合計 %.1f KB' % (
        len(info), max(Ls) - min(Ls), sum(d['kb'] for d in info)))
    io.open(os.path.join(HERE, '_stats-ice.json'), 'w', encoding='utf-8').write(
        json.dumps(info, ensure_ascii=False, indent=1))
