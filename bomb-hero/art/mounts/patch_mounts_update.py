# -*- coding: utf-8 -*-
"""v4.34：把新的 MOUNT_ART（去背修好的龍坐騎）整塊換進 index.html（可重複執行）。"""
import io
import os
import re
import sys

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
JS = os.path.join(ROOT, 'art', 'mounts', '_mounts_game.js')

s = io.open(PAGE, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
mount_js = io.open(JS, encoding='utf-8', newline='').read().replace('\r\n', '\n').strip()
mount_js = mount_js[mount_js.index('const MOUNT_ART'):]          # 只取資料本體，註解沿用舊的

pat = re.compile(r'const MOUNT_ART = \{.*?\n\};', re.S)
m = pat.search(s.replace('\r\n', '\n'))
if not m:
    sys.exit('找不到 const MOUNT_ART 區塊')
old = m.group(0)
if old.strip() == mount_js:
    print('skip: MOUNT_ART 已是最新')
else:
    body = s.replace('\r\n', '\n')
    body = body[:m.start()] + mount_js + body[m.end():]
    s = body.replace('\n', nl) if nl == '\r\n' else body
    io.open(PAGE, 'w', encoding='utf-8', newline='').write(s)
    print('ok  : MOUNT_ART 已更新  (%d -> %d chars)' % (len(old), len(mount_js)))

# 驗證
s2 = io.open(PAGE, encoding='utf-8', newline='').read()
n = len(re.findall(r"data:image/webp;base64,", s2))
print('webp 區塊總數', n)
