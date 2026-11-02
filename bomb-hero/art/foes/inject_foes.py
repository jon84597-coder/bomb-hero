# -*- coding: utf-8 -*-
"""把 _foes_game_parts.js（pack_foes_game.py 的產物）整塊換進 index.html 的 FOE_ART。
   冪等：不管跑幾次結果都一樣（不會像 patch_*.py 那樣重複插入）。"""
import io, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'index.html')
DATA = os.path.join(HERE, '_foes_game_parts.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
foe = io.open(DATA, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()

i = s.index('const FOE_ART = {')
head = s.rindex('\n// ---------- 小怪美術', 0, i) + 1
end = s.index('\n};\n', i) + len('\n};\n')
old_n = len(re.findall(r"dir: [+-]1", s[head:end]))

s2 = s[:head] + foe + '\n' + s[end:]
new_n = len(re.findall(r"dir: [+-]1", foe))
io.open(PAGE, 'w', encoding='utf-8', newline='').write(s2.replace('\n', '\r\n'))
print('FOE_ART: %d -> %d 隻  (file %d bytes)' % (old_n, new_n, len(s2)))
