# -*- coding: utf-8 -*-
"""key_flat.py — 任意「單色棚拍背景」去背（洋紅／綠幕／暗紅都吃）

為什麼需要這支：影片模型偶爾會把 #FF00C8 洋紅底換成綠色（chroma key 慣性）
或壓暗成暗紅，vid2frames.py 只認洋紅 → 那些影片全部作廢，只能重花點數。
這支改成「每一幀都自己採樣邊界顏色」，用那個顏色去 flood，所以背景換色也救得回來。

用法：python key_flat.py <mp4|幀目錄> <輸出資料夾>

輸出：<輸出>/*.png（RGBA、原尺寸、未縮放未對位 —— 交給 anim_batch 統一縮放與對齊）
"""
import sys, os, glob, subprocess, tempfile
import numpy as np
from PIL import Image
from collections import deque

TOL = 62          # 與背景色的距離 < TOL 視為背景（flood 只從邊界長進去）
FRINGE = 46       # 剩下的邊緣污染（比 TOL 嚴）→ alpha 直接歸零


def frames(src):
    if os.path.isdir(src):
        got = sorted(glob.glob(os.path.join(src, '*.png')))
        if got:
            return got
        mp4 = sorted(glob.glob(os.path.join(src, '*.mp4')))
        if not mp4:
            raise SystemExit('這個目錄裡沒有 mp4／png：%s' % src)
        src = mp4[0]
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vsync', '0',
                    os.path.join(tmp, 'f%04d.png')], check=True)
    return sorted(glob.glob(os.path.join(tmp, '*.png')))


def border_color(a):
    """四邊各 6px 的中位色 —— 比單點穩，也不會被角色碰到邊界帶歪。"""
    strips = [a[0:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
              a[:, 0:6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)]
    return np.median(np.concatenate(strips), axis=0)


def key_frame(a, bg):
    """從邊界 flood（numpy 迭代膨脹，結果與 BFS 相同）；再清邊緣污染。回傳 RGBA。"""
    h, w = a.shape[:2]
    d = np.linalg.norm(a - bg, axis=2)
    near = d < TOL
    seed = np.zeros((h, w), bool)
    seed[0, :] = near[0, :]
    seed[-1, :] = near[-1, :]
    seed[:, 0] |= near[:, 0]
    seed[:, -1] |= near[:, -1]
    # 4 鄰接膨脹直到收斂（純 numpy，比逐像素 BFS 快 20 倍以上）
    while True:
        g = seed.copy()
        g[1:, :] |= seed[:-1, :]
        g[:-1, :] |= seed[1:, :]
        g[:, 1:] |= seed[:, :-1]
        g[:, :-1] |= seed[:, 1:]
        g &= near
        if g.sum() == seed.sum():
            break
        seed = g
    seen = seed
    out = np.dstack([a, np.where(seen, 0, 255)]).astype(np.uint8)
    # 邊緣污染：還沒被挖掉、但顏色仍很接近背景 → 半透明化再歸零
    fringe = (~seen) & (d < FRINGE)
    out[fringe, 3] = 0
    out[fringe, :3] = 0
    return out


WM_W, WM_H = 250, 84          # 左上角 AI 浮水印（768 版座標，其他尺寸按比例）


def main(src, outdir):
    fs = frames(src)
    os.makedirs(outdir, exist_ok=True)
    for i, f in enumerate(fs):
        a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
        h, w = a.shape[:2]
        bg = border_color(a)
        rgba = key_frame(a, bg)
        # 浮水印：左上角一律挖掉（角色頭部不會到那裡），再整張壓回洋紅 ——
        #   這樣 anim_batch 的洋紅去背照樣能用，不必改共用管線。
        rgba[0:int(h * WM_H / 768.0), 0:int(w * WM_W / 768.0), 3] = 0
        al = (rgba[:, :, 3:4] / 255.0)
        comp = rgba[:, :, :3] * al + np.array([255, 0, 200]) * (1 - al)
        Image.fromarray(comp.astype(np.uint8), 'RGB').save(os.path.join(outdir, '%04d.png' % i))
    # 回報：邊界殘留 / 角色佔比（輸出是「壓回洋紅的 RGB」，所以用顏色距離判斷）
    chk = sorted(glob.glob(os.path.join(outdir, '*.png')))
    bad = 0; ratios = []
    for f in chk:
        a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
        e = np.concatenate([a[0:4].reshape(-1, 3), a[-4:].reshape(-1, 3),
                            a[:, 0:4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
        if np.linalg.norm(e - np.array([255, 0, 200]), axis=1).mean() > 40:
            bad += 1
        ratios.append((np.linalg.norm(a - np.array([255, 0, 200]), axis=2) > 60).mean())
    print('%s → %d 幀  邊界殘留 %d 幀  角色佔比 %.1f%%~%.1f%%'
          % (outdir, len(chk), bad, 100 * min(ratios), 100 * max(ratios)))
    return bad


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
