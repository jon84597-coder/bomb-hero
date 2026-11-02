# 用「邊框背景色盤 + Lab 色差」把主體從插畫背景分離（比 grabCut 對這種柔和插畫更穩）
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')
CENTER = dict(boss=(.50, .55), dragon=(.46, .62))


def bg_mask_remove(name, thr=26.0, k=10):
    src = os.path.join(ART, name + '-src.jpg')
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)

    # 邊框一圈當背景樣本
    ring = np.concatenate([
        lab[:int(h * .07)].reshape(-1, 3), lab[-int(h * .07):].reshape(-1, 3),
        lab[:, :int(w * .05)].reshape(-1, 3), lab[:, -int(w * .05):].reshape(-1, 3)])
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5)
    _, _, centers = cv2.kmeans(ring, k, None, crit, 6, cv2.KMEANS_PP_CENTERS)

    # 每像素到色盤的最短距離
    flat = lab.reshape(-1, 3)
    best = np.full(flat.shape[0], 1e9, np.float32)
    for c in centers:
        d = np.linalg.norm(flat - c, axis=1)
        best = np.minimum(best, d)
    dmap = best.reshape(h, w)
    m = np.where(dmap > thr, 255, 0).astype(np.uint8)

    kk = np.ones((5, 5), np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, kk, iterations=2)

    # 找出包含畫面中心的最大連通塊（主體）
    cx, cy = int(w * CENTER[name][0]), int(h * CENTER[name][1])
    n, lb, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    pick = -1
    if n > 1:
        bestd, pick = 1e9, -1
        for i in range(1, n):
            if stats[i, cv2.CC_STAT_AREA] < 3000:
                continue
            d = (cent[i][0] - cx) ** 2 + (cent[i][1] - cy) ** 2
            if d < bestd:
                bestd, pick = d, i
    if pick < 0:
        raise SystemExit('no component')
    m = np.where(lb == pick, 255, 0).astype(np.uint8)

    # 填洞（主體內部的背景色區域）
    ff = m.copy()
    mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=2)

    a = cv2.GaussianBlur(m, (7, 7), 1.6)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 12)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(ART, name + '-cut.png'), out)

    # 洋紅底預覽
    bg = np.zeros_like(out); bg[:, :] = (255, 0, 255, 255)
    al = out[:, :, 3:4].astype(np.float32) / 255
    prev = (out[:, :, :3].astype(np.float32) * al + bg[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
    cv2.imwrite(os.path.join(ART, '_prev_' + name + '.png'), prev)
    print(name, out.shape[1], 'x', out.shape[0], 'coverage %.1f%%' % (100 * (a > 128).mean()))


bg_mask_remove('boss', thr=30.0)
bg_mask_remove('dragon', thr=30.0)
