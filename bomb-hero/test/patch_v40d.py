# -*- coding: utf-8 -*-
"""patch_v40d.py —— RPG 模式鈕的副標題太長會折成兩行，10 語一起縮短"""
import io
P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
EOL = '\r\n' if '\r\n' in raw else '\n'
src = raw.replace('\r\n', '\n')

PAIRS = [
 ("'四維屬性配點 · 怪物血量防禦 · 32 張不規則地圖'", "'四維屬性 · 血量防禦 · 32 張地圖'"),
 ("'四维属性配点 · 怪物血量防御 · 32 张不规则地图'", "'四维属性 · 血量防御 · 32 张地图'"),
 ("'4 attributes · monster HP & armor · 32 organic maps'", "'4 attributes · HP & armor · 32 maps'"),
 ("'4つの能力値 · モンスターのHPと防御 · 32枚の不規則マップ'", "'4つの能力値 · HPと防御 · 32枚のマップ'"),
 ("'4대 능력치 · 몬스터 HP와 방어 · 32개 불규칙 맵'", "'4대 능력치 · HP와 방어 · 32개 맵'"),
 ("'4 ค่าสถานะ · เลือดและเกราะมอนสเตอร์ · 32 แผนที่ไม่เป็นระเบียบ'", "'4 ค่าสถานะ · เลือด/เกราะ · 32 แผน'"),
 ("'4 chỉ số · máu & giáp quái · 32 bản đồ ngẫu hứng'", "'4 chỉ số · máu & giáp · 32 bản đồ'"),
 ("'4 характеристики · HP и броня монстров · 32 живых карты'", "'4 характеристики · HP и броня · 32 карты'"),
 ("'4 Attribute · Monster-HP & Rüstung · 32 organische Karten'", "'4 Attribute · HP & Rüstung · 32 Karten'"),
 ("'4 attributi · HP e armatura dei mostri · 32 mappe organiche'", "'4 attributi · HP e armatura · 32 mappe'"),
]
for old, new in PAIRS:
    n = src.count(old)
    assert n == 1, '找不到（%d 次）：%s' % (n, old)
    src = src.replace(old, new)
    print('  ok ' + new)

io.open(P, 'wb').write(src.replace('\n', EOL).encode('utf-8'))
print('[OK] 已寫回 ' + P)
