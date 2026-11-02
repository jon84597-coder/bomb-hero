# -*- coding: utf-8 -*-
"""v4.23 patch D：版號 4.23 + VERSION_LOG 新條目 + 三份 sw.js"""
import io, os

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')

def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, '需要 %d 次，實際 %d 次：%r' % (cnt, n, old[:80])
    s = s.replace(old, new)

rep("const VERSION = '4.22';", "const VERSION = '4.23';")
rep('<div class="ver beta">測試版 v<span id="verTxt">4.22</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.23</span></div>')
rep('<span class="vlnum">v<span id="verLogVer">4.22</span></span>',
    '<span class="vlnum">v<span id="verLogVer">4.23</span></span>')

entry = """const VERSION_LOG = [
  { v: '4.23', date: '2026-11-02', now: true, items: [
    '<b>🛡️ 四顆按鈕不會再「一起壞掉」</b>：以前整個程式是一個大模組，<b>只要其中一段在初始化時出錯，後面所有功能（商店／帳號／RPG／BOSS）就全部跟著停擺</b>，而且畫面上完全沒訊息。現在每個模組都獨立包起來 —— 一段出錯只影響那一項，其餘照常運作。',
    '<b>🧯 首頁會直接告訴你哪裡壞了</b>：真的載入失敗時，首頁上方會出現紅色診斷卡，寫出<b>是哪個模組、什麼原因</b>，還有一顆「🔄 強制更新」可以自己救回來（以前只會「按了沒反應」）。',
    '<b>📜 左上角「版本更新內容」不再浮在選單上</b>：它原本是固定浮動的，滑到哪裡都黏在畫面左上、<b>會蓋住下面的按鈕</b>（點下去變成開版本紀錄）。現在改成跟「作者公告」並排的普通區塊。',
    '<b>👤 「帳號登入」看得到了</b>：舊版是深藍底配深褐字，幾乎看不見。改成淺藍卡片＋深藍字，「商店」也改成金色卡片。',
    '<b>📱 手機選單改兩欄</b>：原本十顆按鈕一路排到第四屏，<b>商店／帳號登入要滑很久才找得到</b>。現在三個主模式跨滿整列、其餘兩兩並排，商店與帳號也提到 BOSS 下面，一屏就看得到。',
    '<b>🧊 寒冰地圖的元件重畫了</b>：硬牆／軟牆／地板／滑地以前全是淡藍色，只有細節不同，<b>玩家會把地板當成牆</b>。現在用「明度階梯」分開 —— 雪地最亮、冰塊中間偏亮、滑地中間偏暗、硬牆最深，形狀也各不相同（深藍厚方塊／八角冰晶／鏡面方形），<b>縮到手機小格子、甚至印成黑白都分得出來</b>。'
  ] },
  { v: '4.22', date: '2026-11-02', now: false, items: ["""
rep("const VERSION_LOG = [\n  { v: '4.22', date: '2026-11-02', now: true, items: [", entry)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('index.html 版號與紀錄完成')

# --- 三份 sw.js
sw = io.open('sw.js', encoding='utf-8', newline='').read()
assert "var SW_VERSION = 'v4.22.0';" in sw, sw[:400]
sw = sw.replace("var SW_VERSION = 'v4.22.0';", "var SW_VERSION = 'v4.23.0';")
io.open('sw.js', 'w', encoding='utf-8', newline='').write(sw)
for p in ['../public/sw.js', '../bomberman-online/public/sw.js']:
    if os.path.exists(p):
        io.open(p, 'w', encoding='utf-8', newline='').write(sw)
        print('同步', p)
print('SW 版號完成')
