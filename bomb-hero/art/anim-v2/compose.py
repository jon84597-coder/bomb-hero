"""把 4 格姿勢表切成單格，統一縮放、統一基線、統一水平對位。
只做 resize + 平移 —— 不旋轉、不變形、不逐格縮放。
"""
import os, json
import numpy as np
from PIL import Image
from collections import deque

SRC = 'gen/keyed.png'
OUT = 'frames'
CANVAS_W, CANVAS_H = 900, 1560
FOOT_Y = 1360          # 腳底基線（沿用遊戲 HERO 畫布）
CENTER_X = 450         # 水平中心
TARGET_H = 1069        # 對位後角色總高＝遊戲現有角色實測高度（idle_0.png 1069px）


def comps(alpha, min_px=2000):
    h, w = alpha.shape
    solid = alpha > 8
    seen = np.zeros((h, w), dtype=bool)
    out = []
    for y in range(h):
        for x in range(w):
            if solid[y, x] and not seen[y, x]:
                q = deque([(y, x)]); seen[y, x] = True
                pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
                if len(pts) >= min_px:
                    ys = np.array([p[0] for p in pts]); xs = np.array([p[1] for p in pts])
                    out.append({'n': len(pts), 'x0': int(xs.min()), 'x1': int(xs.max()),
                                'y0': int(ys.min()), 'y1': int(ys.max())})
    return out


def head_cx(sub_alpha, top, bottom):
    """用上 12%~45% 高度帶的質心當水平基準 —— 頭部在走路時不會左右跑。"""
    h = bottom - top
    y0 = top + int(h * 0.12)
    y1 = top + int(h * 0.45)
    band = sub_alpha[y0:y1, :] > 60
    xs = np.where(band)[1]
    return float(xs.mean()) if len(xs) else (sub_alpha.shape[1] / 2.0)


def main():
    os.makedirs(OUT, exist_ok=True)
    full = Image.open(SRC).convert('RGBA')
    A = np.array(full)[:, :, 3]
    cs = comps(A)
    assert len(cs) == 4, '需要 4 格，實得 %d' % len(cs)
    # 依 y 分上下排，再依 x 分左右 → 固定順序 TL, TR, BL, BR
    cs.sort(key=lambda c: (0 if c['y0'] < full.height / 2 else 1, c['x0']))
    heights = [c['y1'] - c['y0'] + 1 for c in cs]
    med = float(np.median(heights))
    k = TARGET_H / med

    rows = []
    for i, c in enumerate(cs):
        pad = 6
        x0 = max(0, c['x0'] - pad); y0 = max(0, c['y0'] - pad)
        x1 = min(full.width, c['x1'] + 1 + pad); y1 = min(full.height, c['y1'] + 1 + pad)
        sub = full.crop((x0, y0, x1, y1))
        nw = max(1, int(round(sub.width * k)))
        nh = max(1, int(round(sub.height * k)))
        sub = sub.resize((nw, nh), Image.LANCZOS)
        SA = np.array(sub)[:, :, 3]
        # 對位：腳底貼 FOOT_Y，水平用頭部質心貼 CENTER_X
        # 先求真實腳底（alpha>8 的最後一列）
        ys = np.where((SA > 8).any(axis=1))[0]
        real_bottom = int(ys.max())
        hcx = head_cx(SA, 0, real_bottom)
        cv = Image.new('RGBA', (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        dx = int(round(CENTER_X - hcx))
        dy = int(round(FOOT_Y - real_bottom))
        cv.alpha_composite(sub, (dx, dy))
        cv.save('%s/walk_%d.png' % (OUT, i))
        rows.append({'i': i, 'src_h': c['y1'] - c['y0'] + 1,
                     'src_w': c['x1'] - c['x0'] + 1,
                     'out_h': nh, 'out_w': nw,
                     'dx': dx, 'dy': dy,
                     'head_cx': round(hcx, 1)})

    hs = [r['src_h'] for r in rows]
    meta = {'sheet': SRC, 'k': round(k, 4), 'median_h': med,
            'h_min': min(hs), 'h_max': max(hs),
            'h_spread_pct': round(100.0 * (max(hs) - min(hs)) / med, 2),
            'frames': rows}
    json.dump(meta, open('%s/meta.json' % OUT, 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(meta, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
