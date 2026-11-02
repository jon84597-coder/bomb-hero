# -*- coding: utf-8 -*-
"""
v4.7 修補（沿用專案慣例：全檔 CRLF，不做任何隱性換行轉換）
  A. 飛行小怪全面降速（穿牆＋追人太兇，玩家一下就被打死）
  B. 密碼欄位加「顯示／隱藏」眼睛切換（10 語）
  C. 版本號 4.6 → 4.7、版本紀錄新增一筆
"""
import io, sys

P = 'bomb-hero/index.html'
s = io.open(P, 'rb').read().decode('utf-8')
EOL = '\r\n'
n = 0


def rep(old, new, cnt=1, tag=''):
    """嚴格取代：命中次數不符就直接炸掉，避免改錯地方還渾然不知"""
    global s, n
    got = s.count(old)
    if got != cnt:
        raise SystemExit('[FAIL] %s  預期 %d 次，實際 %d 次\n--- old ---\n%s' % (tag or old[:60], cnt, got, old[:300]))
    s = s.replace(old, new)
    n += 1
    print('  ok  ' + (tag or old[:56].replace(EOL, ' / ')))


# ============================================================
# A. 版本號 / 徽章 / 版本紀錄
# ============================================================
rep("const VERSION = '4.6';", "const VERSION = '4.7';", tag='VERSION 常數')
rep('<span id="verTxt">4.6</span>', '<span id="verTxt">4.7</span>', tag='標題版本徽章')

LOG_OLD = EOL.join([
    "const VERSION_LOG = [",
    "  { v: '4.6', date: '2026-11-01', now: true, items: [",
])
LOG_NEW = EOL.join([
    "const VERSION_LOG = [",
    "  { v: '4.7', date: '2026-11-01', now: true, items: [",
    "    '<b>飛行小怪變慢了</b>：蝙蝠／幽靈／毒蜂／眼球怪的基礎速度調降約 35%，關卡加深的加速度也砍半；速度上限從 118 降到 <b>78</b>（玩家基礎 146），再也不會一進場就被穿牆怪追著撞死',",
    "    '<b>不會一直盯著你追</b>：飛行怪轉向的間隔拉長、直接朝玩家飛的機率從 60% 降到 35%，路線也加了一點偏移，有時間看清楚再閃',",
    "    '<b>RPG 同步變温和</b>：32 張地圖裡飛行怪的速度倍率一併下修，開場也不再立刻鎖定玩家',",
    "    '<b>密碼可以看清楚了</b>：登入／註冊／改密碼的密碼欄右邊多一顆 👁，按一下切換顯示內容（變 🙈 再按一次藏回去）；切換時<b>不會清掉已輸入的字、游標位置也不跑掉</b>，強度條與兩次密碼檢查照常運作',",
    "    '<b>10 語都跟到</b>：眼睛按鈕的「顯示密碼／隱藏密碼」提示在繁中、简中、English、日本語、한국어、ไทย、Tiếng Việt、Русский、Deutsch、Italiano 都有對應文字，也支援鍵盤 focus 與無障礙標籤'",
    "  ] },",
    "  { v: '4.6', date: '2026-11-01', items: [",
])
rep(LOG_OLD, LOG_NEW, tag='VERSION_LOG 新增 v4.7 並把 v4.6 轉為舊版')

# ============================================================
# B. 飛行怪降速
# ============================================================
rep("  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 46, color: '#9a86e8', color2: '#4c3d94' },",
    "  { id: 'bat',    name: '蝙蝠',   kind: 'fly',    wing: true,  r: 13, spd: 30, color: '#9a86e8', color2: '#4c3d94' },",
    tag='蝙蝠 46 → 30')
rep("  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 40, color: '#dfe9ff', color2: '#8fa6cc' },",
    "  { id: 'ghost',  name: '幽靈',   kind: 'fly',    wing: true,  r: 14, spd: 26, color: '#dfe9ff', color2: '#8fa6cc' },",
    tag='幽靈 40 → 26')
rep("  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 56, color: '#ffd166', color2: '#a9761a' },",
    "  { id: 'bee',    name: '毒蜂',   kind: 'fly',    wing: true,  r: 12, spd: 36, color: '#ffd166', color2: '#a9761a' },",
    tag='毒蜂 56 → 36')
rep("  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 44, color: '#f4f6ff', color2: '#b04a6a' }",
    "  { id: 'eye',    name: '眼球怪', kind: 'fly',    wing: true,  r: 13, spd: 29, color: '#f4f6ff', color2: '#b04a6a' }",
    tag='眼球怪 44 → 29')

