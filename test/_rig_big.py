# 用 meta.json 把部位圖組成骨架動畫，輸出 4 個相位對照（模擬遊戲內 drawRigChar 的畫法）
import os, json, math
import numpy as np
import cv2

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'art', 'parts')
meta = json.load(open(os.path.join(OUT, 'meta.json'), encoding='utf-8'))
IMGS = {}
for k, m in meta.items():
    for p, d in m['parts'].items():
        im = cv2.imread(os.path.join(OUT, d['img']), cv2.IMREAD_UNCHANGED)
        IMGS[(k, p)] = im

Hd = 420.0   # 角色顯示高度（像素）


def draw_rig(canvas, key, cx, footY, phase, moving=True):
    m = meta[key]
    H = Hd
    W = H * m['aspect']
    ox, oy = cx - W / 2, footY - H
    w = phase

    def put(part, ang=0.0, dx=0.0, dy=0.0, sx=1.0, sy=1.0):
        d = m['parts'].get(part)
        if not d:
            return
        im = IMGS[(key, part)]
        px, py = ox + d['x'] * W, oy + d['y'] * H
        pw, ph = d['w'] * W, d['h'] * H
        ux, uy = ox + d['px'] * W, oy + d['py'] * H
        M = cv2.getRotationMatrix2D((ux, uy), math.degrees(ang), 1.0)
        M[0, 2] += dx
        M[1, 2] += dy
        tmp = np.zeros((canvas.shape[0], canvas.shape[1], 4), np.uint8)
        # 以最近鄰近似：把圖貼到畫布座標後旋轉
        x0, y0, x1, y1 = int(max(0, px - 40)), int(max(0, py - 40)), int(px + pw + 40), int(py + ph + 40)
        # 直接在整張畫布上做仿射
        src = im
        M2 = M.copy()
        M2[0, 2] += 0
        M2[1, 2] += 0
        # 先在整張畫布大小的空白上放置原圖，再做仿射
        layer = np.zeros_like(canvas)
        ix, iy = int(round(px)), int(round(py))
        tw, th = max(1, int(round(pw))), max(1, int(round(ph)))
        rs = cv2.resize(src, (tw, th), interpolation=cv2.INTER_AREA)
        yy0, yy1 = max(0, iy), min(canvas.shape[0], iy + th)
        xx0, xx1 = max(0, ix), min(canvas.shape[1], ix + tw)
        if yy1 <= yy0 or xx1 <= xx0:
            return
        s = rs[yy0 - iy:yy1 - iy, xx0 - ix:xx1 - ix]
        layer[yy0:yy1, xx0:xx1] = s
        rot = cv2.warpAffine(layer, M, (canvas.shape[1], canvas.shape[0]), flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        a = rot[:, :, 3:4].astype(np.float32) / 255
        canvas[:, :, :3] = (rot[:, :, :3].astype(np.float32) * a + canvas[:, :, :3].astype(np.float32) * (1 - a)).astype(np.uint8)
        canvas[:, :, 3] = np.maximum(canvas[:, :, 3], rot[:, :, 3])

    step = math.sin(w) if moving else 0.0
    sq = math.sin(w * 2) * .05 if moving else 0.0
    # 腿
    put('legL', ang=-step * .10, dy=-max(0, step) * H * .045)
    put('legR', ang=step * .10, dy=-max(0, -step) * H * .045)
    # 身體（擠壓 + 微傾）
    put('torso', ang=step * .02, dx=step * W * .012, sy=1 - sq * .6)
    # 手臂（前後擺）
    put('armL', ang=-step * .22, dy=-step * H * .01)
    put('armR', ang=step * .22, dy=step * H * .01)
    # 頭（點 + 晃）
    put('head', ang=step * .05, dy=-abs(math.sin(w)) * H * .012)


tiles = []
for key in ['boss', 'dragon']:
    for ph in [0, math.pi / 3, math.pi / 2, math.pi * 2 / 3]:
        cv = np.full((560, 620, 4), 245, np.uint8)
        cv[:, :, 3] = 255
        draw_rig(cv, key, 310, 540, ph)
        tiles.append(cv)
rows = [np.hstack(tiles[i * 4:(i + 1) * 4]) for i in range(len(tiles) // 4)]
cv2.imwrite(os.path.join(ROOT, 'art', '_rig_big.png'), np.vstack([np.hstack(tiles[0:4]), np.hstack(tiles[4:8])]))
print('ok')
