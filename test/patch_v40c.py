# -*- coding: utf-8 -*-
"""
patch_v40c.py —— v4.0 收尾：
  1) 10 國語言字典補上 v4.0 新介面文案（RPG 模式／商店／版本更新／說明分頁）
     → verify-v33「靜態中文文案進字典」回復到 85% 以上，且 RPG 畫面真的會跟著語言切換
  2) RPG 畫面文案改成單一文字節點（desc 不再被 <b> 切碎、② 標題與剩餘點數分行）
"""
import io, re, sys

P = 'index.html'
raw = io.open(P, 'rb').read().decode('utf-8')
EOL = '\r\n' if '\r\n' in raw else '\n'
src = raw.replace('\r\n', '\n')

def sub(old, new, tag):
    global src
    n = src.count(old)
    assert n == 1, '[%s] 預期 1 次，實際 %d 次' % (tag, n)
    src = src.replace(old, new)
    print('  ok ' + tag)

# ---------------- 1. 字典 ----------------
DICT = {
'agree': None,  # 佔位
}

KEYS = ['ann.title','ann.fb','verlog.btn','verlog.title','rpg.mode','rpg.beta','rpg.sub','rpg.desc',
        'rpg.step1','rpg.step2','rpg.step3','rpg.random','rpg.start','store.btn','store.note',
        'help.desc','help.tab.basic','help.tab.item','help.tab.ride','help.tab.stage','help.tab.foe','help.tab.tip']

