# -*- coding: utf-8 -*-
# 把舊驗證腳本裡的 3.4 版本斷言更新成 3.5（v3.5 改版）
import io, glob, re
files = sorted(glob.glob('test/verify-v*.js'))
for p in files:
    s = io.open(p, encoding='utf-8').read()
    if '3.4' not in s:
        continue
    o = s
    s = s.replace("P.VERSION === '3.4'", "P.VERSION === '3.5'")
    s = s.replace('verTxt">3.4<', 'verTxt">3.5<')
    s = s.replace("VERSION === '3.4'", "VERSION === '3.5'")
    s = s.replace("'版本 = 3.4'", "'版本 = 3.5'")
    s = s.replace("徽章版本號同步 3.4", "徽章版本號同步 3.5")
    s = s.replace('verTxt">3\\.4<', 'verTxt">3\\.5<')
    s = s.replace("'3.4'", "'3.5'")
    if s != o:
        io.open(p, 'w', encoding='utf-8').write(s)
        print('updated', p)
