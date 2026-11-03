# -*- coding: utf-8 -*-
"""清除風格圖右下角的「AI生成 / WORKBUDD」浮水印：從深色底參考圖取出 alpha 蒙版，再反向還原。"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BOX = (860, 940, 1024, 1024)
EPS = 0.055


def build_alpha(ref_path='_raw/style-neon.png'):
    """用深色底的圖算出浮水印的 alpha（假設浮水印是半透明白）。"""
    a = np.asarray(Image.open(os.path.join(HERE, ref_path)).convert('RGB')).astype(np.float32)
    x0, y0, x1, y1 = BOX
    sub = a[y0:y1, x0:x1]
    # 背景色：整塊的中位數（文字只占少數）
    bg = np.median(sub.reshape(-1, 3), axis=0)
    alpha = np.clip(((sub - bg) / (255.0 - bg)).max(axis=2), 0, 1)
    alpha[alpha < EPS] = 0
    # 找出真正的文字範圍再裁掉空白邊
    ys, xs = np.where(alpha > 0.12)
    print('alpha bbox in box:', xs.min(), ys.min(), xs.max(), ys.max(), 'bg=', bg)
    full = np.zeros(a.shape[:2], np.float32)
    full[y0:y1, x0:x1] = alpha
    return full


def unmix(im, alpha):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    A = alpha[:, :, None]
    out = (a - 255.0 * A) / np.maximum(1.0 - A, 0.06)
    out = np.where(A > 0, out, a)
    return Image.fromarray(np.clip(out + .5, 0, 255).astype(np.uint8)), int((alpha > 0).sum())


if __name__ == '__main__':
    A = build_alpha()
    for n in ['sand', 'ice', 'lava', 'neon', 'sea', 'sky', 'dark']:
        p = os.path.join(HERE, 'style-%s.png' % n)
        im = Image.open(os.path.join(HERE, '_raw', 'style-%s.png' % n))
        out, cnt = unmix(im, A)
        out.save(p)
        print('%-5s fixed %d px' % (n, cnt))
