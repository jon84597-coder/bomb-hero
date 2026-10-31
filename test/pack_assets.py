# -*- coding: utf-8 -*-
"""把角色精灵图与首页背景图打包成 base64 资源块（内嵌单档用）"""
import base64, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAMES = ['rabbit', 'bear', 'dog', 'cat', 'pig', 'panda', 'frog', 'chick']
CH = os.path.join(ROOT, 'art', 'chars')

# 首页背景：1280 宽 q80
src = Image.open(os.path.join(ROOT, 'art', 'arena-src.jpg'))
w = 1280
h = int(src.size[1] * w / src.size[0])
bg_path = os.path.join(ROOT, 'art', 'title-bg.jpg')
src.resize((w, h), Image.LANCZOS).save(bg_path, quality=80, optimize=True, progressive=True)
print('title bg', os.path.getsize(bg_path) // 1024, 'KB')

lines = []
lines.append('// ---------- 內嵌美術資源（使用者提供的原圖 → 已摳成透明精靈圖） ----------')
for n in NAMES:
    b = open(os.path.join(CH, n + '.webp'), 'rb').read()
    lines.append("const IMG_%s = 'data:image/webp;base64,%s';" % (n.upper(), base64.b64encode(b).decode()))
bb = open(bg_path, 'rb').read()
lines.append("const IMG_TITLEBG = 'data:image/jpeg;base64,%s';" % base64.b64encode(bb).decode())
lines.append('const IMG_CHARS = { rabbit: IMG_RABBIT, bear: IMG_BEAR, dog: IMG_DOG, cat: IMG_CAT,')
lines.append('  pig: IMG_PIG, panda: IMG_PANDA, frog: IMG_FROG, chick: IMG_CHICK };')

out = os.path.join(ROOT, 'art', 'assets.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')
print('assets.js', os.path.getsize(out) // 1024, 'KB')
