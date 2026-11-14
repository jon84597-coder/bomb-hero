# -*- coding: utf-8 -*-
"""_qc_batch.py — 一次品管多支影片，只印「能不能用」的關鍵數字。

判定（與 v5.95 起的規則一致）：
  背景漂移幀  → 邊界平均色距洋紅 > 90 的幀數（>0 就是壞，模型把洋紅換掉了）
  觸邊        → bbox 貼到畫面任一邊（會被裁掉）
  身高變動    → 相機有沒有偷偷推近／拉遠（>6% 要懷疑）
  動作幅度    → 相鄰幀剪影差最大值（<0.06 幾乎沒動）
用法：python _qc_batch.py vid/pig-walk vid/pig-idle ...
"""
import sys, os, glob, subprocess, tempfile
import numpy as np
from PIL import Image

BG = np.array([255, 0, 200], float)


def load(src):
    if os.path.isdir(src):
        return [np.array(Image.open(f).convert('RGB')).astype(np.float32)
                for f in sorted(glob.glob(os.path.join(src, '*.png')))]
    tmp = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vsync', '0',
                    os.path.join(tmp, 'f%04d.png')], check=True)
    return [np.array(Image.open(f).convert('RGB')).astype(np.float32)
            for f in sorted(glob.glob(os.path.join(tmp, '*.png')))]


def main(dirs):
    for d in dirs:
        mp4 = glob.glob(os.path.join(d, '*.mp4'))
        src = mp4[0] if mp4 else d
        fr = load(src)
        h, w = fr[0].shape[:2]
        drift, tops, bots, ls, rs, hs, sizes, masks = [], [], [], [], [], [], [], []
        prev = None
        for a in fr:
            edge = np.concatenate([a[0:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                                   a[:, 0:6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
            dist = np.linalg.norm(edge - BG, axis=1).mean()
            if dist > 90:
                drift.append(len(drift))
            m = np.linalg.norm(a - BG, axis=2) > 60
            ys, xs = np.where(m)
            if len(ys):
                tops.append(ys.min()); bots.append(ys.max())
                ls.append(xs.min()); rs.append(xs.max())
                hs.append(ys.max() - ys.min() + 1)
                sizes.append(m.sum())
            small = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((48, 48))) > 100
            if prev is not None:
                masks.append(np.abs(small.astype(np.int8) - prev.astype(np.int8)).mean())
            prev = small
        hmed = float(np.median(hs))
        var = 100.0 * (max(hs) - min(hs)) / hmed
        touch = (min(tops) <= 1) or (min(ls) <= 1) or (max(rs) >= w - 2) or (max(bots) >= h - 2)
        print('%-26s 幀%3d  漂移%3d  觸邊%-5s  身高變動%5.1f%%  動作max%.3f  面積變%5.1f%%'
              % (os.path.basename(d), len(fr), len(drift), 'YES' if touch else 'no', var,
                 max(masks) if masks else 0, 100.0 * (max(sizes) - min(sizes)) / max(sizes)))


if __name__ == '__main__':
    main(sys.argv[1:])