rep("// v2.0：飛行怪再快也不能超過這個值（玩家基礎速度 146 → 飛行怪最高約 81%）" + EOL + "const FLY_SPEED_CAP = 118;",
    "// v4.7：飛行怪穿牆又會追人，太快玩家根本沒時間反應 → 上限再砍一截" + EOL +
    "// 玩家基礎速度 146，飛行怪封頂 78（約 53%），即使困難難度 ×1.22 也還有餘裕" + EOL +
    "const FLY_SPEED_CAP = 78;",
    tag='FLY_SPEED_CAP 118 → 78')

# 關卡加深的加速度：飛行怪砍半以上，地面怪維持原樣
rep("    speed: (sp.spd + stage * 2.6) * M, color: sp.color, color2: sp.color2,",
    "    // v4.7：飛行怪的成長斜率砍半（原本每關 +2.6，穿牆又追人會越後面越無解）" + EOL +
    "    speed: (sp.spd + stage * (sp.kind === 'fly' ? 1.2 : 2.6)) * M, color: sp.color, color2: sp.color2,",
    tag='飛行怪關卡成長 2.6 → 1.2')

rep("  // v2.0：飛行怪一定比玩家慢（玩家基礎 146，飛行怪封頂 118）",
    "  // v2.0 / v4.7：飛行怪一定比玩家慢（玩家基礎 146，飛行怪封頂 78）",
    tag='封頂註解')

# 開場轉向時間拉長 + 追人機率降低 + 路線偏移加大
rep("    e.turnT = .8 + Math.random() * 1.4;",
    "    e.turnT = 1.6 + Math.random() * 1.6;   // v4.7：開場先給玩家 1.6~3.2 秒喘息，不要一生成就鎖人",
    tag='開場轉向延遲')
rep("    e.turnT = .7 + Math.random() * 1.4;",
    "    e.turnT = 1.3 + Math.random() * 1.8;   // v4.7：轉向間隔拉長，路線更好預判",
    tag='轉向間隔')
rep("    // 一半的機率直接朝玩家飛（會追人，不再只是亂飄）",
    "    // v4.7：直接朝玩家飛的機率從 60% 降到 35%，其餘時間維持原本的飄行路線",
    tag='追人註解')
rep("    if (best && Math.random() < .6) {",
    "    if (best && Math.random() < .35) {",
    tag='追人機率 .6 → .35')
rep("      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .5;",
    "      a = Math.atan2(best.y - e.y, best.x - e.x) + (Math.random() - .5) * .9;   // v4.7：不再直直撞過來",
    tag='追人角度擾動加大')

# RPG 模式的速度倍率同步下修
rep("  bat:    { hp: 1, def: 0, spd: 1.00 },  // 飛行：穿牆",
    "  bat:    { hp: 1, def: 0, spd: .82 },   // v4.7 飛行：穿牆，降速", tag='RPG bat')
rep("  ghost:  { hp: 2, def: 0, spd: 1.00 },",
    "  ghost:  { hp: 2, def: 0, spd: .80 },   // v4.7", tag='RPG ghost')
rep("  bee:    { hp: 1, def: 0, spd: 1.12 },",
    "  bee:    { hp: 1, def: 0, spd: .90 },   // v4.7", tag='RPG bee')
rep("  eye:    { hp: 3, def: 0, spd: 1.00 }",
    "  eye:    { hp: 3, def: 0, spd: .84 }    // v4.7", tag='RPG eye')

# 怪物圖鑑的速度標籤與描述要跟著改，不能還寫「快」
rep("  { id: 'bat', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Bat',",
    "  { id: 'bat', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Bat',",
    tag='圖鑑 蝙蝠 中→慢')
rep("  { id: 'bee', k: 'fly', hp: 1, spd: { tw: '快', cn: '快', en: 'Fast' }, en: 'Poison Bee'," + EOL +
    "    d: { tw: '毒蜂：穿牆飛行、<b>速度快</b>，還會慢慢往你靠。', cn: '毒蜂：穿墙飞行、<b>速度快</b>，还会慢慢往你靠。', en: 'Flies through walls, <b>fast</b>, and slowly homes in on you.' } },",
    "  { id: 'bee', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Poison Bee'," + EOL +
    "    d: { tw: '毒蜂：<b>飛行怪裡最快的一隻</b>，但已經調慢，偶爾才會往你靠。', cn: '毒蜂：<b>飞行怪里最快的一只</b>，但已经调慢，偶尔才会往你靠。', en: 'The <b>fastest flyer</b>, now slowed down; only occasionally drifts your way.' } },",
    tag='圖鑑 毒蜂 快→中＋描述')
