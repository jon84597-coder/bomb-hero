# -*- coding: utf-8 -*-
# v4.69 D：地圖模式 UI（單人＋RPG）＋ 10 語言文案
import io, sys
P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        sys.stderr.write('[FAIL] %s count=%d\n' % (tag, n))
        if n:
            i = s.find(old)
            sys.stderr.write(repr(s[max(0, i - 150):i + 250]) + '\n')
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


# ---------- 1. 單人頁：地圖模式 ----------
rep("""      <div class="field"><label>難易度</label>""",
    """      <div class="field"><label id="soloMapLbl"></label>
        <div class="seg" id="segSoloMap">
          <button data-v="classic"></button><button data-v="random"></button>
        </div>
        <div class="hint" id="soloMapHint"></div>
      </div>
      <div class="field"><label>難易度</label>""",
    'solo-html')

# ---------- 2. RPG 頁：地圖模式 ----------
rep("""        <div class="seg wrap" id="segRpgTheme"></div>""",
    """        <div class="seg wrap" id="segRpgMode" style="margin-bottom:7px"></div>
        <div class="seg wrap" id="segRpgTheme"></div>""",
    'rpg-html')

# ---------- 3. JS：填字＋綁定 ----------
rep("""refreshers.push(segWire('segSoloDiff', function () { return settings.soloDiff; }, function (v) {""",
    """// v4.69：地圖模式（單人／RPG 共用同一個設定）
function mapModeHintTxt() {
  return t(mapModeRandom() ? 'mapmode.hint.random' : 'mapmode.hint.classic');
}
function paintMapModeUI() {
  const lbl = $id('soloMapLbl'); if (lbl) lbl.textContent = t('mapmode.title');
  [['segSoloMap', 'soloMapHint'], ['segRpgMode', 'rpgMapHint']].forEach(function (pair) {
    const seg = $id(pair[0]);
    if (seg) {
      seg.querySelectorAll('button').forEach(function (b) {
        b.textContent = b.getAttribute('data-v') === 'random' ? t('mapmode.random') : t('mapmode.classic');
      });
    }
    const h = $id(pair[1]); if (h) h.textContent = mapModeHintTxt();
  });
}
function mapModeChanged() {
  paintMapModeUI();
  try { Solo.renderGo(); } catch (e) {}
}
refreshers.push(paintMapModeUI);
refreshers.push(segWire('segSoloMap', function () { return settings.mapMode; }, function (v) {
  settings.mapMode = v; mapModeChanged();
}));
refreshers.push(segWire('segRpgMode', function () { return settings.mapMode; }, function (v) {
  settings.mapMode = v; mapModeChanged();
}));
paintMapModeUI();
refreshers.push(segWire('segSoloDiff', function () { return settings.soloDiff; }, function (v) {""",
    'mapmode-js')

# ---------- 4. i18n（10 語言）----------
LANGS = [
    ('zh-TW', '難易度', '地圖模式', '🗺️ 基本地圖（舊）', '🎲 隨機生成（新）',
     '沿用原本 32 張手工地圖：路線固定、可以記圖，完成度高',
     '每關重新生成，尺寸照 T1～T5 規則（越後面越大）；同一關重試會沿用同一張'),
    ('zh-CN', '难度', '地图模式', '🗺️ 基本地图（旧）', '🎲 随机生成（新）',
     '沿用原本 32 张手工地图：路线固定、可以记图，完成度高',
     '每关重新生成，尺寸照 T1～T5 规则（越后面越大）；同一关重试会沿用同一张'),
    ('en', 'Difficulty', 'Map type', '🗺️ Classic maps', '🎲 Random maps',
     'The original 32 hand-made maps: fixed routes you can memorise',
     'Generated per stage, size follows the T1–T5 rule (later stages are bigger); retrying a stage keeps the same map'),
    ('ja', '難易度', 'マップ種類', '🗺️ 通常マップ（旧）', '🎲 ランダム生成（新）',
     '従来の 32 枚の手作りマップ：ルートが固定で覚えやすい',
     'ステージごとに生成。サイズは T1～T5 の規則どおり（後のステージほど広い）。同じステージの再挑戦は同じマップ'),
    ('ko', '난이도', '맵 종류', '🗺️ 기본 맵(구)', '🎲 랜덤 생성(신)',
     '기존 32개 수작업 맵: 경로가 고정되어 외우기 쉬움',
     '스테이지마다 새로 생성. 크기는 T1~T5 규칙(뒤로 갈수록 큼). 같은 스테이지 재도전 시 같은 맵'),
    ('th', 'ความยาก', 'รูปแบบแผนที่', '🗺️ แผนที่พื้นฐาน (เดิม)', '🎲 สุ่มสร้างใหม่',
     'แผนที่ทำมือ 32 แบบเดิม: เส้นทางคงที่ จำได้ง่าย',
     'สร้างใหม่ทุกด่าน ขนาดตามกฎ T1~T5 (ด่านหลังใหญ่ขึ้น) เล่นด่านเดิมซ้ำจะได้แผนที่เดิม'),
    ('vi', 'Độ khó', 'Kiểu bản đồ', '🗺️ Bản đồ gốc (cũ)', '🎲 Tạo ngẫu nhiên (mới)',
     '32 bản đồ thủ công ban đầu: đường đi cố định, dễ nhớ',
     'Tạo mới mỗi màn, kích thước theo quy tắc T1~T5 (màn sau lớn hơn); chơi lại cùng màn sẽ giữ nguyên bản đồ'),
    ('ru', 'Сложность', 'Тип карты', '🗺️ Обычные карты', '🎲 Случайная генерация',
     'Прежние 32 ручные карты: фиксированные маршруты, легко запомнить',
     'Генерируется для каждого уровня, размер по правилам T1–T5 (дальше — больше); при повторе уровня карта та же'),
    ('de', 'Schwierigkeit', 'Kartentyp', '🗺️ Klassische Karten', '🎲 Zufallskarten',
     'Die 32 handgemachten Karten: feste Wege, gut zu merken',
     'Pro Level neu erzeugt, Größe nach T1–T5 (spätere Level größer); beim Wiederholen bleibt die Karte gleich'),
    ('it', 'Difficoltà', 'Tipo mappa', '🗺️ Mappe classiche', '🎲 Generazione casuale',
     'Le 32 mappe originali fatte a mano: percorsi fissi, facili da memorizzare',
     'Generata per ogni livello, dimensione secondo T1–T5 (i livelli avanzati sono più grandi); rigiocando lo stesso livello la mappa resta uguale'),
]
for (lang, diff, title, cls, rnd, hint1, hint2) in LANGS:
    old = "I18N['" + lang + "'] = {\n"
    new = (old +
           "  'mapmode.title': '" + title + "',\n"
           "  'mapmode.classic': '" + cls + "', 'mapmode.random': '" + rnd + "',\n"
           "  'mapmode.hint.classic': '" + hint1 + "',\n"
           "  'mapmode.hint.random': '" + hint2 + "',\n")
    rep(old, new, 'i18n-' + lang)

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s))
