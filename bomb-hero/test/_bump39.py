# -*- coding: utf-8 -*-
"""版本斷言 3.8 → 3.9（只改「版本號」相關，其他說明文字不動；保留原本換行符）"""
import glob, os

D = os.path.dirname(os.path.abspath(__file__))


def pairs(eol):
    return [
        ("P.VERSION === '3.8'", "P.VERSION === '3.9'"),
        ('<span id="verTxt">3.8</span>', '<span id="verTxt">3.9</span>'),
        ('<span id="verTxt">3\\.8<\\/span>', '<span id="verTxt">3\\.9<\\/span>'),
        ('版本 = 3.7（', '版本 = 3.9（'),
        ('畫面上的版本號同步 3.7', '畫面上的版本號同步 3.9'),
        ('徽章版本號同步 3.8', '徽章版本號同步 3.9'),
        ('「測試版 v3.8」小字徽章', '「測試版 v3.9」小字徽章'),
    ]


n = 0
for f in sorted(glob.glob(os.path.join(D, 'verify-v*.js'))):
    raw = open(f, 'rb').read()
    eol = '\r\n' if b'\r\n' in raw else '\n'
    t = raw.decode('utf-8')
    o = t
    for a, b in pairs(eol):
        t = t.replace(a, b)
    if t != o:
        open(f, 'wb').write(t.encode('utf-8'))
        print('  ' + os.path.basename(f) + ('  (CRLF)' if eol == '\r\n' else '  (LF)'))
        n += 1
print('共更新 %d 檔' % n)