rep("  { id: 'eye', k: 'fly', hp: 1, spd: { tw: '中', cn: '中', en: 'Medium' }, en: 'Evil Eye'," + EOL +
    "    d: { tw: '眼球怪：穿牆飛行，會<b>直直盯著你靠過來</b>。', cn: '眼球怪：穿墙飞行，会<b>直直盯着你靠过来</b>。', en: 'Flies through walls and <b>locks onto you</b>.' } }",
    "  { id: 'eye', k: 'fly', hp: 1, spd: { tw: '慢', cn: '慢', en: 'Slow' }, en: 'Evil Eye'," + EOL +
    "    d: { tw: '眼球怪：穿牆飛行、速度慢，<b>偶爾</b>才會朝你飄過來。', cn: '眼球怪：穿墙飞行、速度慢，<b>偶尔</b>才会朝你飘过来。', en: 'Slow flyer that <b>occasionally</b> drifts your way.' } }",
    tag='圖鑑 眼球怪 中→慢＋描述')

# ============================================================
# C. 密碼顯示／隱藏（10 語）
# ============================================================
PW_TXT = [
    ('顯示密碼', '隱藏密碼'),
    ('显示密码', '隐藏密码'),
    ('Show password', 'Hide password'),
    ('パスワードを表示', 'パスワードを隠す'),
    ('비밀번호 표시', '비밀번호 숨기기'),
    ('แสดงรหัสผ่าน', 'ซ่อนรหัสผ่าน'),
    ('Hiện mật khẩu', 'Ẩn mật khẩu'),
    ('Показать пароль', 'Скрыть пароль'),
    ('Passwort anzeigen', 'Passwort verbergen'),
    ('Mostra password', 'Nascondi password'),
]
lines = s.split(EOL)
out = []
hit = 0
for ln in lines:
    out.append(ln)
    if ln.lstrip().startswith("'web.pwHint':"):
        idx = hit
        if idx >= len(PW_TXT):
            raise SystemExit('[FAIL] web.pwHint 出現次數超過 10')
        a, b = PW_TXT[idx]
        indent = ln[:len(ln) - len(ln.lstrip())]
        out.append(indent + "'web.pwShow': '" + a + "',")
        out.append(indent + "'web.pwHide': '" + b + "',")
        hit += 1
if hit != 10:
    raise SystemExit('[FAIL] 只插入到 %d 個語言表（預期 10）' % hit)
s = EOL.join(out)
n += 1
print('  ok  10 語插入 web.pwShow / web.pwHide')

# CSS：眼睛按鈕壓在輸入框右側，不額外佔一行
CSS_OLD = "  .acctin:focus { border-color: #f4703c; box-shadow: 0 0 0 3px rgba(244,112,60,.14); }"
CSS_NEW = CSS_OLD + EOL + EOL.join([
    "  /* v4.7：密碼顯示／隱藏眼睛 —— 絕對定位壓在輸入框右側，不另佔一行 */",
    "  .pwrow { position: relative; display: block; }",
    "  .pwrow .acctin { padding-right: 46px; }",
    "  .pwtoggle {",
    "    position: absolute; right: 5px; top: 50%; transform: translateY(-50%);",
    "    width: 34px; height: 34px; padding: 0; line-height: 1;",
    "    display: flex; align-items: center; justify-content: center;",
    "    font-size: 17px; cursor: pointer; border: 0; border-radius: 9px;",
    "    background: transparent; color: #a98a68;",
    "    -webkit-tap-highlight-color: transparent;",
    "  }",
    "  .pwtoggle:hover { background: #f6e9d5; color: #8a5f35; }",
    "  .pwtoggle:focus-visible { outline: 2px solid #f4703c; outline-offset: 1px; }",
    "  .pwtoggle.on { background: #fff0df; color: #c05a22; }",
])
rep(CSS_OLD, CSS_NEW, tag='密碼眼睛 CSS')

# 手機窄版的 .acctin padding shorthand 會蓋回來 → 明確補一條
rep("    .acctin { padding: 7px 10px; font-size: 13px; border-radius: 9px; }",
    "    .acctin { padding: 7px 10px; font-size: 13px; border-radius: 9px; }" + EOL +
    "    .pwrow .acctin { padding-right: 42px; }",
    tag='手機版 padding-right 保留')

