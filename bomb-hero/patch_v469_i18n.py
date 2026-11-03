# -*- coding: utf-8 -*-
# v4.69 G：線上組隊文案（10 語言）＋ 版本號 4.69 ＋ 更新紀錄
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


LANGS = [
    ('zh-TW', '組隊模式（房主設定）', '混戰', '{n} 隊',
     '⚠️ 目前是測試階段：線上配對的連線可能會有點卡 —— 伺服器用的只是最初階的規格、速度不快，卡頓請見諒。'),
    ('zh-CN', '组队模式（房主设置）', '混战', '{n} 队',
     '⚠️ 目前是测试阶段：线上配对的连线可能会有点卡 —— 服务器用的只是最初阶的规格、速度不快，卡顿请见谅。'),
    ('en', 'Team mode (host)', 'Free-for-all', '{n} teams',
     '⚠️ Beta notice: online matches may lag a little — the server runs on the most basic tier and is not fast. Thanks for your patience.'),
    ('ja', 'チーム戦（ホスト設定）', '混戦', '{n} チーム',
     '⚠️ 現在はテスト段階です。オンライン対戦は多少ラグることがあります（サーバーが最低限のスペックのため）。ご了承ください。'),
    ('ko', '팀 모드(방장 설정)', '난전', '{n}팀',
     '⚠️ 현재 테스트 단계입니다. 온라인 대전은 약간 끊길 수 있습니다(서버가 최저 사양이라 빠르지 않습니다). 양해 부탁드립니다.'),
    ('th', 'โหมดทีม (หัวหน้าห้องตั้ง)', 'ปล่อยหมัด', '{n} ทีม',
     '⚠️ ขณะนี้เป็นช่วงทดสอบ การเชื่อมต่อออนไลน์อาจหน่วงบ้าง เพราะเซิร์ฟเวอร์เป็นสเปกพื้นฐานที่สุด ขออภัยในความไม่สะดวก'),
    ('vi', 'Chế độ đội (chủ phòng đặt)', 'Hỗn chiến', '{n} đội',
     '⚠️ Hiện là giai đoạn thử nghiệm: kết nối online có thể hơi lag vì máy chủ chỉ ở mức cơ bản nhất, mong bạn thông cảm.'),
    ('ru', 'Режим команд (хост)', 'Все против всех', '{n} команд',
     '⚠️ Идёт тестирование: в онлайн-матчах возможны задержки — сервер на минимальном тарифе, не очень быстрый. Спасибо за понимание.'),
    ('de', 'Teammodus (Host)', 'Jeder gegen jeden', '{n} Teams',
     '⚠️ Beta-Hinweis: Online-Partien können etwas laggen — der Server läuft auf dem einfachsten Tarif und ist nicht schnell. Danke fürs Verständnis.'),
    ('it', 'Modalità squadre (host)', 'Tutti contro tutti', '{n} squadre',
     '⚠️ Nota beta: le partite online possono laggare — il server è al livello più basilare e non è veloce. Grazie per la pazienza.'),
]
for (lang, title, free, nteam, lag) in LANGS:
    old = "I18N['" + lang + "'] = {\n"
    new = (old +
           "  'net.teams': '" + title + "', 'net.teams.free': '" + free + "', 'net.teams.n': '" + nteam + "',\n"
           "  'net.lag': '" + lag + "',\n")
    rep(old, new, 'i18n-net-' + lang)

# ---------- 版本號 ----------
rep("const VERSION = '4.68';", "const VERSION = '4.69';", 'VERSION')
rep('<span id="verTxt">4.68</span>', '<span id="verTxt">4.69</span>', 'verTxt')
rep('<span id="verLogVer">4.68</span>', '<span id="verLogVer">4.69</span>', 'verLogVer')

rep("""  { v: '4.68', date: '2026-11-04', now: true, items: [""",
    """  { v: '4.69', date: '2026-11-04', now: true, items: [
    '單人闖關與 RPG 模式都多了「地圖模式」：🗺️ 基本地圖（原本 32 張手工地圖，路線固定可以記圖）／🎲 隨機生成（每關重新長，尺寸照 T1～T5 規則）。出發前在選單切換就好，兩種都保留',
    '隨機生成地圖的 32 關配置：第 1～16 關依序 T1→T4 循環，第 17 關之後整段加一階 T2→T5（17=T2、18=T3、19=T4、20=T5…），後面越打越大、怪也越多；同一關重試會沿用同一張圖',
    '隨機地圖的出生點只清「半徑 1 格」：以前四周三大圈全是空地，看起來像被清場；現在第 2 格起就照一般機率長硬岩與軟磚，一開場就看得到掩體',
    'RPG 模式的小怪改成跟單人完全同一套「八大關卡生態」：第 1 大關只會遇到草原那 6 隻、深海關只會遇到深海那 6 隻，不會再第 1 關就冒出章魚或機器人；數量也改成跟單人同一條曲線',
    '商店新增「🏝️ 大逃殺門票」：一張 2000 金幣，可以重複購買（每場消耗一張），錢包會顯示目前持有幾張；大逃殺玩法仍在開發，票會先存著不會過期',
    '線上配對新增「組隊模式」：房主可以設定混戰／2 隊／3 隊／4 隊，人數自動平均分隊，同隊的炸彈與火焰不會傷到自己人；配對頁也加了一段說明，測試階段連線可能有點卡，請見諒' ] },
  { v: '4.68', date: '2026-11-04', now: false, items: [""",
    'VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('chars:', len(s))
