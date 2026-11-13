"""vid2frames.py — 影片 → 已去背、已對位、單一縮放係數的循環幀

    python vid2frames.py <mp4 或 幀資料夾> <輸出資料夾>

順序很重要：
  1. 抽幀
  2. 洋紅去背（只從畫布邊界 flood，身體內部一個像素都不動）
  3. 縮放（BICUBIC，避免 LANCZOS 振鈴）
  4. **放大之後**才做去污 —— 放大本身會重新製造洋紅環，去污一定要放最後
  5. 對位：腳底貼基線、頭部質心貼中心，全程只有一個縮放係數
  6. 自動找「首尾剪影最像」的循環長度
"""
import sys, os, glob, json
import numpy as np
from PIL import Image
from collections import deque

BG = np.array([255, 0, 200])
D_BG = 142.0          # 距底色 < 142 → 可能是背景（只從邊界 flood，不會滲進身體）
D_SOLID = 78.0        # < 78 → 確定是純背景
MAG_TOL = 25          # min(R,B) - G > 25 → 視為洋紅污染
CANVAS_W, CANVAS_H, FOOT_Y, CENTER_X = 900, 1560, 1360, 450
TARGET_H = 1069       # 遊戲角色在 900x1560 畫布上的實測高度（idle_0.png 量測）


# ---------------------------------------------------------------- 去背
def key_bg(im):
    a = np.array(im.convert('RGB')).astype(np.int32)
    d = np.sqrt(((a - BG) ** 2).sum(axis=2))
    bg = d < D_BG
    h, w = bg.shape
    out = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(out, 0, 255).astype(np.uint8)
    # 柔邊 2px（只動邊界那一圈，內部恆 255）
    e = out.copy()
    for _ in range(2):
        g = np.zeros_like(e)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            g |= np.roll(e, (dy, dx), axis=(0, 1))
        e = e | g
    t = np.clip((d - D_SOLID) / (D_BG - D_SOLID), 0, 1)
    alpha = np.where(e & ~out, np.minimum(alpha, (t * 255).astype(np.uint8)), alpha)
    alpha[out & (d < D_SOLID)] = 0
    alpha[(d < 105) & ~out] = 0
    return np.dstack([a.astype(np.uint8), alpha])


# ---------------------------------------------------------------- 去污
def despill(arr, rounds=3, steps=24):
    """把洋紅污染的像素換成「最近的乾淨像素顏色」。不動 alpha、不侵蝕、不動內部。"""
    arr = arr.copy()
    rgb, alpha = arr[:, :, :3], arr[:, :, 3]
    for _ in range(rounds):
        r = rgb[:, :, 0].astype(np.int16)
        g = rgb[:, :, 1].astype(np.int16)
        b = rgb[:, :, 2].astype(np.int16)
        bad = ((np.minimum(r, b) - g) > MAG_TOL) & (alpha > 0)
        if not bad.any():
            break
        done = ~bad
        ring = bad.copy()
        for _i in range(steps):
            if not ring.any():
                break
            newly = np.zeros_like(ring)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                nb_done = np.roll(np.roll(done, dy, 0), dx, 1)
                nb_col = np.roll(np.roll(rgb, dy, 0), dx, 1)
                m = ring & ~done & nb_done
                rgb[m] = nb_col[m]
                newly |= m
            done |= newly
            ring &= ~newly
    # 洋紅塵點（alpha 極低但放大會看到粉點）→ 歸零
    r = rgb[:, :, 0].astype(np.int16); g = rgb[:, :, 1].astype(np.int16); b = rgb[:, :, 2].astype(np.int16)
    dust = (alpha < 14) & ((np.minimum(r, b) - g) > 10)
    alpha = np.where(dust, 0, alpha).astype(np.uint8)
    return np.dstack([rgb, alpha])


def biggest(arr, keep=1):
    alpha = arr[:, :, 3]
    solid = alpha > 8
    h, w = solid.shape
    seen = np.zeros((h, w), bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if solid[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = True; pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                comps.append(pts)
    comps.sort(key=len, reverse=True)
    keepm = np.zeros((h, w), bool)
    for pts in comps[:keep]:
        for cy, cx in pts:
            keepm[cy, cx] = True
    arr = arr.copy()
    arr[:, :, 3] = np.where(keepm, arr[:, :, 3], 0)
    return arr


def anchor(arr):
    alpha = arr[:, :, 3]
    ys = np.where((alpha > 40).any(axis=1))[0]
    xs = np.where((alpha > 40).any(axis=0))[0]
    y0, y1 = int(ys.min()), int(ys.max())
    h = y1 - y0 + 1
    band = alpha[y0 + int(h * .10):y0 + int(h * .45), :] > 40
    bx = np.where(band)[1]
    hcx = float(bx.mean()) if len(bx) else (int(xs.min()) + int(xs.max())) / 2.0
    return h, y1, hcx


def main(src, outdir):
    os.makedirs(outdir, exist_ok=True)
    if os.path.isdir(src):
        files = sorted(glob.glob(os.path.join(src, '*.png')))
    else:
        tmp = os.path.join(outdir, '_fr')
        os.makedirs(tmp, exist_ok=True)
        os.system('ffmpeg -y -v error -i "%s" -vsync 0 "%s/%%04d.png"' % (src, tmp))
        files = sorted(glob.glob(os.path.join(tmp, '*.png')))

    arrs = []
    for f in files:
        ar = biggest(key_bg(Image.open(f)), 1)
        arrs.append(ar)

    A = [anchor(ar) for ar in arrs]
    hs = np.array([a[0] for a in A])
    med = int(np.median(hs))
    k = TARGET_H / med
    print('幀數 %d  身高 中位 %d (min %d max %d, 變動 %.1f%%)  單一縮放 %.4f'
          % (len(arrs), med, hs.min(), hs.max(), 100 * (hs.max() - hs.min()) / med, k))

    placed = []
    for ar, (h, bot, hcx) in zip(arrs, A):
        im = Image.fromarray(ar, 'RGBA')
        nw = max(1, int(round(im.width * k)))
        nh = max(1, int(round(im.height * k)))
        s = np.array(im.resize((nw, nh), Image.BICUBIC))
        s = despill(s)                                    # ← 放大後才去污
        cv = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        cv.alpha_composite(Image.fromarray(s, 'RGBA'),
                           (int(round(CENTER_X - hcx * k)), int(round(FOOT_Y - bot * k))))
        placed.append(cv)

    def sig(im):
        a = np.array(im)[:, :, 3] > 40
        return np.array(Image.fromarray((a * 255).astype(np.uint8)).resize((90, 156), Image.BILINEAR)) > 100

    sigs = np.array([sig(im) for im in placed], dtype=np.float32)
    best = None
    for L in range(16, 49):
        if len(sigs) - L < 3:
            continue
        diff = np.abs(sigs[:-L] - sigs[L:]).mean(axis=(1, 2))
        sc = float(diff.mean())
        if best is None or sc < best[0]:
            best = (sc, L, int(np.argmin(diff)))
    sc, L, off = best
    print('最佳循環：長度 %d 幀（%.2fs），起點 %d，剪影差 %.4f' % (L, L / 24.0, off, sc))
    json.dump({'k': k, 'median_h': med, 'loop_len': L, 'loop_start': off, 'fps': 24,
               'frames': len(placed)}, open(os.path.join(outdir, 'meta.json'), 'w'),
              ensure_ascii=False, indent=1)
    for i in range(L):
        placed[off + i].save(os.path.join(outdir, 'f%02d.png' % i))
    print('輸出 %d 幀到 %s' % (L, outdir))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
