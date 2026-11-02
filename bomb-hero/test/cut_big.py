# 把 BOSS（老虎）與坐騎（小龍）從插畫背景中摳出來（grabCut + 遮罩初始化）
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')

# 每張圖的「主體大概位置」（比例），以及輸出名
CFG = {
    'boss':   dict(rect=(.245, .035, .745, .965), name='boss'),
    'dragon': dict(rect=(.265, .120, .760, .965), name='dragon'),
}


def cut(name, rect):
    src = os.path.join(ART, name + '-src.jpg')
    img = cv2.imread(src, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    x0, y0, x1, y1 = [int(v * (w if i % 2 == 0 else h)) for i, v in enumerate(rect)]

    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    # 邊框一圈 → 確定背景
    bw = int(min(w, h) * .045)
    mask[bw:h - bw, bw:w - bw] = cv2.GC_PR_BGD
    # 主體框內 → 可能是前景
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    # 主體中心橢圓 → 確定前景
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    ax, ay = int((x1 - x0) * .34), int((y1 - y0) * .40)
    cv2.ellipse(mask, (cx, cy + int((y1 - y0) * .06)), (ax, ay), 0, 0, 360, cv2.GC_FGD, -1)

    bgm = np.zeros((1, 65), np.float64)
    fgm = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgm, fgm, 10, cv2.GC_INIT_WITH_MASK)

    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    k = np.ones((5, 5), np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=3)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k, iterations=2)
    # 只留跟中心連通的最大塊
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        best, bd = -1, 1e9
        for i in range(1, n):
            d = (cent[i][0] - cx) ** 2 + (cent[i][1] - cy) ** 2
            if stats[i, cv2.CC_STAT_AREA] > 2000 and d < bd:
                bd, best = d, i
        m = np.where(lab == best, 255, 0).astype(np.uint8)
    # 填洞
    ff = m.copy()
    mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    # 邊緣羽化
    a = cv2.GaussianBlur(m, (5, 5), 1.1)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 10)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(ART, CFG[name]['name'] + '-cut.png'), out)
    print(name, 'size', out.shape[1], 'x', out.shape[0])


for k, v in CFG.items():
    cut(k, v['rect'])
