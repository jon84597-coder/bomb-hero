# 把部位圖打包成單檔內嵌的 JS 片段（art/parts.js）
import os, json, base64

ROOT = os.path.join(os.path.dirname(__file__), '..')
PARTS = os.path.join(ROOT, 'art', 'parts')
meta = json.load(open(os.path.join(PARTS, 'meta.json'), encoding='utf-8'))

lines = ['// ---------- 角色部位圖（由使用者原圖拆解：頭 / 身體 / 左右手臂 / 左右腿） ----------',
         'const IMG_PARTS = {']
for key, m in meta.items():
    lines.append('  %s: { asp: %s, p: {' % (key, round(m['aspect'], 4)))
    for name, d in m['parts'].items():
        raw = open(os.path.join(PARTS, d['img']), 'rb').read()
        b64 = base64.b64encode(raw).decode()
        lines.append('    %s: { u: "data:image/webp;base64,%s", x: %.4f, y: %.4f, w: %.4f, h: %.4f, px: %.4f, py: %.4f },'
                     % (name, b64, d['x'], d['y'], d['w'], d['h'], d['px'], d['py']))
    lines.append('  } },')
lines.append('};')
out = os.path.join(ROOT, 'art', 'parts.js')
open(out, 'w', encoding='utf-8').write('\n'.join(lines))
print(out, round(os.path.getsize(out) / 1024, 1), 'KB')
