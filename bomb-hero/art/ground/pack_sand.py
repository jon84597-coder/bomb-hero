# -*- coding: utf-8 -*-
"""
第二大關（沙漠遺跡）地面貼圖管線（自包含）
================================================================
沿用 pack_grass.py 的做法：母圖 1024 四等分切 512 -> 縮 128，四塊互不重疊。
差別：
  1. 沙地是高頻細粒，縮 4 倍會糊 -> 改用「先縮後銳化 + 局部對比增強」
  2. 沙地不需要殺豎條紋（沒有草簇排列），改成「殺大顆亮斑」
  3. 目標色調對齊 THEMES[1].floor '#e3ca95'（227,202,149）

輸出：tile-sand0..N.png（128x128）
"""
import io
import os
import json

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '_raw', 'sand')

OUT_SIZE = 128
CROP = 512
CROPS = [(0, 0), (512, 0), (0, 512), (512, 512)]
MOTHERS = ['Seamless_tileable_hand_painted_2026-11-02T21-32-10.png']

# 目標色調：沙漠地板主題色 (227,202,149)。遊戲裡牆會壓暗，貼圖取略亮一點點
TARGET_RGB = (229.0, 205.0, 152.0)
TARGET_STD = 6.0         # 沙地是低對比材質：11 以上會變「雜訊」，5 以下像塑膠板

KEEP_LOW = 0.00          # 完全不留大面積起伏（沙地只要細顆粒，任何中低頻都會拼出方格）
CLARITY = 2.2            # 局部對比（UnsharpMask 半徑大一點 -> 沙粒浮出來）
USE = None

# ── 程序化裝飾 ────────────────────────────────────────────────
# v4.45：石子／裂紋「不進貼圖」。每格 1~3 顆 × 143 格 = 幾百顆，鋪起來是規則點陣，
# 縮到 59px 又變黑色髒點（跟「地板放花」同一個坑）。地板貼圖只留極細顆粒，
# 裝飾物要就做成遊戲內的獨立 sprite，由程式稀疏撒。下面兩組預設關閉，留著調參用。
PEBBLE_N = (0, 0)        # 每張放幾顆小石子
PEBBLE_R = (2.6, 5.4)    # 半徑範圍（128px 貼圖上；59px 遊戲格約 1.2~2.5px）
PEBBLE_COL = (196.0, 182.0, 160.0)
CRACK_N = (0, 0)         # 幾條細裂紋


