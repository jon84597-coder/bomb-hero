# 參數掃描：grabCut 兩輪 → 不同開運算核徑 → 只留最大塊 → 填洞，輸出 2x2 對照
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')
CFG = {
    'boss': dict(rect=(.290, .035, .790, .915),
                 fg=[(.47, .13), (.55, .16), (.50, .34), (.44, .48), (.56, .50), (.48, .68),
                     (.40, .80), (.58, .80), (.33, .55), (.645, .48), (.655, .60), (.71, .72), (.68, .66)],
                 bg=[(.75, .40), (.78, .33), (.70, .26), (.80, .46), (.79, .56), (.76, .22),
                     (.30, .20), (.28, .40), (.72, .90), (.31, .88)]),
    'dragon': dict(rect=(.255, .110, .750, .885),
                   fg=[(.45, .22), (.50, .17), (.40, .40), (.50, .52), (.55, .66),
                       (.35, .45), (.62, .45), (.44, .78), (.55, .78)],
                   bg=[(.27, .30), (.74, .30), (.25, .60), (.76, .60), (.50, .94), (.50, .04)]),
}
KS = [5, 9, 15, 21]


def base_mask(img, x0, y0, x1, y1, fg, bg):
    h, w = img.shape[:2]
    kk = np.ones((5, 5), np.uint8)
    bw = int(min(w, h) * .05)
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
    return cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3), cv2.MORPH_OPEN, kk, iterations=2)


def finish(img, m, k):
    h, w = img.shape[:2]
    if k > 0:
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)), iterations=1)
    n, lb, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lb == pick, 255, 0).astype(np.uint8)
    ff = m.copy(); mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    if k > 0:
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)), iterations=1)
    a = cv2.GaussianBlur(m, (5, 5), 1.2)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 14)
    return out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


for name, cfg in CFG.items():
    img = cv2.imread(os.path.join(ART, name + '-src.jpg'), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    x0, y0, x1, y1 = int(cfg['rect'][0] * w), int(cfg['rect'][1] * h), int(cfg['rect'][2] * w), int(cfg['rect'][3] * h)
    fg, bg = cfg['fg'], cfg['bg']
    m0 = base_mask(img, x0, y0, x1, y1, fg, bg)
    tiles = []
    for k in KS:
        out = finish(img, m0.copy(), k)
        bgi = np.zeros_like(out); bgi[:, :] = (255, 0, 255, 255)
        al = out[:, :, 3:4].astype(np.float32) / 255
        prev = (out[:, :, :3].astype(np.float32) * al + bgi[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
        prev = cv2.resize(prev, (420, int(420 * prev.shape[0] / prev.shape[1])))
        cv2.putText(prev, 'k=%d' % k, (6, 22), cv2.FONT_HERSHEY_SIMPLEX, .7, (0, 0, 0), 2)
        tiles.append(prev)
    hh = max(t.shape[0] for t in tiles)
    tiles = [cv2.copyMakeBorder(t, 0, hh - t.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(255, 0, 255)) for t in tiles]
    row1 = np.hstack(tiles[:2]); row2 = np.hstack(tiles[2:])
    cv2.imwrite(os.path.join(ART, '_sweep_' + name + '.png'), np.vstack([row1, row2]))
    print('done', name)
