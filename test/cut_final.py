# BOSS 老虎 / 小龍：grabCut 兩輪 + 寬鬆主體多邊形（只負責排除明顯的背景塊）+ 法杖區域色差濾除
import os
import numpy as np
import cv2

ART = os.path.join(os.path.dirname(__file__), '..', 'art')

CFG = {
    'boss': dict(
        rect=(.280, .030, .800, .925),
        fg=[(.47, .13), (.55, .17), (.50, .35), (.44, .49), (.57, .51), (.48, .69),
            (.40, .81), (.59, .81), (.33, .56), (.66, .49), (.67, .61), (.71, .73), (.69, .67)],
        bg=[(.76, .40), (.79, .33), (.71, .26), (.81, .46), (.80, .56), (.77, .22),
            (.29, .20), (.27, .40), (.73, .91), (.30, .89)],
        # 順時針：皇冠 → 右側 → 尾巴 → 腳 → 左側 → 回到皇冠（法杖另外一塊）
        poly=[(.552, .055), (.600, .090), (.640, .135), (.660, .250), (.700, .295),
              (.742, .380), (.755, .478), (.746, .558), (.728, .620), (.694, .668),
              (.720, .712), (.780, .730), (.788, .810), (.744, .852), (.700, .818),
              (.676, .872), (.668, .940), (.570, .952), (.470, .944), (.436, .872),
              (.410, .762), (.388, .566), (.366, .438), (.340, .372), (.352, .290),
              (.390, .220), (.432, .170), (.472, .120), (.506, .075)],
        poly2=[(.298, .355), (.262, .402), (.258, .882), (.302, .928), (.322, .880), (.320, .400)],
        staffBox=None, paleTop=.215),

    'dragon': dict(
        rect=(.240, .100, .830, .950),
        fg=[(.45, .22), (.50, .17), (.40, .40), (.50, .52), (.56, .66),
            (.35, .45), (.63, .45), (.44, .78), (.56, .78)],
        bg=[(.26, .30), (.78, .30), (.24, .60), (.80, .60), (.50, .96), (.50, .03)],
        poly=[(.466, .115), (.520, .155), (.545, .270), (.556, .350), (.615, .330),
              (.692, .312), (.815, .478), (.744, .605), (.676, .652), (.728, .748),
              (.718, .812), (.640, .835), (.615, .925), (.515, .940), (.370, .925),
              (.353, .812), (.345, .748), (.276, .652), (.258, .585), (.255, .472),
              (.318, .378), (.372, .298), (.412, .140)],
        staffBox=None, paleTop=0.0, usePoly=True),
}


def run(name, c):
    img = cv2.imread(os.path.join(ART, name + '-src.jpg'), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    kk = np.ones((5, 5), np.uint8)
    bw = int(min(w, h) * .05)
    x0, y0 = int(c['rect'][0] * w), int(c['rect'][1] * h)
    x1, y1 = int(c['rect'][2] * w), int(c['rect'][3] * h)

    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    mask[:bw] = cv2.GC_BGD; mask[-bw:] = cv2.GC_BGD
    mask[:, :bw] = cv2.GC_BGD; mask[:, -bw:] = cv2.GC_BGD
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    for (px, py) in c['bg']:
        cv2.circle(mask, (int(px * w), int(py * h)), int(min(w, h) * .028), cv2.GC_BGD, -1)
    for (px, py) in c['fg']:
        cv2.circle(mask, (int(px * w), int(py * h)), int(min(w, h) * .035), cv2.GC_FGD, -1)
    bgm = np.zeros((1, 65), np.float64)
    fgm = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgm, fgm, 12, cv2.GC_INIT_WITH_MASK)
    m = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3), cv2.MORPH_OPEN, kk, iterations=2)

    m2 = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    m2[cv2.erode(m, kk, iterations=2) > 0] = cv2.GC_FGD
    m2[m > 0] = cv2.GC_PR_FGD
    m2[cv2.dilate(m, kk, iterations=6) == 0] = cv2.GC_BGD
    m2[:bw] = cv2.GC_BGD; m2[-bw:] = cv2.GC_BGD
    m2[:, :bw] = cv2.GC_BGD; m2[:, -bw:] = cv2.GC_BGD
    cv2.grabCut(img, m2, None, bgm, fgm, 8, cv2.GC_INIT_WITH_MASK)
    m = np.where((m2 == cv2.GC_FGD) | (m2 == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(cv2.morphologyEx(m, cv2.MORPH_CLOSE, kk, iterations=3), cv2.MORPH_OPEN, kk, iterations=2)

    # 主體多邊形（寬鬆）
    # 頭頂上方：把「很亮又很淡」的背景殘塊清掉（角色白毛不會出現在那麼高的位置）
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    pale = ((hsv[:, :, 2] > 185) & (hsv[:, :, 1] < 78)).astype(np.uint8) * 255
    pale = cv2.dilate(pale, np.ones((9, 9), np.uint8), iterations=1)
    band = np.zeros((h, w), np.uint8)
    band[:int(h * c.get('paleTop', 0)), :] = 255
    m[pale & band > 0] = 0
    if c.get('usePoly'):
        pm = np.zeros((h, w), np.uint8)
        pp = np.array([[int(px * w), int(py * h)] for (px, py) in c['poly']], np.int32)
        cv2.fillPoly(pm, [pp], 255)
        m = np.minimum(m, pm)

    # 法杖等細長物：範圍內改用色差濾除（把綠色背景剔掉）
    if c['staffBox']:
        sx0, sy0, sx1, sy1 = [int(v * (w if i % 2 == 0 else h)) for i, v in enumerate(c['staffBox'])]
        roi = img[sy0:sy1, sx0:sx1]
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB).astype(np.float32)
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV).astype(np.float32)
        # 綠色（背景）→ HSV 色相 45~95 且飽和度不低
        green = ((hsv[:, :, 0] > 42) & (hsv[:, :, 0] < 100) & (hsv[:, :, 1] > 45)).astype(np.uint8) * 255
        green = cv2.dilate(green, np.ones((5, 5), np.uint8), iterations=2)
        box = m[sy0:sy1, sx0:sx1].copy()
        box[green > 0] = 0
        m[sy0:sy1, sx0:sx1] = box

    n, lb, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n > 1:
        pick = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        m = np.where(lb == pick, 255, 0).astype(np.uint8)
    ff = m.copy(); mk = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, mk, (0, 0), 255)
    m = m | cv2.bitwise_not(ff)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=2)

    a = cv2.GaussianBlur(m, (5, 5), 1.2)
    out = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
    out[:, :, 3] = a
    ys, xs = np.where(a > 16)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(os.path.join(ART, name + '-cut.png'), out)

    bgi = np.zeros_like(out); bgi[:, :] = (255, 0, 255, 255)
    al = out[:, :, 3:4].astype(np.float32) / 255
    prev = (out[:, :, :3].astype(np.float32) * al + bgi[:, :, :3].astype(np.float32) * (1 - al)).astype(np.uint8)
    cv2.imwrite(os.path.join(ART, '_prev_' + name + '.png'), prev)
    dbg = img.copy()
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(dbg, cs, -1, (0, 0, 255), 4)
    cv2.imwrite(os.path.join(ART, '_dbg_' + name + '.png'), cv2.resize(dbg, (700, int(700 * dbg.shape[0] / dbg.shape[1]))))
    print(name, out.shape[1], 'x', out.shape[0])


for k, v in CFG.items():
    run(k, v)
