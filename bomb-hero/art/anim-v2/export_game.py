# -*- coding: utf-8 -*-
"""把 anim-v2 的六套動作輸出成遊戲用精靈圖（spr/hero-anim-rabbit-*.webp）。

要點：
  1. 逐幀做連通塊清理 —— 影片壓縮會在畫面邊緣留下一條 alpha=255 的近白細條，
     肉眼在淺底看不到，但貼到遊戲裡會變成淡白色方塊。
  2. 所有動作共用「同一個裁切框 + 同一個縮放 + 同一個錨點（腳底中心）」，
     所以切換動作時位置與比例天生一致，不可能跳。
"""
import os
import json
import glob
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'spr'))

FRAMES = {
    'walk':    lambda i: os.path.join(HERE, 'frames_game', 'w%02d.png' % i),
    'idle':    lambda i: os.path.join(HERE, 'frames_anim', 'idle', '%02d.png' % i),
    'hold':    lambda i: os.path.join(HERE, 'frames_anim', 'hold', '%02d.png' % i),
    'throw':   lambda i: os.path.join(HERE, 'frames_anim', 'throw', '%02d.png' % i),
    'hurt':    lambda i: os.path.join(HERE, 'frames_anim', 'hurt', '%02d.png' % i),
    'victory': lambda i: os.path.join(HERE, 'frames_anim', 'victory', '%02d.png' % i),
}

CROP_X, CROP_Y, CROP_W, CROP_H = 70, 150, 760, 1250
ANCHOR_X, ANCHOR_Y = 450.0, 1360.0     # 畫布座標裡「腳底中心」的位置
CHAR_H_CANVAS = 1069.0                 # 角色在 900x1560 畫布上的高度
TARGET_H = 200                         # 輸出素材裡的角色高度（遊戲約顯示 78px，約 2.5x 餘量）
SCALE = TARGET_H / CHAR_H_CANVAS
CELL_W = int(round(CROP_W * SCALE))
CELL_H = int(round(CROP_H * SCALE))
AX = (ANCHOR_X - CROP_X) * SCALE
AY = (ANCHOR_Y - CROP_Y) * SCALE


def clean(a):
    """alpha 幾乎為 0 的像素把 RGB 一起歸零 —— 否則縮放時會把淡色暈成方塊。"""
    al = a[:, :, 3]
    kill = al < 8
    a[kill, :3] = 0
    a[kill, 3] = 0
    return a


def load(act, i):
    im = Image.open(FRAMES[act](i)).convert('RGBA')
    a = clean(np.array(im))
    return Image.fromarray(a, 'RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {
        'v': 1,
        'charHpx': TARGET_H,
        'cellW': CELL_W, 'cellH': CELL_H,
        'ax': round(AX, 2), 'ay': round(AY, 2),
        'actions': {},
    }
    for act in FRAMES:
        sheet = Image.new('RGBA', (CELL_W * 12, CELL_H), (0, 0, 0, 0))
        for i in range(12):
            im = load(act, i).crop((CROP_X, CROP_Y, CROP_X + CROP_W, CROP_Y + CROP_H))
            im = im.resize((CELL_W, CELL_H), Image.LANCZOS)
            sheet.alpha_composite(im, (CELL_W * i, 0))
        fn = 'hero-anim-rabbit-%s.webp' % act
        sheet.save(os.path.join(OUT, fn), 'WEBP', quality=80, method=5)
        kb = os.path.getsize(os.path.join(OUT, fn)) / 1024.0
        meta['actions'][act] = {'file': fn, 'frames': 12}
        print('%-8s %s  %dx%d  %.0f KB' % (act, fn, sheet.width, sheet.height, kb))
    with open(os.path.join(OUT, 'hero-anim-rabbit.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print('\ncell %dx%d  anchor (%.1f, %.1f)  charHpx %d' % (CELL_W, CELL_H, AX, AY, TARGET_H))


if __name__ == '__main__':
    main()
