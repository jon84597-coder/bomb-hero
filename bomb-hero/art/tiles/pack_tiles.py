# -*- coding: utf-8 -*-
"""v4.43：把 9 張場景貼圖（硬牆×3／軟牆×1／地板×3／外牆×2）打包成遊戲用資料。

- 清掉右下角浮水印（亮度差遮罩 + 擴散填補，只在 1024 原圖上做，縮到 144 後完全看不出）
- 輸出 144×144 webp（q=78），產生 _tiles_game.js（TILE_ART）
"""
import io
import os
import base64
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_PX = 144
QUALITY = 78

# 檔名關鍵字 → (分類, 索引)
SPECS = [
    ('hard',  0, '_raw/One_square_game_tile__top_down_2026-11-02T18-46-12.png'),
    ('hard',  1, '_raw/One_square_game_tile__top_down_2026-11-02T18-46-42.png'),
    ('hard',  2, '_raw2/One_square_game_tile__top_down_2026-11-02T18-49-13.png'),
    ('soft',  0, '_raw/One_square_game_tile__top_down_2026-11-02T18-47-09.png'),
    ('floor', 0, '_raw/One_square_floor_tile__top_dow_2026-11-02T18-47-24.png'),
    ('floor', 1, '_raw/One_square_floor_tile__top_dow_2026-11-02T18-47-43.png'),
    ('floor', 2, '_raw/One_square_floor_tile__top_dow_2026-11-02T18-47-56.png'),
    ('outer', 0, '_raw2/One_single_square_game_tile_se_2026-11-02T18-48-59.png'),
    ('outer', 1, '_raw/One_square_game_tile__top_down_2026-11-02T18-48-28.png'),
]


def kill_watermark(im):
    """右下角浮水印：取「比模糊背景亮 & 低飽和」的像素，往內擴散填補。"""
    W, H = im.size
    x0, y0, x1, y1 = W - 200, H - 140, W, H
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    reg = a[y0:y1, x0:x1]
    gray = reg @ np.array([.299, .587, .114], dtype=np.float32)
    bg = np.asarray(Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.GaussianBlur(13))).astype(np.float32)
    diff = gray - bg
    sat = reg.max(axis=2) - reg.min(axis=2)
    mask = (diff > 6) & (sat < 46)
    for _ in range(2):
        m = mask.copy()
        m[1:, :] |= mask[:-1, :]; m[:-1, :] |= mask[1:, :]
        m[:, 1:] |= mask[:, :-1]; m[:, :-1] |= mask[:, 1:]
        mask = m
    n = int(mask.sum())
    if n == 0:
        return im, 0
    big = np.zeros((H, W), bool)
    big[y0:y1, x0:x1] = mask
    img = a.copy()
    for _ in range(180):
        avg = (np.roll(img, 1, 0) + np.roll(img, -1, 0) + np.roll(img, 1, 1) + np.roll(img, -1, 1)) / 4.0
        img[big] = avg[big]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    soft = out.filter(ImageFilter.GaussianBlur(1.4))
    mm = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    out.paste(soft.crop((x0, y0, x1, y1)), (x0, y0), mm)
    return out, n


def add_thickness(im):
    """軟磚那張太平 → 補一道右／下的厚度陰影，才像「立起來的方塊」。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    H, W, _ = a.shape
    band = int(W * 0.13)
    xs = np.arange(W)[None, :]
    ys = np.arange(H)[:, None]
    # 右側 13%、下側 13% 漸暗（越靠邊越暗）
    wr = np.clip((xs - (W - band)) / float(band), 0, 1)
    wb = np.clip((ys - (H - band)) / float(band), 0, 1)
    k = np.maximum(wr, wb) * 0.30                      # 最多壓暗 30%
    a *= (1.0 - k)[:, :, None]
    # 邊緣再壓一條暗線
    a[:, -2:, :] *= 0.80
    a[-2:, :, :] *= 0.80
    # 左上補一道窄亮邊
    a[:2, :, :] = np.clip(a[:2, :, :] * 1.10, 0, 255)
    a[:, :2, :] = np.clip(a[:, :2, :] * 1.10, 0, 255)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def unify_hue(im, sat_k=0.55, warm_k=0.55):
    """把某張石牆的色偏拉回來（v4.43：三張硬牆一張偏暖、兩張偏冷 → 拼起來很花）。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lum = (a @ np.array([.299, .587, .114], dtype=np.float32))[:, :, None]
    a = lum + (a - lum) * sat_k                     # 降飽和
    a = a * warm_k + np.array([246, 243, 235], dtype=np.float32) * (1 - warm_k)   # 往暖白靠
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    groups = {}
    total = 0
    meta = []
    for kind, idx, rel in SPECS:
        src = os.path.join(ROOT, rel)
        im = Image.open(src).convert('RGB')
        im, wm = kill_watermark(im)
        if kind == 'soft':
            im = add_thickness(im)
        if kind == 'hard' and idx == 1:
            im = unify_hue(im)
        im = im.resize((OUT_PX, OUT_PX), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=QUALITY, method=6)
        data = buf.getvalue()
        total += len(data)
        groups.setdefault(kind, []).append(base64.b64encode(data).decode('ascii'))
        meta.append({'kind': kind, 'i': idx, 'kb': round(len(data) / 1024.0, 1), 'wm': wm})
        im.save(os.path.join(ROOT, 'tile-%s%d.png' % (kind, idx)))
        print('  %-6s %d  %5.1f KB  watermark px=%d' % (kind, idx, len(data) / 1024.0, wm))

    lines = []
    lines.append('// ---------- 場景貼圖（自動生成，勿手改；來源 art/tiles/pack_tiles.py）----------')
    lines.append('// 第一大關專用：硬牆 3／軟牆 1／地板 3／外牆 2，每張 144×144、整格滿版。')
    lines.append('const TILE_ART = {')
    for kind in ('hard', 'soft', 'floor', 'outer'):
        arr = groups.get(kind, [])
        lines.append('  %s: [' % kind)
        for b in arr:
            lines.append('    { u: "data:image/webp;base64,%s" },' % b)
        lines.append('  ],')
    lines.append('};')
    js = '\n'.join(lines) + '\n'
    io.open(os.path.join(ROOT, '_tiles_game.js'), 'w', encoding='utf-8', newline='\n').write(js)

    print('')
    print('  合計 %.1f KB（base64 %.1f KB）' % (total / 1024.0, len(js) / 1024.0))
    io.open(os.path.join(ROOT, '_stats.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(meta, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
