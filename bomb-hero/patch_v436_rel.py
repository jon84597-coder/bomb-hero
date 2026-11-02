# -*- coding: utf-8 -*-
"""v4.36 發佈收尾：版本號 4.35 -> 4.36（四處）＋ VERSION_LOG 新增條目"""
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
src = s.replace('\r\n', '\n')
orig = src

def rep(old, new, tag, n=1):
    global src
    c = src.count(old)
    assert c == n, '[%s] 預期 %d 次，實際 %d 次' % (tag, n, c)
    src = src.replace(old, new)
    print('ok [%s]' % tag)

# 1) VERSION
rep("const VERSION = '4.35';", "const VERSION = '4.36';", 'VERSION')
# 2) 版本紀錄彈窗標題
rep('<span id="verLogVer">4.35</span>', '<span id="verLogVer">4.36</span>', 'verLogVer')
# 3) 首頁版本徽章
rep('<div class="ver beta">測試版 v<span id="verTxt">4.35</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.36</span></div>', 'verTxt')

# 4) VERSION_LOG：新的放最上面，舊的 now 改 false
old_head = """const VERSION_LOG = [
  { v: '4.35', date: '2026-11-02', now: true, items: ["""
new_head = """const VERSION_LOG = [
  { v: '4.36', date: '2026-11-02', now: true, items: [
    '對戰模式的龍吐火真的燒得到人了：火柱從 2 格延長到 3 格、兩側還多了斜角火苗，對手貼邊站也躲不掉',
    '對戰 AI 會轉向了：以前不管往哪走臉都朝同一邊，現在往哪走就看哪邊',
    '手套撿炸彈修好了：站在炸彈上、或面前那一格，不分誰丟的都撿得起來；自己剛放下的要等 0.35 秒才撿',
    '豬、青蛙、小雞三隻主角縮小 5%，跟其他角色站在一起比較不擠',
    '48 隻小怪全部有自己的習性與特殊技能：會分裂、吐元素彈、蓄力衝撞、瞬移、吹風推人、麻痺、召喚同伴',
    '小怪身上開始有元素特效：火焰、冰霧、雷電、紫色邪氣、水紋、風、霓虹、毒霧、砂土、自然之力，一眼就分得出屬性',
    '每場關卡的怪上限 12 隻，數量依關卡難度與地圖大小自動調整（不會再一開場就被人海淹沒）',
    '新增 8 隻主角風格的章節 BOSS：每大關第 4 關（4／8／12…28）與最後第 32 關都會遇到大魔王',
    '怪物圖鑑同步更新：每隻怪的敘述後面多了「習性」與「特殊技能」兩段說明'
  ] },
  { v: '4.35', date: '2026-11-02', now: false, items: ["""
rep(old_head, new_head, 'VERSION_LOG')

assert src != orig
out = src.replace('\n', '\r\n')
io.open(P, 'w', encoding='utf-8', newline='').write(out)
print('write ok  %d bytes' % len(out.encode('utf-8')))
