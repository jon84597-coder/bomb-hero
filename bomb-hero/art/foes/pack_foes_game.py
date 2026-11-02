# -*- coding: utf-8 -*-
"""
把第一大關 6 隻小怪的 PNG 打包成遊戲用的單張貼圖（base64 webp）。

小怪沒有拆件（頭上沒有要獨立轉的部位），所以只需要「一張圖 ＋ 預設朝向」：
  · dir = 原圖朝哪邊（+1 面右 / -1 面左）→ 遊戲端用 scale(dir*look, 1) 鏡像就換向
  · asp = 寬/高（用內容 bbox 算，遊戲端 H 決定後寬度自動等比例）
  · hs  = 顯示高度 / 小怪外型半徑 R（每隻體型不同，逐一調）
  · anim = 動作型（jelly 果凍彈 / hop 跳 / inch 蠕動 / sway 搖 / skitter 爬）

輸出：_foes_game_parts.js（片段，供 patch 用）+ _foes_pack_report.txt
"""
import json
import io
import os
import base64
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'stage1')

# 遊戲內顯示高度 ≈ 30px，手機 DPR 2 + 縮放 2.5 → 150px，取 168 留餘裕
HT = 168
QUALITY = 84

# (檔名, 遊戲 id, 原圖朝向, 顯示高度倍率 hs, 動作)
SPECS = [
    ('01-slime',  'slime',  +1, 1.95, 'jelly'),
    ('02-bunny',  'bunny',  +1, 2.30, 'hop'),
    ('03-frog',   'frog',   -1, 1.88, 'hop'),
    ('04-cater',  'cater',  -1, 1.92, 'inch'),
    ('05-mush',   'mush',   +1, 1.95, 'sway'),
    ('06-beetle', 'beetle', -1, 1.74, 'skitter'),
]


def content_bbox(im):
    a = im.split()[3]
    # 只信 alpha > 8 的像素（羽化邊不算內容）
    mask = a.point(lambda v: 255 if v > 8 else 0)
    return mask.getbbox()


def enc(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6, lossless=False)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    out = []
    report = []
    total = 0
    for fname, key, d, hs, anim in SPECS:
        im = Image.open(os.path.join(SRC, fname + '.png')).convert('RGBA')
        bb = content_bbox(im)
        if not bb:
            raise SystemExit('%s 找不到內容' % fname)
        im = im.crop(bb)
        W0, H0 = im.size
        asp = W0 / float(H0)
        Ht = HT
        Wt = max(1, int(round(Ht * asp)))
        im = im.resize((Wt, Ht), Image.LANCZOS)
        data = enc(im)
        total += len(data)
        out.append('  %s: { dir: %d, hs: %.2f, asp: %.4f, anim: %s, u: "data:image/webp;base64,%s" },'
                   % (key, d, hs, asp, "'" + anim + "'", data))
        report.append('%-8s bbox %dx%d  asp %.3f  out %dx%d  %5.1f KB  dir %+d  hs %.2f  %s'
                      % (key, W0, H0, asp, Wt, Ht, len(data) / 1024.0, d, hs, anim))

    js = ('// ---------- v4.30：第一大關小怪美術（單張貼圖，靠鏡像轉向）----------\n'
          'const FOE_ART = {\n' + '\n'.join(out) + '\n};\n')
    io.open(os.path.join(ROOT, '_foes_game_parts.js'), 'w',
            encoding='utf-8', newline='').write(js)
    io.open(os.path.join(ROOT, '_foes_pack_report.txt'), 'w',
            encoding='utf-8', newline='').write('\n'.join(report))

    print('\n'.join(report))
    print('---- 合計 base64 %.0f KB ----' % (total / 1024.0))


if __name__ == '__main__':
    main()
