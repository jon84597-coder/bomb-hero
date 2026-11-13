# -*- coding: utf-8 -*-
"""measure_ball.py — 量「舉彈」12 格精靈裡那顆球的圓心／半徑

為什麼要量：這支影片模型自己在頭頂畫了一顆大球（雙手托著），
它會隨呼吸上下浮動（實測 60~80px）。遊戲要用真炸彈蓋掉它，
蓋的位置就必須逐格跟著球心走，固定高度一定錯位。

做法：從角色 bbox 頂端往下逐行取左右邊界，只取「還沒被耳朵／手臂污染」的區段
（寬度突然跳增 > 12% 就停），兩側對稱取中點當圓心 x，再用最小二乘擬合圓。
"""
import glob
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CANVAS_H = 1560.0
FOOT_Y = 1360.0
CHAR_H = 1069.0


def edges(al, y):
    xs = np.where(al[y])[0]
    if not len(xs):
        return None
    return int(xs.min()), int(xs.max())


def fit_ball(path):
    a = np.array(Image.open(path).convert('RGBA'))
    al = a[:, :, 3] > 40
    ys = np.where(al.any(axis=1))[0]
    if not len(ys):
        return None
    top = int(ys.min())
    rows = []
    prev_w = 0
    # 球頂在好幾格裡是被削平的（模型生成時就切掉了）→ 前幾行寬度不可信，跳過
    for y in range(top + 8, min(top + 210, al.shape[0])):
        e = edges(al, y)
        if not e:
            continue
        w = e[1] - e[0]
        if prev_w and w > prev_w * 1.22:      # 耳朵／手臂突然出現 → 停止
            break
        rows.append((y, e[0], e[1]))
        prev_w = w
    if len(rows) < 16:
        return None
    # 只用下半段（球面斜率高、抗雜訊）
    use = rows[max(0, len(rows) // 2):]
    P = []
    for y, xl, xr in use:
        P.append((xl, y))
        P.append((xr, y))
    P = np.array(P, float)
    x, y = P[:, 0], P[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]
    b = x ** 2 + y ** 2
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    cx, cy, c = sol
    r = float(np.sqrt(max(c + cx ** 2 + cy ** 2, 1)))
    return dict(top=top, cx=float(cx), cy=float(cy), r=r,
                n=len(rows), w0=int(use[0][2] - use[0][1]))


def main():
    files = sorted(glob.glob(os.path.join(HERE, 'frames_anim', 'hold', '*.png')))
    out = []
    for f in files:
        g = fit_ball(f)
        if not g:
            print('%-8s 擬合失敗' % os.path.basename(f))
            out.append(None)
            continue
        cy_cell = (g['cy'] - 150.0) * (200.0 / CHAR_H)
        cx_cell = (g['cx'] - 70.0) * (200.0 / CHAR_H)
        r_cell = g['r'] * (200.0 / CHAR_H)
        up = (226.38 - cy_cell) / 200.0          # 球心距腳底 ÷ 角色高
        print('%-8s 圓心(%6.1f,%6.1f) r=%5.1f  格內(%5.1f,%5.1f) r=%5.1f  up=%.3f'
              % (os.path.basename(f), g['cx'], g['cy'], g['r'],
                 cx_cell, cy_cell, r_cell, up))
        out.append(dict(f=os.path.basename(f), cx=g['cx'], cy=g['cy'], r=g['r'],
                        up=round(up, 4), dx=round(cx_cell / 200.0, 4)))
    ups = [o['up'] for o in out if o]
    if ups:
        print('\nup %.3f ~ %.3f（中位 %.3f）  dx %.3f ~ %.3f'
              % (min(ups), max(ups), float(np.median(ups)),
                 min(o['dx'] for o in out if o), max(o['dx'] for o in out if o)))
        print('球半徑 / 角色高 = %.3f ～ %.3f'
              % (min(o['r'] for o in out if o) / CHAR_H, max(o['r'] for o in out if o) / CHAR_H))
    # 擬合失敗的格用前後有效值線性插值（球只會緩慢上下，插值誤差 < 1px 遊戲內）
    for key in ('up', 'dx'):
        v = np.array([o[key] if o else np.nan for o in out], float)
        idx = np.arange(len(v))
        good = ~np.isnan(v)
        if good.sum() >= 2:
            v = np.interp(idx, idx[good], v[good])
            for i, o in enumerate(out):
                if not o:
                    out[i] = dict(up=0.0, dx=0.0)
                out[i][key] = round(float(v[i]), 4)
    print('\nup 序列：' + ', '.join('%.3f' % o['up'] for o in out))
    print('dx 序列：' + ', '.join('%.3f' % o['dx'] for o in out))
    p = os.path.join(HERE, 'ball-hold.json')
    with open(p, 'w', encoding='utf-8', newline='\n') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    print('寫出 %s' % p)


if __name__ == '__main__':
    main()
