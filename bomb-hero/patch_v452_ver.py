# -*- coding: utf-8 -*-
# v4.52 patch D：版本號 4.51 → 4.52（四處同步）＋三份 sw.js＋版本紀錄
import io, sys

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

ITEMS = [
    '首頁 11 顆大按鈕統一外型：左側圖示徽章＋主標＋副標，四種狀態（一般／滑過／按下／發亮提示），以後新按鈕照同一套長',
    '對戰（含 AI）與線上配對都標上「測試版 Beta」；首頁那塊白底操作提示拿掉（內容在遊戲說明與新手教學都看得到）',
    '隨從售價調漲到 5000 金幣（刀客／投彈／格檔三種都一樣；已經買過的不受影響）',
    '打彈拳擊修好：真的會一路越過牆壁飛到對面（舊版第一格空地就停，等於沒越牆）',
    '推車丟到軟磚上會繼續往下一格彈（舊版只彈石牆，丟到軟磚就卡住）',
    '推車炸彈落到輸送帶上會馬上被帶走；火焰與隨從都會破壞骷髏頭（其他道具炸到不會壞）',
]

OLD = """const VERSION_LOG = [
  { v: '4.51', date: '2026-11-03', now: true, items: ["""
NEW = """const VERSION_LOG = [
  { v: '4.52', date: '2026-11-03', now: true, items: [
""" + ''.join("    '%s',\n" % it for it in ITEMS) + """  ] },
  { v: '4.51', date: '2026-11-03', now: false, items: ["""

if NEW not in s:
    must(s.count(OLD) == 1, 'VERSION_LOG anchor')
    s = s.replace(OLD, NEW)
    print('  ok   VERSION_LOG +4.52')

def rep(old, new, tag):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag); print('  skip ' + tag); return
    must(s.count(old) == 1, 'DUP %s' % tag)
    s = s.replace(old, new)
    print('  ok   ' + tag)

rep("const VERSION = '4.51';", "const VERSION = '4.52';", 'const VERSION')
rep('id="verTxt">4.51', 'id="verTxt">4.52', '#verTxt')
rep('id="verLogVer">4.51', 'id="verLogVer">4.52', '#verLogVer')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('index chars %d -> %d (%+d)' % (before, len(s), len(s) - before))

# 三份 sw.js
for f in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    try:
        t = io.open(f, encoding='utf-8', newline='').read()
    except IOError:
        print('  skip (no file) ' + f); continue
    if "var SW_VERSION = 'v4.52.0';" in t:
        print('  skip ' + f); continue
    must("var SW_VERSION = 'v4.51.0';" in t, 'SW anchor ' + f)
    t = t.replace("var SW_VERSION = 'v4.51.0';", "var SW_VERSION = 'v4.52.0';")
    io.open(f, 'w', encoding='utf-8', newline='').write(t)
    print('  ok   ' + f)

# verify-v62 的隨從價格基線（逐條改，不是放寬）
v = io.open('test/verify-v62.js', encoding='utf-8', newline='').read()
v2 = v.replace("return k.price === 1000; }), '每一隻都是 1000 金幣');",
               "return k.price === 5000; }), '每一隻都是 5000 金幣（v4.52 調漲）');")
v2 = v2.replace("//   ① 商店開放：三種隨從各 1000 金幣", "//   ① 商店開放：三種隨從各 5000 金幣（v4.52 調漲）")
v2 = v2.replace("head('1. 商店：三種隨從各 1000');", "head('1. 商店：三種隨從各 5000');")
if v2 != v:
    io.open('test/verify-v62.js', 'w', encoding='utf-8', newline='').write(v2)
    print('  ok   verify-v62 price baseline')
else:
    print('  skip verify-v62')
