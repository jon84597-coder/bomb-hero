# -*- coding: utf-8 -*-
"""v4.37：只替换 index.html 的 FOE_ART 数据区（不动 FoeArt 模块 / BOSS_ART）

patch_foes_game.py 会连 v4.36 的 BossArt 与 anim 分支一起盖掉，故改用本脚本。
"""
import io, os

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'foes', '_foes_game_parts.js')

page = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
foe = io.open(DATA, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()

lines = page.split('\n')

# 1) FOE_ART 起始行
idx = [i for i, l in enumerate(lines) if l.startswith('const FOE_ART = {')]
assert len(idx) == 1, idx
head = idx[0]

# 2) 往上吃掉註解頭
start = head
while start > 0 and lines[start - 1].startswith('//'):
    start -= 1

# 3) 往下找結束的 };
end = None
for i in range(head, len(lines)):
    if lines[i] == '};':
        end = i
        break
assert end is not None, '找不到 FOE_ART 結尾'
assert any('龍坐騎美術' in lines[end + k] for k in (1, 2, 3)), \
    '結尾位置不對: %r' % lines[end + 1:end + 4]

old_key = lines[head + 1].split(':')[0].strip()
print('替換區間 行 %d~%d（共 %d 行），第一隻 %s' % (start + 1, end + 1, end - start + 1, old_key))

new_lines = foe.split('\n')
out = lines[:start] + new_lines + lines[end + 1:]
assert '\n'.join(out).count('const FOE_ART = {') == 1
assert 'const BOSS_ART = {' in '\n'.join(out)
assert "anim === 'slide'" in '\n'.join(out)

io.open(PAGE, 'w', encoding='utf-8', newline='').write('\r\n'.join(out))
print('ok [v437-size-data] %d 行 → %d 行，檔案 %d bytes'
      % (len(lines), len(out), os.path.getsize(PAGE)))
