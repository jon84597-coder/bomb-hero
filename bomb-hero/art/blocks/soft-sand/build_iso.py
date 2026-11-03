# -*- coding: utf-8 -*-
"""用同一張砂岩材質，重建真正的 2.5D 等角方塊：
   頂面菱形（亮）＋左側面（暗）＋右側面（中），三個面都有，才有體積。
   草圖 465456.jpg 的水平接縫 → 移到左右兩個側面上，當作裂開的腰線。"""
import numpy as np
from PIL import Image, ImageDraw

SRC = 'soft-sand-exact.png'
OUT = 'soft-sand-iso.png'
N = 1024

# --- 等角方塊的六個角 ---
HW = 512          # 菱形半寬（撐滿畫布）
TH = 235          # 菱形半高（2:1）
SH = 512          # 立邊（撐滿畫布，略扁於真等角）
CX = N // 2
CY = (N - (2 * TH + SH)) // 2 + TH      # 垂直置中
T = (CX, CY - TH)
R = (CX + HW, CY)
B = (CX, CY + TH)
L = (CX - HW, CY)
BL = (CX - HW, CY + SH)
BB = (CX, CY + TH + SH)
BR = (CX + HW, CY + SH)


def sample(a, sx, sy):
    h, w = a.shape[:2]
    sx = np.clip(sx, 0, w - 1.001); sy = np.clip(sy, 0, h - 1.001)
    x0 = sx.astype(np.int32); y0 = sy.astype(np.int32)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) +
            a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)


def put(out, a, O, E1, E2, rect, shade=1.0, warm=1.0, mask=None):
    """把來源矩形貼進平行四邊形 O + u*E1 + v*E2（u,v ∈ [0,1]）。"""
    ox, oy = O; e1x, e1y = E1; e2x, e2y = E2
    det = e1x * e2y - e1y * e2x
    xs = [O[0], O[0] + E1[0], O[0] + E2[0], O[0] + E1[0] + E2[0]]
    ys = [O[1], O[1] + E1[1], O[1] + E2[1], O[1] + E1[1] + E2[1]]
    x0, x1 = max(0, int(min(xs))), min(N, int(max(xs)) + 1)
    y0, y1 = max(0, int(min(ys))), min(N, int(max(ys)) + 1)
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
    px, py = xx - ox, yy - oy
    u = (px * e2y - py * e2x) / det
    v = (e1x * py - e1y * px) / det
    ins = (u >= 0) & (u <= 1) & (v >= 0) & (v <= 1)
    if not ins.any():
        return
    rx0, ry0, rx1, ry1 = rect
    sx = rx0 + u * (rx1 - rx0); sy = ry0 + v * (ry1 - ry0)
    col = sample(a, sx, sy) * shade
    col[..., 0] *= warm
    col[..., 2] *= (2 - warm) * 0.94 + 0.06
    sub = out[y0:y1, x0:x1]
    sub[ins] = np.clip(col[ins], 0, 255)
    out[y0:y1, x0:x1] = sub
    if mask is not None:
        mask[y0:y1, x0:x1][ins] = True


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
    out = np.zeros((N, N, 3), np.float32) + np.array([26, 26, 28], np.float32)
    mk = np.zeros((N, N), bool)

    # 頂面：亮
    put(out, a, T, (R[0]-T[0], R[1]-T[1]), (L[0]-T[0], L[1]-T[1]), (60, 90, 960, 590), 1.06, 1.02, mk)
    # 左側面：暗
    put(out, a, L, (B[0]-L[0], B[1]-L[1]), (BL[0]-L[0], BL[1]-L[1]), (70, 620, 540, 960), 0.62, 0.97, mk)
    # 右側面：中間
    put(out, a, B, (R[0]-B[0], R[1]-B[1]), (BB[0]-B[0], BB[1]-B[1]), (560, 620, 950, 960), 0.80, 1.03, mk)

    img = Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)

    # 腰線（草圖的水平接縫）→ 左右兩個側面上各一條
    def on_face(y_frac):
        return [(L[0], L[1] + (BL[1]-L[1]) * y_frac), (B[0], B[1] + (BB[1]-B[1]) * y_frac),
                (R[0], R[1] + (BR[1]-R[1]) * y_frac)]
    ln = on_face(0.42)
    d.line([ln[0], ln[1]], fill=(58, 32, 18), width=9)
    d.line([ln[1], ln[2]], fill=(48, 26, 15), width=9)

    # 六角外框 + 三條內稜線（乾淨深色描邊）
    for p, q, wd in [(T, R, 7), (R, BR, 7), (BR, BB, 7), (BB, BL, 7), (BL, L, 7), (L, T, 7)]:
        d.line([p, q], fill=(46, 26, 15), width=wd)
    for p, q, wd in [(L, B, 6), (B, R, 6), (B, BB, 6)]:
        d.line([p, q], fill=(40, 22, 12), width=wd)

    img.save(OUT)
    print('saved', OUT)
    return img


if __name__ == '__main__':
    im = main()
    im.resize((128, 128), Image.LANCZOS).save('soft-sand-iso-128.png')

    TILE = 59
    cv = Image.new('RGB', (TILE*5, TILE*5), (214, 190, 150))
    t = im.resize((TILE, TILE), Image.LANCZOS)
    for (x, y) in [(0, 0), (1, 0), (0, 1), (2, 1), (1, 3), (3, 3), (4, 4)]:
        cv.paste(t, (x*TILE, y*TILE))
    cv.resize((cv.width*2, cv.height*2), Image.LANCZOS).save('mock-iso.png')

    sheet = Image.new('RGB', (1024, 1024), (26, 26, 28))
    sheet.paste(Image.open('soft-sand-exact.png').resize((512, 512), Image.LANCZOS), (0, 0))
    sheet.paste(im.resize((512, 512), Image.LANCZOS), (512, 0))
    sheet.paste(Image.open('mock-ingame.png').resize((512, 512), Image.LANCZOS), (0, 512))
    sheet.paste(Image.open('mock-iso.png').resize((512, 512), Image.LANCZOS), (512, 512))
    sheet.save('_cmp.png')
    print('cmp ok')
