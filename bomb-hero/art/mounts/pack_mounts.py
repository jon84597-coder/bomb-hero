# -*- coding: utf-8 -*-
"""
把龍坐騎（原色／紅色）打包成遊戲用的單張貼圖（base64 webp）。

坐騎跟小怪一樣「沒有拆件」——整張圖用變形做動畫（bob／擠壓／前傾），
所以資料只需要：
  · asp = 寬/高（用內容 bbox 算，遊戲端 H 決定後寬度自動等比例）
  · dir = 原圖朝哪邊（+1 面右 / -1 面左）→ 遊戲端用 scale(dir*look, 1) 鏡像換向
  · u   = webp data URI

輸出：_mounts_game.js（片段，供 patch_mounts.py 用）+ _mounts_pack_report.txt
"""
import io
import os
import base64
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))

# 遊戲內顯示高度 ≈ 68px（T≈40），手機 DPR2＋縮放 2.5 → 340px，取 256 留餘裕
HT = 256
QUALITY = 86

# (檔名, 遊戲鍵名, 原圖朝向)
SPECS = [
    ('dragon-green', 'green', +1),
    ('dragon-red',   'red',   +1),
]


def content_bbox(im):
    a = im.split()[3]
    mask = a.point(lambda v: 255 if v > 8 else 0)
    return mask.getbbox()


def enc(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6, lossless=False)
    return base64.b64encode(buf.getvalue()).decode('ascii')


def main():
    lines = []
    report = []
    total = 0
    for fn, key, d in SPECS:
        src = os.path.join(ROOT, fn + '.png')
        im = Image.open(src).convert('RGBA')
        bb = content_bbox(im)
        if bb:
            im = im.crop(bb)
        W, H = im.size
        asp = round(W / float(H), 4)
        Ht = HT
        Wt = max(1, int(round(HT * asp)))
        if (Wt, Ht) != im.size:
            im = im.resize((Wt, Ht), Image.LANCZOS)
        u = enc(im)
        total += len(u)
        lines.append("  %s: { dir: %+d, asp: %.4f, u: \"data:image/webp;base64,%s\" }"
                     % (key, d, asp, u))
        report.append('%-6s %4dx%-4d asp=%.4f  base64=%dKB' % (key, W, H, asp, len(u) // 1024))
    js = ("// ---------- 龍坐騎美術（自動生成，勿手改；來源 art/mounts/pack_mounts.py）----------\n"
          "// 原色綠龍／紅色紅龍各一張；dir = 原圖朝向（+1 面右），asp = 寬/高。\n"
          "const MOUNT_ART = {\n" + ',\n'.join(lines) + "\n};\n")
    out = os.path.join(ROOT, '_mounts_game.js')
    io.open(out, 'w', encoding='utf-8', newline='\n').write(js)
    rep = '\n'.join(report) + '\ntotal base64 %dKB -> %s' % (total // 1024, out)
    io.open(os.path.join(ROOT, '_mounts_pack_report.txt'), 'w', encoding='utf-8', newline='\n').write(rep)
    print(rep)


if __name__ == '__main__':
    main()
