# -*- coding: utf-8 -*-
"""v4.2：把新的觸控設定文案補進 10 種語言的字典（不動其他內容、保留 CRLF/LF）。"""
import io, re, sys

P = 'index.html'
EOL = '\r\n'
s = io.open(P, encoding='utf-8', newline='').read()

LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it']

# 每個 key：{ 語言: 譯文 }
NEW = {
    'set.tmode': {
        'zh-TW': '隱形滑動區', 'zh-CN': '隐形滑动区', 'en': 'Invisible slide area',
        'ja': '透明スライド領域', 'ko': '투명 슬라이드 영역', 'th': 'พื้นที่สไลด์ล่องหน',
        'vi': 'Vùng trượt vô hình', 'ru': 'Невидимая зона скольжения',
        'de': 'Unsichtbares Wischfeld', 'it': 'Area scorrevole invisibile',
    },
    'set.tmode2': {
        'zh-TW': '虛擬搖桿', 'zh-CN': '虚拟摇杆', 'en': 'Virtual joystick',
        'ja': 'バーチャルスティック', 'ko': '가상 조이스틱', 'th': 'จอยสติ๊กเสมือน',
        'vi': 'Cần điều khiển ảo', 'ru': 'Виртуальный стик',
        'de': 'Virtueller Joystick', 'it': 'Joystick virtuale',
    },
    'set.padL': {
        'zh-TW': '操作區在左', 'zh-CN': '操作区在左', 'en': 'Pad on left',
        'ja': '操作領域は左', 'ko': '조작 영역 왼쪽', 'th': 'พื้นที่ควบคุมด้านซ้าย',
        'vi': 'Vùng điều khiển bên trái', 'ru': 'Зона слева',
        'de': 'Feld links', 'it': 'Area a sinistra',
    },
    'set.padR': {
        'zh-TW': '操作區在右', 'zh-CN': '操作区在右', 'en': 'Pad on right',
        'ja': '操作領域は右', 'ko': '조작 영역 오른쪽', 'th': 'พื้นที่ควบคุมด้านขวา',
        'vi': 'Vùng điều khiển bên phải', 'ru': 'Зона справа',
        'de': 'Feld rechts', 'it': 'Area a destra',
    },
    'set.padPos': {
        'zh-TW': '✥ 拖曳調整搖桿位置', 'zh-CN': '✥ 拖曳调整摇杆位置', 'en': '✥ Drag to move the pad',
        'ja': '✥ ドラッグで位置調整', 'ko': '✥ 드래그로 위치 조정', 'th': '✥ ลากเพื่อปรับตำแหน่ง',
        'vi': '✥ Kéo để chỉnh vị trí', 'ru': '✥ Перетащите, чтобы сдвинуть',
        'de': '✥ Ziehen zum Verschieben', 'it': '✥ Trascina per spostare',
    },
    'set.padReset': {
        'zh-TW': '回復預設位置', 'zh-CN': '恢复预设位置', 'en': 'Reset position',
        'ja': '位置を初期化', 'ko': '기본 위치로', 'th': 'คืนตำแหน่งเริ่มต้น',
        'vi': 'Về vị trí mặc định', 'ru': 'Сбросить позицию',
        'de': 'Position zurücksetzen', 'it': 'Ripristina posizione',
    },
    'set.peTitle': {
        'zh-TW': '✥ 拖曳搖桿到順手的位置', 'zh-CN': '✥ 拖曳摇杆到顺手的位置',
        'en': '✥ Drag the pad to a comfy spot', 'ja': '✥ 押しやすい位置へドラッグ',
        'ko': '✥ 편한 위치로 드래그', 'th': '✥ ลากจอยไปยังตำแหน่งที่ถนัด',
        'vi': '✥ Kéo cần đến vị trí thoải mái', 'ru': '✥ Перетащите стик в удобное место',
        'de': '✥ Joystick an die passende Stelle ziehen', 'it': '✥ Trascina il joystick dove preferisci',
    },
    'set.peTip': {
        'zh-TW': '按住圓盤拖曳（這塊就是遊戲畫面，位置會依比例記住）',
        'zh-CN': '按住圆盘拖曳（这块就是游戏画面，位置会依比例记住）',
        'en': 'Hold and drag the dial (this box is the game view; the spot is saved as a ratio)',
        'ja': '円盤を押したままドラッグ（この枠がゲーム画面。位置は比率で保存されます）',
        'ko': '원판을 누른 채 드래그하세요 (이 상자가 게임 화면이며 위치는 비율로 저장됩니다)',
        'th': 'กดแล้วลากวงกลม (กรอบนี้คือหน้าจอเกม ตำแหน่งจะจำตามสัดส่วน)',
        'vi': 'Giữ và kéo vòng tròn (khung này là màn hình game, vị trí lưu theo tỉ lệ)',
        'ru': 'Зажмите и тяните круг (это экран игры, позиция хранится в долях)',
        'de': 'Kreis gedrückt halten und ziehen (das ist der Spielbereich, Position wird anteilig gespeichert)',
        'it': 'Tieni premuto e trascina il cerchio (questo riquadro è lo schermo, la posizione è salvata in proporzione)',
    },
    'set.peSave': {
        'zh-TW': '儲存位置', 'zh-CN': '保存位置', 'en': 'Save position',
        'ja': '位置を保存', 'ko': '위치 저장', 'th': 'บันทึกตำแหน่ง',
        'vi': 'Lưu vị trí', 'ru': 'Сохранить позицию',
        'de': 'Position speichern', 'it': 'Salva posizione',
    },
}


def esc(v):
    return v.replace('\\', '\\\\').replace("'", "\\'")


total = 0
for lang in LANGS:
    m = re.search(r"^I18N\['" + re.escape(lang) + r"'\] = \{\r?\n", s, re.M)
    if not m:
        print('!! 找不到語言區塊', lang)
        sys.exit(1)
    start = m.end()
    end = s.find('\n};', start)
    if end < 0:
        print('!! 找不到結尾', lang)
        sys.exit(1)
    block = s[start:end]
    lines = []
    for k, per in NEW.items():
        if ("'" + k + "':") in block:
            print('   skip（已存在）', lang, k)
            continue
        lines.append("  '" + k + "': '" + esc(per[lang]) + "',")
    if not lines:
        continue
    ins = EOL.join(lines) + EOL
    s = s[:end] + EOL + ins.rstrip(EOL) + s[end:]
    total += len(lines)
    # 重新計算下一次（因為插入了內容，位置會變；統一在迴圈外重跑）
    # → 直接重新搜尋即可（re.search 每次從頭找，字串已更新）

print('插入 %d 條翻譯' % total)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
