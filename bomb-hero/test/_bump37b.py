# -*- coding: utf-8 -*-
"""
補 _bump37.py 的漏網之魚：測試裡的正則有把 / 跳脫成 \/，
原本的配對字串沒考慮到，所以 13 支測試的版本斷言沒跟著更新。
"""
import io, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAIRS = [
    (r'<span id="verTxt">3\.6<\/span>', r'<span id="verTxt">3\.7<\/span>'),
    (r'<div class="ver beta">測試版 v<span id="verTxt">3\.6<\/span><\/div>',
     r'<div class="ver beta">測試版 v<span id="verTxt">3\.7<\/span><\/div>'),
]

n = 0
for p in sorted(glob.glob(os.path.join(ROOT, 'test', 'verify-v*.js'))):
    s = io.open(p, encoding='utf-8').read()
    o = s
    for a, b in PAIRS:
        s = s.replace(a, b)
    if s != o:
        io.open(p, 'w', encoding='utf-8').write(s)
        n += 1
        print('  更新 ' + os.path.basename(p))
print('[OK] 共更新 ' + str(n) + ' 個測試檔')
