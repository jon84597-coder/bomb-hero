# -*- coding: utf-8 -*-
# v4.52 patch E：字典對齊新版首頁按鈕文字（v33 要求靜態中文文案進字典 ≥85%）
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

# ---------- 1. 只改 zh-TW 區塊裡的字典值 ----------
i0 = s.index("I18N['zh-TW'] = {")
i1 = s.index("I18N['zh-CN'] = {")
zw = s[i0:i1]
orig = zw

PAIRS = [
    ("'menu.solo.sub': '32 張地圖 · 難易度／無限時間 · 第 32 關魔王'", "'menu.solo.sub': '32 關 · 可調難度'"),
    ("'rpg.sub': '四維屬性 · 血量防禦 · 32 張地圖'", "'rpg.sub': '配點養成 · 血量防禦'"),
    ("'menu.boss.sub': '直接單挑暗黑魔王 · 沒有小怪干擾'", "'menu.boss.sub': '單挑暗黑魔王'"),
    ("'menu.battle': '對戰（含 AI）'", "'menu.battle': '對戰模式'"),
    ("'menu.battle.sub': '2～8 人混戰 · 可改名 · 沒人就 AI 補位'", "'menu.battle.sub': '2～8 人混戰'"),
    ("'menu.online.sub': '房號連線 · 等待室 · 朋友一起打'", "'menu.online.sub': '房號連線 · 朋友同樂'"),
    ("'menu.settings.sub': '地圖尺寸 · 控制方式 · 音量'", "'menu.settings.sub': '控制 · 音量 · 語言'"),
    ("'menu.help.sub': '操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂'", "'menu.help.sub': '操作 · 道具 · 怪物'"),
    ("'menu.acct.sub': '綁定帳號 · 雲端存檔 · 分享金幣'", "'menu.acct.sub': '雲端存檔 · 分享金幣'"),
    ("'menu.quit.sub': '存好進度 · 關掉這個頁面'", "'menu.quit.sub': '存好進度再關'"),
    # 按鈕標題改成純文字（emoji 移到 data-ico）→ 字典也跟著去掉 emoji
    ("'menu.boss': '挑戰 BOSS 👹'", "'menu.boss': '挑戰 BOSS'"),
    ("'store.btn': '🛒 商店'", "'store.btn': '商店'"),
    ("'menu.acct': '👤 帳號登入'", "'menu.acct': '帳號登入'"),
    ("'menu.quit': '🚪 離開遊戲'", "'menu.quit': '離開遊戲'"),
    ("'menu.help': '📖 遊戲說明'", "'menu.help': '遊戲說明'"),
    ("'rpg.mode': '🎲 RPG 模式'", "'rpg.mode': 'RPG 模式'"),
]
changed = 0
for a, b in PAIRS:
    if a in zw:
        must(zw.count(a) == 1, 'DUP ' + a[:24])
        zw = zw.replace(a, b); changed += 1
    elif b in zw:
        pass
    else:
        print('  MISS ' + a[:40]); sys.exit(1)
if zw != orig:
    s = s[:i0] + zw + s[i1:]
print('  ok   zh-TW 字典 %d 條' % changed)

# ---------- 2. 十國語系補一個 menu.store.sub（首頁商店鈕副標）----------
SUBS = ['隨從 5000 金幣', '随从 5000 金币', 'Followers · 5,000 gold', 'お供 5000ゴールド',
        '동료 5000골드', 'ลูกสมุน 5,000 เหรียญ', 'Đồng hành 5.000 vàng', 'Спутники · 5000 золота',
        'Gefährten · 5.000 Gold', 'Seguaci · 5.000 oro']
if "'menu.store.sub'" not in s:
    idx = [0]
    def ins(m):
        i = idx[0]; idx[0] += 1
        return "'menu.store.sub': '%s', 'store.note': '" % SUBS[i]
    s, n = re.subn(r"'store\.note': '", ins, s)
    must(n == 10, 'store.note count %d' % n)
    print('  ok   menu.store.sub x10')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
