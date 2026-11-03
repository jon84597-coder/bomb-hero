# -*- coding: utf-8 -*-
"""五面 2.5D 方塊生成器（幾何全由程式決定，AI 只提供材質）。

為什麼這樣做：AI 生圖做不出指定頂點的多邊形，一定會回歸成圓潤石頭。
所以幾何用數學定義，材質從已生成的砂岩圖裡取樣後做透視映射。

五個可見面：
  A 頂面（菱形）        B 上層右面      C 上層左面
  D 基座右面（梯形）    E 基座左面（梯形）
中間一道深縫 = 草圖 465456.jpg 的水平分割線。

可調參數都在 PARAMS 裡，改數字就能出不同層數／厚度／傾角。
"""
import numpy as np
from PIL import Image, ImageDraw

SRC = 'soft-sand-v2.png'   # 整張都是石材，沒有背景
N = 1024
SS = 2                      # 超取樣倍率（畫大再縮，邊緣才不會鋸齒）

P = dict(
    hw=446,      # 頂面菱形半寬（要留出基座外擴的空間，否則會被畫布切掉）
    th=188,      # 頂面菱形半高（越小＝俯視越陡，菱形越扁）
    v1=340,      # 上層側面高度
    gap=14,      # 中縫寬度
    v2=210,      # 基座高度
    out=30,      # 基座外擴（每側）
)

SHADE = dict(
    top=(1.02, 1.05),      # (亮度, 暖度)
    up_r=(0.90, 1.02),
    up_l=(0.66, 0.96),
    base_r=(0.84, 1.00),
    base_l=(0.62, 0.94),
)


def bilinear_uv(px, py, P00, P10, P11, P01, iters=7):
    """反解雙線性參數：找 (u,v) 使 bilinear(u,v) == 目標點。牛頓法。"""
    u = np.full(px.shape, 0.5, np.float32)
    v = np.full(px.shape, 0.5, np.float32)
    for _ in range(iters):
        a, b = 1 - u, u
        c, d = 1 - v, v
        fx = a * c * P00[0] + b * c * P10[0] + b * d * P11[0] + a * d * P01[0] - px
        fy = a * c * P00[1] + b * c * P10[1] + b * d * P11[1] + a * d * P01[1] - py
        dux = c * (P10[0] - P00[0]) + d * (P11[0] - P01[0])
        duy = c * (P10[1] - P00[1]) + d * (P11[1] - P01[1])
        dvx = a * (P01[0] - P00[0]) + b * (P11[0] - P10[0])
        dvy = a * (P01[1] - P00[1]) + b * (P11[1] - P10[1])
        det = dux * dvy - duy * dvx
        det = np.where(np.abs(det) < 1e-9, 1e-9, det)
        u = np.clip(u - (fx * dvy - fy * dvx) / det, -0.5, 1.5)
        v = np.clip(v - (dux * fy - duy * fx) / det, -0.5, 1.5)
    return u, v


def sample(a, sx, sy):
    h, w = a.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) +
            a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def face(out, mask, src, quad, rect, shade, warm):
    """quad = 四角 (左上, 右上, 右下, 左下)，順時針。"""
    # 注意：quad 是 tuple，直接 *SS 會變成元素重複（不是座標放大）
    P00, P10, P11, P01 = [np.asarray(q, np.float32) * SS for q in quad]
    xs = [q[0] for q in quad]; ys = [q[1] for q in quad]
    x0 = max(0, int(min(xs) * SS) - 1); x1 = min(N * SS, int(max(xs) * SS) + 2)
    y0 = max(0, int(min(ys) * SS) - 1); y1 = min(N * SS, int(max(ys) * SS) + 2)
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    u, v = bilinear_uv(xx, yy, P00, P10, P11, P01)
    ins = (u >= -0.004) & (u <= 1.004) & (v >= -0.004) & (v <= 1.004)
    if not ins.any():
        return
    u = np.clip(u, 0, 1); v = np.clip(v, 0, 1)
    rx0, ry0, rx1, ry1 = rect
    col = sample(src, rx0 + u * (rx1 - rx0), ry0 + v * (ry1 - ry0)) * shade
    col[..., 0] *= warm
    col[..., 2] *= (2 - warm) * 0.94 + 0.06
    sub = out[y0:y1, x0:x1]
    sub[ins] = np.clip(col[ins], 0, 255)
    out[y0:y1, x0:x1] = sub
    m = mask[y0:y1, x0:x1]
    m[ins] = 255
    mask[y0:y1, x0:x1] = m


