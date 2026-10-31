# -*- coding: utf-8 -*-
"""
版本號 3.6 → 3.7（v3.7：統計在 Render 這種容器會重啟的平台上更耐用）

只替換「版本號斷言」的精確模式，不做子字串全面替換 ——
index.html / 測試裡都有 `T * 3.6` 這種數學常數，誤改會把遊戲邏輯弄壞。
歷史註解（v3.6 那段在做什麼）保留不動，因為它描述的確實是 v3.6 時做的事。
"""
import io, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

PAIRS_HTML = [
    ("const VERSION = '3.6';", "const VERSION = '3.7';"),
    ('<span id="verTxt">3.6</span>', '<span id="verTxt">3.7</span>'),
]

PAIRS_TEST = [
    ("P.VERSION === '3.6'", "P.VERSION === '3.7'"),
    (r'<span id="verTxt">3\.6</span>', r'<span id="verTxt">3.7</span>'),
    ('<span id="verTxt">3.6</span>', '<span id="verTxt">3.7</span>'),
    ("'徽章版本號同步 3.6'", "'徽章版本號同步 3.7'"),
    ("'畫面上的版本號同步 3.4'", "'畫面上的版本號同步 3.7'"),
    ("'版本 = 3.4（'", "'版本 = 3.7（'"),
    ("'版本 = 3.6'", "'版本 = 3.7'"),
    ("'「測試版 v3.6」小字徽章'", "'「測試版 v3.7」小字徽章'"),
]


def bump(path, pairs):
    s = io.open(path, encoding='utf-8').read()
    o = s
    for a, b in pairs:
        s = s.replace(a, b)
    if s != o:
        io.open(path, 'w', encoding='utf-8').write(s)
        print('  更新 ' + os.path.basename(path))
        return True
    return False


n = 0
if bump(HTML, PAIRS_HTML):
    n += 1
for p in sorted(glob.glob(os.path.join(ROOT, 'test', 'verify-v*.js'))):
    if bump(p, PAIRS_TEST):
        n += 1
print('[OK] 共更新 ' + str(n) + ' 個檔案（版本號 3.6 → 3.7）')
