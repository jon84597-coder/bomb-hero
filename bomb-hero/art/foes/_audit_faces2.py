# -*- coding: utf-8 -*-
import io, os, re, sys
from PIL import Image, ImageDraw
D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(D))
s = io.open(os.path.join(ROOT,'index.html'), encoding='utf-8').read()
i = s.index('const FOE_ART = {'); j = s.index('\n};', i)
art = {m.group(1): int(m.group(2)) for m in re.finditer(r"(\w+): \{ dir: (-?1)", s[i:j])}

def find(stage, name):
    for f in sorted(os.listdir(os.path.join(D,'stage%d'%stage))):
        if re.match(r'^\d\d-%s\.png$'%name, f): return os.path.join(D,'stage%d'%stage,f)

S = {1:['slime','bunny','frog','cater','mush','beetle'],2:['crab','mummy','eye','sandworm','dune','scorp'],
     3:['penguin','crystal','bat','snowball','seal','panda'],4:['lavaslime','lavaworm','bee','bomber','lizard','rockling']}
st = int(sys.argv[1])
CW = CH = 460
sheet = Image.new('RGB', (CW*3, CH*2), (250,250,246))
dr = ImageDraw.Draw(sheet)
for n, name in enumerate(S[st]):
    p = find(st, name); im = Image.open(p).convert('RGBA')
    w,h = im.size; k = min((CW-40)/w, (CH-60)/h)
    im = im.resize((max(1,int(w*k)), max(1,int(h*k))), Image.LANCZOS)
    c, r = n%3, n//3
    sheet.paste(im, (c*CW+(CW-im.width)//2, r*CH+(CH-im.height)//2+14), im)
    dr.text((c*CW+8, r*CH+6), '%s  (dir=%+d)'%(name, art.get(name,0)), fill=(0,0,0))
out = os.path.join(D,'_audit_st%d.png'%st); sheet.save(out); print(out, sheet.size)
