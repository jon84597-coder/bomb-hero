# -*- coding: utf-8 -*-
"""measure_hold_bear.py — 逐格量「雙手舉起來那顆球」的圓心

影片模型在舉彈動作裡會自己畫一顆球（灰色／銀色，低飽和、亮），
這顆球就是要被遊戲炸彈蓋住的位置。這裡逐格量它的圓心，
換算成 HOLD_BOMB 要的 up（＝球心距腳底 多少 × 角色高）。

輸出：ball-bear-hold.json
"""
import glob, json
import numpy as np
from PIL import Image
from collections import deque

FOOT_Y = 1360.0
CHAR_H = 1069.0
CENTER_X = 540.0     # anim_batch 把角色中心放在這裡（小熊畫布 1080 寬）
R_FIX = 0.2525 * 1069.0   # 球半徑（0.505H/2，12 格實測中位數 270）


def blob(mask):
    """最大連通塊（4 鄰接）"""
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    best = None
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if not mask[y, x] or seen[y, x]:
                continue
            q = deque([(y, x)]); seen[y, x] = True; pts = []
            while q:
                cy, cx = q.popleft(); pts.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
            if best is None or len(pts) > len(best):
                best = pts
    return best


def main():
    out = []
    for f in sorted(glob.glob('frames_anim_bear/hold/*.png')):
        a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
        mx = a.max(axis=2); mn = a.min(axis=2)
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
        m = (sat < 0.28) & (mx > 115)
        # 球整顆都在頭頂上方、手掌也托在球的下半 → 只取到 560（肚子是奶油色、
        #   飽和度也低，切太低會跟球連成同一塊）。
        m[560:] = False
        m[:, :150] = False
        m[:, 960:] = False
        pts = blob(m)
        if not pts or len(pts) < 3000:
            out.append(None)
            print('%-22s 量不到' % f.split('/')[-1])
            continue
        # 手掌會從下面托住球 → bbox 底邊不可信。改用「球頂 + 已知半徑」定圓心：
        #   y_top 永遠乾淨（球頂沒有任何東西擋），cy = y_top + r；
        #   cx 用上半球的質心（被遮到的機會最小）。
        ys = np.array([p[0] for p in pts]); xs = np.array([p[1] for p in pts])
        ytop = float(ys.min())
        upper = ys < (ytop + R_FIX * 0.95)
        cx = float(xs[upper].mean())
        cy = ytop + R_FIX
        r = R_FIX
        up = (FOOT_Y - cy) / CHAR_H
        dx = (cx - CENTER_X) / CHAR_H
        out.append([round(up, 4), round(dx, 4)])
        print('%-22s 球心 (%.0f, %.0f) r=%.0f  up=%.4f  dia/H=%.3f'
              % (f.split('/')[-1], cx, cy, r, up, 2 * r / CHAR_H))
    ups = [o[0] for o in out]
    dxs = [o[1] for o in out]
    json.dump({'upFrames': ups, 'sideFrames': dxs}, open('ball-bear-hold.json', 'w'), indent=1)
    print('\nupFrames  =', ups)
    print('sideFrames=', dxs)


if __name__ == '__main__':
    main()
