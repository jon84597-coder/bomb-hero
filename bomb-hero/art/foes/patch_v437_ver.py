# -*- coding: utf-8 -*-
"""v4.37 版號＋版本紀錄"""
import io, os

ROOT = r'C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero'
PAGE = os.path.join(ROOT, 'index.html')
s = io.open(PAGE, encoding='utf-8', newline='').read().replace('\r\n', '\n')

# 1) const VERSION
a = "const VERSION = '4.36';"
assert s.count(a) == 1
s = s.replace(a, "const VERSION = '4.37';")

# 2) 標題列
a = '<div class="ver beta">測試版 v<span id="verTxt">4.36</span></div>'
assert s.count(a) == 1
s = s.replace(a, '<div class="ver beta">測試版 v<span id="verTxt">4.37</span></div>')

# 3) 版本紀錄標題
a = '<b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.36</span></span>'
assert s.count(a) == 1
s = s.replace(a, '<b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.37</span></span>')

# 4) VERSION_LOG[0]
a = "  { v: '4.36', date: '2026-11-02', now: true, items: ["
assert s.count(a) == 1
s = s.replace(a, "  { v: '4.36', date: '2026-11-02', now: false, items: [")

ITEMS = [
    '激戰突死縮圈：落石現在會一圈一圈落滿整個場地，不會再跳過中間好幾圈（以前中間會有一整圈是空的）',
    '對戰模式的電腦對手終於會躲落石了：它會往還沒落石的內圈跑，被自己的軟磚關住時還會自己炸一條路出來',
    '縮圈的落石速度調快一點（每格 0.9 秒 → 0.55 秒），因為現在落滿全場，總時間才不會拖太久',
    '48 隻小怪的體型重新配比：強悍的怪變大了 —— 死亡騎士、皇家守衛、熊貓、鮟鱇魚現在比主角還大隻，'
    '巫師、機器人、霓虹機兵、黃蜂、巨鷹、風靈也都長到跟主角相當',
    '太小的幾隻補回合理體型：巨鷹與黑暗蝙蝠從主角的 0.39 倍調到 0.95／0.72 倍，蜥蜴、飛艇、光靈、幽靈、'
    '甲蟲、沙丘獸、岩石怪、章魚、海豹、企鵝、貴族蟹都明顯長大了；兔子、螃蟹、激光蜂幾隻體型偏大的微縮一點',
    '修掉 9 隻小怪的去背瑕疵：殘留的白底、白邊、白方塊清乾淨了，被誤刪的本體（幽靈的頭頂、金色雷球的引線）也補回來了',
]
NEW = ("  { v: '4.37', date: '2026-11-02', now: true, items: [\n"
       + ''.join("    '%s',\n" % t for t in ITEMS)
       + "  ] },\n")
anchor = "  { v: '4.36', date: '2026-11-02', now: false, items: ["
assert s.count(anchor) == 1
s = s.replace(anchor, NEW + anchor, 1)

io.open(PAGE, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('ok [v437-ver] 版號 4.37，紀錄條目 %d 行' % NEW.count('\n'))
