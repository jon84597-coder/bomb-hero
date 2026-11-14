# -*- coding: utf-8 -*-
"""export_pet.py — 把隨從的動作輸出成 spr/pet-anim-<角色>-<動作>.webp

跟 export_game.py（主角）的差別只有四個：
  1. **角色高度比較矮**：隨從在遊戲裡只有主角的四成高（~48px），
     charHpx 用 132 已經有 2.7 倍餘量；主角用 200 是因為他要撐到 78px。
  2. 動作名稱不一樣：idle / move / attack / hurt / victory（主角是 walk／hold…）。
  3. **裁切框自動量測**：五支動作 × 12 格的聯集 bbox，水平以「對齊中心」對稱，
     垂直含腳底基線 —— 手寫的框很容易把刀光／盾牌切掉，或讓角色偏一邊。
  4. cellH/ay 逐隻不同（犀牛有盾牌，框比較高）→ meta 一起寫出來給 main.js 填。

用法：
    python export_pet.py blade            # 量測 + 匯出
    python export_pet.py blade --measure  # 只印建議裁切框，不寫檔
"""
import os
import sys
import json
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'spr'))

CHAR_H_CANVAS = 1069.0     # anim_batch 對齊後的角色高度（與主角同一個量綱）
CHAR_H_PET = 132.0         # 輸出素材裡的角色高度（遊戲顯示 48~58px，約 2.5 倍餘量）
FOOT_Y_CANVAS = 1360.0
SCALE = CHAR_H_PET / CHAR_H_CANVAS

ACTS = ['idle', 'move', 'attack', 'hurt', 'victory']

PETS = {
    # cx＝anim_batch 的水平對齊中心；canvas＝anim_batch 的畫布寬（1340）。
    'blade':  dict(src='frames_pet_wolf',  cx=670, canvas=1340),
    'bomber': dict(src='frames_pet_monkey', cx=670, canvas=1340),
    'guard':  dict(src='frames_pet_rhino', cx=670, canvas=1340),
}

PAD_X = 8       # 刀光／盾牌邊緣的防鋸齒餘量（內容本來就留了空白，不用再墊大）
PAD_T = 14
PAD_B = 12


def clean(a):
    """alpha 幾乎是 0 的像素把 RGB 一起歸零 —— 否則縮放會把淡色暈成方塊。"""
    al = a[:, :, 3]
    kill = al < 8
    a[kill, :3] = 0
    a[kill, 3] = 0
    return a


def frames_of(cfg, act):
    d = os.path.join(HERE, cfg['src'], act)
    if not os.path.isdir(d):
        return []
    return [os.path.join(d, '%02d.png' % i) for i in range(12)
            if os.path.isfile(os.path.join(d, '%02d.png' % i))]


def measure(cfg):
    """回傳五支動作的聯集 bbox (x0, y0, x1, y1)，座標為畫布座標（右開）。"""
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    for act in ACTS:
        for p in frames_of(cfg, act):
            a = np.array(Image.open(p).convert('RGBA'))[:, :, 3]
            ys = np.where((a > 8).any(axis=1))[0]
            if not len(ys):
                continue
            xs = np.where((a > 8).any(axis=0))[0]
            x0 = min(x0, int(xs.min()))
            x1 = max(x1, int(xs.max()) + 1)
            y0 = min(y0, int(ys.min()))
            y1 = max(y1, int(ys.max()) + 1)
    if x1 < 0:
        raise SystemExit('量不到任何內容：%s' % cfg['src'])
    return x0, y0, x1, y1


def crop_of(cfg):
    """不對稱緊裁：左邊界就取「內容最左 - PAD」，不強制以 cx 對稱 ——
    狼的刀光弧往左掃得比右邊遠很多，對稱裁切會白白多出一大塊透明區域。"""
    cx = cfg['cx']
    x0, y0, x1, y1 = measure(cfg)
    left = max(0, x0 - PAD_X)
    right = min(cfg['canvas'], x1 + PAD_X)
    top = max(0, y0 - PAD_T)
    bot = max(int(y1) + PAD_B, int(FOOT_Y_CANVAS) + 4)
    return (left, top, right - left, bot - top), (x0, y0, x1, y1)


def main(key, measure_only=False):
    cfg = PETS[key]
    (cxx, cyy, cw, ch), bb = crop_of(cfg)
    cell_w = int(round(cw * SCALE))
    cell_h = int(round(ch * SCALE))
    ax = (cfg['cx'] - cxx) * SCALE             # 腳底中心（對齊中心）在格子裡的位置
    ay = (FOOT_Y_CANVAS - cyy) * SCALE

    print('%s  bbox %s  →  crop (%d, %d, %d, %d)  cell %dx%d  ax %.2f ay %.2f'
          % (key, bb, cxx, cyy, cw, ch, cell_w, cell_h, ax, ay))
    if measure_only:
        return

    meta = {'v': 1, 'charHpx': int(CHAR_H_PET), 'cellW': cell_w, 'cellH': cell_h,
            'ax': round(ax, 2), 'ay': round(ay, 2), 'actions': {}}
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for act in ACTS:
        files = frames_of(cfg, act)
        if len(files) < 12:
            print('  ! %s 只有 %d 格，跳過' % (act, len(files)))
            continue
        sheet = Image.new('RGBA', (cell_w * 12, cell_h), (0, 0, 0, 0))
        for i, p in enumerate(files[:12]):
            im = Image.fromarray(clean(np.array(Image.open(p).convert('RGBA'))), 'RGBA')
            im = im.crop((cxx, cyy, cxx + cw, cyy + ch))
            im = im.resize((cell_w, cell_h), Image.LANCZOS)
            sheet.alpha_composite(im, (cell_w * i, 0))
        fn = 'pet-anim-%s-%s.webp' % (key, act)
        sheet.save(os.path.join(OUT, fn), 'WEBP', quality=78, method=5)
        kb = os.path.getsize(os.path.join(OUT, fn)) / 1024.0
        total += kb
        meta['actions'][act] = {'file': fn, 'frames': 12}
        print('  %-8s %s  %dx%d  %.0f KB' % (act, fn, sheet.width, sheet.height, kb))
    with open(os.path.join(OUT, 'pet-anim-%s.json' % key), 'w',
              encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    print('  %s  cell %dx%d  ax %.2f ay %.2f  合計 %.0f KB'
          % (key, cell_w, cell_h, ax, ay, total))


if __name__ == '__main__':
    k = sys.argv[1] if len(sys.argv) > 1 else 'blade'
    main(k, '--measure' in sys.argv)
