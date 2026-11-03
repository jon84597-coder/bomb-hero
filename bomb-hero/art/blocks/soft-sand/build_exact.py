# -*- coding: utf-8 -*-
"""把 AI 生成的砂岩軟磚材質，鎖進 465456.jpg 草圖的精確幾何：
   上方一整塊方形面 → 一條水平深縫 → 下方向外撐開的梯形基座（撐到畫布邊）。
   材質用雙線性反向取樣重貼，輪廓因此是硬邊多邊形，不再是有機波浪邊。"""
import numpy as np
from PIL import Image

SRC = 'soft-sand-v2.png'
OUT = 'soft-sand-exact.png'
N = 1024
BG = (27, 27, 29)

# --- 參考圖 465456.jpg 量到的比例（128px 畫布）---
T = 0.031          # 上方與左右內縮 3.1%
SEAM = 0.695       # 水平分割線在 69.5% 高度
TL = (int(N * T), int(N * T))
TR = (int(N * (1 - T)), int(N * T))
SL = (int(N * T), int(N * SEAM))
SR = (int(N * (1 - T)), int(N * SEAM))
BL = (0, N - 1)
BR = (N - 1, N - 1)


def load_src():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    bg = np.median(a[5:80, 5:80].reshape(-1, 3), axis=0)
    m = np.abs(a - bg).max(axis=2) > 28
    ys, xs = np.where(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    # 接縫 = 方塊內最暗的一列
    best, besty = 1e9, y0
    for y in range(y0 + int((y1 - y0) * .5), y0 + int((y1 - y0) * .85)):
        v = a[y, x0 + 20:x1 - 20].mean()
        if v < best:
            best, besty = v, y
    return a, (x0, y0, x1, besty), (x0, besty, x1, y1)


def sample(a, sx, sy):
    """雙線性取樣（sx, sy 為 float 陣列）。"""
    h, w = a.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    p00 = a[y0, x0]; p10 = a[y0, x0 + 1]; p01 = a[y0 + 1, x0]; p11 = a[y0 + 1, x0 + 1]
    return (p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) +
            p01 * (1 - fx) * fy + p11 * fx * fy)


def main():
    a, top, base = load_src()
    out = np.zeros((N, N, 3), np.float32) + np.array(BG, np.float32)

    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

    # 1) 上方面板：矩形 → 矩形
    m1 = (xx >= TL[0]) & (xx <= TR[0]) & (yy >= TL[1]) & (yy <= SL[1])
    u = (xx - TL[0]) / (TR[0] - TL[0])
    v = (yy - TL[1]) / (SL[1] - TL[1])
    sx = top[0] + u * (top[2] - top[0])
    sy = top[1] + v * (top[3] - top[1])
    out[m1] = sample(a, sx, sy)[m1]

    # 2) 下方基座：梯形（左右邊隨高度外擴）→ 反向映射
    m2 = (yy > SL[1]) & (yy <= BL[1])
    v2 = (yy - SL[1]) / (BL[1] - SL[1])
    xl = SL[0] + (BL[0] - SL[0]) * v2
    xr = SR[0] + (BR[0] - SR[0]) * v2
    m2 = m2 & (xx >= xl) & (xx <= xr)
    u2 = (xx - xl) / np.maximum(xr - xl, 1)
    sx2 = base[0] + u2 * (base[2] - base[0])
    sy2 = base[1] + v2 * (base[3] - base[1])
    out[m2] = sample(a, sx2, sy2)[m2]

    img = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8))
    img.save(OUT)
    print('saved', OUT, 'top src', top, 'base src', base)
    return img


if __name__ == '__main__':
    im = main()
    im.resize((128, 128), Image.LANCZOS).save('soft-sand-exact-128.png')
    print('128 preview ok')
