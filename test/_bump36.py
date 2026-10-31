# -*- coding: utf-8 -*-
# v3.6：把舊 verify 裡的 3.5 版本斷言批次改成 3.6
import io, os, re, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
hits = 0
for p in sorted(glob.glob(os.path.join(ROOT, 'verify-v*.js'))) + sorted(glob.glob(os.path.join(ROOT, 'smoke-v*.js'))):
    s = io.open(p, encoding='utf-8').read()
    if "'3.5'" not in s and '3\\.5' not in s and 'v3.5' not in s and '>3.5<' not in s:
        continue
    o = s
    s = s.replace("P.VERSION === '3.5'", "P.VERSION === '3.6'")
    s = s.replace('"P.VERSION === \'3.5\'"', '"P.VERSION === \'3.6\'"')
    s = s.replace('3\\.5', '3\\.6')                 # 正則裡的 3\.5
    s = s.replace('<span id="verTxt">3.5</span>', '<span id="verTxt">3.6</span>')
    s = s.replace("=== '3.5'", "=== '3.6'")
    s = s.replace("'3.5'", "'3.6'")
    s = s.replace('版本 = 3.5', '版本 = 3.6')
    s = s.replace('v3.5', 'v3.6')
    if s != o:
        io.open(p, 'w', encoding='utf-8').write(s)
        hits += 1
        print('  更新 ' + os.path.basename(p))
print('[bump36] 共更新 %d 個檔案' % hits)
