# 最終版：grabCut（兩輪）＋ 背景色盤過濾（去掉與邊框同色的碎塊），保留法杖等細節
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')

CFG = {
    'boss': dict(rect=(.290, .035, .790, .915), thr=20.0,
                 fg=[(.47, .13), (.55, .16), (.50, .34), (.44, .48), (.56, .50), (.48, .68),
                     (.40, .80), (.58, .80), (.33, .55), (.645, .48), (.655, .60), (.71, .72), (.68, .66)],
                 bg=[(.75, .40), (.78, .33), (.70, .26), (.80, .46), (.79, .56), (.76, .22),
                     (.30, .20), (.28, .40), (.72, .90), (.31, .88)]),
    'dragon': dict(rect=(.255, .110, .750, .885), thr=20.0,
                   fg=[(.45, .22), (.50, .17), (.40, .40), (.50, .52), (.55, .66),
                       (.35, .45), (.62, .45), (.44, .78), (.55, .78)],
                   bg=[(.27, .30), (.74, .30), (.25, .60), (.76, .60), (.50, .94), (.50, .04)]),
}


def run(name, rect, thr, fg, bg):
    img = cv2.imread(os.path.join(ART, name + '-src.jpg'), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    x0, y0, x1, y1 = int(rect[0] * w), int(rect[1] * h), int(rect[2] * w), int(rect[3] * h)
    kk = np.ones((5, 5), np.uint8)
    bw = int(min(w, h) * .05)

    # ---------- 1) grabCut：緊框 + 種子點 ----------
    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[:bw] = cv2.GC_BGD; mask[-bw:] = cv2.GC_BGD
    mask[:, :bw] = cv2.GC_BGD; mask[:, -bw:] = cv2.GC_BGD
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    for (px, py) in bg:
        cv2.circle(mask, (int(px * w), int(py * h)), int(min(w, h) * .028), cv2.GC_BGD, -1)
    for (px, py) in fg:
        cv2.circle(mask, (int(px * w), int(py * h)), int(min(w, h) * .035), cv2.GC_FGD, -1)
    bgm = np.zeros((1, 65), np.float64)
    fgm = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgm, fgm, 12, cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, kk, iterations=2)

    m2 = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    m2[cv2.erode(m, kk, iterations=2) > 0] = cv2.GC_FGD
    m2[m > 0] = np.where(m2[m > 0] == cv2.GC_FGD, cv2.GC_FGD, cv2.GC_PR_FGD)
    m2[cv2.dilate(m, kk, iterations=6) == 0] = cv2.GC_BGD
    m2[:bw] = cv2.GC_BGD; m2[-bw:] = cv2.GC_BGD
    m2[:, :bw] = cv2.GC_BGD; m2[:, -bw:] = cv2.GC_BGD
    cv2.grabCut(img, m2, None, bgm, fgm, 8, cv2.GC_INIT_WITH_MASK)
    m = np.where((m2 == cv2.GC_FGD) | (m2 == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, kk, iterations=2)

    # ---------- 2) 背景色盤過濾：把「長得像邊框背景」的像素剔掉 ----------
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    ring = np.concatenate([lab[:bw].reshape(-1, 3), lab[-bw:].reshape(-1, 3),
                           lab[:, :bw].reshape(-1, 3), lab[:, -bw:].reshape(-1, 3)])
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, .5)
    _, _, pal = cv2.kmeans(ring, 6, None, crit, 5, cv2.KMEANS_PP_CENTERS)
    flat = lab.reshape(-1, 3)
    dist = np.full(flat.shape[0], 1e9, np.float32)
    for c in pal:
        dist = np.minimum(dist, np.linalg.norm(flat - c, axis=1))
    keep = (dist.reshape(h, w) > thr).astype(np.uint8) * 255
    keep = cv2.morphologyEx(keep, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8), iterations=1)
    keep = cv2.dilate(keep, np.ones((9, 9), np.uint8), iterations=2)     # 往外擴，保住邊緣描線
    m = np.minimum(m, keep)

    # 取最大塊 → 填洞 → 收邊
    n, lb2, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lb2 == pick, 255, 0).astype(np.uint8)
    ff = m.copy(); mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8), iterations=2)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)

    a = cv2.GaussianBlur(m, (5, 5), 1.2)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 14)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(ART, name + '-cut.png'), out)

    bgi = np.zeros_like(out); bgi[:, :] = (255, 0, 255, 255)
    al = out[:, :, 3:4].astype(np.float32) / 255
    prev = (out[:, :, :3].astype(np.float32) * al + bgi[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
    cv2.imwrite(os.path.join(ART, '_prev_' + name + '.png'), prev)
    print(name, out.shape[1], 'x', out.shape[0])


for k, v in CFG.items():
    run(k, v['rect'], v['thr'], v['fg'], v['bg'])
