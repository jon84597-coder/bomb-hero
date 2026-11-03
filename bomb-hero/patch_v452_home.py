# -*- coding: utf-8 -*-
# v4.52 patch A：首頁大按鈕改版（統一外型＋四態）／移除操作提示白框／對戰標測試版
# 冪等：可重複執行
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()
before = len(s)

def must(cond, msg):
    if not cond:
        print('FAIL ' + msg)
        sys.exit(1)

def rep(old, new, tag):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag)
        print('  skip ' + tag)
        return
    must(s.count(old) == 1, 'DUP(%d) %s' % (s.count(old), tag))
    s = s.replace(old, new)
    print('  ok   ' + tag)

# ---------- 1. 按鈕標記：統一的 class（c-*）＋ data-ico（beta 鈕另加 has-beta）----------
BTN = [
    ('btnLearn',   'c-learn',   '🎓', False),
    ('btnSolo',    'c-solo',    '🎯', False),
    ('btnRpg',     'c-rpg',     '🎲', True),
    ('btnBoss',    'c-boss',    '👹', False),
    ('btnStore',   'c-store',   '🛒', False),
    ('btnAcctBig', 'c-acct',    '👤', False),
    ('btnBattle',  'c-battle',  '⚔️', True),
    ('btnOnline',  'c-online',  '🌐', True),
    ('btnHelp',    'c-help',    '📖', False),
    ('btnSettings','c-set',     '⚙️', False),
    ('btnQuit',    'c-quit',    '🚪', False),
]
for bid, cls, ico, beta in BTN:
    pat = re.compile(r'<button class="mbtn[^"]*" id="%s"' % bid)
    m = pat.search(s)
    must(m, 'button ' + bid)
    cc = 'mbtn %s%s' % (cls, ' has-beta' if beta else '')
    s = s[:m.start()] + '<button class="%s" id="%s" data-ico="%s"' % (cc, bid, ico) + s[m.end():]
print('  ok   data-ico x11')

# ---------- 2. 標題文字去掉行內 emoji（改由 ::before 的 icon 徽章呈現）----------
rep('">🎲 RPG 模式<span class="betaTag">', '">RPG 模式<span class="betaTag">', 'rpg text')
rep('">挑戰 BOSS 👹<small>', '">挑戰 BOSS<small>', 'boss text')
rep('">🛒 商店<small>隨從 1000 金幣 · 分享送金幣</small>',
    '">商店<small>隨從 1000 金幣 · 分享送金幣</small>', 'store text')
rep('">👤 帳號登入<small>', '">帳號登入<small>', 'acct text')
rep('">📖 遊戲說明<small>', '">遊戲說明<small>', 'help text')
rep('">🚪 離開遊戲<small>', '">離開遊戲<small>', 'quit text')

# ---------- 3. 對戰／線上配對標「測試版 Beta」 ----------
rep('">對戰（含 AI）<small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small>',
    '">對戰（含 AI）<span class="betaTag">測試版 Beta</span><small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small>',
    'battle beta')
rep('">線上配對<small>房號連線 · 等待室 · 朋友一起打</small>',
    '">線上配對<span class="betaTag">測試版 Beta</span><small>房號連線 · 等待室 · 朋友一起打</small>',
    'online beta')

# ---------- 4. 設定鈕副標：地圖尺寸已被 v4.51 移除 ----------
rep('">設定<small>地圖尺寸 · 控制方式 · 音量</small>',
    '">設定<small>控制方式 · 音量 · 語言 · 全螢幕</small>', 'settings sub')

