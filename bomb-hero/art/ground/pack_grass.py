# -*- coding: utf-8 -*-
"""
第一大關草地貼圖管線（自包含）
================================================================
輸入：_raw/ 裡每張 1024 的草地母圖 -> 每張整圖縮成 1 格 128x128
輸出：tile-grass0..N.png，全部亮度/色調對齊到同一目標

為什麼是「整圖縮成一格」而不是「一張切三塊」：
  1024 切 416 再縮到 128，等於把 2.5 格的內容壓進 1 格，草葉和花在 59px 下
  只剩 1~2px，遊戲裡看起來就是一塊純色絨面。改成整圖＝一格，比例才對。

三個關鍵處理：
  1. 亮度/色調統一  -> 每張平均亮度差 < 2 灰階，拼起來沒有方格
  2. 低頻壓制       -> 抹掉大面積明暗漸變，只留草葉細節
  3. 四向翻轉預覽   -> 一張圖 4 個朝向，大幅降低重複感
"""
import io
import os
import glob
import json

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '_raw')

OUT_SIZE = 128
CROP = 512               # 每塊從母圖裁 512 再縮到 128（縮 4 倍：草葉約 10px，59px 下仍看得見）
CROPS = [(0, 0), (512, 0), (0, 512), (512, 512)]   # 母圖四等分，四塊互不重疊
MOTHERS = ['Seamless_tileable_cartoon_gras_2026-11-02T21-17-56.png']

# 目標色調：概念圖草地 mean RGB ~(146,150,82)、L ~126
# 遊戲裡牆的陰影會壓暗，所以取略亮
TARGET_RGB = (150.0, 168.0, 76.0)
TARGET_STD = 13.0

KEEP_LOW = 0.28          # 保留多少低頻起伏（0＝完全平坦）
VSTRIPE_KILL = 0.55      # 抹掉多少「整列偏亮／偏暗」
USE = None               # 指定母圖檔名（None＝用 _raw 全部）


