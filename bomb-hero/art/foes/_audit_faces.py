# -*- coding: utf-8 -*-
"""把所有小怪貼圖排成一張標註圖，人眼檢查「是不是全部朝同一邊」。"""
import io, os, re
from PIL import Image, ImageDraw

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(D))

def foe_art():
    s = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    i = s.index('const FOE_ART = {'); j = s.index('\n};', i)
    out = {}
    for m in re.finditer(r"(\w+): \{ dir: (-?1)", s[i:j]):
        out[m.group(1)] = int(m.group(2))
    return out

def find(stage, name):
    for f in sorted(os.listdir(os.path.join(D, 'stage%d' % stage))):
        if re.match(r'^\d\d-%s\.png$' % name, f):
            return os.path.join(D, 'stage%d' % stage, f)
    return None

STAGES = {1: ['slime','bunny','frog','cater','mush','beetle'],
          2: ['crab','mummy','eye','sandworm','dune','scorp'],
          3: ['penguin','crystal','bat','snowball','seal','panda'],
          4: ['lavaslime','lavaworm','bee','bomber','lizard','rockling']}

art = foe_art()
CW, CH = 250, 250
rows = len(STAGES)
sheet = Image.new('RGB', (CW * 6, CH * rows), (26, 34, 40))
dr = ImageDraw.Draw(sheet)
for r, (st, ids) in enumerate(sorted(STAGES.items())):
    for c, name in enumerate(ids):
        p = find(st, name)
        if not p: continue
        im = Image.open(p).convert('RGBA')
        w, h = im.size
        k = min((CW - 30) / w, (CH - 46) / h)
        im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.LANCZOS)
        x = c * CW + (CW - im.width) // 2
        y = r * CH + (CH - im.height) // 2 + 8
        sheet.paste(im, (x, y), im)
        dr.text((c * CW + 6, r * CH + 4), '%s  dir=%+d  st%d' % (name, art.get(name, 0), st), fill=(255, 220, 120))
out = os.path.join(D, '_audit_faces.png')
sheet.save(out)
print('saved', out, sheet.size)
