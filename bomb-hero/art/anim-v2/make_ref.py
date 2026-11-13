"""用遊戲原始零件拼一張「乾淨」全身參考圖（去掉矩形薄霧），0 點。
用途：餵給生成模型當風格／比例基準 —— 這才是遊戲真正的那隻兔子。
"""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SPR = os.path.join(HERE, '..', '..', 'spr')

H, W = 1000.0, 1000.0 * 0.6333
CANVAS = (900, 1560)
OX = (CANVAS[0] - W) / 2.0
OY = CANVAS[1] - 40 - H      # 腳底基線 1360

# 與 js/main.js HERO_PARTS.rabbit 完全一致
P = {
    'legL':  ('hero-parts-rabbit-leg-l.webp',  -0.0572, 0.7740, 0.6094, 0.2431),
    'legR':  ('hero-parts-rabbit-leg-r.webp',   0.4444, 0.7740, 0.6128, 0.2431),
    'torso': ('hero-parts-rabbit-torso.webp',  -0.0572, 0.5139, 1.1145, 0.3284),
    'armL':  ('hero-parts-rabbit-arm-l.webp',   0.1347, 0.7484, 0.0505, 0.0917),
    'armR':  ('hero-parts-rabbit-arm-r.webp',   0.8114, 0.7207, 0.0808, 0.1130),
    'head':  ('hero-parts-rabbit-head.webp',   -0.0572, -0.0171, 1.1145, 0.5991),
}
# armL/armR 只有 9x26 與 15x33 px，放大 30 倍會變成浮在體外的方塊 → 不拼進來
ORDER = ['legL', 'legR', 'torso', 'head']


def dehaze(im):
    """把 alpha 39 的矩形薄霧壓成 0，邊緣用平滑過渡保留。"""
    a = np.array(im).astype(np.float32)
    al = a[:, :, 3]
    al = np.clip((al - 72.0) / 128.0, 0.0, 1.0) * 255.0
    a[:, :, 3] = al
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main():
    cv = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    for k in ORDER:
        f, dx, dy, dw, dh = P[k]
        im = dehaze(Image.open(os.path.join(SPR, f)).convert('RGBA'))
        tw = im.width * (dw * W) / im.width if False else int(round(dw * W))
        th = int(round(dh * H))
        im = im.resize((tw, th), Image.LANCZOS)
        cv.alpha_composite(im, (int(round(OX + dx * W)), int(round(OY + dy * H))))
    # 輪廓微整：3px 閉運算，把零件邊緣造成的小缺口／階梯磨平（不改形狀、不動內部）
    a0 = np.array(cv)
    al = Image.fromarray(a0[:, :, 3])
    al = al.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5))
    a0[:, :, 3] = np.array(al)
    cv = Image.fromarray(a0, 'RGBA')
    out = os.path.join(HERE, 'ref_clean.png')
    cv.save(out)
    a = np.array(cv)[:, :, 3]
    ys = np.where((a > 8).any(axis=1))[0]
    xs = np.where((a > 8).any(axis=0))[0]
    print(out, cv.size, 'h', ys.max() - ys.min() + 1, 'w', xs.max() - xs.min() + 1)
    # 放大鋪洋紅底，方便直接餵模型
    pad = 60
    bg = Image.new('RGBA', (xs.max() - xs.min() + pad * 2, ys.max() - ys.min() + pad * 2), (255, 0, 200, 255))
    bg.alpha_composite(cv.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)), (pad, pad))
    o2 = os.path.join(HERE, 'ref_clean_magenta.png')
    bg.convert('RGB').save(o2)
    print(o2, bg.size)


if __name__ == '__main__':
    main()
