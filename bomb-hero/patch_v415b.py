# -*- coding: utf-8 -*-
"""patch_v415b.py —— v4.15：10 種語言的選單文案 ＋ 升版號 ＋ VERSION_LOG ＋ sw.js"""
import io

# ---------- 1. index.html ----------
P = 'index.html'
with io.open(P, 'r', encoding='utf-8', newline='') as f:
    text = f.read()
text = text.replace('\r\n', '\n')

R = []


def rule(old, new):
    R.append((old, new))


# ---- 主選單：對戰 / 組隊 說明（10 語言）----
rule("'menu.battle.sub': '4／8 人混戰 · 可改名 · 沒人就 AI 補位'",
     "'menu.battle.sub': '2～8 人混戰 · 可改名 · 沒人就 AI 補位'")
rule("'menu.battle.sub': '4／8 人混战 · 可改名 · 没人就 AI 补位'",
     "'menu.battle.sub': '2～8 人混战 · 可改名 · 没人就 AI 补位'")
rule("'menu.battle.sub': '4 / 8 player melee · rename · AI fills empty slots'",
     "'menu.battle.sub': '2–8 player melee · rename · AI fills empty slots'")
rule("'menu.battle.sub': '4／8 人バトル · 名前変更OK · 空きはAIが補充'",
     "'menu.battle.sub': '2～8 人バトル · 名前変更OK · 空きはAIが補充'")
rule("'menu.battle.sub': '4／8인 난투 · 이름 변경 · 빈자리는 AI'",
     "'menu.battle.sub': '2～8인 난투 · 이름 변경 · 빈자리는 AI'")
rule("'menu.battle.sub': 'บวกกัน 4／8 คน · เปลี่ยนชื่อได้ · ไม่ครบให้ AI แทน'",
     "'menu.battle.sub': 'บวกกัน 2～8 คน · เปลี่ยนชื่อได้ · ไม่ครบให้ AI แทน'")
rule("'menu.battle.sub': 'Hỗn chiến 4／8 người · đổi tên · thiếu người AI thế chỗ'",
     "'menu.battle.sub': 'Hỗn chiến 2～8 người · đổi tên · thiếu người AI thế chỗ'")
rule("'menu.battle.sub': '4／8 игроков · можно менять имя · пустые слоты займёт ИИ'",
     "'menu.battle.sub': '2–8 игроков · можно менять имя · пустые слоты займёт ИИ'")
rule("'menu.battle.sub': '4／8 Spieler · Namen ändern · freie Plätze füllt die KI'",
     "'menu.battle.sub': '2–8 Spieler · Namen ändern · freie Plätze füllt die KI'")
rule("'menu.battle.sub': 'Mischia 4／8 giocatori · nome modificabile · IA nei posti vuoti'",
     "'menu.battle.sub': 'Mischia 2–8 giocatori · nome modificabile · IA nei posti vuoti'")

# ---- 組隊對戰：正式開放（10 語言）----
rule("'menu.team': '👥 組隊 對戰', 'menu.team.sub': '未開放 敬請期待'",
     "'menu.team': '👥 組隊 對戰', 'menu.team.sub': '紅／藍／綠／黃 4 隊 · 2～8 人'")
rule("'menu.team': '👥 组队 对战', 'menu.team.sub': '未开放 敬请期待'",
     "'menu.team': '👥 组队 对战', 'menu.team.sub': '红／蓝／绿／黄 4 队 · 2～8 人'")
rule("'menu.team': '👥 Team Battle', 'menu.team.sub': 'Coming soon'",
     "'menu.team': '👥 Team Battle', 'menu.team.sub': 'Red / Blue / Green / Yellow · 2–8 players'")
rule("'menu.team': '👥 チーム対戦', 'menu.team.sub': '未実装 お楽しみに'",
     "'menu.team': '👥 チーム対戦', 'menu.team.sub': '赤／青／緑／黄 4 チーム · 2～8 人'")
rule("'menu.team': '👥 팀 대전', 'menu.team.sub': '미지원 · 기대해 주세요'",
     "'menu.team': '👥 팀 대전', 'menu.team.sub': '빨강／파랑／초록／노랑 4팀 · 2～8인'")
rule("'menu.team': '👥 ต่อสู้แบบทีม', 'menu.team.sub': 'ยังไม่เปิด ฝากติดตาม'",
     "'menu.team': '👥 ต่อสู้แบบทีม', 'menu.team.sub': 'แดง／น้ำเงิน／เขียว／เหลือง 4 ทีม · 2～8 คน'")
