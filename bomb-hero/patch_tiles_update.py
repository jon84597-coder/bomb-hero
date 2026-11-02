# -*- coding: utf-8 -*-
"""重新把 _tiles_game.js 的內容換進 index.html（不重跑整個 patch）。"""
import io

s = io.open('index.html', encoding='utf-8', newline='').read()
js = io.open('art/tiles/_tiles_game.js', encoding='utf-8', newline='').read()
i0 = s.index('// ---------- 場景貼圖（自動生成')
i1 = s.index('// 場景貼圖載入器')
n0 = len(s)
s = s[:i0] + js + '\n' + s[i1:]
io.open('index.html', 'w', encoding='utf-8', newline='').write(s)
print('OK  %d -> %d  (%+.1f KB)' % (n0, len(s), (len(s) - n0) / 1024.0))
