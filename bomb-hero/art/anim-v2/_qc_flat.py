# -*- coding: utf-8 -*-
"""_qc_flat.py — 對「已經去背好的洋紅底幀目錄」做一次完整品管＋量測

與 _qc_batch.py 的差別：
  _qc_batch 吃原始 mp4，只看「模型有沒有把洋紅換色」。
  這支吃 key_flat.py 的輸出（已經壓回洋紅底的 RGB 幀），一次算完
  「能不能用」與「要做動畫格需要的參數」——

    漂移幀   邊界平均色距洋紅 > 90 的幀數（>0 就是壞）
    觸邊     bbox 貼到畫面任一邊
    身高     第一幀站姿高（= anim_batch 的 ref_h）與全段變動百分比
    底線     腳底 y 的範圍（>8px 表示角色在飛或有雜點）
    左右     bbox 相對「第一幀頭部質心」的最大伸展（× 身高）→ 決定畫布要多寬
    動作     相鄰幀剪影差最大值（<0.02 幾乎沒動）
    球       hold 動作才有：最大暗塊的圓心（× 身高）→ HOLD_BOMB 的 up／side

用法：
    python _qc_flat.py vid/panda-walk/flat vid/frog-hold/flat ...
    python _qc_flat.py --all          # 掃 vid/*/flat
"""
import sys, os, glob
import numpy as np
from PIL import Image
from collections import deque

BG = np.array([255, 0, 200], float)


def frames(d):
    return sorted(glob.glob(os.path.join(d, '*.png')))


def biggest(mask):
    """最大連通塊（4 鄰接）—— 從遮罩質心往外膨脹，只會長到「質心所在那一塊」。
    等價於 BFS 找最大塊（角色一定涵蓋質心），但用 numpy 位移運算，比逐像素快 30 倍以上。"""
    h, w = mask.shape
    ys, xs = np.where(mask)
    if not len(ys):
        return mask
    cy, cx = int(np.median(ys)), int(np.median(xs))
    if not mask[cy, cx]:                       # 質心剛好落在洞裡 → 往最近的遮罩像素挪
        d2 = (ys - cy) ** 2 + (xs - cx) ** 2
        k = int(np.argmin(d2)); cy, cx = int(ys[k]), int(xs[k])
    seed = np.zeros((h, w), bool)
    seed[cy, cx] = True
    while True:
        g = seed.copy()
        g[1:, :] |= seed[:-1, :]
        g[:-1, :] |= seed[1:, :]
        g[:, 1:] |= seed[:, :-1]
        g[:, :-1] |= seed[:, 1:]
        g &= mask
        if g.sum() == seed.sum():
            return g
        seed = g


def qc(d):
    fs = frames(d)
    if not fs:
        return None
    drift = 0
    touches = 0
    tops, bots, ls, rs, hs, areas = [], [], [], [], [], []
    prev = None
    motion = 0.0
    ref_h = None; cx0 = None
    ball = None
    for i, f in enumerate(fs):
        a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
        h, w = a.shape[:2]
        edge = np.concatenate([a[0:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                               a[:, 0:6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
        if np.linalg.norm(edge - BG, axis=1).mean() > 90:
            drift += 1
        m = np.linalg.norm(a - BG, axis=2) > 60
        if i % 3 == 0:                       # 每 3 幀做一次連通塊清理（慢，只為了量準）
            m = biggest(m)
        ys, xs = np.where(m)
        if not len(ys):
            continue
        if i == 0:
            ref_h = int(ys.max() - ys.min() + 1)
            cut = ys.min() + int(ref_h * 0.42)
            hm = m[:cut]
            hy, hx = np.where(hm)
            cx0 = float(hx.mean()) if len(hx) else float(xs.mean())
        if ys.min() <= 1 or ys.max() >= h - 2 or xs.min() <= 1 or xs.max() >= w - 2:
            touches += 1
        tops.append(int(ys.min())); bots.append(int(ys.max()))
        ls.append(int(xs.min())); rs.append(int(xs.max()))
        hs.append(int(ys.max() - ys.min() + 1)); areas.append(int(m.sum()))
        small = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((48, 48))) > 100
        if prev is not None:
            motion = max(motion, float(np.abs(small.astype(np.int8) - prev.astype(np.int8)).mean()))
        prev = small
        # 球：最大暗塊（只在中段取樣，開頭常常還沒出現）
        if 'hold' in d and i in (len(fs) // 2, len(fs) // 2 + 20):
            dark = a.max(axis=2) < 95
            b = biggest(dark)
            if b.sum() > 3500:
                by, bx = np.where(b)
                ball = (float(bx.mean()), float(by.mean()), int(b.sum()))
    foot0 = bots[0] if bots else 0
    med_h = float(np.median(hs)) if hs else 1
    res = dict(
        dir=d, n=len(fs), drift=drift, touch=touches, ref_h=ref_h,
        h_var_pct=round(100.0 * (max(hs) - min(hs)) / med_h, 1),
        base_min=min(bots), base_max=max(bots),
        left=round((cx0 - min(ls)) / ref_h, 3), right=round((max(rs) - cx0) / ref_h, 3),
        top=round((foot0 - min(tops)) / ref_h, 3),
        motion=round(motion, 3),
        area_var=round(100.0 * (max(areas) - min(areas)) / max(areas), 1),
    )
    if ball:
        res['ball_up'] = round((foot0 - ball[1]) / ref_h, 3)
        res['ball_side'] = round((ball[0] - cx0) / ref_h, 3)
        res['ball_px'] = ball[2]
    return res


def main(argv):
    if not argv or argv[0] == '--all':
        dirs = sorted(glob.glob('vid/*/flat'))
    else:
        dirs = argv
    print('%-28s %4s %4s %4s %5s %6s %6s %6s %7s %7s %6s %s'
          % ('目錄', '幀', '漂移', '觸邊', 'ref_h', '身高%', '底線', '左伸', '右伸', '動作', '面積%', '球(up/side)'))
    bad = []
    for d in dirs:
        r = qc(d)
        if not r:
            continue
        flag = []
        if r['drift']: flag.append('漂移')
        if r['touch']: flag.append('觸邊')
        if r['motion'] < 0.02: flag.append('幾乎不動')
        if r['h_var_pct'] > 9: flag.append('身高變動大')
        if r['base_max'] - r['base_min'] > 12: flag.append('底線浮動')
        if flag:
            bad.append((d, flag))
        ball = ''
        if 'ball_up' in r:
            ball = '%.3f/%.3f' % (r['ball_up'], r['ball_side'])
        print('%-28s %4d %4d %4d %5d %6.1f %3d~%-3d %6.2f %7.2f %7.3f %6.1f %s'
              % (r['dir'], r['n'], r['drift'], r['touch'], r['ref_h'], r['h_var_pct'],
                 r['base_min'], r['base_max'], r['left'], r['right'], r['motion'], r['area_var'], ball))
    if bad:
        print('\n需要複查：')
        for d, f in bad:
            print('  %-28s %s' % (d, '、'.join(f)))


if __name__ == '__main__':
    main(sys.argv[1:])