# ---------- 4b. 副標縮短（手機兩欄只有 157px，長句會被截斷）＋ 對戰鈕改名 ----------
rep('">對戰（含 AI）<span class="betaTag">', '">對戰模式<span class="betaTag">', 'battle title')
rep('<small>32 張地圖 · 難易度／無限時間 · 第 32 關魔王</small>', '<small>32 關 · 可調難度</small>', 'solo sub')
rep('<small>四維屬性 · 血量防禦 · 32 張地圖</small>', '<small>配點養成 · 血量防禦</small>', 'rpg sub')
rep('<small>直接單挑暗黑魔王 · 沒有小怪干擾</small>', '<small>單挑暗黑魔王</small>', 'boss sub')
rep('<small>隨從 1000 金幣 · 分享送金幣</small>', '<small>隨從 1000 金幣</small>', 'store sub')
rep('<small>綁定帳號 · 雲端存檔 · 分享金幣</small>', '<small>雲端存檔 · 分享金幣</small>', 'acct sub')
rep('<small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small>', '<small>2～8 人混戰 · AI 補位</small>', 'battle sub')
rep('<small>房號連線 · 等待室 · 朋友一起打</small>', '<small>房號連線 · 朋友同樂</small>', 'online sub')
rep('<small>操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂</small>', '<small>操作 · 道具 · 怪物</small>', 'help sub')
rep('<small>控制方式 · 音量 · 語言 · 全螢幕</small>', '<small>控制 · 音量 · 語言</small>', 'set sub')
rep('<small>存好進度 · 關掉這個頁面</small>', '<small>存好進度再關</small>', 'quit sub')

rep("if (sub) sub.textContent = isDone() ? '一步一步帶你玩 · 約 5 分鐘' : '第一次玩？先點這裡，3 分鐘帶你玩一輪';",
    "if (sub) sub.textContent = isDone() ? '想複習再玩一次' : '3 分鐘帶你玩一輪';", 'learn sub (syncTag)')
rep('<small>2～8 人混戰 · AI 補位</small>', '<small>2～8 人混戰</small>', 'battle sub2')

# ---------- 5. 首頁移除「操作提示」白框（內容在遊戲說明／新手教學都有）----------
HINT = '''      <div class="hint">
        🐰🐻🐶🐱🐷🐼🐸🐥 8 隻動物可選（單人選角處直接挑）<br>
        🛼滑冰 🧤搬彈投擲 🥾踢彈 🥊打彈 📁遙控引爆（<b>E</b>）🧨穿透彈 🦖恐龍蛋 ❤️愛心<br>
        冰原滑行 · 傳送門 · 輸送帶 · 激戰突死縮圈<br>
        <kbd>WASD</kbd>／<kbd>方向鍵</kbd> 移動　<kbd>空白鍵</kbd>／<kbd>Enter</kbd> 炸彈　<kbd>E</kbd> 引爆　<kbd>F</kbd> 恐龍吐火
      </div>
'''
rep(HINT, '', 'remove home hint')

# ---------- 6. btnLearn 文案：emoji 交給 data-ico ----------
rep("b.innerHTML = '🎓 新手教學<span id=\"learnTag\">推薦先玩</span><small>一步一步帶你玩 · 約 5 分鐘</small>';",
    "b.innerHTML = '新手教學<span id=\"learnTag\">推薦先玩</span><small>一步一步帶你玩 · 約 5 分鐘</small>';",
    'learn innerHTML')

# ---------- 7. learnTag 統一成金色小膠囊（跟 betaTag 同款）----------
OLD_TAG = '''#learnTag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px;
  background: #ffd166; color: #3a2a08; font-size: 10px; letter-spacing: 0; vertical-align: 2px; }'''
NEW_TAG = '''#learnTag { display: inline-block; margin-left: 7px; padding: 2px 7px; border-radius: 999px;
  background: linear-gradient(180deg, #ffe6a3, #ffb347); color: #3a2200;
  font-size: 9.5px; font-weight: 900; letter-spacing: .04em; vertical-align: 2px;
  box-shadow: 0 2px 6px -2px rgba(0,0,0,.45); }'''
rep(OLD_TAG, NEW_TAG, 'learnTag style')

