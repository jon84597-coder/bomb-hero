# -*- coding: utf-8 -*-
"""v2.4：把舊測試斷言同步到 v2.4"""
import io, sys

def load(p):
    return io.open(p, encoding='utf-8').read()

def save(p, s):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

def rep(p, old, new, label=''):
    s = load(p)
    if old not in s:
        print('  !! NOT FOUND in', p, ':', label)
        return False
    s = s.replace(old, new, 1)
    save(p, s)
    print('  ok', p, ':', label)
    return True

# v26：BOSS 影子正則（小怪現在走 ar）
rep('test/verify-v26.js',
    r"""ok(/const sr = e\.boss \? e\.r \* \(e\.sizeMul \|\| 1\) : e\.r;/.test(html), 'BOSS 的影子也跟著放大');""",
    r"""ok(/const sr = e\.boss \? e\.r \* \(e\.sizeMul \|\| 1\) : ar;/.test(html),
   'BOSS 的影子也跟著放大（小怪改走 ar：v2.4 放大後的外型半徑）');""",
    'v26 BOSS 影子正則')

# v26 / v29：徽章版本號 2.3 → 2.4
for p in ('test/verify-v26.js', 'test/verify-v29.js'):
    s = load(p)
    if 'id="verTxt">2.3</span>' in s:
        s = s.replace('id="verTxt">2.3</span>', 'id="verTxt">2.4</span>')
        save(p, s); print('  ok', p, ': 徽章 2.4')
    else:
        print('  -- skip', p, '(no verTxt 2.3)')

# v29：版本斷言 2.3 → 2.4
s = load('test/verify-v29.js')
before = s
s = s.replace("P.VERSION === '2.3'", "P.VERSION === '2.4'")
s = s.replace("版本 = 2.3（", "版本 = 2.4（")
s = s.replace("畫面上的版本號同步 2.3", "畫面上的版本號同步 2.4")
s = s.replace("verTxt\">2.3<", "verTxt\">2.4<")
s = s.replace("verTxt\\\">2.3<", "verTxt\\\">2.4<")
if s != before:
    save('test/verify-v29.js', s); print('  ok verify-v29.js: 版本 2.4')
else:
    print('  -- skip verify-v29.js')

print('done')
