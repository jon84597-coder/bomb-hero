# -*- coding: utf-8 -*-
"""vid_qc.py — 影片品管：背景穩定度 + 動作幅度

用法：python vid_qc.py <mp4|幀目錄> [幀數上限]

輸出：
  - 每幀四角／邊界平均色距洋紅多遠（>90 視為背景漂移的壞幀）
  - 角色 bbox 與腳底位置（確認相機沒動、沒走出畫面）
  - 動作幅度：相鄰幀剪影差 + bbox 面積變化 + 質心位移
"""
import sys, os, glob, subprocess, tempfile
import numpy as np
from PIL import Image

BG = np.array([255, 0, 200], float)


def frames(src, tmp):
    if os.path.isdir(src):
        return sorted(glob.glob(os.path.join(src, '*.png')))
    subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vsync', '0',
                    os.path.join(tmp, 'f%04d.png')], check=True)
    return sorted(glob.glob(os.path.join(tmp, 'f*.png')))


def main(src, limit=None):
    tmp = tempfile.mkdtemp()
    fs = frames(src, tmp)
    if limit:
        fs = fs[:int(limit)]
    prev = None
    rows = []
    for i, f in enumerate(fs):
        a = np.array(Image.open(f).convert('RGB')).astype(np.float32)
        h, w = a.shape[:2]
        # 邊界一圈（背景可信區）
        edge = np.concatenate([a[0:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
                               a[:, 0:6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
        dbg = np.sqrt(((edge - BG) ** 2).sum(axis=1)).mean()
        d = np.sqrt(((a - BG) ** 2).sum(axis=2))
        m = d > 60
        # 影片模型固定在左上角烙「AI生成」浮水印 —— 那是雜訊，不能算進角色 bbox。
        # （輸出裁切框 (70,150,760,1250) 天然會把它切掉，所以不必額外去除。）
        m[0:84, 0:250] = False
        area = int(m.sum())
        if area < 50:
            rows.append((i, dbg, 0, 0, 0, 0, 0, 0))
            continue
        ys, xs = np.where(m)
        cy, cx = ys.mean(), xs.mean()
        # 相鄰幀剪影差（IoU 距離）
        diff = 0.0
        if prev is not None:
            inter = (m & prev).sum(); uni = (m | prev).sum()
            diff = 1.0 - inter / max(1, uni)
        prev = m
        rows.append((i, dbg, ys.min(), ys.max(), xs.min(), xs.max(), area, diff))

    bad = [r for r in rows if r[1] > 90]
    print('幀數 %d  尺寸 %s' % (len(rows), a.shape[:2]))
    print('背景漂移幀（邊界色距>90）：%d %s' % (len(bad), [r[0] for r in bad][:20]))
    good = [r for r in rows if r[1] <= 90] if bad else rows
    if good:
        top = min(r[2] for r in good); bot = max(r[3] for r in good)
        lft = min(r[4] for r in good); rgt = max(r[5] for r in good)
        ar = [r[6] for r in good]
        df = [r[7] for r in good]
        print('bbox y %d~%d（高 %d）  x %d~%d（寬 %d）' % (top, bot, bot - top + 1, lft, rgt, rgt - lft + 1))
        print('面積 %d~%d（變化 %.1f%%）' % (min(ar), max(ar), 100.0 * (max(ar) - min(ar)) / max(1, max(ar))))
        print('相鄰幀剪影差 平均 %.3f 最大 %.3f（越大動作越大）' % (np.mean(df), np.max(df)))
        print('幀序 bbox_top: ' + ' '.join(str(r[2]) for r in good[::max(1, len(good) // 24)]))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
