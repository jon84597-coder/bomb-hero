# -*- coding: utf-8 -*-
"""patch_v474_d.py — v4.74：入口卡文案、死亡小卡樣式、版本紀錄、版本號"""
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()

def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        print('FAIL[%s] count=%d want=%d' % (tag, n, cnt)); sys.exit(1)
    s = s.replace(old, new)
    print('ok[%s]' % tag)

# ── 1) 入口卡：30 人／免費／隨機大陸 ──
rep("""  ov.innerHTML = '<div class="ov-box" style="background:rgba(14,20,32,.95);border-radius:16px;' +
    'padding:18px 16px;box-shadow:0 18px 44px rgba(0,0,0,.55)"><h3>🏝️ 大逃殺 · 三島</h3>' +
    '<p>' + BR.W + '×' + BR.H + ' 的超大地圖切成 <b>三座島</b>，中間只有兩條 3 格寬的窄橋 —— 過橋就是別人的地盤。' +
    '每一場三座島會隨機配上三種不同地形（草原／沙地／冰原／熔岩／霓虹／深海／天空／魔城），' +
    '地板、可炸物、地面裝飾都跟著換。</p>' +
    '<p><b>8 人同場</b>（你 + 7 個 AI）＋ 14 隻小怪平均散在三座島上。' +
    '毒圈會從腳下最大的島開始往內收，圈外撐 1.6 秒就淘汰；<b>最後一個活著的就是冠軍</b>。</p>' +
    '<p>🏅 名次獎勵：冠軍 1200 金幣、亞軍 700、季軍 450（依序遞減到 80）；' +
    '<b>前三名再送一張門票</b>，打得好可以一直打下去。</p>' +
    '<p>🎟️ 你目前有 <b>' + tkN + ' 張</b>門票（每場消耗 1 張；每天登入送 1 張，商店 ' + price + ' 金幣可買）。</p>' +
    (tkN > 0
      ? '<button class="mbtn warm" id="brGo">出發（消耗 1 張門票）</button>'
      : '<button class="mbtn warm" id="brGo">門票不足 → 去商店</button>') +
    ' <button class="ghostbtn" id="brOk">再想想</button></div>';""",
"""  ov.innerHTML = '<div class="ov-box" style="background:rgba(14,20,32,.95);border-radius:16px;' +
    'padding:18px 16px;box-shadow:0 18px 44px rgba(0,0,0,.55)"><h3>🏝️ 大逃殺 · 隨機大陸</h3>' +
    '<p>' + BR.W + '×' + BR.H + ' 的<b>隨機不規則地圖</b>：八種地形（草原／沙地／冰原／熔岩／霓虹／深海／天空／魔城）' +
    '各佔一塊，走過去地板、可炸物、裝飾就換一套。障礙幾乎都是<b>可炸的軟磚</b>，硬牆很少，' +
    '圖上還散著<b>草叢／破屋／陶甕</b>可以躲人（躲在裡面 AI 看不到你）。</p>' +
    '<p><b>' + BR.N + ' 人同場</b>（你 + ' + (BR.N - 1) + ' 個 AI）＋ ' + BR.FOES + ' 隻小怪散在整張圖。' +
    '毒圈 <b>10 分鐘收 10 次</b>（每分鐘一次），圈外撐 1.6 秒掉一點血；<b>最後一個活著的就是冠軍</b>。</p>' +
    '<p>🏅 名次獎勵：冠軍 1200 金幣、亞軍 700、季軍 450（依序遞減到 80）；前三名再送一張門票。</p>' +
    (BR.FREE
      ? '<p>🎟️ <b>正式測試期間免費入場</b>（不收門票；你目前有 ' + tkN + ' 張，等正式開放才扣）。</p>'
      : '<p>🎟️ 你目前有 <b>' + tkN + ' 張</b>門票（每場消耗 1 張；每天登入送 1 張，商店 ' + price + ' 金幣可買）。</p>') +
    '<button class="mbtn warm" id="brGo">出發（' + BR.N + ' 人混戰）</button>' +
    ' <button class="ghostbtn" id="brOk">再想想</button></div>';""", 'card')

