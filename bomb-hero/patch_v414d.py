# -*- coding: utf-8 -*-
"""patch_v414d.py —— v4.14 收尾：把畫面上還寫著「8 關」的文案改成 32 張地圖
（首頁按鈕說明 ×10 語言、說明頁 goalSolo/HELP_BOSS、說明頁 lead）
"""
import io, sys

P = 'index.html'
with io.open(P, 'r', encoding='utf-8', newline='') as f:
    text = f.read()
assert '\r\n' in text
text = text.replace('\r\n', '\n')

RULES = [
    # 首頁「單人闖關」按鈕說明（HTML 預設值）
    ('單人闖關<small>8 大關卡 · 難易度／無限時間 · 關底魔王</small>',
     '單人闖關<small>32 張地圖 · 難易度／無限時間 · 每區魔王</small>'),
    # menu.solo.sub × 10 語言
    ("'menu.solo.sub': '8 大關卡 · 難易度／無限時間 · 關底魔王'",
     "'menu.solo.sub': '32 張地圖 · 難易度／無限時間 · 每區魔王'"),
    ("'menu.solo.sub': '8 大关卡 · 难度／无限时间 · 关底魔王'",
     "'menu.solo.sub': '32 张地图 · 难度／无限时间 · 每区魔王'"),
    ("'menu.solo.sub': '8 stages · difficulty / endless time · final boss'",
     "'menu.solo.sub': '32 maps · difficulty / endless time · stage bosses'"),
    ("'menu.solo.sub': '全 8 ステージ · 難易度／無制限時間 · 最後に魔王'",
     "'menu.solo.sub': '全 32 ステージ · 難易度／無制限時間 · 各エリアに魔王'"),
    ("'menu.solo.sub': '8개 스테이지 · 난이도／무한 시간 · 마지막 보스'",
     "'menu.solo.sub': '32개 스테이지 · 난이도／무한 시간 · 구역 보스'"),
    ("'menu.solo.sub': '8 ด่าน · ความยาก／เวลาไม่จำกัด · บอสสุดท้าย'",
     "'menu.solo.sub': '32 ด่าน · ความยาก／เวลาไม่จำกัด · บอสแต่ละโซน'"),
    ("'menu.solo.sub': '8 màn · độ khó／thời gian vô hạn · trùm cuối'",
     "'menu.solo.sub': '32 màn · độ khó／thời gian vô hạn · trùm mỗi vùng'"),
    ("'menu.solo.sub': '8 уровней · сложность／без лимита · финальный босс'",
     "'menu.solo.sub': '32 уровня · сложность／без лимита · босс в каждой зоне'"),
    ("'menu.solo.sub': '8 Level · Schwierigkeit／unendlich Zeit · Endboss'",
     "'menu.solo.sub': '32 Level · Schwierigkeit／unendlich Zeit · Endboss pro Zone'"),
    ("'menu.solo.sub': '8 livelli · difficoltà／tempo infinito · boss finale'",
     "'menu.solo.sub': '32 livelli · difficoltà／tempo infinito · boss per zona'"),
    # 說明頁：單人闖關說明
    ("let h = '<div class=\"hlead\">單人闖關共 <b>8 大關</b>，每關有專屬配色與地形機關；關卡越後面機關越多、怪物越兇。</div>';",
     "let h = '<div class=\"hlead\">單人闖關共 <b>32 張地圖</b>（8 大主題 × 4 張），每一區的第 4 張是魔王關；關卡越後面機關越多、怪物越兇。</div>';"),
]

for old, new in RULES:
    c = text.count(old)
    assert c == 1, '規則命中 %d 次（應為 1）：%s' % (c, old[:40])
    text = text.replace(old, new)

with io.open(P, 'w', encoding='utf-8', newline='') as f:
    f.write(text.replace('\n', '\r\n'))
print('patch_v414d OK：%d 條規則' % len(RULES))