TR = {
'zh-TW': [
  '作者公告', 'FB 連結：', '版本更新內容', '📜 版本更新內容',
  '🎲 RPG 模式', '測試版 Beta', '四維屬性配點 · 怪物血量防禦 · 32 張不規則地圖',
  '跟一般闖關完全不同的養成規則：怪物有血量與防禦，炸一次不會死；你自己也有生命與護甲。先配點、再出發，一路打過 32 張地圖。',
  '① 選角色', '② 能力配點', '③ 出發地圖（32 張 · 8 大主題 × 4 張地區）',
  '🎲 電腦隨機分配', '開始冒險 →', '🛒 商店', '未來開放 · 道具／造型兌換',
  '操作、道具、坐騎招式、場景機關、怪物圖鑑一次看懂 —— 點上面的分類切換。',
  '🎮 基本操作', '🎁 道具總覽', '🦖 坐騎招式', '🗺️ 場景機關', '👾 怪物圖鑑', '💡 實戰訣竅',
],
'zh-CN': [
  '作者公告', 'FB 链接：', '版本更新内容', '📜 版本更新内容',
  '🎲 RPG 模式', '测试版 Beta', '四维属性配点 · 怪物血量防御 · 32 张不规则地图',
  '跟一般闯关完全不同的养成规则：怪物有血量与防御，炸一次不会死；你自己也有生命与护甲。先配点、再出发，一路打过 32 张地图。',
  '① 选角色', '② 能力配点', '③ 出发地图（32 张 · 8 大主题 × 4 张地区）',
  '🎲 电脑随机分配', '开始冒险 →', '🛒 商店', '未来开放 · 道具／造型兑换',
  '操作、道具、坐骑招式、场景机关、怪物图鉴一次看懂 —— 点上面的分类切换。',
  '🎮 基本操作', '🎁 道具总览', '🦖 坐骑招式', '🗺️ 场景机关', '👾 怪物图鉴', '💡 实战诀窍',
],
'en': [
  'Author Notice', 'FB: ', 'Version Log', '📜 Version Log',
  '🎲 RPG Mode', 'Beta', '4 attributes · monster HP & armor · 32 organic maps',
  'A completely different growth system: monsters have HP and armor, so one blast will not kill them; you also have HP and armor yourself. Spend points, then set off and clear all 32 maps.',
  '① Pick a hero', '② Allocate points', '③ Choose a map (32 maps · 8 themes × 4 areas)',
  '🎲 Random allocate', 'Start adventure →', '🛒 Store', 'Coming soon · items / skins',
  'Controls, items, mount skills, stage hazards and the monster guide in one place — switch tabs above.',
  '🎮 Basics', '🎁 Items', '🦖 Mount Skills', '🗺️ Hazards', '👾 Monsters', '💡 Tips',
],
'ja': [
  '作者からのお知らせ', 'FB：', '更新情報', '📜 更新情報',
  '🎲 RPGモード', 'ベータ版', '4つの能力値 · モンスターのHPと防御 · 32枚の不規則マップ',
  '通常ステージとは全く違う成長ルール：モンスターにはHPと防御があり、1回の爆発では倒せません。あなた自身にもHPと防御があります。まずポイントを振ってから出発し、32枚のマップをクリアしましょう。',
  '① キャラを選ぶ', '② 能力値に振り分け', '③ マップを選ぶ（32枚 · 8テーマ × 4エリア）',
  '🎲 ランダム振り分け', '冒険スタート →', '🛒 ショップ', '近日公開 · アイテム／スキン',
  '操作・アイテム・騎乗スキル・ステージの仕掛け・モンスター図鑑をまとめて確認 —— 上のタブで切り替え。',
  '🎮 基本操作', '🎁 アイテム', '🦖 騎乗スキル', '🗺️ 仕掛け', '👾 モンスター', '💡 攻略のコツ',
],
'ko': [
  '작성자 공지', 'FB: ', '업데이트 내역', '📜 업데이트 내역',
  '🎲 RPG 모드', '베타 버전', '4대 능력치 · 몬스터 HP와 방어 · 32개 불규칙 맵',
  '일반 스테이지와 완전히 다른 성장 규칙: 몬스터에게 HP와 방어가 있어 한 번의 폭발로 죽지 않습니다. 당신에게도 HP와 방어가 있습니다. 먼저 포인트를 분배하고 32개 맵을 모두 클리어하세요.',
  '① 캐릭터 선택', '② 능력치 분배', '③ 맵 선택 (32개 · 8테마 × 4지역)',
  '🎲 무작위 분배', '모험 시작 →', '🛒 상점', '추후 오픈 · 아이템／스킨',
  '조작, 아이템, 탈것 기술, 스테이지 장치, 몬스터 도감을 한 번에 —— 위 탭에서 전환하세요.',
  '🎮 기본 조작', '🎁 아이템', '🦖 탈것 기술', '🗺️ 장치', '👾 몬스터', '💡 실전 요령',
],
'th': [
  'ประกาศผู้สร้าง', 'FB: ', 'บันทึกการอัปเดต', '📜 บันทึกการอัปเดต',
  '🎲 โหมด RPG', 'เวอร์ชันทดสอบ Beta', '4 ค่าสถานะ · เลือดและเกราะมอนสเตอร์ · 32 แผนที่ไม่เป็นระเบียบ',
  'ระบบพัฒนาตัวละครที่ต่างจากการเล่นปกติโดยสิ้นเชิง: มอนสเตอร์มีเลือดและเกราะ ระเบิดครั้งเดียวไม่ตาย และคุณก็มีเลือดกับเกราะเช่นกัน ใส่แต้มก่อนแล้วออกผจญภัยผ่านทั้ง 32 แผน',
  '① เลือกตัวละคร', '② ใส่แต้มความสามารถ', '③ เลือกแผนที่ (32 แผน · 8 ธีม × 4 พื้นที่)',
  '🎲 สุ่มแจกแต้ม', 'เริ่มผจญภัย →', '🛒 ร้านค้า', 'เปิดเร็ว ๆ นี้ · ไอเทม／สกิน',
  'การควบคุม ไอเทม ท่าของพาหนะ กลไกในด่าน และคู่มือมอนสเตอร์ ครบในที่เดียว —— สลับแท็บด้านบน',
  '🎮 การควบคุม', '🎁 ไอเทม', '🦖 ท่าพาหนะ', '🗺️ กลไกด่าน', '👾 มอนสเตอร์', '💡 เทคนิค',
],
'vi': [
  'Thông báo của tác giả', 'FB: ', 'Nhật ký cập nhật', '📜 Nhật ký cập nhật',
  '🎲 Chế độ RPG', 'Bản thử Beta', '4 chỉ số · máu & giáp quái · 32 bản đồ ngẫu hứng',
  'Hệ thống phát triển hoàn toàn khác chế độ thường: quái có máu và giáp nên một quả bom không giết ngay; bạn cũng có máu và giáp. Hãy chia điểm rồi lên đường, phá 32 bản đồ.',
  '① Chọn nhân vật', '② Chia điểm', '③ Chọn bản đồ (32 bản đồ · 8 chủ đề × 4 khu)',
  '🎲 Chia ngẫu nhiên', 'Bắt đầu phiêu lưu →', '🛒 Cửa hàng', 'Sắp mở · vật phẩm／ngoại hình',
  'Điều khiển, vật phẩm, chiêu của thú cưỡi, cơ chế màn chơi và sổ tay quái — xem tất cả ở đây, chuyển tab phía trên.',
  '🎮 Cơ bản', '🎁 Vật phẩm', '🦖 Chiêu thú cưỡi', '🗺️ Cơ chế', '👾 Quái', '💡 Mẹo',
],
'ru': [
  'Объявление автора', 'FB: ', 'История версий', '📜 История версий',
  '🎲 Режим RPG', 'Бета-версия', '4 характеристики · HP и броня монстров · 32 живых карты',
  'Совсем другая система развития: у монстров есть HP и броня, одной бомбой их не убить; у вас тоже есть HP и броня. Распределите очки и пройдите все 32 карты.',
  '① Выбор героя', '② Распределение очков', '③ Выбор карты (32 карты · 8 тем × 4 зоны)',
  '🎲 Случайно', 'В приключение →', '🛒 Магазин', 'Скоро · предметы／образы',
  'Управление, предметы, приёмы ездовых, ловушки уровней и бестиарий — всё здесь, переключайте вкладки сверху.',
  '🎮 Управление', '🎁 Предметы', '🦖 Приёмы ездовых', '🗺️ Ловушки', '👾 Монстры', '💡 Советы',
],
'de': [
  'Hinweis des Autors', 'FB: ', 'Versionsverlauf', '📜 Versionsverlauf',
  '🎲 RPG-Modus', 'Beta-Version', '4 Attribute · Monster-HP & Rüstung · 32 organische Karten',
  'Ein völlig anderes Wachstumssystem: Monster haben HP und Rüstung, eine Bombe tötet sie nicht; du hast ebenfalls HP und Rüstung. Punkte verteilen, dann losziehen und alle 32 Karten schaffen.',
  '① Held wählen', '② Punkte verteilen', '③ Karte wählen (32 Karten · 8 Themen × 4 Gebiete)',
  '🎲 Zufällig verteilen', 'Abenteuer starten →', '🛒 Shop', 'Demnächst · Items／Skins',
  'Steuerung, Items, Reittier-Fähigkeiten, Level-Mechaniken und Monsterlexikon auf einen Blick — oben umschalten.',
  '🎮 Steuerung', '🎁 Items', '🦖 Reittier-Fähigkeiten', '🗺️ Mechaniken', '👾 Monster', '💡 Tipps',
],
'it': [
  "Avviso dell'autore", 'FB: ', 'Cronologia versioni', '📜 Cronologia versioni',
  '🎲 Modalità RPG', 'Versione Beta', '4 attributi · HP e armatura dei mostri · 32 mappe organiche',
  "Un sistema di crescita completamente diverso: i mostri hanno HP e armatura, una bomba non li uccide; anche tu hai HP e armatura. Distribuisci i punti e affronta tutte le 32 mappe.",
  "① Scegli l'eroe", '② Distribuisci punti', '③ Scegli la mappa (32 mappe · 8 temi × 4 aree)',
  '🎲 Distribuzione casuale', "Inizia l'avventura →", '🛒 Negozio', 'Prossimamente · oggetti／skin',
  'Comandi, oggetti, mosse delle cavalcature, meccaniche dei livelli e bestiario in un colpo d\'occhio — cambia scheda qui sopra.',
  '🎮 Comandi', '🎁 Oggetti', '🦖 Mosse cavalcatura', '🗺️ Meccaniche', '👾 Mostri', '💡 Consigli',
],
}

