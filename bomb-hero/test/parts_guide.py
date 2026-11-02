# 為每張角色圖畫上 bbox + 10% 網格，方便挑選拆部位的比例
import os, json
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')
OUT = os.path.join(ART, '_guide')
os.makedirs(OUT, exist_ok=True)

def bbox_of(alpha):
    ys, xs = np.where(alpha > 8)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def guide(name, img):
    h, w = img.shape[:2]
    a = img[:, :, 3]
    x0, y0, x1, y1 = bbox_of(a)
    g = img.copy()
    cv2.rectangle(g, (x0, y0), (x1, y1), (255, 0, 0, 255), 2)
    for i in range(1, 10):
        x = int(x0 + (x1 - x0) * i / 10)
        y = int(y0 + (y1 - y0) * i / 10)
        cv2.line(g, (x, y0), (x, y1), (0, 200, 255, 255), 1)
        cv2.line(g, (x0, y), (x1, y), (0, 200, 255, 255), 1)
        cv2.putText(g, str(i * 10), (x + 2, y0 + 12), cv2.FONT_HERSHEY_SIMPLEX, .35, (0, 0, 0, 255), 1)
    # 洋紅底
    bg = np.zeros_like(g); bg[:, :] = (255, 0, 255, 255)
    al = g[:, :, 3:4].astype(np.float32) / 255.0
    comp = (g[:, :, :3].astype(np.float32) * al + bg[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, name + '.png'), comp)
    return [int(x0), int(y0), int(x1), int(y1)]

def grabcut(path):
    img = cv2.imread(path, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    rect = (int(w * .06), int(h * .05), int(w * .88), int(h * .92))
    bgm = np.zeros((1, 65), np.float64); fgm = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, rect, bgm, fgm, 8, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == 2) | (mask == 0), 0, 255).astype(np.uint8)
    k = np.ones((5, 5), np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=2)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k, iterations=1)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lab == big, 255, 0).astype(np.uint8)
    # 填洞
    ff = m.copy()
    hh, ww = m.shape
    mask2 = np.zeros((hh + 2, ww + 2), np.uint8)
    cv2.floodFill(ff, mask2, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    a = cv2.GaussianBlur(m, (3, 3), 0)
    rgba = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = a
    return rgba

faces = {}
for k in ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']:
    p = os.path.join(ART, 'chars', k + '.png')
    img = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    faces[k] = guide('char-' + k, img)

for name in ['boss', 'dragon']:
    src = os.path.join(ART, name + '-src.jpg')
    rgba = grabcut(src)
    cv2.imwrite(os.path.join(ART, name + '-cut.png'), rgba)
    faces[name] = guide(name, rgba)

print(json.dumps(faces, indent=0))
