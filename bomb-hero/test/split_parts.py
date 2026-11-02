# 把角色圖拆成「頭 / 身體 / 左臂 / 右臂 / 左腿 / 右腿」部位圖（邊緣羽化，可重疊）
# 輸出 art/parts/{key}_{part}.webp 與 art/parts/meta.json
import os, json
import numpy as np
import cv2

ROOT = os.path.join(os.path.dirname(__file__), '..')
ART = os.path.join(ROOT, 'art')
OUT = os.path.join(ART, 'parts')
os.makedirs(OUT, exist_ok=True)
MAXH = 215          # 部位圖最高像素（遊戲內顯示約 75~110px，足夠）

# 每隻角色的拆解比例（x/y 都是 0~1 的相對比例；hb=頭底、lt=腿頂、aw=手臂寬度）
ANIMALS = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']
CFG = {}
for a in ANIMALS:
    CFG[a] = dict(hb=.58, lt=.84, aw=.20, at=.56, src='chars/%s.png' % a)

CFG['boss'] = dict(hb=.30, lt=.68, aw=.34, at=.24, src='boss-cut.png',
                   armLeftTall=True, splitAt=.50)
CFG['dragon'] = dict(hb=.34, lt=.70, aw=.30, at=.16, src='dragon-cut.png', splitAt=.50)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def edge_weight(hh, ww, gx, gy):
    """四邊羽化的權重圖"""
    xi = np.arange(ww, dtype=np.float32)
    yi = np.arange(hh, dtype=np.float32)
    wx = np.minimum(smoothstep(xi / max(1, gx)), smoothstep((ww - 1 - xi) / max(1, gx)))
    wy = np.minimum(smoothstep(yi / max(1, gy)), smoothstep((hh - 1 - yi) / max(1, gy)))
    return wy[:, None] * wx[None, :]


def split(key, cfg):
    src = os.path.join(ART, cfg['src'])
    img = cv2.imread(src, cv2.IMREAD_UNCHANGED)
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    alpha = img[:, :, 3].astype(np.float32) / 255.0
    ys, xs = np.where(img[:, :, 3] > 12)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    img = img[y0:y1, x0:x1]
    alpha = alpha[y0:y1, x0:x1]
    h, w = alpha.shape

    hb, lt, aw, at = cfg['hb'], cfg['lt'], cfg['aw'], cfg['at']
    sp = cfg.get('splitAt', .5)
    gy = max(3, int(h * .05))
    gx = max(3, int(w * .05))

    def box(xa, ya, xb, yb, feather=True):
        m = np.zeros((h, w), np.float32)
        ixa, iya = int(xa * w), int(ya * h)
        ixb, iyb = int(xb * w), int(yb * h)
        ixa, ixb = max(0, ixa), min(w, ixb)
        iya, iyb = max(0, iya), min(h, iyb)
        if ixb <= ixa or iyb <= iya:
            return m
        sub = np.ones((iyb - iya, ixb - ixa), np.float32)
        if feather:
            sub = edge_weight(iyb - iya, ixb - ixa, gx, gy)
        m[iya:iyb, ixa:ixb] = sub
        return m

    parts = {}
    # 頭（畫在最上層；底部羽化，轉動時由身體補上）
    parts['head'] = (box(0, 0, 1, hb + .02), (0.5, hb))
    # 身體
    parts['torso'] = (box(0, hb - .03, 1, lt + .05), (0.5, (hb + lt) / 2))
    # 手臂（畫在身體前面，稍微加寬一點確保蓋住接縫）
    armY0, armY1 = at, (1.0 if cfg.get('armLeftTall') else lt + .02)
    over = .015
    parts['armL'] = (box(0, armY0, aw + over, armY1), (aw * .55, armY0 + .05))
    parts['armR'] = (box(1 - aw - over, armY0, 1, armY1), (1 - aw * .55, armY0 + .05))
    # 腿（畫在身體後面；從腿頂稍上方切，靠身體蓋住接縫）
    legY0 = lt - .06
    legX0 = .0 if key in ('boss', 'dragon') else .0
    parts['legL'] = (box(legX0, legY0, sp + .02, 1), (sp * .5, legY0 + .04))
    parts['legR'] = (box(sp - .02, legY0, 1, 1), (sp + (1 - sp) * .5, legY0 + .04))

    meta = {'w': 1.0, 'h': 1.0, 'aspect': w / h, 'parts': {}}
    for name, (mask, pivot) in parts.items():
        a = alpha * mask
        if a.max() < 0.02:
            continue
        sys_, sxs = np.where(a > 0.02)
        px0, py0, px1, py1 = sxs.min(), sys_.min(), sxs.max() + 1, sys_.max() + 1
        sub = img[py0:py1, px0:px1].copy()
        sub[:, :, 3] = np.clip(a[py0:py1, px0:px1] * 255, 0, 255).astype(np.uint8)
        # 縮到 MAXH
        if sub.shape[0] > MAXH:
            s = MAXH / sub.shape[0]
            sub = cv2.resize(sub, (max(1, int(sub.shape[1] * s)), MAXH), interpolation=cv2.INTER_AREA)
        fn = '%s_%s.webp' % (key, name)
        cv2.imwrite(os.path.join(OUT, fn), sub, [cv2.IMWRITE_WEBP_QUALITY, 78])
        meta['parts'][name] = {
            'img': fn,
            # 部位在角色座標中的位置（0~1，左上角 + 尺寸）
            'x': px0 / w, 'y': py0 / h,
            'w': (px1 - px0) / w, 'h': (py1 - py0) / h,
            'px': pivot[0], 'py': pivot[1],
        }
    return meta


def main():
    allmeta = {}
    for key, cfg in CFG.items():
        allmeta[key] = split(key, cfg)
        print(key, len(allmeta[key]['parts']), 'parts')
    with open(os.path.join(OUT, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(allmeta, f, ensure_ascii=False, indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.webp'))
    print('total webp KB', round(total / 1024, 1))


main()
