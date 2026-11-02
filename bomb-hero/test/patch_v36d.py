# -*- coding: utf-8 -*-
# v3.6d：把 initStats() 從前面的初始化鏈移到檔案最末尾
#   原因：前面那串 initXXX() 在檔案前半段就執行，而 `const Net = {` 宣告在很後面，
#        在那個時間點碰 Net 會踩到 TDZ（Cannot access 'Net' before initialization）→ 整支遊戲掛掉。
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HTML = os.path.join(ROOT, 'bomb-hero', 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s
n = 0

def rep(old, new, tag):
    global s, n
    if old not in s:
        sys.exit('[v36d] 找不到錨點：' + tag)
    if s.count(old) > 1:
        sys.exit('[v36d] 錨點不唯一：' + tag)
    s = s.replace(old, new)
    n += 1

# 1. 從前面的初始化鏈移除
rep(u'''  initAnn();
  initStats();
''', u'''  initAnn();
''', '移除早期 initStats')

# 2. 改在檔案最末尾（const Net 之後）才初始化
rep(u'''// 標題音樂需要使用者互動後才會響；首次點擊任意按鈕時啟動''',
    u'''// v3.6：統計列要等 Net（線上模組）宣告好之後才能初始化，所以放在檔案最末尾
initStats();

// 標題音樂需要使用者互動後才會響；首次點擊任意按鈕時啟動''',
    '末尾 initStats')

io.open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
print('[v36d] index.html 修補 %d 處，%d → %d bytes' % (n, len(orig), len(s)))
