# -*- coding: utf-8 -*-
"""v4.43：版號四處 + 版本紀錄。"""
import io

HTML = 'index.html'
s = io.open(HTML, encoding='utf-8', newline='').read()
s = s.replace('\r\n', '\n')
n0 = len(s)

# 1) const VERSION
old = "const VERSION = '4.42';"
assert s.count(old) == 1
s = s.replace(old, "const VERSION = '4.43';")

# 2) 畫面上的版號
old = '<span id="verTxt">4.42</span>'
assert s.count(old) == 1
s = s.replace(old, '<span id="verTxt">4.43</span>')

# 3) 版本紀錄畫面
old = '<span id="verLogVer">4.42</span>'
if s.count(old) == 1:
    s = s.replace(old, '<span id="verLogVer">4.43</span>')
else:
    print('warn: verLogVer 沒找到')

# 4) VERSION_LOG[0]
OLD = """const VERSION_LOG = [
  { v: '4.42', date: '2026-11-03', now: true, items: ["""
NEW = """const VERSION_LOG = [
  { v: '4.43', date: '2026-11-03', now: true, items: [
    '手機遊戲畫面把上下資訊收乾淨：直放只剩最上面「工具列」＋下面「一排資訊」，遊戲畫面整個往上長',
    '原本中間那顆 ESC 按鈕拿掉了（右邊本來就有一顆大顆的暫停鍵），不再多佔一排',
    '橫放時資訊列跟右上角的按鈕擠在同一排，沒有第二排；工具（音樂／語言／音效／全視窗／信箱…）一律收進 ⋮ 選單',
    '推車丟到牆上會「彈一格」——砸到石牆就往同方向彈過去，一落到地面就停住',
    '第一大關換上新畫的場景貼圖：外牆 2 種、硬牆 3 種、可炸的軟磚 1 種、草地 3 種，整格滿版直接鋪上去',
  ] },
  { v: '4.42', date: '2026-11-03', now: false, items: ["""
assert s.count(OLD) == 1
s = s.replace(OLD, NEW)

# 5) 舊的第一筆取消 now
OLD2 = """  { v: '4.42', date: '2026-11-03', now: false, items: ["""
assert s.count(OLD2) >= 1

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('OK  %d -> %d' % (n0, len(s)))

# 6) 三份 sw.js
for p in ('sw.js', '../public/sw.js', '../bomberman-online/public/sw.js'):
    t = io.open(p, encoding='utf-8', newline='').read()
    n = t.replace('v4.42.0', 'v4.43.0')
    io.open(p, 'w', encoding='utf-8', newline='').write(n)
    print('  sw', p, 'OK' if n != t else '(no change)')