rule("'menu.team': '👥 Đối chiến đội', 'menu.team.sub': 'Chưa mở · mong bạn đón chờ'",
     "'menu.team': '👥 Đối chiến đội', 'menu.team.sub': 'Đỏ／Xanh dương／Xanh lá／Vàng · 2–8 người'")
rule("'menu.team': '👥 Командная битва', 'menu.team.sub': 'Закрыто · ожидайте'",
     "'menu.team': '👥 Командная битва', 'menu.team.sub': 'Красные／Синие／Зелёные／Жёлтые · 2–8 игроков'")
rule("'menu.team': '👥 Teamkampf', 'menu.team.sub': 'Noch geschlossen · bald verfügbar'",
     "'menu.team': '👥 Teamkampf', 'menu.team.sub': 'Rot／Blau／Grün／Gelb · 2–8 Spieler'")
rule("'menu.team': '👥 Battaglia a squadre', 'menu.team.sub': 'Non disponibile · resta sintonizzato'",
     "'menu.team': '👥 Battaglia a squadre', 'menu.team.sub': 'Rossi／Blu／Verdi／Gialli · 2–8 giocatori'")

# ---- 版號 ----
rule("const VERSION = '4.14';", "const VERSION = '4.15';")
rule('<span class="vlnum">v<span id="verLogVer">4.14</span></span>',
     '<span class="vlnum">v<span id="verLogVer">4.15</span></span>')
rule('<div class="ver beta">測試版 v<span id="verTxt">4.14</span></div>',
     '<div class="ver beta">測試版 v<span id="verTxt">4.15</span></div>')

# ---- VERSION_LOG ----
rule("  { v: '4.14', date: '2026-11-01', now: true, items: [\n",
     "  { v: '4.15', date: '2026-11-01', now: true, items: [\n"
     "    '<b>對戰人數 2～8 人</b>：原本只能選 4 人或 8 人，現在 2／3／4／5／6／7／8 都可以（線上配對房間也一樣，房主設幾人就收幾人）',\n"
     "    '<b>對戰選角變精簡了</b>：每一格從「大卡」縮成小卡（頭像、◀▶換角、🤖、暱稱一行搞定），8 個人一排也放得下，手機 4 個一排',\n"
     "    '<b>組隊對戰正式開放</b>：選「2 隊／3 隊／4 隊」，系統自動分成 <b>🔴紅隊／🔵藍隊／🟢綠隊／🟡黃隊</b>（最多 4 隊、最多 8 人），點每一格的隊徽可以自己換隊',\n"
     "    '<b>同隊不會互炸</b>：隊友的炸彈與火焰傷不到自己人（自己的炸彈照樣炸得到自己），隊友腳下與名牌都有隊色，一眼就知道誰是自己人',\n"
     "    '<b>組隊勝負看隊伍</b>：一局打完由「活著的那一隊」拿一勝，全隊成員一起加星星；先拿到指定勝場的隊伍奪冠。主選單的「👥 組隊 對戰」按下去就直接進組隊設定',\n"
     "    '<b>線上配對人數</b>：房間可以設 2～8 人，滿了就擋（伺服器端也一起擋，不會超收）'\n"
     "  ] },\n"
     "  { v: '4.14', date: '2026-11-01', now: false, items: [\n")

for old, new in R:
    c = text.count(old)
    assert c == 1, '規則命中 %d 次（應為 1）：%r' % (c, old[:70])
    text = text.replace(old, new)

with io.open(P, 'w', encoding='utf-8', newline='') as f:
    f.write(text.replace('\n', '\r\n'))
print('patch_v415b OK：%d 條規則' % len(R))

# ---------- 2. sw.js ----------
for SP in ['sw.js']:
    with io.open(SP, 'r', encoding='utf-8', newline='') as f:
        s = f.read()
    crlf = '\r\n' in s
    s2 = s.replace('\r\n', '\n').replace("var SW_VERSION = 'v4.14.0';", "var SW_VERSION = 'v4.15.0';")
    assert s2 != s.replace('\r\n', '\n'), 'sw.js 版號沒換到'
    with io.open(SP, 'w', encoding='utf-8', newline='') as f:
        f.write(s2.replace('\n', '\r\n') if crlf else s2)
print('sw.js → v4.15.0')
