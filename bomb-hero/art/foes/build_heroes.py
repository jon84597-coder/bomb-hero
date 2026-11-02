# -*- coding: utf-8 -*-
"""
主角群 Hero 圖後處理：
  1) bgcut 去背（泛洪）
  2) 縮到 512x512，底部對齊（腳底 = 底 - 4%），不裁掉耳朵
  3) 產生 _contact_heroes.png 對照表
用法：python art/foes/build_heroes.py <raw_dir> <out_dir>
raw 檔名以「生成時間」排序對應 CHARACTERS 順序，或用 --map 明確指定。
"""
import sys, os, glob
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bgcut

IDS = ['01-rabbit', '02-bear', '03-dog', '04-cat',
       '05-pig', '06-panda', '07-frog', '08-chick']
OUT = 512
PAD_BOTTOM = 0.04   # 腳底 = 底 - 4%


def process(src, dst):
    tmp = dst + '.cut.png'
    size, cover, pal = bgcut.cut(src, tmp)
    im = Image.open(tmp).convert('RGBA')
    w, h = im.size
    scale = min((OUT * 0.92) / w, (OUT * 0.92) / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (OUT, OUT), (0, 0, 0, 0))
    x = (OUT - nw) // 2
    y = OUT - int(OUT * PAD_BOTTOM) - nh
    y = max(0, y)
    canvas.alpha_composite(im, (x, y))
    canvas.save(dst, 'PNG', optimize=True)
    os.remove(tmp)
    return (w, h), (nw, nh), cover


def contact(files, dst):
    cell, cols = 256, 4
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGBA', (cell * cols, cell * rows), (24, 28, 36, 255))
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGBA').resize((cell, cell), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % cols) * cell, (i // cols) * cell))
    sheet.save(dst, 'PNG', optimize=True)


if __name__ == '__main__':
    raw_dir = sys.argv[1] if len(sys.argv) > 1 else 'bomb-hero/art/foes/heroes/_raw'
    out_dir = sys.argv[2] if len(sys.argv) > 2 else 'bomb-hero/art/foes/heroes'
    raws = sorted(glob.glob(os.path.join(raw_dir, '*.png')))
    raws = [r for r in raws if not os.path.basename(r).startswith('_')]
    assert len(raws) == len(IDS), 'raw 數量 %d != %d' % (len(raws), len(IDS))
    outs = []
    for rid, src in zip(IDS, raws):
        dst = os.path.join(out_dir, rid + '.png')
        a, b, cov = process(src, dst)
        outs.append(dst)
        print('%-12s %-34s %s -> %s  bg %.0f%%' %
              (rid, os.path.basename(src), a, b, cov))
    contact(outs, os.path.join(out_dir, '_contact_heroes.png'))
    print('done:', len(outs))