# ── 2) 死亡小卡樣式 ──
rep("</style>",
""".br-end { position: fixed; left: 50%; top: 60px; transform: translateX(-50%); z-index: 62;
  width: min(90vw, 330px); padding: 10px 12px 9px; border-radius: 12px;
  background: rgba(10,16,28,.94); border: 1px solid rgba(255,120,190,.5);
  box-shadow: 0 12px 30px rgba(0,0,0,.5); text-align: center; color: #fff;
  font-size: 13px; line-height: 1.5; pointer-events: auto; }
.br-end.hide { display: none; }
.br-end b { display: block; font-size: 15px; font-weight: 900; color: #ffe6a6; margin-bottom: 2px; }
.br-end i { display: block; font-style: normal; color: #b9c7e4; font-size: 12px; margin-bottom: 7px; }
.br-end .br-end-row { display: flex; gap: 8px; justify-content: center; }
.br-end .mbtn, .br-end .ghostbtn { width: auto; padding: 7px 14px; font-size: 13px; }
</style>""", 'css')

# ── 3) 版本號 ──
rep("const VERSION = '4.73';", "const VERSION = '4.74';", 'version')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.73</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.74</span></div>', 'vertxt')
rep('<span class="vlnum">v<span id="verLogVer">4.73</span></span>',
    '<span class="vlnum">v<span id="verLogVer">4.74</span></span>', 'verlogver')

# ── 4) 版本紀錄 ──
rep("""const VERSION_LOG = [
  { v: '4.73', date: '2026-11-04', now: true, items: [""",
"""const VERSION_LOG = [
  { v: '4.74', date: '2026-11-04', now: true, items: [
    '🏝️ 大逃殺改成「隨機不規則大陸」：不再是三座島，整張 56×44 的圖是一塊彎彎曲曲的大陸＋外海，八種地形各佔一區（分區邊界帶雜訊，不是直線切格）',
    '硬牆大幅減少（只佔約 8% 的零碎岩層），障礙幾乎都是可炸的軟磚；圖上隨機散著草叢／破屋／陶甕，躲進去 AI 看不到你',
    '毒圈改成 10 分鐘收 10 次（每分鐘縮一次，半徑 26→22→18.5→15→12→9.5→7.5→5.5→4→2.8 格）',
    '人數開放到 30 人同場（你 + 29 個 AI）；小怪數量維持 14 隻，改成散在整張圖、依所在地形區決定種類',
    '正式測試期間免費入場（不扣門票）；名次獎勵照舊，第 9 名以後一樣拿 80 金幣',
    '自己頭上跟對戰一樣會顯示「我」的牌子；躲進草叢時 AI 看不到你',
    '電腦不再傻站在自己的炸彈上：腳下有炸彈就一定會跑（最多找 5 步內的安全格），跑不掉也會往離炸彈最遠的方向走，而不是原地不動',
    '玩家出局不再蓋一張全螢幕結算卡（看不到自己怎麼死的），改成畫面上方的小卡；比賽會繼續，鏡頭自動切給還活著的人',
    '大圖的怪物比例與碰撞判定一起縮一級（約 -16%），手機上不再覺得怪物很大一隻' ] },
  { v: '4.73', date: '2026-11-04', now: false, items: [""", 'log')

# ── 5) 測試介面匯出 ──
rep("  brOnDeath: brOnDeath, drawBRHud: drawBRHud, drawBRZone: drawBRZone, brSteer: brSteer, viewRange: viewRange,",
    "  brOnDeath: brOnDeath, drawBRHud: drawBRHud, drawBRZone: drawBRZone, brSteer: brSteer, viewRange: viewRange,\n  showBRDeath: showBRDeath, aiEscape: aiEscape, placeHideTiles: placeHideTiles,",
    'export')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done', len(s))

for f in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    t = io.open(f, encoding='utf-8').read()
    if t.count("'v4.73.0'") != 1:
        print('FAIL sw', f); sys.exit(1)
    t = t.replace("'v4.73.0'", "'v4.74.0'")
    io.open(f, 'w', encoding='utf-8', newline='\n').write(t)
    print('ok sw', f)
