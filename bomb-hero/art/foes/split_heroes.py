# -*- coding: utf-8 -*-
"""
主角群拆件：頭 / 軀幹 / 左腿 / 右腿 /（尾巴）
- 切分線用「內容 bbox 高度比例」定義，切線處上下各留 OVERLAP px 重疊區
  （旋轉時重疊區會互相遮住，不會出現縫）
- 每層做「出血」(bleed)：透明像素填上鄰近的不透明色，縮放取樣時不會出現黑邊
- 輸出 layers/<id>/{head,torso,legL,legR,tail}.png ＋ layers/_layers.json
  JSON 記每層在原圖的 offset / w / h / pivot，前端按 offset 放回去即可對齊

用法：python bomb-hero/art/foes/split_heroes.py
"""
import io, json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HEROES = os.path.join(HERE, 'heroes')
OUTDIR = os.path.join(HEROES, 'layers')
IDS = ['01-rabbit', '02-bear', '03-dog', '04-cat',
       '05-pig', '06-panda', '07-frog', '08-chick']

OVERLAP = 16          # 切線上下重疊 px
BLEED = 8             # 出血半徑

# neck / hip = 內容高度的比例；tail = (x0,x1,y0,y1) 同樣是內容 bbox 的比例
SPLIT = {
    '01-rabbit': dict(neck=.55, hip=.81, tail=None),
    '02-bear':   dict(neck=.43, hip=.80, tail=None),
    '03-dog':    dict(neck=.45, hip=.82, tail=(.66, 1.00, .28, .70)),
    '04-cat':    dict(neck=.42, hip=.78, tail=(.70, 1.00, .26, .82)),
    '05-pig':    dict(neck=.48, hip=.84, tail=None),
    '06-panda':  dict(neck=.45, hip=.82, tail=None),
    '07-frog':   dict(neck=.38, hip=.72, tail=None),
    '08-chick':  dict(neck=.50, hip=.82, tail=None),
}


def content_bbox(a):
    ys, xs = np.where(a > 24)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def bleed(arr, r=BLEED):
    """把透明的像素填上最近的已知顏色（alpha 仍為 0），避免縮放時邊緣發黑。"""
    out = arr.copy()
    rgb = out[:, :, :3].astype(np.float32)
    known = out[:, :, 3] > 12
    for _ in range(r):
        if known.all():
            break
        grow = np.zeros_like(known)
        acc = np.zeros_like(rgb)
        cnt = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            src = np.roll(np.roll(known, dy, axis=0), dx, axis=1)
            srgb = np.roll(np.roll(rgb, dy, axis=0), dx, axis=1)
            grow |= src & ~known
            acc += srgb * src[:, :, None]
            cnt += src
        fill = grow & (cnt > 0)
        rgb[fill] = (acc[fill] / cnt[fill][:, None])
        known = known | fill
    rgb = np.clip(rgb, 0, 255)
    out[:, :, :3] = rgb.astype(np.uint8)
    return out


def crop_layer(arr, x0, y0, x1, y1, name, layers, outdir):
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(arr.shape[1], x1), min(arr.shape[0], y1)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return
    sub = bleed(arr[y0:y1, x0:x1])
    im = Image.fromarray(sub, 'RGBA')
    im.save(os.path.join(outdir, name + '.png'), 'PNG', optimize=True)
    layers[name] = dict(x=x0, y=y0, w=x1 - x0, h=y1 - y0)


def split(rid):
    src = os.path.join(HEROES, rid + '.png')
    im = Image.open(src).convert('RGBA')
    arr = np.array(im)
    x0, y0, x1, y1 = content_bbox(arr[:, :, 3])
    W, H = x1 - x0, y1 - y0
    p = SPLIT[rid]
    ny = y0 + int(H * p['neck'])
    hy = y0 + int(H * p['hip'])
    mx = (x0 + x1) // 2
    pad_x = int(W * 0.06)                     # 左右各留一點，避免裁到耳朵/手

    d = os.path.join(OUTDIR, rid)
    os.makedirs(d, exist_ok=True)

    layers = {}
    # 頭：內容頂 → 頸線 + 重疊
    crop_layer(arr, x0 - pad_x, y0 - 8, x1 + pad_x, ny + OVERLAP, 'head', layers, d)
    # 軀幹（含手臂）：頸線 - 重疊 → 胯線 + 重疊
    crop_layer(arr, x0 - pad_x, ny - OVERLAP, x1 + pad_x, hy + OVERLAP, 'torso', layers, d)
    # 腿：胯線 - 重疊 → 底
    crop_layer(arr, x0 - pad_x, hy - OVERLAP, mx + OVERLAP, y1 + 8, 'legL', layers, d)
    crop_layer(arr, mx - OVERLAP, hy - OVERLAP, x1 + pad_x, y1 + 8, 'legR', layers, d)

    if p['tail']:
        tx0, tx1, ty0, ty1 = p['tail']
        crop_layer(arr,
                   x0 + int(W * tx0), y0 + int(H * ty0),
                   x0 + int(W * tx1), y0 + int(H * ty1), 'tail', layers, d)

    meta = dict(bbox=[x0, y0, x1, y1], neck=ny, hip=hy, mid=mx,
                overlap=OVERLAP, layers=layers)
    print('%-11s bbox %s neck=%d hip=%d  層 %d' %
          (rid, (W, H), ny, hy, len(layers)))
    return meta


if __name__ == '__main__':
    os.makedirs(OUTDIR, exist_ok=True)
    allm = {}
    for rid in IDS:
        allm[rid] = split(rid)
    io.open(os.path.join(HEROES, 'layers', '_layers.json'), 'w',
            encoding='utf-8').write(json.dumps(allm, ensure_ascii=False, indent=1))
    print('-> heroes/layers/_layers.json')
