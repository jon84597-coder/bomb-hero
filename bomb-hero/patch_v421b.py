# -*- coding: utf-8 -*-
# v4.21 版號 / 版本紀錄 / Service Worker
import io, sys, re

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
crlf = '\r\n' in raw
s = raw.replace('\r\n', '\n')
bad = 0

def rep(name, old, new, cnt=1):
    global s, bad
    n = s.count(old)
    if n != cnt:
        print('  ! %s -> hits %d (want %d)' % (name, n, cnt)); bad += 1; return
    s = s.replace(old, new)

rep('VERSION', "const VERSION = '4.20';", "const VERSION = '4.21';")
rep('verTxt', 'id="verTxt">4.20<', 'id="verTxt">4.21<')
rep('verLogVer', 'id="verLogVer">4.20<', 'id="verLogVer">4.21<')

rep('VERSION_LOG 新條目',
"""const VERSION_LOG = [
  { v: '4.20', date: '2026-11-02', now: true, items: [""",
"""const VERSION_LOG = [
  { v: '4.21', date: '2026-11-02', now: true, items: [
    '<b>🔧 修好「有些選項進不去」</b>：首頁的<b>作者公告</b>以前會浮在選單上面（展開時直接蓋住按鈕），點「商店／RPG／BOSS」其實是點到公告文字 → 現在公告改成卡片內的一般區塊、預設收成小膠囊，<b>再也不會蓋住任何按鈕</b>',
    '<b>📐 修好「畫面頂端被切掉」</b>：內容比視窗高的時候（手機尤其明顯），整頁會往上溢出、上半截拉不回來 → 改成「有空間就置中、沒空間就從上面排」，一定捲得到',
    '<b>🛒 商店／🎲 RPG／👑 BOSS／👤 帳號</b>：改成先切換畫面再畫內容，而且出錯會跳出訊息（以前只要中間一個小錯誤，按鈕就完全沒反應、也不說為什麼）',
    '<b>📣 分享拿金幣</b>：FB／LINE 內建瀏覽器改用「連結點擊」開啟分享頁（以前常被當彈窗擋掉）；未登入時點分享會直接幫你開帳號視窗；加上 16 秒保險，按鈕不會再卡在「不能按」',
    '<b>🚪 首頁多了「離開遊戲」</b>：關掉頁面前的離場卡，會提醒你進度已存好（手機／內建瀏覽器不允許網頁自己關閉時，就停在離場卡上，不會變黑畫面）',
    '<b>💰 關卡金幣可以拿來買隨從了</b>：關卡中 HUD 上那顆 💰 就是你賺到的金幣 —— <b>過關時「本關金幣 ＋ 過關獎勵」一起進商店錢包</b>；不幸陣亡也會把這關賺到的金幣留給你',
    '<b>🚪 找傳送門的提示變漂亮了</b>：以前是畫面正中央的巨型字，閃 0.9 秒就不見、還蓋住整張地圖。現在改成上方的毛玻璃提示卡：滑入 → 停留 2.6 秒 → 慢慢淡出，底部還有剩餘時間的進度條'
  ] },
  { v: '4.20', date: '2026-11-02', now: false, items: [""")

print('bad', bad)
if bad:
    sys.exit(1)
if crlf:
    s = s.replace('\n', '\r\n')
io.open(P, 'wb').write(s.encode('utf-8'))

# ---- sw.js（三份）----
import os
base = os.path.dirname(os.path.abspath('sw.js'))
for p in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    if not os.path.exists(p):
        print('  skip (not found)', p); continue
    t = io.open(p, 'rb').read().decode('utf-8')
    t2 = re.sub(r"var SW_VERSION = 'v[\d.]+';", "var SW_VERSION = 'v4.21.0';", t)
    if t2 == t:
        print('  ! sw 未變更', p); bad += 1
    io.open(p, 'wb').write(t2.encode('utf-8'))
    print('  sw ok', p, re.search(r"SW_VERSION = '[^']+'", t2).group(0))
print('final bad', bad)
