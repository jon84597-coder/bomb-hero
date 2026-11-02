# -*- coding: utf-8 -*-
"""
從 8 張 1024 場景風格圖裡，自動挑出「乾淨的地面區塊」，做成 128px 可平鋪地板貼圖。
================================================================
思路：風格圖是 45° 等角，地面被磚塊切成小塊。手動猜座標很容易挑到磚角。
這裡用兩個指標自動篩：
  1. 梯度能量低   -> 區塊裡沒有磚塊輪廓、沒有裝飾物
  2. 顏色接近主題 floor 色 -> 不會挑到牆的陰影裡

用法：
    python pick_ground_from_style.py            # 只挑候選並輸出預覽
    python pick_ground_from_style.py --make     # 直接產出 tile-<theme>N.png
"""
import io
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
STYLE = os.path.join(HERE, '..', 'scene', 'style')

OUT_SIZE = 128
WIN = 200                      # 從風格圖取 200x200 -> 縮 128（縮比 0.64）
STEP = 40
# 只搜內圈：風格圖的四邊是外牆／背景虛空（海、天空、暗底），梯度最低但根本不是地面。
MARGIN = 170
PICK_N = 4
MIN_GAP = 210                  # 四塊中心距至少這麼遠，避免四塊幾乎一樣

# 主題 -> (風格圖, 目標地板色 / THEMES[i].floor)
THEMES = [
    ('lava', 'style-lava.png', (93, 72, 67)),
    ('neon', 'style-neon.png', (68, 60, 120)),
    ('sea',  'style-sea.png',  (116, 163, 166)),
    ('sky',  'style-sky.png',  (238, 243, 251)),
    ('dark', 'style-dark.png', (88, 64, 80)),
]


def grad_energy(a):
    """區塊內的「邊緣強度」：磚塊輪廓、裝飾物都會拉高。"""
    gx = np.abs(np.diff(a, axis=1)).mean()
    gy = np.abs(np.diff(a, axis=0)).mean()
    return float(gx + gy)


def scan(path, target):
    im = Image.open(path).convert('RGB')
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(im, np.float32)
    H, W = a.shape[:2]
    cands = []
    for y in range(MARGIN, H - WIN - MARGIN + 1, STEP):
        for x in range(MARGIN, W - WIN - MARGIN + 1, STEP):
            blk = a[y:y + WIN, x:x + WIN]
            m = blk.reshape(-1, 3).mean(axis=0)
            cd = float(np.abs(m - np.array(target, np.float32)).sum())
            g = grad_energy(blk)
            cands.append(dict(x=x, y=y, cx=x + WIN // 2, cy=y + WIN // 2,
                              grad=round(g, 2), cdist=round(cd, 1),
                              mean=[round(float(v), 1) for v in m]))
    return cands


def pick(cands, n=PICK_N):
    """地面 = 「顏色接近主題色」＋「沒有磚塊輪廓」。兩者都算分，不能只看梯度。"""
    def score(c):
        return c['cdist'] * 0.55 + c['grad'] * 9.0
    ok = sorted(cands, key=score)
    chosen = []
    for c in ok:
        if all((c['cx'] - o['cx']) ** 2 + (c['cy'] - o['cy']) ** 2 > MIN_GAP ** 2 for o in chosen):
            chosen.append(c)
        if len(chosen) >= n:
            break
    return chosen


def preview(theme, path, blocks, out):
    """把選中的四塊並排（2x 放大），方便目視檢查有沒有磚角。"""
    W = len(blocks) * (OUT_SIZE + 10) + 10
    cv = Image.new('RGB', (W, OUT_SIZE + 20), (30, 30, 32))
    for i, b in enumerate(blocks):
        cv.paste(b, (10 + i * (OUT_SIZE + 10), 10))
    cv.resize((cv.width * 2, cv.height * 2), Image.LANCZOS).save(out)


def main():
    make = '--make' in sys.argv
    allinfo = {}
    for theme, fn, target in THEMES:
        p = os.path.join(STYLE, fn)
        cands = scan(p, target)
        sel = pick(cands)
        print('\n== %s ==  目標色 %s，候選 %d，選 %d' % (theme, target, len(cands), len(sel)))
        for c in sel:
            print('   @%4d,%4d  grad %6.2f  cdist %6.1f  mean %s' % (c['x'], c['y'], c['grad'], c['cdist'], c['mean']))
        allinfo[theme] = [dict(x=c['x'], y=c['y']) for c in sel]

        im = Image.open(p).convert('RGB')
        blocks = []
        for c in sel:
            b = im.crop((c['x'], c['y'], c['x'] + WIN, c['y'] + WIN)).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
            blocks.append(b)
        preview(theme, p, blocks, os.path.join(HERE, '_pick-%s.png' % theme))

    io.open(os.path.join(HERE, '_picks.json'), 'w', encoding='utf-8').write(
        json.dumps(allinfo, ensure_ascii=False, indent=1))
    print('\n候選座標已寫入 _picks.json；預覽 _pick-<theme>.png')


if __name__ == '__main__':
    main()
