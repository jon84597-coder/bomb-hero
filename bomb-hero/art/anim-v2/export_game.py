# -*- coding: utf-8 -*-
"""把 anim-v2 的動作輸出成遊戲用精靈圖（spr/hero-anim-<角色>-*.webp）

要點：
  1. 逐幀做連通塊清理 —— 影片壓縮會在畫面邊緣留下一條 alpha=255 的近白細條，
     肉眼在淺底看不到，但貼到遊戲裡會變成淡白色方塊。
  2. 同一隻角色的所有動作共用「同一個裁切框 + 同一個縮放 + 同一個錨點（腳底中心）」，
     所以切換動作時位置與比例天生一致，不可能跳。
  3. 裁切框可以「逐隻角色」不同（小熊比兔子胖，900 寬的畫布會把手掌切掉），
     但縮放基準 CHAR_H_CANVAS 一定要一樣，否則每隻角色大小不同。

用法：python export_game.py [角色key]
"""
import os
import sys
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'spr'))

CHAR_H_CANVAS = 1069.0                 # 角色在畫布上的高度（所有角色一致）
TARGET_H = 200                         # 輸出素材裡的角色高度（遊戲約顯示 78px，約 2.5x 餘量）
FOOT_Y_CANVAS = 1360.0                 # 腳底基線（畫布座標）
SCALE = TARGET_H / CHAR_H_CANVAS

CHARS = {
    # 裁切框＝(x, y, w, h)，畫布座標。中心 x 必須等於 x + w/2（錨點靠它對齊）
    'rabbit': dict(src='frames_anim', crop=(70, 150, 760, 1250),
                   acts=['walk', 'idle', 'hold', 'throw', 'hurt', 'victory'],
                   walk='frames_game/w%02d.png'),
    # 小熊：1080 寬畫布（手臂甩出去到 ±531）。走路也走這套，所以沒有 frames_game。
    'bear':   dict(src='frames_anim_bear', crop=(0, 150, 1080, 1250),
                   acts=['walk', 'idle', 'hold', 'victory', 'hurt', 'throw'], walk=None),
    # 柴犬（v5.96）：站姿比兔兔寬一點，勝利雙手一張會頂到 900 的左邊界 → 畫布 1000。
    'dog':    dict(src='frames_anim_dog', crop=(0, 150, 1000, 1250),
                   acts=['walk', 'idle', 'hold', 'victory'], walk=None),
}


def clean(a):
    """alpha 幾乎為 0 的像素把 RGB 一起歸零 —— 否則縮放時會把淡色暈成方塊。"""
    al = a[:, :, 3]
    kill = al < 8
    a[kill, :3] = 0
    a[kill, 3] = 0
    return a


def main(key):
    cfg = CHARS[key]
    cx, cy, cw, ch = cfg['crop']
    cell_w = int(round(cw * SCALE))
    cell_h = int(round(ch * SCALE))
    ax = (cx + cw / 2.0 - cx) * SCALE      # 錨點在裁切框裡的座標
    ay = (FOOT_Y_CANVAS - cy) * SCALE

    def load(act, i):
        if act == 'walk' and cfg['walk']:
            p = os.path.join(HERE, cfg['walk'] % i)
        else:
            p = os.path.join(HERE, cfg['src'], act, '%02d.png' % i)
        return Image.fromarray(clean(np.array(Image.open(p).convert('RGBA'))), 'RGBA')

    meta = {
        'v': 1,
        'charHpx': TARGET_H,
        'cellW': cell_w, 'cellH': cell_h,
        'ax': round(ax, 2), 'ay': round(ay, 2),
        'actions': {},
    }
    os.makedirs(OUT, exist_ok=True)
    for act in cfg['acts']:
        sheet = Image.new('RGBA', (cell_w * 12, cell_h), (0, 0, 0, 0))
        for i in range(12):
            im = load(act, i).crop((cx, cy, cx + cw, cy + ch))
            im = im.resize((cell_w, cell_h), Image.LANCZOS)
            sheet.alpha_composite(im, (cell_w * i, 0))
        fn = 'hero-anim-%s-%s.webp' % (key, act)
        sheet.save(os.path.join(OUT, fn), 'WEBP', quality=80, method=5)
        kb = os.path.getsize(os.path.join(OUT, fn)) / 1024.0
        meta['actions'][act] = {'file': fn, 'frames': 12}
        print('%-8s %s  %dx%d  %.0f KB' % (act, fn, sheet.width, sheet.height, kb))
    with open(os.path.join(OUT, 'hero-anim-%s.json' % key), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print('\n%s  cell %dx%d  anchor (%.2f, %.2f)  charHpx %d' % (key, cell_w, cell_h, ax, ay, TARGET_H))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'rabbit')
