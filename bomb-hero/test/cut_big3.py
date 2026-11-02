# BOSS 老虎 / 小龍：grabCut（緊框 + 前景種子 + 邊框背景種子）→ 透明 PNG + 洋紅底預覽
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')

CFG = {
    'boss': dict(rect=(.300, .040, .760, .910),
                 fg=[(.47, .13), (.55, .16), (.50, .34), (.44, .48), (.56, .50), (.48, .68),
                     (.40, .80), (.58, .80), (.33, .55), (.645, .48), (.655, .60), (.70, .72), (.68, .66)],
                 bg=[(.705, .40), (.735, .33), (.665, .285), (.765, .46), (.752, .56), (.72, .24),
                     (.31, .20), (.29, .40), (.70, .90), (.33, .86)],
                 poly=[(.505, .045), (.575, .075), (.605, .105), (.612, .145), (.600, .195), (.640, .225),
                       (.700, .265), (.728, .340), (.740, .450), (.726, .535), (.690, .585), (.665, .620),
                       (.700, .645), (.760, .660), (.775, .745), (.735, .790), (.680, .775), (.665, .840),
                       (.620, .890), (.560, .900), (.505, .820), (.450, .900), (.390, .880), (.372, .820),
                       (.360, .700), (.340, .650), (.338, .560), (.330, .470), (.320, .400), (.322, .300),
                       (.352, .235), (.392, .195), (.408, .145), (.420, .100), (.455, .065)]),
    'dragon': dict(rect=(.265, .120, .735, .880),
                   fg=[(.45, .22), (.50, .17), (.40, .40), (.50, .52), (.55, .66),
                       (.35, .45), (.62, .45), (.44, .78), (.55, .78)],
                   bg=[(.28, .30), (.72, .30), (.26, .60), (.74, .60), (.50, .92), (.50, .06)],
                   poly=[(.262, .420), (.310, .300), (.352, .245), (.372, .185), (.400, .150), (.435, .118),
                         (.500, .112), (.528, .150), (.545, .190), (.548, .265), (.578, .310), (.618, .290),
                         (.668, .300), (.742, .390), (.716, .500), (.668, .560), (.660, .640), (.700, .700),
                         (.712, .790), (.660, .830), (.600, .870), (.560, .890), (.420, .890), (.372, .860),
                         (.356, .760), (.352, .660), (.320, .580), (.268, .520)]),
}


def run(name, rect, fg, bg="", poly_pts=()):
    img = cv2.imread(os.path.join(ART, name + '-src.jpg'), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    x0, y0 = int(rect[0] * w), int(rect[1] * h)
    x1, y1 = int(rect[2] * w), int(rect[3] * h)

    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    bw = int(min(w, h) * .05)
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

    # ---- 第二輪：用第一輪結果當種子再修邊（清掉黏在主體上的背景碎塊） ----
    kk = np.ones((5, 5), np.uint8)
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
    # 取最大連通塊
    n, lb, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lb == pick, 255, 0).astype(np.uint8)
    # 填洞
    ff = m.copy(); mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=2)

    # ---- 第三輪：跟「主體輪廓多邊形」相交，清掉黏在身上的背景碎塊 ----
    poly = np.array([[int(px * w), int(py * h)] for (px, py) in poly_pts], np.int32)
    pm = np.zeros((h, w), np.uint8)
    cv2.fillPoly(pm, [poly], 255)
    pm = cv2.erode(pm, np.ones((3, 3), np.uint8), iterations=1)
    m = np.minimum(m, pm)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=2)

    a = cv2.GaussianBlur(m, (5, 5), 1.2)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 14)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(ART, name + '-cut.png'), out)

    bg = np.zeros_like(out); bg[:, :] = (255, 0, 255, 255)
    al = out[:, :, 3:4].astype(np.float32) / 255
    prev = (out[:, :, :3].astype(np.float32) * al + bg[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
    cv2.imwrite(os.path.join(ART, '_prev_' + name + '.png'), prev)
    print(name, out.shape[1], 'x', out.shape[0])


for k, v in CFG.items():
    run(k, v["rect"], v["fg"], v.get("bg", []), v.get("poly", []))