# ---------------------------------------------------------------- 去浮水印
def cut_watermark(im, box=(836, 912, 1024, 1024), feather=14):
    """浮水印在右下角。不用「挑低飽和像素」那種半吊子做法——
    草地紋理是無方向的高頻，直接把該區用「上方同一段鏡像」蓋掉，肉眼完全看不出來，
    而且不會像調色那樣留下殘影（v4.45 前一版就是殘影導致切到右下那塊還看得到字）。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    H, W = a.shape[:2]
    x0, y0, x1, y1 = box
    h = y1 - y0
    patch = a[y0 - h:y0, x0:x1][::-1]          # 正上方同寬同高，垂直鏡像
    # 上緣做羽化，避免一條硬線
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
    """可分離高斯模糊（PIL 的 F 模式不支援 GaussianBlur，環境也沒有 scipy/cv2）。"""
    k = _kernel(r)
    pad = len(k) // 2
    ap = np.pad(a, ((0, 0), (pad, pad)), mode='edge')
    h = np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 1, ap)
    ap2 = np.pad(h, ((pad, pad), (0, 0)), mode='edge')
    return np.apply_along_axis(lambda m: np.convolve(m, k, mode='valid'), 0, ap2).astype(np.float32)


# ---------------------------------------------------------------- 去豎條紋
def kill_vstripes(a):
    """AI 草地常見「整列偏亮／偏暗」：算列均值 -> 減掉平滑剖面 -> 只補回一部分。"""
    L = a.mean(axis=2)
    prof = L.mean(axis=0)
    k = np.ones(31) / 31.0
    smooth = np.convolve(np.pad(prof, (15, 15), mode='edge'), k, mode='valid')
    return a - ((prof - smooth) * VSTRIPE_KILL)[None, :, None]


# ---------------------------------------------------------------- 去小白點
def kill_specks(a, thr=16.0, r=1):
    """原圖的白色小花、小石子縮小後會變成 1~3px 的白點，看起來像髒點。
    用形態學開運算（先腐蝕後膨脹）估出「沒有亮點」的底，亮出差額就壓回去。"""
    L = a.mean(axis=2)
    # PIL 的 F 模式不支援 Min/MaxFilter，先轉回 uint8
    L8 = Image.fromarray(np.clip(L, 0, 255).astype(np.uint8))
    k = 2 * r + 1                     # MinFilter/MaxFilter 的 size 必須是奇數
    opened = np.asarray(L8.filter(ImageFilter.MinFilter(k)).filter(
        ImageFilter.MaxFilter(k))).astype(np.float32)
    diff = L - opened                     # 只有亮點會是正的大值
    m = diff > thr
    if m.sum() == 0:
        return a
    target = np.where(m, opened, L)
    ratio = np.where(L > 1.0, target / np.maximum(L, 1.0), 1.0)
    return a * ratio[:, :, None]


# ---------------------------------------------------------------- 低頻壓制
def flatten_low_freq(a, radius=26):
    """壓掉大面積明暗漸變，只留草葉細節 -> 拼圖看不出方格。"""
    L = a.mean(axis=2)
    low = blur2d(L, radius)
    resid = L - low
    newL = low.mean() + resid + (low - low.mean()) * KEEP_LOW
    ratio = np.where(L > 1.0, newL / np.maximum(L, 1.0), 1.0)
    return a * ratio[:, :, None]


# ---------------------------------------------------------------- 色彩對齊
def match_stats(a, target_rgb=None, target_std=None):
    """用「亮度」對齊均值與標準差（RGB 各通道分別對齊會讓亮度 std 掉到 7）。
    不能寫成預設參數——預設值在函式定義時綁定，改全域無效。"""
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
def build():
    srcs = [os.path.join(RAW, f) for f in MOTHERS]
    assert all(os.path.exists(p) for p in srcs), '母圖缺失'

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
            im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=55, threshold=2))
            a = np.asarray(im).astype(np.float32)
            a = kill_vstripes(a)
            a = kill_specks(a)
            a = flatten_low_freq(a, radius=18)
            a = match_stats(a)
            a += (i % 3 - 1) * 0.7      # 留 ±0.7 的微差異，不要每張一模一樣
            out = Image.fromarray(np.clip(a + .5, 0, 255).astype(np.uint8))
            path = os.path.join(HERE, 'tile-grass%d.png' % i)
            out.save(path)
            tiles.append(out)
            b = np.asarray(out).astype(np.float32)
            info.append(dict(i=i, src=os.path.basename(p)[7:20] + ' @%d,%d' % (cx, cy),
                             mean=[round(float(v), 1) for v in b.reshape(-1, 3).mean(axis=0)],
                             L=round(float(b.mean()), 2),
                             std=round(float(b.mean(axis=2).std()), 2),
                             kb=round(os.path.getsize(path) / 1024.0, 1)))
    return tiles, info


# ---------------------------------------------------------------- 預覽
def make_preview(tiles, path, cols=13, rows=11, T=59, scale=2, flips=True):
    """用真實遊戲尺寸拼地圖；每格隨機選貼圖＋隨機翻轉（模擬遊戲裡的做法）。"""
    rng = np.random.RandomState(11)
    variants = []
    for t in tiles:
        if flips:
            variants += [t, t.transpose(Image.FLIP_LEFT_RIGHT),
                         t.transpose(Image.FLIP_TOP_BOTTOM),
                         t.transpose(Image.ROTATE_180)]
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
    make_sheet(tiles, os.path.join(HERE, 'sheet-tiles.png'))
    make_preview(tiles, os.path.join(HERE, 'test-tiles-2x.png'))
    make_preview(tiles, os.path.join(HERE, 'test-tiles-noflip-2x.png'), flips=False)
    print(json.dumps(info, ensure_ascii=False, indent=1))
    Ls = [d['L'] for d in info]
    print('\n共 %d 張，亮度差 %.2f 灰階，合計 %.1f KB' % (
        len(info), max(Ls) - min(Ls), sum(d['kb'] for d in info)))
    io.open(os.path.join(HERE, '_stats.json'), 'w', encoding='utf-8').write(
        json.dumps(info, ensure_ascii=False, indent=1))
