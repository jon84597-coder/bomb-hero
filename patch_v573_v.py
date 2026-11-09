# -*- coding: utf-8 -*-
"""v5.73 patch V: 版本號（七處）+ 版本紀錄"""
import io, os, json, re

D = os.path.dirname(__file__)
PM = os.path.join(D, 'bomb-hero', 'js', 'main.js')
PH = os.path.join(D, 'bomb-hero', 'index.html')
PV = os.path.join(D, 'bomb-hero', 'js', 'version-log.js')
PK = os.path.join(D, 'package.json')

m = io.open(PM, 'r', encoding='utf-8', newline='').read()
h = io.open(PH, 'r', encoding='utf-8', newline='').read()
v = io.open(PV, 'r', encoding='utf-8', newline='').read()

assert m.count("const VERSION = '5.72';") == 1
m = m.replace("const VERSION = '5.72';", "const VERSION = '5.73';")

assert h.count('<span id="verTxt">5.72</span>') == 1
h = h.replace('<span id="verTxt">5.72</span>', '<span id="verTxt">5.73</span>')
assert h.count('<span id="verLogVer">5.72</span>') == 1
h = h.replace('<span id="verLogVer">5.72</span>', '<span id="verLogVer">5.73</span>')

assert v.count("{ v: '5.72', date: '2026-11-09', now: true, items: [") == 1
v = v.replace("{ v: '5.72', date: '2026-11-09', now: true, items: [",
              "{ v: '5.72', date: '2026-11-09', now: false, items: [")

NEW = """window.__VERSION_LOG = [
    { v: '5.73', date: '2026-11-09', now: true, items: [
    '🕳️ <b>深淵（無盡模式）</b>：40 關全破之後開啟。每一層都是一關，主題在 2~39 關之間輪轉，<b>第 5 的倍數進 BOSS 決戰場</b>；越深炸彈越多、火力越強、<b>引信一路縮短</b>（最低 42%），但血量最多只給 3 格 —— 難度來自節奏變快，不是怪變肉。死亡即結算，記錄最深層數並上全服榜。',
    '⏱️ <b>本週限制挑戰</b>：每週一道題、同一張圖、同一條限制（<b>長引信 / 孤軍奮戰 / 空手</b>），一週內比最快秒數。限制每幀都會重新套用 —— 吃到引信強化卡或撿到隨從都不會偷偷失效。榜單獨立，不會跟每日／每週榜混在一起。',
    '🔥 <b>每日特惠</b>：商店每天換三件折扣商品（隨從、升級、門票、補給三件組），<b>當天全服同一組、每件限購一次</b>。這是金幣第一個「今天不買就虧了」的出口。',
    '✨ <b>八個角色各有專屬技</b>：疾風步／滾地閃避／速爆指令／烈焰灌注／拾金之手／鐵壁／軍械補給／星塵爆。不花技能點、不佔出戰 4 欄、獨立冷卻，按 <b>T</b> 或點技能列最前面那顆金色按鈕。',
    '🧩 <b>招式 combo</b>：兩招在 4 秒內接續會產生第三種效果 —— <b>冰霜→震地（碎冰）</b>、<b>護盾→遙控（盾炸）</b>、<b>遙控→震地（氣浪）</b>。冷卻各自獨立，連段靠時機不靠運氣。',
    '🎒 <b>三件行為型補給</b>：透視符（30 秒看穿牆後道具）、煙霧彈（開場 10 秒怪物看不到你）、傳送卷（陣亡自動回起點）。終於不是只有「+血 +甲 +火力」。',
    '🎲 <b>支線事件</b>：過關後 12% 遇到<b>路邊商人／寶箱／賭局</b>，一張卡一次決定，不打断節奏；深淵與限制挑戰不插事件（公平）。',
    '🐣 <b>新手不再選擇過載</b>：第一次打開只有一顆「開始冒險」，通關 2／4／6 關逐步解鎖其他模式與社群入口。<b>只影響全新帳號</b>，老玩家首頁一個像素都不變。',
    '📊 <b>今日進度</b>：招呼語下面多一行「第 X/40 關 · ★ N/M · 深淵 N 層」，把長期目標切成每天都看得到的數字。',
    '🪨 <b>地板材質</b>：手繪石礫母圖四象限鏡像拼接成無縫貼圖，再依八個主題色系衍生八張，以 overlay 34% 疊在地板上 —— 地板終於有「材質」而不是色塊；同時所有角色補上統一落地投影（光源固定在左上）。',
    '🩺 <b>失敗埋點</b>：死亡時上報「第幾關、被什麼弄死」，後台總算能看出玩家卡在哪一關。',
    '🧪 新增 <b>verify-v574</b>（60 項）：深淵層數輪轉、限制挑戰三條、特惠當天固定、八招專屬技、三組 combo、九件補給、支線機率、新手判定、埋點、今日進度、八張材質與字典五語。',
  ] },
    { v: '5.72', date: '2026-11-09', now: false, items: ["""
assert v.count("window.__VERSION_LOG = [\n    { v: '5.72', date: '2026-11-09', now: false, items: [") == 1
v = v.replace("window.__VERSION_LOG = [\n    { v: '5.72', date: '2026-11-09', now: false, items: [", NEW)

pk = io.open(PK, 'r', encoding='utf-8', newline='').read()
assert pk.count('"version": "5.72.0"') == 1
pk = pk.replace('"version": "5.72.0"', '"version": "5.73.0"')

for path, data in ((PM, m), (PH, h), (PV, v), (PK, pk)):
    assert data.count('\r\n') == 0, 'CRLF ' + path
    tmp = path + '.tmp'
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(data)
    os.replace(tmp, path)

# SW：三份
n = 0
for rel in ('bomb-hero/sw.js', 'public/sw.js', 'bomberman-online/public/sw.js'):
    p = os.path.join(D, rel)
    if not os.path.exists(p):
        continue
    s = io.open(p, 'r', encoding='utf-8', newline='').read()
    s2 = s.replace("var SW_VERSION = 'v5.72.0';", "var SW_VERSION = 'v5.73.0';")
    if s2 != s:
        tmp = p + '.tmp'
        io.open(tmp, 'w', encoding='utf-8', newline='\n').write(s2)
        os.replace(tmp, p)
        n += 1
print('版本更新完成，sw 改了', n, '份')
