"""v2 去背：只從畫布邊界 flood 背景色，身體內部一個像素都不動。
不補洞、不侵蝕、不 despill —— 內部 alpha 恆為 255。
"""
import sys, os, json
import numpy as np
from PIL import Image
from collections import deque

BG = np.array([255, 0, 200], dtype=np.int32)   # 參考圖底色 #FF00C8
D_CORE = 80.0      # 距底色 < 80 → 確定是背景
D_EDGE = 128.0     # 80~128 → 柔邊過渡


def key(img: Image.Image):
    a = np.array(img.convert('RGB')).astype(np.int32)
    d = np.sqrt(((a - BG) ** 2).sum(axis=2))
    bg_like = d < D_EDGE

    h, w = bg_like.shape
    # 從四邊 flood（4 连通），只走 bg_like
    out = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_like[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_like[y, x] and not out[y, x]:
                out[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bg_like[ny, nx] and not out[ny, nx]:
                out[ny, nx] = True; q.append((ny, nx))

    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[out] = 0
    # 柔邊：只作用在「與外部相鄰 ≤2px」的像素，內部不動
    edge = np.zeros((h, w), dtype=bool)
    for _ in range(2):
        grow = np.zeros((h, w), dtype=bool)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sh = np.roll(out, (dy, dx), axis=(0, 1))
            grow |= sh
        edge |= (grow & ~out)
        out = out | grow
    t = np.clip((d - D_CORE) / (D_EDGE - D_CORE), 0.0, 1.0)
    soft = np.where(edge & ~np.isin(alpha, [0]), (t * 255).astype(np.uint8), alpha)
    # edge 區已被 grow 汙染，重算：只有原本 edge 且非純背景的才套柔邊
    alpha = np.where(edge, np.minimum(alpha, (t * 255).astype(np.uint8)), alpha)
    alpha[out & (d < D_CORE)] = 0
    rgba = np.dstack([a.astype(np.uint8), alpha])
    return Image.fromarray(rgba, 'RGBA'), d


def components(alpha, min_px=400):
    h, w = alpha.shape
    seen = np.zeros((h, w), dtype=bool)
    solid = alpha > 8
    comps = []
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
                    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                    comps.append({'n': len(pts), 'x0': min(xs), 'x1': max(xs),
                                  'y0': min(ys), 'y1': max(ys)})
    comps.sort(key=lambda c: -c['n'])
    return comps


def main(src, dst):
    im = Image.open(src)
    rgba, d = key(im)
    a = np.array(rgba)[:, :, 3]
    comps = components(a)
    # 只留 4 大塊（水印是小塊，自然被丟掉）
    keep = comps[:4]
    mask = np.zeros_like(a, dtype=bool)
    # 用 bbox 遮罩重建：只保留屬於 keep 的連通塊
    solid = a > 8
    tmp = np.zeros_like(solid)
    for c in keep:
        tmp[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1] = True
    # 精確做法：再一次標記，只留落到 keep bbox 的塊
    h, w = a.shape
    seen = np.zeros((h, w), dtype=bool)
    kept = np.zeros((h, w), dtype=bool)
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
                if len(pts) < 400:
                    continue
                ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
                bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
                if any(abs(bx0 - c['x0']) < 3 and abs(by0 - c['y0']) < 3 for c in keep):
                    for (cy, cx) in pts:
                        kept[cy, cx] = True
    a2 = np.where(kept, a, 0).astype(np.uint8)
    # 被輪廓包住的背景縫隙（例如抬腳與身體之間）→ 同樣挖掉，不補色。
    # 只在「距底色 < 95」時動手；角色本身的粉（內耳／腮紅／鼻）距底色 > 150，不可能被誤殺。
    enclosed_bg = (a2 > 8) & (d < 95)
    n_enclosed = int(enclosed_bg.sum())
    a2[enclosed_bg] = 0
    rgba = Image.fromarray(np.dstack([np.array(rgba)[:, :, :3], a2]), 'RGBA')
    rgba.save(dst)

    # 內部孔洞檢查：對每個 keep 塊，bbox 內 alpha=0 但四邊都被 alpha>128 包住
    report = {'src': os.path.basename(src), 'size': list(im.size), 'comps': keep}
    holes_tot = 0
    for c in keep:
        sub = a2[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
        solid_s = sub > 128
        if solid_s.size == 0:
            continue
        # 從 sub 邊界 flood 透明區，剩下未觸及的透明像素 = 內部孔洞
        hh, ww = solid_s.shape
        tr = (~solid_s)
        vis = np.zeros((hh, ww), dtype=bool)
        q = deque()
        for x in range(ww):
            for y in (0, hh - 1):
                if tr[y, x] and not vis[y, x]:
                    vis[y, x] = True; q.append((y, x))
        for y in range(hh):
            for x in (0, ww - 1):
                if tr[y, x] and not vis[y, x]:
                    vis[y, x] = True; q.append((y, x))
        while q:
            cy, cx = q.popleft()
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < hh and 0 <= nx < ww and tr[ny, nx] and not vis[ny, nx]:
                    vis[ny, nx] = True; q.append((ny, nx))
        holes = int((tr & ~vis).sum())
        holes_tot += holes
        c['holes_px'] = holes
        c['holes_pct'] = round(100.0 * holes / solid_s.sum(), 3)
    report['holes_total'] = holes_tot
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