# ---------- 8. 新按鈕系統（插在 </style> 前，位置最後 → 蓋掉所有舊規則）----------
CSS = '''  /* ================================================================
     v4.52：首頁大按鈕統一設計
     · 11 顆同一個外型：左側 icon 徽章 ＋ 主標 ＋ 副標，圓角、厚底、內高光
     · 四種狀態：一般 / 滑過（抬起＋外圈）/ 按下（壓到底）/ 發亮提示（脈衝光環）
     · 顏色分三層：主玩法＝暖色深淺、工具＝冷灰藍、新手教學＝綠
     ================================================================ */
  #scr-title .menu .mbtn {
    --c1: #ffa161; --c2: #e8622b; --c3: #a8411a;
    --g1: rgba(255,180,120,.55); --g0: rgba(255,180,120,0);
    position: relative; display: block; width: 100%; min-width: 0; overflow: hidden;
    text-align: left; cursor: pointer;
    padding: 14px 14px 14px 58px; border: 0; border-radius: 16px;
    font-family: inherit; font-size: 21px; font-weight: 900; line-height: 1.25; letter-spacing: .02em;
    color: #fff; text-shadow: 0 2px 3px rgba(0,0,0,.32); white-space: nowrap;
    background: linear-gradient(180deg, var(--c1), var(--c2));
    box-shadow: 0 5px 0 var(--c3), 0 14px 22px -14px rgba(40,24,10,.75),
                inset 0 2px 0 rgba(255,255,255,.4), inset 0 -4px 0 rgba(0,0,0,.1);
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  #scr-title .menu .mbtn.has-beta { padding-right: 74px; }
  #scr-title .menu .mbtn::before {
    content: attr(data-ico); position: absolute; left: 12px; top: 50%; margin-top: -16px;
    width: 32px; height: 32px; line-height: 32px; text-align: center;
    font-size: 18px; border-radius: 9px;
    background: rgba(255,255,255,.2); box-shadow: inset 0 1px 0 rgba(255,255,255,.45);
  }
  #scr-title .menu .mbtn small {
    display: block; margin-top: 4px; font-size: 12.5px; font-weight: 700; letter-spacing: .01em;
    color: rgba(255,255,255,.88); text-shadow: 0 1px 2px rgba(0,0,0,.26);
    overflow: hidden; text-overflow: ellipsis;
  }
  /* 滑過：抬起來 ＋ 亮一階 ＋ 白圈 */
  #scr-title .menu .mbtn:hover {
    transform: translateY(-2px) scale(1.012); filter: brightness(1.13) saturate(1.06);
    box-shadow: 0 7px 0 var(--c3), 0 20px 28px -14px rgba(40,24,10,.6),
                0 0 0 3px rgba(255,255,255,.62), 0 0 18px 2px var(--g1),
                inset 0 2px 0 rgba(255,255,255,.55);
  }
  /* 按下：壓到底 ＋ 陰影只剩 1px */
  #scr-title .menu .mbtn:active {
    transform: translateY(4px); filter: brightness(.95);
    box-shadow: 0 1px 0 var(--c3), 0 3px 10px -6px rgba(0,0,0,.55),
                inset 0 3px 9px rgba(0,0,0,.28);
  }
  #scr-title .menu .mbtn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
  /* 發亮提示：還沒玩過新手教學時，按鈕外圈呼吸光環 */
  #scr-title .menu .mbtn.newbie { animation: mbtnGlow 1.9s ease-in-out infinite; }
  @keyframes mbtnGlow {
    0%, 100% { box-shadow: 0 5px 0 var(--c3), 0 0 0 0 var(--g1), inset 0 2px 0 rgba(255,255,255,.4); }
    55%      { box-shadow: 0 5px 0 var(--c3), 0 0 0 10px var(--g0), inset 0 2px 0 rgba(255,255,255,.4); }
  }
  /* Beta 小膠囊（RPG／對戰／線上配對）*/
  .mbtn.rpgbtn .betaTag, #scr-title .menu .mbtn .betaTag {
    position: absolute; right: 9px; top: 9px; padding: 2px 7px; border-radius: 999px;
    font-size: 9.5px; font-weight: 900; letter-spacing: .06em; color: #3a2200;
    background: linear-gradient(180deg, #ffe6a3, #ffb347); box-shadow: 0 2px 6px -2px rgba(0,0,0,.45);
  }
  /* 主玩法：暖色深淺 ／ 工具：冷灰藍 ／ 新手教學：綠 */
  #scr-title .menu .c-learn { --c1: #48c08a; --c2: #1e7a52; --c3: #125038; --g1: rgba(120,230,170,.6); --g0: rgba(120,230,170,0); }
  #scr-title .menu .c-solo  { --c1: #ffa161; --c2: #e8622b; --c3: #a8411a; --g1: rgba(255,180,120,.55); --g0: rgba(255,180,120,0); }
  #scr-title .menu .c-rpg   { --c1: #f0b13c; --c2: #c47a10; --c3: #8a5306; --g1: rgba(255,210,120,.55); --g0: rgba(255,210,120,0); }
  #scr-title .menu .c-boss  { --c1: #b07ae0; --c2: #6b2fa0; --c3: #43185f; --g1: rgba(210,170,255,.55); --g0: rgba(210,170,255,0); }
  #scr-title .menu .c-battle{ --c1: #f2695a; --c2: #b83424; --c3: #7d1c12; --g1: rgba(255,160,140,.55); --g0: rgba(255,160,140,0); }
  #scr-title .menu .c-online{ --c1: #ea6c93; --c2: #a72c50; --c3: #742039; --g1: rgba(255,170,200,.55); --g0: rgba(255,170,200,0); }
  #scr-title .menu .c-store { --c1: #6b8fc0; --c2: #33507a; --c3: #22344f; --g1: rgba(150,190,240,.5); --g0: rgba(150,190,240,0); }
  #scr-title .menu .c-acct  { --c1: #7fa2c8; --c2: #456a92; --c3: #2b4661; --g1: rgba(150,190,240,.45); --g0: rgba(150,190,240,0); }
  #scr-title .menu .c-help  { --c1: #8a9bb0; --c2: #54647a; --c3: #37424f; --g1: rgba(170,190,215,.45); --g0: rgba(170,190,215,0); }
  #scr-title .menu .c-set   { --c1: #96a0ad; --c2: #5b646f; --c3: #3a4149; --g1: rgba(180,190,200,.45); --g0: rgba(180,190,200,0); }
  #scr-title .menu .c-quit  { --c1: #9a7a84; --c2: #5f3d47; --c3: #3d262d; --g1: rgba(200,160,175,.45); --g0: rgba(200,160,175,0); }
  /* 桌機 11 顆排成 4＋4＋3（最後一顆吃 2 格補滿）；手機維持兩欄，剛好 6 排排滿 */
  #scr-title .menu .mbtn:last-child { grid-column: auto; justify-self: stretch; width: auto; }
  @media (min-width: 900px) { #scr-title .menu .mbtn:last-child { grid-column: span 2; } }
  /* 手機：icon 縮小、字縮小，四種狀態與配色完全不變 */
  body.touch #scr-title .menu .mbtn { padding: 11px 10px 11px 40px; font-size: 15px; border-radius: 13px; }
  body.touch #scr-title .menu .mbtn.has-beta { padding-right: 10px; }
  body.touch #scr-title .menu .mbtn::before { left: 9px; margin-top: -12px; width: 24px; height: 24px; line-height: 24px; font-size: 14px; border-radius: 7px; }
  body.touch #scr-title .menu .mbtn small { font-size: 10.5px; margin-top: 2px; }
  body.touch #scr-title .menu .mbtn .betaTag { right: 7px; top: 6px; font-size: 8px; padding: 1px 5px; }
'''
rep('</style>', CSS + '</style>', 'new button css')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('chars %d -> %d (%+d)' % (before, len(s), len(s) - before))
