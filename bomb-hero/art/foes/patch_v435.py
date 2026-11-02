# -*- coding: utf-8 -*-
"""v4.34 → v4.35：版號四處同步 ＋ 版本紀錄新增一條（可重複執行）。"""
import io
import os
import sys

PAGE = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html'

NEW = """  { v: '4.35', date: '2026-11-02', now: true, items: [
    '龍坐騎重新去背：腳底那條白帶、翅膀與脖子之間的白色方塊都清掉了（不再有白底殘留）',
    '岩石小怪重新去背：手臂內側的白邊清掉，右腳也不再缺一塊',
    '去背工具多兩道處理：「腳底縫隙」與「夾縫純白」（被輪廓包住、又碰不到透明區的整片白）',
    '這兩道預設關閉，只有像坐騎這種沒有發光核心、沒有純白眼珠的圖才開，避免把光暈挖破洞'
  ] },
"""

s = io.open(PAGE, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
body = s.replace('\r\n', '\n')

if "v: '4.35'" in body:
    print('skip: 已有 4.35 條目')
else:
    old = "  { v: '4.34', date: '2026-11-02', now: true, items: ["
    if body.count(old) != 1:
        sys.exit('錨點 4.34 條目出現 %d 次' % body.count(old))
    body = body.replace(old, NEW + "  { v: '4.34', date: '2026-11-02', now: false, items: [", 1)
    print('ok  : VERSION_LOG')

for a, b, tag in [
    ("const VERSION = '4.34';", "const VERSION = '4.35';", 'VERSION'),
    ('<span id="verTxt">4.34</span>', '<span id="verTxt">4.35</span>', 'verTxt'),
    ('<span id="verLogVer">4.34</span>', '<span id="verLogVer">4.35</span>', 'verLogVer'),
]:
    n = body.count(a)
    if n != 1:
        sys.exit('錨點 %s 出現 %d 次' % (tag, n))
    body = body.replace(a, b, 1)
    print('ok  :', tag)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(body.replace('\n', nl) if nl == '\r\n' else body)
print('done')
