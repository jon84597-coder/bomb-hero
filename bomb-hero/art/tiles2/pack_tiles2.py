# -*- coding: utf-8 -*-
"""v4.44：第一大關場景貼圖打包管線（自包含）。

輸入：4 張 AI 母圖（每張 2×2 四塊等大方磚 / 一整張草地）
輸出：12 張 128×128 webp → _tiles_game.js（TILE_ART）＋ tile-*.png 供目檢

處理鏈：
  1. kill_watermark  清掉右下角 AI 浮水印（只作用在 1024 母圖，縮到 128 看不出）
  2. clean_gaps      把「低飽和＋高亮」的數位白（磚縫殘留）填成砂漿色
  3. quad            內縮後切 1/4 = 一格一塊完整方磚
  4. tone            統一色系（灰石降飽和提亮、磚牆微暖）
  5. clip_hi         壓掉近純白高光（縮到 59px 會變成一圈白線）
  6. bevel           最外 2~3px 壓成深石縫 → 拼起來是磚牆而不是貼紙
  7. kill_vstripes   草地專用：AI 會生成整列偏亮的豎條紋，用列剖面減掉
"""
import io
import os
import base64
import json
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.abspath(os.path.join(ROOT, '..', '..', '..', 'generated-images'))
OUT_PX = 128
QUALITY = 74
MORTAR = (72, 58, 44)

SRC = {
    'hard': os.path.join(GEN, 'A_neat_two_by_two_wall_of_exac_2026-11-02T19-18-41.png'),
    'soft': os.path.join(GEN, 'Exactly_TWO_rows_and_TWO_colum_2026-11-02T19-11-47.png'),
    'outer': os.path.join(GEN, 'A_neat_two_by_two_wall_of_exac_2026-11-02T19-18-48.png'),
    'floor': os.path.join(GEN, 'Seamless_lush_cartoon_grass_la_2026-11-02T19-12-30.png'),
}


# ---------------------------------------------------------------- 影像工具
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
    if mask.sum() == 0:
        return im
    big = np.zeros((H, W), bool)
    big[y0:y1, x0:x1] = mask
    img = a.copy()
    for _ in range(150):
        avg = (np.roll(img, 1, 0) + np.roll(img, -1, 0) + np.roll(img, 1, 1) + np.roll(img, -1, 1)) / 4.0
        img[big] = avg[big]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    soft = out.filter(ImageFilter.GaussianBlur(1.4))
    mm = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))
    out.paste(soft.crop((x0, y0, x1, y1)), (x0, y0), mm)
    return out


