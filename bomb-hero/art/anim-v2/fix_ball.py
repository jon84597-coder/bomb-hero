"""fix_ball.py — 把手舉彈影片裡「模型自己畫的球」抹成背景色

球是實心淺藍圓球，和手掌同色系，但手掌在圓外（距圓心 ~185px > r ~142px），
所以用幾何圓挖除不會傷到手。挖完去背時球自然變成透明，遊戲就能在手上畫真炸彈。

球會隨身體起伏上下移動（圓心 y 實測 92~122），所以**必須逐幀挖**；
固定圓會在下沉時留下月牙殘留。個別幀擬合失敗時用前後有效值線性插值，
再做時間軸中值濾波，避免單幀抖動。
"""
import glob, os, sys
import numpy as np
from PIL import Image

MAG = np.array([248, 19, 198])


def longest_run(mask_row):
    xs = np.where(mask_row)[0]
    if not len(xs):
        return None
    brk = np.where(np.diff(xs) > 1)[0]
    s = np.concatenate(([0], brk + 1))
    e = np.concatenate((brk, [len(xs) - 1]))
    k = int(np.argmax(xs[e] - xs[s]))
    return int(xs[s[k]]), int(xs[e[k]])


def fit_circle(rows):
    P = []
    for y, xl, xr in rows:
        P.append((xl, y))
        P.append((xr, y))
    P = np.array(P, float)
    x, y = P[:, 0], P[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]
    b = x ** 2 + y ** 2
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c = sol
    return cx, cy, float(np.sqrt(max(c + cx ** 2 + cy ** 2, 1)))


def ball_of(path):
    a = np.array(Image.open(path).convert('RGB')).astype(np.int16)
    nonbg = np.abs(a - MAG).sum(axis=2) > 130
    rows = []
    for y in range(0, 112):
        seg = longest_run(nonbg[y])
        if seg is None:
            continue
        rows.append((y, seg[0], seg[1]))
    if len(rows) < 14:
        return None
    w = np.array([xr - xl for _, xl, xr in rows], float)
    md = np.median(w)
    rows = [r for r, ww in zip(rows, w) if ww < md * 1.6]
    if len(rows) < 14:
        return None
    cx, cy, r = fit_circle(rows)
    if not (100 < r < 200) or not (40 < cy < 170):
        return None
    return cx, cy, r


def fill_gaps(v):
    v = np.array(v, float)
    idx = np.arange(len(v))
    good = ~np.isnan(v)
    if good.sum() < 4:
        raise SystemExit('有效擬合太少')
    return np.interp(idx, idx[good], v[good])


def med_smooth(v, w=7):
    out = v.copy()
    h = w // 2
    for i in range(len(v)):
        lo, hi = max(0, i - h), min(len(v), i + h + 1)
        out[i] = np.median(v[lo:hi])
    return out


def main(srcdir, outdir, pad=1.03):
    os.makedirs(outdir, exist_ok=True)
    files = sorted(glob.glob(os.path.join(srcdir, '*.png')))
    raw = [ball_of(f) for f in files]
    n_ok = sum(1 for g in raw if g)
    print('擬合成功 %d/%d' % (n_ok, len(files)))
    if n_ok < 8:
        raise SystemExit('擬合成功太少，無法定位球')

    CX = np.array([g[0] if g else np.nan for g in raw])
    CY = np.array([g[1] if g else np.nan for g in raw])
    RR = np.array([g[2] if g else np.nan for g in raw])
    cx_s = med_smooth(fill_gaps(CX))
    cy_s = med_smooth(fill_gaps(CY))
    r_s = med_smooth(fill_gaps(RR))
    print('平滑後 球心 x %.1f~%.1f  y %.1f~%.1f  r %.1f~%.1f'
          % (cx_s.min(), cx_s.max(), cy_s.min(), cy_s.max(), r_s.min(), r_s.max()))

    for i, f in enumerate(files):
        a = np.array(Image.open(f).convert('RGB')).copy()
        h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        inside = ((xx - cx_s[i]) ** 2 + (yy - cy_s[i]) ** 2) < (r_s[i] * pad) ** 2
        a[inside] = MAG.astype(np.uint8)
        Image.fromarray(a).save(os.path.join(outdir, '%04d.png' % (i + 1)))

    bad = 0
    for i in range(0, len(files), 8):
        a = np.array(Image.open(os.path.join(outdir, '%04d.png' % (i + 1))).convert('RGB')).astype(np.int16)
        h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        inner = ((xx - cx_s[i]) ** 2 + (yy - cy_s[i]) ** 2) < (r_s[i] * 0.80) ** 2
        mag = np.abs(a - MAG).sum(axis=2)
        bad = max(bad, int((inner & (mag > 60)).sum()))
    print('球心 80%% 半徑內殘留最大值 %d px（＞0 表示還有球體）' % bad)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