def build():
    src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)

    hw, th, v1, gap, v2, out_s = P['hw'], P['th'], P['v1'], P['gap'], P['v2'], P['out']
    cx = N // 2
    total_h = 2 * th + v1 + gap + v2
    y_top = (N - total_h) / 2.0
    cy = y_top + th

    T = (cx, y_top)
    R = (cx + hw, cy)
    B = (cx, cy + th)
    L = (cx - hw, cy)

    BL = (L[0], L[1] + v1); BB = (B[0], B[1] + v1); BR = (R[0], R[1] + v1)
    BL2 = (BL[0], BL[1] + gap); BB2 = (BB[0], BB[1] + gap); BR2 = (BR[0], BR[1] + gap)
    BL3 = (BL2[0] - out_s, BL2[1] + v2)
    BB3 = (BB2[0], BB2[1] + v2)
    BR3 = (BR2[0] + out_s, BR2[1] + v2)

    out = np.zeros((N * SS, N * SS, 3), np.float32) + np.array([24, 24, 26], np.float32)
    mask = np.zeros((N * SS, N * SS), np.uint8)

    # 先畫遠的（基座），再畫近的（上層），最後頂面
    face(out, mask, src, (BL2, BB2, BB3, BL3), (90, 630, 470, 940), *SHADE['base_l'])
    face(out, mask, src, (BB2, BR2, BR3, BB3), (520, 630, 930, 940), *SHADE['base_r'])

    # 中縫：整條壓成暗色
    face(out, mask, src, (BL, BB, BB2, BL2), (320, 120, 700, 300), 0.30, 0.90)
    face(out, mask, src, (BB, BR, BR2, BB2), (320, 120, 700, 300), 0.34, 0.90)

    face(out, mask, src, (L, B, BB, BL), (70, 330, 430, 820), *SHADE['up_l'])
    face(out, mask, src, (B, R, BR, BB), (600, 330, 950, 820), *SHADE['up_r'])
    face(out, mask, src, (T, R, B, L), (90, 90, 700, 560), *SHADE['top'])

    img = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8))
    img = img.resize((N, N), Image.LANCZOS)

    d = ImageDraw.Draw(img)
    INK = (44, 25, 14)
    # 外框
    for p, q, wd in [(T, R, 8), (R, BR, 8), (BR, BR3, 8), (BR3, BB3, 8),
                     (BB3, BL3, 8), (BL3, BL, 8), (BL, L, 8), (L, T, 8)]:
        d.line([p, q], fill=INK, width=wd)
    # 內稜線（面與面的交界）
    for p, q, wd in [(L, B, 6), (B, R, 6), (B, BB, 6),
                     (BL, BB, 3), (BB, BR, 3), (BB2, BB3, 3)]:
        d.line([p, q], fill=(40, 22, 12), width=wd)

    return img, mask


if __name__ == '__main__':
    im, mk = build()
    im.save('soft-sand-5f.png')
    print('saved soft-sand-5f.png')

    # 128 / 256 遊戲尺寸
    im.resize((128, 128), Image.LANCZOS).save('soft-sand-5f-128.png')
    im.resize((256, 256), Image.LANCZOS).save('soft-sand-5f-256.png')
    im.resize((128, 128), Image.LANCZOS).resize((512, 512), Image.NEAREST).save('soft-sand-5f-128x4.png')

    # 透明版（給遊戲用）
    a = np.asarray(im).astype(np.uint8)
    alpha = Image.fromarray(mk).resize((N, N), Image.LANCZOS)
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)
    rgba.save('soft-sand-5f-t.png')

    # 遊戲模擬：59px 一格
    TILE = 59
    cv = Image.new('RGB', (TILE * 5, TILE * 5), (214, 190, 150))
    t = rgba.resize((TILE, TILE), Image.LANCZOS)
    for (x, y) in [(0, 0), (1, 0), (0, 1), (2, 1), (1, 3), (3, 3), (4, 4), (2, 4), (4, 1)]:
        cv.paste(t, (x * TILE, y * TILE), t)
    cv.resize((cv.width * 2, cv.height * 2), Image.LANCZOS).save('mock-5f.png')
    print('saved mock-5f.png')
