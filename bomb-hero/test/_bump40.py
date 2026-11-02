# -*- coding: utf-8 -*-
"""版本斷言 3.9 → 4.0（只改版本號相關，其他說明文字不動；保留原本換行符）"""
import glob, os

D = os.path.dirname(os.path.abspath(__file__))
PAIRS = [
    ("P.VERSION === '3.9'", "P.VERSION === '4.0'"),
    ("'版本 = 3.9'", "'版本 = 4.0'"),
    ('<span id="verTxt">3.9</span>', '<span id="verTxt">4.0</span>'),
    ('<span id="verTxt">3\\.9<\\/span>', '<span id="verTxt">4\\.0<\\/span>'),
    ("/const VERSION = '3\\.9';/", "/const VERSION = '4\\.0';/"),
    ("'版本常數是 3.9'", "'版本常數是 4.0'"),
    ('徽章版本號同步 3.9', '徽章版本號同步 4.0'),
    ('畫面上的版本號同步 3.9', '畫面上的版本號同步 4.0'),
]
n = 0
for f in sorted(glob.glob(os.path.join(D, 'verify-v*.js'))):
    raw = open(f, 'rb').read()
    t = raw.decode('utf-8')
    o = t
    for a, b in PAIRS:
        t = t.replace(a, b)
    if t != o:
        open(f, 'wb').write(t.encode('utf-8'))
        print('  ' + os.path.basename(f))
        n += 1
print('共更新 %d 檔' % n)