# ---------------------------------------------------------------- 去浮水印
def cut_watermark(im, box=(836, 912, 1024, 1024), feather=14):
    """右下角浮水印：用正上方同寬同高的「垂直鏡像」覆蓋。
    沙地是無方向高頻，鏡像後完全看不出來（草地的成功做法）。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    x0, y0, x1, y1 = box
    h = y1 - y0
    patch = a[y0 - h:y0, x0:x1][::-1]
    w = np.linspace(0.0, 1.0, min(feather, h))[:, None, None]
    a[y0:y0 + w.shape[0], x0:x1] = a[y0:y0 + w.shape[0], x0:x1] * (1 - w) + patch[:w.shape[0]] * w
    a[y0 + w.shape[0]:y1, x0:x1] = patch[w.shape[0]:]
    return Image.fromarray(np.clip(a + .5, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- 模糊
def _kernel(r):
    sigma = max(r / 2.0, 0.8)
    rad = int(3 * sigma) + 1
    x = np.arange(-rad, rad + 1, dtype=np.float32)
    k = np.exp(-(x ** 2) / (2.0 * sigma ** 2))
    return (k / k.sum()).astype(np.float32)


def blur2d(a, r):
    k = _kernel(r)
    pad = len(k) // 2
    ap = np.pad(a, ((0, 0), (pad, pad)), mode='edge')
    h = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 1, ap)
    ap2 = np.pad(h, ((pad, pad), (0, 0)), mode='edge')
    return np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, ap2).astype(np.float32)


# ---------------------------------------------------------------- 低頻壓制
def flatten_low_freq(a, radius=18):
    """沙地母圖常有大片「一邊亮一邊暗」的沙丘光影 -> 拼圖會看到方格。壓掉。"""
    L = a.mean(axis=2)
    low = blur2d(L, radius)
    resid = L - low
    newL = low.mean() + resid + (low - low.mean()) * KEEP_LOW
    ratio = np.where(L > 1.0, newL / np.maximum(L, 1.0), 1.0)
    return a * ratio[:, :, None]


# ---------------------------------------------------------------- 色彩對齊
def match_stats(a, target_rgb=None, target_std=None):
    """用亮度對齊均值/標準差。不可寫成預設參數（會在定義時綁定全域）。"""
    if target_rgb is None:
        target_rgb = TARGET_RGB
    if target_std is None:
        target_std = TARGET_STD
    L = a.mean(axis=2)
    m, s = float(L.mean()), float(L.std())
    k = target_std / max(s, 1e-3)
    L2 = (L - m) * k + sum(target_rgb) / 3.0
    ratio = np.where(L > 1.0, L2 / np.maximum(L, 1.0), 1.0)
    out = a * ratio[:, :, None]
    d = np.array(target_rgb, np.float32) - out.reshape(-1, 3).mean(axis=0)
    return np.clip(out + d[None, None, :], 0, 255)


# ---------------------------------------------------------------- 主流程
def grain(a, seed, amp=2.0, cell=2):
    """疊一層 2px 大小的微噪點：128→59 縮 2.2 倍後還留得住，沙面才不會像塑膠板。
    cell=1 的話縮小就被平均掉了，白做。"""
    H, W = a.shape[:2]
    rng = np.random.RandomState(seed)
    g = rng.normal(0, 1, (H // cell, W // cell)).astype(np.float32)
    g8 = np.clip((g - g.min()) / max(float(g.max() - g.min()), 1e-6) * 255, 0, 255).astype(np.uint8)
    gi = np.asarray(Image.fromarray(g8).resize((W, H), Image.BILINEAR), np.float32)
    gi = (gi - gi.mean()) / max(float(gi.std()), 1e-3) * amp
    return a + gi[:, :, None]


def add_pebbles(a, rng):
    """在 128px 貼圖上畫幾顆手繪感小石子：接觸陰影 → 石體（上亮下暗）→ 深色描邊。
    刻意不放邊界附近，避免跨格被切一半。"""
    H, W = a.shape[:2]
    n = rng.randint(PEBBLE_N[0], PEBBLE_N[1] + 1)
    for _ in range(n):
        r = rng.uniform(*PEBBLE_R)
        pad = r + 3
        cx = rng.uniform(pad, W - pad)
        cy = rng.uniform(pad, H - pad)
        ry = r * rng.uniform(.66, .80)
        yy, xx = np.mgrid[0:H, 0:W]
        dx = (xx - cx) / r
        dy = (yy - cy) / ry
        d = np.sqrt(dx ** 2 + dy ** 2)
        # 接觸陰影（往右下偏移、比較軟）
        ds = np.sqrt(((xx - cx - r * .35) / (r * 1.5)) ** 2 + ((yy - cy - ry * .55) / (ry * 1.6)) ** 2)
        sh = np.clip(1 - ds, 0, 1) ** 1.6 * .38
        # 描邊 + 內部明暗
        body = np.clip((1.0 - d) / .14, 0, 1)          # 1 = 石心，0 = 外
        lit = 1 + .10 * body - .20 * body * np.clip((yy - cy) / ry, -1, 1)
        rim = np.clip((1.08 - d) / .10, 0, 1) * body
        tint = np.array(PEBBLE_COL, np.float32) / max(a.reshape(-1, 3).mean(), 1.0)
        k = (1 - sh * (1 - body))                      # 陰影只作用在石外
        out = a * k[:, :, None]
        m = body > 0
        if m.any():
            base = a * (lit * (1 - .55 * rim))[:, :, None]
            base = base * (1 - body[:, :, None]) + (base * tint[None, None, :]) * body[:, :, None]
            out = np.where(m[:, :, None], base, out)
        a = out
    return a


def add_cracks(a, rng):
    """細裂紋：隨機遊走，1px 寬，只壓暗 20%，不搶戲。"""
    H, W = a.shape[:2]
    n = rng.randint(CRACK_N[0], CRACK_N[1] + 1)
    for _ in range(n):
        x = rng.uniform(14, W - 14)
        y = rng.uniform(14, H - 14)
        ang = rng.uniform(0, 6.283)
        for _ in range(rng.randint(10, 25)):
            ang += rng.uniform(-.55, .55)
            x += np.cos(ang) * 1.3
            y += np.sin(ang) * 1.3
            if not (2 < x < W - 3 and 2 < y < H - 3):
                break
            ix, iy = int(x), int(y)
            a[iy, ix] *= .80
            a[iy + 1, ix] *= .90
    return a


def build():
    srcs = [os.path.join(RAW, f) for f in MOTHERS]
    assert all(os.path.exists(p) for p in srcs), '母圖缺失: %s' % srcs

    tiles, info = [], []
    idx = 0
    for p in srcs:
        mother = cut_watermark(Image.open(p).convert('RGB'))
        if mother.size != (1024, 1024):
            mother = mother.resize((1024, 1024), Image.LANCZOS)
        src = np.asarray(mother).astype(np.float32)
        for (cx, cy) in CROPS:
            block = src[cy:cy + CROP, cx:cx + CROP].copy()
            im = Image.fromarray(np.clip(block + .5, 0, 255).astype(np.uint8))
            i = idx
            idx += 1
            im = im.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            # 沙粒是很細的高頻，縮小後先拉對比再銳化
            im = ImageEnhance.Contrast(im).enhance(1.12)
            im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=int(CLARITY * 100), threshold=1))
            a = np.asarray(im).astype(np.float32)
            a = flatten_low_freq(a, radius=5)
            a = grain(a, 970 + i, amp=2.2)
            a = match_stats(a)
            # 程序化裝飾：每張獨立 seed -> 四張不會是同一個圖案
            rng = np.random.RandomState(700 + i)
            a = add_pebbles(a, rng)
            a = add_cracks(a, rng)
            a += (i % 3 - 1) * 0.7
            out = Image.fromarray(np.clip(a + .5, 0, 255).astype(np.uint8))
            path = os.path.join(HERE, 'tile-sand%d.png' % i)
            out.save(path)
            tiles.append(out)
            b = np.asarray(out).astype(np.float32)
            info.append(dict(i=i, src=os.path.basename(p)[7:22] + ' @%d,%d' % (cx, cy),
                             mean=[round(float(v), 1) for v in b.reshape(-1, 3).mean(axis=0)],
                             L=round(float(b.mean()), 2),
                             std=round(float(b.mean(axis=2).std()), 2),
                             kb=round(os.path.getsize(path) / 1024.0, 1)))
    return tiles, info


# ---------------------------------------------------------------- 預覽
def make_preview(tiles, path, cols=13, rows=11, T=59, scale=2, flips=True):
    rng = np.random.RandomState(11)
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


def make_sheet(tiles, path, T=128, pad=10, scale=2):
    cv = Image.new('RGB', (len(tiles) * (T + pad) + pad, T + 2 * pad), (30, 30, 32))
    for i, t in enumerate(tiles):
        cv.paste(t, (pad + i * (T + pad), pad))
    cv.resize((cv.width * scale, cv.height * scale), Image.LANCZOS).save(path)


if __name__ == '__main__':
    tiles, info = build()
    make_sheet(tiles, os.path.join(HERE, 'sheet-sand.png'))
    make_preview(tiles, os.path.join(HERE, 'test-sand-2x.png'))
    make_preview(tiles, os.path.join(HERE, 'test-sand-1x.png'), scale=1)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    Ls = [d['L'] for d in info]
    print('\n共 %d 張，亮度差 %.2f 灰階，合計 %.1f KB' % (
        len(info), max(Ls) - min(Ls), sum(d['kb'] for d in info)))
    io.open(os.path.join(HERE, '_stats-sand.json'), 'w', encoding='utf-8').write(
        json.dumps(info, ensure_ascii=False, indent=1))
