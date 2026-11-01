# -*- coding: utf-8 -*-
# v4.14 第三輪：版號 4.13 → 4.14、更新紀錄、Service Worker 快取版本
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

R("""const VERSION = '4.13';""", """const VERSION = '4.14';""")
R("""📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.13</span></span>""",
  """📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.14</span></span>""")
R("""      <div class="ver beta">測試版 v<span id="verTxt">4.13</span></div>""",
  """      <div class="ver beta">測試版 v<span id="verTxt">4.14</span></div>""")

R(
"""const VERSION_LOG = [
  { v: '4.13', date: '2026-11-01', now: true, items: [""",
"""const VERSION_LOG = [
  { v: '4.14', date: '2026-11-01', now: true, items: [
    '<b>撿炸彈／踢炸彈修好</b>：拿到遙控器（計時炸彈）或搬彈手套之後，撿不起炸彈、踢彈鞋也踢不動。原因有三個 —— 炸彈被當成空氣直接走過去（踢的判定看不到炸彈）、踢／打被手套擋掉、動作鍵被線圈炸彈吃掉。現在改成：<b>炸彈一律有實體</b>、<b>踢／打不看手套</b>、<b>動作鍵撿彈優先</b>',
    '<b>單人闖關 8 關 → 32 張地圖</b>：跟 RPG 模式共用同一份 32 張地圖（8 大主題 × 4 張地區小地圖），地形改成有機生成（洞穴／迷宮／環形／樑柱陣…），固定種子 → 同一關每次進去長得都一樣',
    '<b>每一大關的第 4 張是魔王關</b>：第 4、8、12 … 32 關都會出魔王，血量從 5 下逐區增加到 12 下（第 32 關＝最終魔王「魔王之間」）',
    '<b>選關畫面擴成 32 格</b>：魔王關標 👑，地圖名太長自動省略；桌面 4 欄、手機 8 欄，格子可以捲動',
    '<b>怪物量與種類重新配</b>：第 1 關 6 隻 → 第 32 關 18 隻，怪物種類隨大關增加（最後一大關全部 20 種＋4 種技能怪）；速度等級封頂在第 8 關的數值，不會越後面越追不到',
    '<b>遙控引爆不會炸到自己</b>：手上拿著（手套撿起來）的遙控彈，按 E 不會引爆 → 不會一按就炸在懷裡'
  ] },
  { v: '4.13', date: '2026-11-01', now: false, items: ["""
)

failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:80]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
else:
    io.open(PATH, 'w', encoding='utf-8', newline='').write(text.replace('\n', '\r\n'))
    print("OK: %d rules" % len(rules))

# sw.js 版本
SW = 'sw.js'
s = io.open(SW, encoding='utf-8', newline='').read()
if "var SW_VERSION = 'v4.13.0';" in s.replace('\r\n', '\n'):
    s = s.replace("var SW_VERSION = 'v4.13.0';", "var SW_VERSION = 'v4.14.0';")
    io.open(SW, 'w', encoding='utf-8', newline='').write(s)
    print("OK: sw.js -> v4.14.0")
else:
    print("sw.js: pattern not found")