# 產生三個密碼欄位的輔助函式。
# 放在「全域」而非帳號模組的 IIFE 裡：那裡的 esc() 是 closure 私有，
# 而 __BH 測試匯出需要能直接拿到這兩支函式 → 自帶一支極小的 pwEsc()。
HELPER_ANCHOR = "const $id = function (id) { return document.getElementById(id); };"
HELPER_NEW = EOL.join([
    "/* ===== v4.7：密碼欄位「顯示／隱藏」切換（全域，帳號模組與測試都呼叫得到） ===== */",
    "function pwEsc(x) {",
    "  return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/\"/g, '&quot;')",
    "    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');",
    "}",
    "/* 三個密碼欄共用同一個產生器，行為完全一致 */",
    "function pwFieldHtml(id, ac) {",
    "  const lab = pwEsc(t('web.pwShow'));",
    "  return '<span class=\"pwrow\">' +",
    "    '<input id=\"' + id + '\" class=\"acctin\" type=\"password\" autocomplete=\"' + ac + '\" maxlength=\"128\">' +",
    "    '<button type=\"button\" class=\"pwtoggle\" data-acct=\"pwEye\" data-for=\"' + id + '\" ' +",
    "    'aria-pressed=\"false\" aria-label=\"' + lab + '\" title=\"' + lab + '\">👁</button>' +",
    "    '</span>';",
    "}",
    "/* 切換明／暗碼：只改 input.type 與按鈕外觀，不動 value、不重建 DOM、游標不跑掉 */",
    "function togglePwEye(btn) {",
    "  const inp = $id(btn.getAttribute('data-for'));",
    "  if (!inp) return false;",
    "  let pos = null;",
    "  try { pos = inp.selectionStart; } catch (e) {}",
    "  const show = inp.type === 'password';",
    "  inp.type = show ? 'text' : 'password';",
    "  btn.classList.toggle('on', show);",
    "  btn.textContent = show ? '🙈' : '👁';",
    "  const lab = show ? t('web.pwHide') : t('web.pwShow');",
    "  btn.setAttribute('aria-label', lab);",
    "  btn.setAttribute('title', lab);",
    "  btn.setAttribute('aria-pressed', show ? 'true' : 'false');",
    "  try {",
    "    inp.focus();",
    "    if (pos != null && inp.setSelectionRange) inp.setSelectionRange(pos, pos);",
    "  } catch (e) {}",
    "  return show;",
    "}" + EOL,
    HELPER_ANCHOR,
])
rep(HELPER_ANCHOR, HELPER_NEW, tag='pwFieldHtml / togglePwEye 全域輔助函式')

# 三個 input 改呼叫產生器
rep("        '<input id=\"acctOldIn\" class=\"acctin\" type=\"password\" autocomplete=\"current-password\" maxlength=\"128\">';",
    "        pwFieldHtml('acctOldIn', 'current-password');",
    tag='舊密碼欄位')
rep("      '<input id=\"acctPwIn\" class=\"acctin\" type=\"password\" autocomplete=\"new-password\" maxlength=\"128\">' +",
    "      pwFieldHtml('acctPwIn', 'new-password') +",
    tag='新密碼欄位')
rep("        '<input id=\"acctPw2In\" class=\"acctin\" type=\"password\" autocomplete=\"new-password\" maxlength=\"128\">' +",
    "        pwFieldHtml('acctPw2In', 'new-password') +",
    tag='確認密碼欄位')

# 事件委派接上眼睛
rep("      else if (act === 'submit') submitWeb(b);",
    "      else if (act === 'pwEye') togglePwEye(b);" + EOL +
    "      else if (act === 'submit') submitWeb(b);",
    tag='click 委派接 pwEye')

# 匯出給測試用（pwFieldHtml / togglePwEye 定義在 IIFE 外，可直接掛）
rep("  // v4.6：PWA 安裝（測試／除錯用）；pwaCore() 每次都去拿 live 的 window.BHPWA",
    "  // v4.7：密碼顯示切換（測試／除錯用）" + EOL +
    "  pwFieldHtml: pwFieldHtml, togglePwEye: togglePwEye," + EOL +
    "  // v4.6：PWA 安裝（測試／除錯用）；pwaCore() 每次都去拿 live 的 window.BHPWA",
    tag='__BH 匯出密碼函式')

io.open(P, 'wb').write(s.encode('utf-8'))
print('\n完成：%d 處修改，%d bytes，CRLF=%s' % (n, len(s.encode('utf-8')), b'\r\n' in s.encode('utf-8')))
