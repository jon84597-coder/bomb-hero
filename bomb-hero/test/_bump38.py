# -*- coding: utf-8 -*-
"""
版本號 3.7 → 3.8（v3.8：炸彈火焰精緻化／台詞／勝利過場／第二關配色／移除統計）

只替換「版本號斷言」的精確模式。特別小心：
  - `T * 3.7`、`c[5] > 3.7` 這種數學常數不能動
  - 歷史註解（v3.7 那段在做什麼）保留
"""
import io, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')

PAIRS_HTML = [
    ("const VERSION = '3.7';", "const VERSION = '3.8';"),
    ('<span id="verTxt">3.7</span>', '<span id="verTxt">3.8</span>'),
]

PAIRS_TEST = [
    ("P.VERSION === '3.7'", "P.VERSION === '3.8'"),
    (r'<span id="verTxt">3\.7<\/span>', r'<span id="verTxt">3\.8<\/span>'),
    ('<span id="verTxt">3.7</span>', '<span id="verTxt">3.8</span>'),
    ("'徽章版本號同步 3.7'", "'徽章版本號同步 3.8'"),
    ("'版本 = 3.7'", "'版本 = 3.8'"),
    ("'「測試版 v3.7」小字徽章'", "'「測試版 v3.8」小字徽章'"),
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
print('[OK] 共更新 ' + str(n) + ' 個檔案（版本號 3.7 → 3.8）')
