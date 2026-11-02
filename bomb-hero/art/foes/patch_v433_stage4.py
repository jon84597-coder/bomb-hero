# -*- coding: utf-8 -*-
"""v4.33：把第 4 大關（熔岩洞窟）6 隻小怪接進 index.html。
只換 FOE_ART 資料（動作型別 jelly／inch／flap／waddle／skitter／stomp 第 1~3 關都有了）。可重複執行。"""
import io
import os

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
DATA = os.path.join(ROOT, 'art', 'foes', '_foes_game_parts.js')

s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')
foe_js = io.open(DATA, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()

if 'lavaslime: { dir:' in s:
    print('skip: FOE_ART 已含第 4 關')
else:
    i = s.index('const FOE_ART = {')
    # 往前吃掉兩行註解（自動生成那行）
    j = s.rindex('\n// ---------- 小怪美術', 0, i) + 1
    end = s.index('\n};\n', i) + len('\n};\n')
    s = s[:j] + foe_js + '\n' + s[end:]
    io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
    print('ok  : FOE_ART 換成 24 隻')
print('sizes', len(s))