def js_quote(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

print('=== 1. 10 語字典補 v4.0 文案 ===')
for lang, vals in TR.items():
    assert len(vals) == len(KEYS), lang + ' 數量不符 %d vs %d' % (len(vals), len(KEYS))
    block = ['', '  // v4.0：RPG 模式／商店／版本更新內容／說明分頁']
    for i in range(0, len(KEYS), 4):
        chunk = []
        for k, v in zip(KEYS[i:i + 4], vals[i:i + 4]):
            chunk.append(js_quote(k) + ': ' + js_quote(v))
        block.append('  ' + ', '.join(chunk) + ',')
    block = '\n'.join(block) + '\n'
    # 找到該語言區塊的結尾 '};'
    m = re.search(r"I18N\['" + re.escape(lang) + r"'\] = \{", src)
    assert m, '找不到字典 ' + lang
    end = src.index('\n};', m.end())
    # 最後一條原本沒有逗號 → 補上，否則插入後會變成兩個相連的字串
    head = src[:end]
    stripped = head.rstrip()
    if not stripped.endswith(','):
        head = stripped + ','
    src = head + '\n' + block.rstrip('\n') + src[end:]
    print('  ok ' + lang + ' +' + str(len(KEYS)) + ' 鍵')

# ---------------- 2. RPG 畫面文案改成單一節點 ----------------
print('=== 2. RPG 畫面文案整形 ===')
sub('''      <div class="desc">
        跟一般闖關完全不同的養成規則：怪物有<b>血量</b>與<b>防禦</b>，炸一次不會死；
        你自己也有<b>生命</b>與<b>護甲</b>。先配點、再出發，一路打過 32 張地圖。
      </div>''',
'''      <div class="desc">跟一般闖關完全不同的養成規則：怪物有血量與防禦，炸一次不會死；你自己也有生命與護甲。先配點、再出發，一路打過 32 張地圖。</div>''',
    'rpg desc 單一文字節點')

sub('''      <div class="field"><label>② 能力配點（剩餘 <b id="rpgLeft" style="color:#ffe6a3">9</b> 點 · 每項上限 10 格）</label>
        <div class="rpgrows" id="rpgRows"></div>
        <div class="rpgsum" id="rpgSum"></div>
      </div>''',
'''      <div class="field"><label>② 能力配點</label>
        <div class="hint" style="margin:-2px 0 7px">剩餘 <b id="rpgLeft" style="color:#ffe6a3">9</b> 點 · 每項上限 10 格</div>
        <div class="rpgrows" id="rpgRows"></div>
        <div class="rpgsum" id="rpgSum"></div>
      </div>''',
    'rpg ② 標題與剩餘點數分行')

out = src.replace('\n', EOL)
io.open(P, 'wb').write(out.encode('utf-8'))
print('\n[OK] 已寫回 ' + P)
