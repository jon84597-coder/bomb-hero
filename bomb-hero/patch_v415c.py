# -*- coding: utf-8 -*-
"""patch_v415c.py —— v4.15 收尾：
① 對戰／線上人數按鈕改成純數字（2～8），組隊按鈕改成隊數 → 減少硬寫的中文
② 新增兩條字典（組隊對戰標題／說明）到 10 種語言
③ 首頁「對戰（含 AI）」按鈕的小字改成 2～8 人
"""
import io

P = 'index.html'
with io.open(P, 'r', encoding='utf-8', newline='') as f:
    text = f.read()
text = text.replace('\r\n', '\n')

R = []


def rule(old, new):
    R.append((old, new))


# ---------- ① 人數／隊數按鈕 ----------
rule('        <div class="seg" id="segCount"><button data-v="2">2 人</button><button data-v="3">3 人</button>'
     '<button data-v="4">4 人</button><button data-v="5">5 人</button><button data-v="6">6 人</button>'
     '<button data-v="7">7 人</button><button data-v="8">8 人</button></div>\n',
     '        <div class="seg" id="segCount"><button data-v="2">2</button><button data-v="3">3</button>'
     '<button data-v="4">4</button><button data-v="5">5</button><button data-v="6">6</button>'
     '<button data-v="7">7</button><button data-v="8">8</button></div>\n')

rule('          <div class="seg" id="segNetCount"><button data-v="2">2 人</button><button data-v="3">3 人</button>'
     '<button data-v="4">4 人</button><button data-v="5">5 人</button><button data-v="6">6 人</button>'
     '<button data-v="7">7 人</button><button data-v="8">8 人</button></div>\n',
     '          <div class="seg" id="segNetCount"><button data-v="2">2</button><button data-v="3">3</button>'
     '<button data-v="4">4</button><button data-v="5">5</button><button data-v="6">6</button>'
     '<button data-v="7">7</button><button data-v="8">8</button></div>\n')

rule('      <div class="field"><label>組隊對戰（同隊不會互炸）</label>\n'
     '        <div class="seg" id="segTeams"><button data-v="0">關閉 混戰</button><button data-v="2">2 隊</button>'
     '<button data-v="3">3 隊</button><button data-v="4">4 隊</button></div>\n',
     '      <div class="field"><label>組隊對戰（隊數 2～4，同隊不會互炸）</label>\n'
     '        <div class="seg" id="segTeams"><button data-v="0">關閉</button><button data-v="2">2</button>'
     '<button data-v="3">3</button><button data-v="4">4</button></div>\n')

# ---------- ③ 首頁對戰按鈕小字 ----------
rule('對戰（含 AI）<small>4／8 人混戰 · 可改名 · 沒人就 AI 補位</small>',
     '對戰（含 AI）<small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small>')

# ---------- ② 兩條新字典（10 語言） ----------
LANGS = [
    ("  'bt.countHint': '本局 <b>{n}</b> 人混戰 · 沒人加入的位子由 🤖 AI 補滿',",
     "  'bt.teams': '組隊對戰（隊數 2～4，同隊不會互炸）',\n"
     "  'bt.teamsHint': '同隊的炸彈與火焰不會傷到自己人；點每一格的隊徽可以自己換隊。',"),
    ("  'bt.countHint': '本局 <b>{n}</b> 人混战 · 没人加入的位子由 🤖 AI 补满',",
     "  'bt.teams': '组队对战（队数 2～4，同队不会互炸）',\n"
     "  'bt.teamsHint': '同队的炸弹与火焰不会伤到自己人；点每一格的队徽可以自己换队。',"),
    ("  'bt.countHint': 'This match: <b>{n}</b>-player melee · empty slots filled by 🤖 AI',",
     "  'bt.teams': 'Team Battle (2–4 teams, no friendly fire)',\n"
     "  'bt.teamsHint': 'Teammates take no damage from your bombs or flames. Tap a slot\\'s badge to switch its team.',"),
    ("  'bt.countHint': '今回は <b>{n}</b> 人バトル · 空き枠は 🤖 AI が埋めます',",
     "  'bt.teams': 'チーム戦（2～4チーム・同士討ちなし）',\n"
     "  'bt.teamsHint': '同じチームの爆弾と炎では味方は傷つきません。各枠のバッジを押すとチームを変えられます。',"),
    ("  'bt.countHint': '이번 판: <b>{n}</b>인 난투 · 빈자리는 🤖 AI가 채웁니다',",
     "  'bt.teams': '팀 대전 (2～4팀, 같은 팀끼리 안 터짐)',\n"
     "  'bt.teamsHint': '같은 팀의 폭탄과 불꽃에는 아군이 다치지 않습니다. 칸의 배지를 누르면 팀을 바꿀 수 있습니다.',"),
    ("  'bt.countHint': 'เกมนี้: <b>{n}</b> คนบวกกัน · ช่องว่างให้ 🤖 AI แทน',",
     "  'bt.teams': 'ต่อสู้แบบทีม (2～4 ทีม ไม่ทำร้ายพวกเดียวกัน)',\n"
     "  'bt.teamsHint': 'ระเบิดและเปลวไฟของทีมเดียวกันไม่ทำร้ายเพื่อนร่วมทีม แตะป้ายทีมในช่องเพื่อสลับทีม',"),
    ("  'bt.countHint': 'Ván này: hỗn chiến <b>{n}</b> người · ô trống do 🤖 AI thế chỗ',",
     "  'bt.teams': 'Đấu đội (2–4 đội, không bắn đồng đội)',\n"
     "  'bt.teamsHint': 'Bom và lửa của đồng đội không gây sát thương cho nhau. Chạm huy hiệu trong ô để đổi đội.',"),
    ("  'bt.countHint': 'Этот матч: свалка на <b>{n}</b> игроков · пустые слоты займёт 🤖 ИИ',",
     "  'bt.teams': 'Командный бой (2–4 команды, без урона своим)',\n"
     "  'bt.teamsHint': 'Бомбы и пламя союзников не ранят своих. Нажмите значок команды в слоте, чтобы сменить её.',"),
    ("  'bt.countHint': 'Dieses Match: <b>{n}</b>-Spieler-Schlacht · freie Plätze füllt 🤖 KI',",
     "  'bt.teams': 'Teamkampf (2–4 Teams, kein Eigenbeschuss)',\n"
     "  'bt.teamsHint': 'Bomben und Flammen des eigenen Teams verletzen keine Verbündeten. Tippe auf das Team-Abzeichen, um zu wechseln.',"),
    ("  'bt.countHint': 'Questo match: mischia a <b>{n}</b> giocatori · i posti vuoti li riempie la 🤖 IA',",
     "  'bt.teams': 'Sfida a squadre (2–4 squadre, niente fuoco amico)',\n"
     "  'bt.teamsHint': 'Bombe e fiamme della tua squadra non feriscono i compagni. Tocca il badge nello slot per cambiare squadra.',"),
]
for old, add in LANGS:
    rule(old, old + '\n' + add)

for old, new in R:
    c = text.count(old)
    assert c == 1, '規則命中 %d 次（應為 1）：%r' % (c, old[:70])
    text = text.replace(old, new)

with io.open(P, 'w', encoding='utf-8', newline='') as f:
    f.write(text.replace('\n', '\r\n'))
print('patch_v415c OK：%d 條規則' % len(R))
