# -*- coding: utf-8 -*-
"""
主角群 v2（站立常態・更可愛）後處理。
raw 檔名是生成時間戳，所以用明確映射表對應 id（不要用 glob 排序）。
用法：python bomb-hero/art/foes/build_heroes2.py
"""
import sys, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bgcut

RAW = os.path.join(HERE, 'heroes', '_raw')
OUT = os.path.join(HERE, 'heroes')
OUT512 = 512
PAD_BOTTOM = 0.04

# id -> 生成時間戳檔名
MAP = [
    ('01-rabbit', 'Single_character_concept_art_f_2026-11-02T09-10-05.png'),
    ('02-bear',   'Single_character_concept_art_f_2026-11-02T09-09-03.png'),
    ('03-dog',    'Single_character_concept_art_f_2026-11-02T09-09-16.png'),
    ('04-cat',    'Single_character_concept_art_f_2026-11-02T09-09-26.png'),
    ('05-pig',    'Single_character_concept_art_f_2026-11-02T09-10-17.png'),
    ('06-panda',  'Single_character_concept_art_f_2026-11-02T09-10-37.png'),
    ('07-frog',   'Single_character_concept_art_f_2026-11-02T09-10-50.png'),
    ('08-chick',  'Single_character_concept_art_f_2026-11-02T09-11-02.png'),
]


def process(src, dst):
    tmp = dst + '.cut.png'
    size, cover, pal = bgcut.cut(src, tmp)
    im = Image.open(tmp).convert('RGBA')
    w, h = im.size
    scale = min((OUT512 * 0.94) / w, (OUT512 * 0.94) / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (OUT512, OUT512), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((OUT512 - nw) // 2,
                                max(0, OUT512 - int(OUT512 * PAD_BOTTOM) - nh)))
    canvas.save(dst, 'PNG', optimize=True)
    os.remove(tmp)
    return (w, h), (nw, nh), cover


if __name__ == '__main__':
    for rid, fn in MAP:
        src = os.path.join(RAW, fn)
        assert os.path.exists(src), src
        a, b, cov = process(src, os.path.join(OUT, rid + '.png'))
        print('%-11s %-14s %s -> %s   bg %.0f%%' % (rid, fn[-12:-4], a, b, cov))

    files = [os.path.join(OUT, rid + '.png') for rid, _ in MAP]
    cell, cols = 256, 4
    sheet = Image.new('RGBA', (cell * cols, cell * 2), (22, 26, 33, 255))
    for i, f in enumerate(files):
        im = Image.open(f).convert('RGBA').resize((cell, cell), Image.LANCZOS)
        sheet.alpha_composite(im, ((i % cols) * cell, (i // cols) * cell))
    sheet.save(os.path.join(OUT, '_contact_heroes.png'))
    print('contact ok')
