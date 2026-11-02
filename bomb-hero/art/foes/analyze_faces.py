# -*- coding: utf-8 -*-
"""
主角群「臉部標定」：找出兩眼位置、臉中心、環帶色、膚色。
投影法（不裝 scipy）：頭部區域逐行統計暗像素 → 眼睛所在水平帶 → 按 x 聚成兩簇。
投影法對「豬鼻很暗」「青蛙凸眼在頭頂」「熊貓黑眼罩」會抓錯，所以 OVERRIDE 優先。
輸出：heroes/_face.json
用法：python bomb-hero/art/foes/analyze_faces.py
"""
import io, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HEROES = os.path.join(HERE, 'heroes')
IDS = ['01-rabbit', '02-bear', '03-dog', '04-cat',
       '05-pig', '06-panda', '07-frog', '08-chick']

# 手動標定（原圖 512 座標）。自動偵測只當沒有 override 時的 fallback。
OVERRIDE = {
    '01-rabbit': {'eyeL': [161, 233], 'eyeR': [255, 232]},
    '02-bear':   {'eyeL': [188, 179], 'eyeR': [287, 175]},
    '03-dog':    {'eyeL': [265, 205], 'eyeR': [365, 201]},
    '04-cat':    {'eyeL': [178, 170], 'eyeR': [259, 166]},
    '05-pig':    {'eyeL': [129, 223], 'eyeR': [253, 219]},
    '06-panda':  {'eyeL': [246, 231], 'eyeR': [336, 227]},
    '07-frog':   {'eyeL': [234, 177], 'eyeR': [348, 168]},
    '08-chick':  {'eyeL': [181, 259], 'eyeR': [267, 254]},
}


def content_bbox(a):
    ys, xs = np.where(a > 24)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def auto_eyes(arr, x0, y0, x1, y1):
    """投影法：回傳 (e1x, e2x, eye_y) 或 None"""
    W, H = x1 - x0, y1 - y0
    hy0, hy1 = y0, y0 + int(H * 0.46)
    hx0, hx1 = x0 + int(W * 0.10), x1 - int(W * 0.10)
    sub = arr[hy0:hy1, hx0:hx1]
    lum = sub[:, :, :3].mean(axis=2)
    alpha = sub[:, :, 3]
    dark = (lum < 78) & (alpha > 200)
    rows = dark.sum(axis=1)
    if rows.max() < 6:
        return None
    thr = max(6, rows.max() * 0.55)
    cand = np.where(rows >= thr)[0]
    groups, cur = [], [cand[0]]
    for v in cand[1:]:
        if v - cur[-1] <= 4:
            cur.append(v)
        else:
            groups.append(cur); cur = [v]
    groups.append(cur)
    band = groups[-1] if len(groups) > 1 else groups[0]
    by0, by1 = band[0], band[-1] + 1

    cols = dark[by0:by1, :].sum(axis=0)
    xs = np.where(cols > 0)[0]
    if len(xs) < 6:
        return None
    cl, prev, cl_all = [xs[0]], xs[0], []
    for v in xs[1:]:
        if v - prev <= 12:
            cl.append(v)
        else:
            cl_all.append(cl); cl = [v]
        prev = v
    cl_all.append(cl)
    cl_all.sort(key=len, reverse=True)
    pick = sorted(cl_all[:2], key=lambda c: np.mean(c))
    eye_y = hy0 + (by0 + by1) // 2
    if len(pick) == 2:
        return int(hx0 + np.mean(pick[0])), int(hx0 + np.mean(pick[1])), int(eye_y)
    c = int(hx0 + np.mean(pick[0]))
    d = int(W * .10)
    return c - d, c + d, int(eye_y)


def analyze(path):
    im = Image.open(path).convert('RGBA')
    arr = np.array(im)
    x0, y0, x1, y1 = content_bbox(arr[:, :, 3])
    rid = os.path.basename(path)[:-4]

    ov = OVERRIDE.get(rid)
    if ov:
        e1x, e2x = ov['eyeL'][0], ov['eyeR'][0]
        eye_y = (ov['eyeL'][1] + ov['eyeR'][1]) // 2
    else:
        r = auto_eyes(arr, x0, y0, x1, y1)
        if not r:
            return None
        e1x, e2x, eye_y = r
    eye_d = e2x - e1x

    # 環帶色：眼睛上方一圈的顏色（若將來要蓋原眼，熊貓用黑、兔子用白）
    ring = []
    for ex in (e1x, e2x):
        for dx in (-1.15, 0.0, 1.15):
            bx = int(ex + dx * eye_d * 0.22)
            by = int(eye_y - eye_d * 0.30)
            blk = arr[max(0, by - 3):by + 4, max(0, bx - 3):bx + 4]
            mm = blk[:, :, 3] > 200
            if mm.sum() > 8:
                ring.append(np.median(blk[:, :, :3][mm], axis=0))
    ring_col = ([int(v) for v in np.median(np.array(ring), axis=0)]
                if ring else [220, 220, 220])

    # 膚色：額頭小塊的中位色
    fy = max(y0 + 4, eye_y - int(eye_d * 1.35))
    sx0, sx1 = max(0, e1x - int(eye_d * .10)), e2x + int(eye_d * .10)
    sy0, sy1 = max(y0, fy - int(eye_d * .16)), fy + int(eye_d * .16)
    patch = arr[sy0:sy1, sx0:sx1]
    m = patch[:, :, 3] > 200
    skin = ([int(v) for v in np.median(patch[:, :, :3][m], axis=0)]
            if m.sum() > 30 else [235, 225, 210])

    return {
        'cx': int((e1x + e2x) // 2), 'cy': int(eye_y),
        'eyeL': [int(e1x), int(eye_y)], 'eyeR': [int(e2x), int(eye_y)],
        'eyeD': int(eye_d), 'faceR': int(eye_d * 0.86),
        'skin': [int(v) for v in skin], 'ring': ring_col,
        'bbox': [int(v) for v in (x0, y0, x1, y1)],
    }


if __name__ == '__main__':
    out = {}
    for rid in IDS:
        r = analyze(os.path.join(HEROES, rid + '.png'))
        out[rid] = r
        if r:
            print('%-11s eyes %s / %s  d=%d' % (rid, r['eyeL'], r['eyeR'], r['eyeD']))
        else:
            print('%-11s FAILED' % rid)
    io.open(os.path.join(HEROES, '_face.json'), 'w', encoding='utf-8').write(
        json.dumps(out, ensure_ascii=False, indent=1))
    print('-> heroes/_face.json')
