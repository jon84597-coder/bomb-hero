# -*- coding: utf-8 -*-
"""v4.17 patch D：版號 / VERSION_LOG / sw.js / 商店副標 i18n"""
import io

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')
rules = []

def R(name, old, new, cnt=1):
    rules.append((name, old, new, cnt))

R('版本常數', "const VERSION = '4.16';", "const VERSION = '4.17';")
R('版本徽章 verTxt', '<span id="verTxt">4.16</span>', '<span id="verTxt">4.17</span>')
R('版本徽章 verLogVer', '<span id="verLogVer">4.16</span>', '<span id="verLogVer">4.17</span>')
R('舊版本不再是 now', "  { v: '4.16', date: '2026-11-01', now: true, items: [",
                        "  { v: '4.16', date: '2026-11-01', now: false, items: [")

NEW_ENTRY = '''  { v: '4.17', date: '2026-11-02', now: true, items: [
    '<b>🛒 商店開張：隨從系統</b>：首頁「商店」可以用了，三種隨從各 <b>1000 金幣</b>，買了就會跟在主角旁邊。金幣從過關拿（單人與 RPG 都會給，跟 RPG 雲端金幣同一套公式）',
    '<b>⚔️ 刀客隨從</b>：怪物靠近 2 格就衝上去揮刀（1 格範圍），冷卻 2 秒，有刀光與揮刀音效；單人模式一刀一隻',
    '<b>💣 投彈隨從</b>：幫你朝怪物丟炸彈，冷卻 3 秒、一次一顆，<b>不會炸到主人</b>',
    '<b>🛡️ 格檔隨從</b>：不攻擊，主動擋在怪物前面替你硬碰；擋一次要原地休息 3 秒（單人模式可以擋三下）',
    '<b>隨從被打倒會喊 Help</b>：坐在地上一直哭、頭上冒出 <b>Help</b>；主角靠近 <b>5 秒</b>就能救回來。單人模式被打一下就倒（格檔三下），RPG 模式有 HP',
    '<b>隨從會幫你撿道具</b>：附近有道具會跑去撿，撿到直接算你的（骷髏頭不撿）。只出現在單人闖關與 RPG，對戰／線上不會有隨從',
    '<b>小怪變多、變聰明</b>：單人每關小怪 +約 35%（第 1 關 6 → 8、第 7 關 15 → 20），RPG 也一樣變多；追人的怪改成「挑最近的一格走」，迷宮裡會自己轉彎，而且不踩火線',
    '<b>RPG 小怪血量調回來</b>：史萊姆 2→3、鐵甲蟲 3→4、疾風蜥 4→5 …整批變厚，打起來更有壓力（單人維持一擊必殺）',
    '<b>對戰 AI 也會丟炸彈</b>：對手在 2～6 格內，AI 會隔著牆拋一顆炸彈過來，不再是只在腳下放彈',
    '<b>推車投彈更清楚</b>：車上的人手上一定拿著一顆<b>跟地上一模一樣的引燃炸彈</b>（會閃、有火花）；集氣條變得又大又亮（三段顏色＋百分比＋第幾格），落點整格亮起來、跑虛線、有準心與數字，還有一條瞄準線'
  ] },
'''

R('插入 4.17 版本紀錄',
  "const VERSION_LOG = [\n  { v: '4.16',",
  "const VERSION_LOG = [\n" + NEW_ENTRY + "  { v: '4.16',")

# 商店副標題：十語言一起改（HTML 上的靜態文案要對得上字典，i18n 覆蓋率才不會掉）
NOTES = [
  ('zh-TW', "'store.note': '未來開放 · 道具／造型兌換'", "'store.note': '隨從 1000 金幣 · 單人／RPG 幫打'"),
  ('zh-CN', "'store.note': '未来开放 · 道具／造型兑换'", "'store.note': '随从 1000 金币 · 单人／RPG 帮打'"),
  ('en',    "'store.note': 'Coming soon · items / skins'", "'store.note': 'Followers · 1,000 gold · Solo / RPG'"),
  ('ja',    "'store.note': '近日公開 · アイテム／スキン'", "'store.note': 'お供 1000ゴールド · ソロ／RPG'"),
  ('ko',    "'store.note': '추후 오픈 · 아이템／스킨'", "'store.note': '동료 1000골드 · 싱글／RPG'"),
  ('th',    "'store.note': 'เปิดเร็ว ๆ นี้ · ไอเทม／สกิน'", "'store.note': 'ลูกสมุน 1,000 เหรียญ · เดี่ยว／RPG'"),
  ('vi',    "'store.note': 'Sắp mở · vật phẩm／ngoại hình'", "'store.note': 'Đồng hành 1.000 vàng · Solo／RPG'"),
  ('ru',    "'store.note': 'Скоро · предметы／образы'", "'store.note': 'Спутники · 1000 золота · Соло／RPG'"),
  ('de',    "'store.note': 'Demnächst · Items／Skins'", "'store.note': 'Gefährten · 1.000 Gold · Solo／RPG'"),
  ('it',    "'store.note': 'Prossimamente · oggetti／skin'", "'store.note': 'Seguaci · 1.000 oro · Solo／RPG'")
]
for lang, old, new in NOTES:
    R('商店副標 ' + lang, old, new)

for name, old, new, cnt in rules:
    n = s.count(old)
    assert n == cnt, '規則「%s」命中 %d 次（預期 %d）' % (name, n, cnt)
    s = s.replace(old, new)
    print('  ok  ' + name)

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))

# sw.js
sw = io.open('sw.js', encoding='utf-8', newline='').read()
old_sw = "var SW_VERSION = 'v4.16.0';"
assert sw.count(old_sw) == 1
sw = sw.replace(old_sw, "var SW_VERSION = 'v4.17.0';")
io.open('sw.js', 'w', encoding='utf-8', newline='').write(sw)
print('  ok  sw.js v4.17.0')
print('patch D done')