def clean_gaps(im):
    """低飽和＋高亮的數位白（磚縫殘留）→ 砂漿色；米白石材飽和夠高不會誤傷。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    mn, mx = a.min(axis=2), a.max(axis=2)
    mask = (mn > 196) & ((mx - mn) < 20)
    if mask.sum() == 0:
        return im
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 6, a.shape[:2])[:, :, None]
    col = np.array(MORTAR, dtype=np.float32)[None, None, :] + noise
    a[mask] = col[mask]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def tone(im, sat=1.0, lum=1.0, warm=(0, 0, 0), warm_k=0.0):
    """統整色系：飽和度 / 亮度 / 往某個暖色靠。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    l = (a @ np.array([.299, .587, .114], dtype=np.float32))[:, :, None]
    a = l + (a - l) * sat
    a = a * lum
    if warm_k:
        a = a * (1 - warm_k) + np.array(warm, dtype=np.float32)[None, None, :] * warm_k
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def clip_hi(im, cap=242):
    """壓掉接近純白的高光（縮小後會變成一圈白線）。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    a = np.where(a > cap, cap + (a - cap) * 0.25, a)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def bevel(im, gap=3):
    """最外 gap px 壓成深石縫 + 內側一道 AO → 拼起來是磚牆網格。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    H, W, _ = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy))
    t = np.clip(1.0 - d / float(gap), 0, 1)[:, :, None]
    m = np.array(MORTAR, dtype=np.float32)[None, None, :]
    a = a * (1 - t) + m * t
    t2 = np.clip(1.0 - (d - gap) / 2.0, 0, 1)
    t2 = np.where(d >= gap, t2, 0)[:, :, None]
    a = a * (1 - t2 * 0.35)
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def kill_vstripes(im, k=1.0, win=220):
    """AI 草地特有：整列偏亮/偏暗形成豎條 → 用列均值剖面減掉。"""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    prof = a.mean(axis=0)
    ker = np.hanning(win); ker /= ker.sum()
    pad = np.pad(prof, ((win // 2, win // 2), (0, 0)), mode='edge')
    sm = np.stack([np.convolve(pad[:, c], ker, 'valid') for c in range(3)], axis=1)
    a = a - (prof - sm.mean(axis=0, keepdims=True))[None, :, :] * k
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def kill_hstripes(im, k=0.45, win=220):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    prof = a.mean(axis=1)
    ker = np.hanning(win); ker /= ker.sum()
    pad = np.pad(prof, ((win // 2, win // 2), (0, 0)), mode='edge')
    sm = np.stack([np.convolve(pad[:, c], ker, 'valid') for c in range(3)], axis=1)
    a = a - (prof - sm.mean(axis=0, keepdims=True))[:, None, :] * k
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def quad(im, i, inset=26):
    """內縮後切 1/4（避開母圖外圍那圈背景白）→ 一格一塊完整方磚。"""
    W, H = im.size
    im = im.crop((inset, inset, W - inset, H - inset))
    W, H = im.size
    x, y = (i % 2) * W // 2, (i // 2) * H // 2
    return im.crop((x, y, x + W // 2, y + H // 2))


def to_tile(im):
    return im.resize((OUT_PX, OUT_PX), Image.LANCZOS)


def prep(path):
    return clean_gaps(kill_watermark(Image.open(path).convert('RGB')))


# ---------------------------------------------------------------- 12 張貼圖
def build():
    hard = prep(SRC['hard'])
    soft = prep(SRC['soft'])
    outer = prep(SRC['outer'])
    fl = kill_hstripes(kill_vstripes(kill_watermark(Image.open(SRC['floor']).convert('RGB')), 1.0))
    return {
        'floor': [tone(to_tile(fl.crop(b)), 1.12, 1.06, (200, 220, 120), 0.06)
                  for b in [(0, 0, 512, 512), (512, 0, 1024, 512), (0, 512, 512, 1024)]],
        'hard': [bevel(clip_hi(tone(to_tile(quad(hard, i)), 0.72, 1.26, (214, 208, 190), 0.22)), 3)
                 for i in (0, 1, 2)],
        'soft': [bevel(clip_hi(tone(to_tile(quad(soft, i)), 1.06, 1.04, (255, 220, 180), 0.05)), 3)
                 for i in (0, 1, 2)],
        'outer': [bevel(clip_hi(tone(to_tile(quad(outer, i)), 0.84, 1.02, (226, 210, 176), 0.16), 238), 2)
                  for i in (0, 1, 2)],
    }


def main():
    tiles = build()
    total = 0
    meta = []
    lines = ['// ---------- 場景貼圖（自動生成，勿手改；來源 art/tiles2/pack_tiles2.py）----------',
             '// 第一大關專用：硬牆 3／軟牆 3／地板 3／外牆 3，每張 128×128、整格滿版。',
             'const TILE_ART = {']
    for kind in ('hard', 'soft', 'floor', 'outer'):
        lines.append('  %s: [' % kind)
        for i, t in enumerate(tiles[kind]):
            buf = io.BytesIO()
            t.save(buf, 'WEBP', quality=QUALITY, method=6)
            data = buf.getvalue()
            total += len(data)
            meta.append({'kind': kind, 'i': i, 'kb': round(len(data) / 1024.0, 1)})
            lines.append('    { u: "data:image/webp;base64,%s" },' % base64.b64encode(data).decode('ascii'))
            t.save(os.path.join(ROOT, 'tile-%s%d.png' % (kind, i)))
            print('  %-6s %d  %5.1f KB' % (kind, i, len(data) / 1024.0))
        lines.append('  ],')
    lines.append('};')
    js = '\n'.join(lines) + '\n'
    io.open(os.path.join(ROOT, '_tiles_game.js'), 'w', encoding='utf-8', newline='\n').write(js)
    io.open(os.path.join(ROOT, '_stats.json'), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(meta, ensure_ascii=False, indent=1) + '\n')
    print('\n  合計 %.1f KB（base64 %.1f KB / %d 字元）' % (total / 1024.0, len(js) / 1024.0, len(js)))


if __name__ == '__main__':
    main()
