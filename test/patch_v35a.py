# -*- coding: utf-8 -*-
# v3.5-a：首頁「📖 遊戲說明」—— 版本號、ctx 改成可換（畫說明用小圖）、樣式、頁面骨架、多語選單
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
orig = s
n = 0


def rep(old, new, cnt=1, label=''):
    global s, n
    if s.count(old) < 1:
        print('MISS: ' + (label or old[:60]))
        sys.exit(1)
    s = s.replace(old, new, cnt)
    n += 1


# ---------- 1. 版本號 ----------
rep("const VERSION = '3.4';", "const VERSION = '3.5';", 1, 'VERSION')
rep('<span id="verTxt">3.4</span>', '<span id="verTxt">3.5</span>', 1, 'verTxt')

# ---------- 2. ctx 改成 let：說明頁要暫時把畫布換成小畫布來畫道具／怪物圖 ----------
rep("const cv = $id('cv');\nconst ctx = cv.getContext('2d');",
    "const cv = $id('cv');\n// v3.5：改成 let —— 遊戲說明頁會暫時把 ctx 指向小畫布，畫完立刻換回來\nlet ctx = cv.getContext('2d');",
    1, 'let ctx')

# ---------- 3. 選單多語：menu.help / menu.help.sub ----------
HELP_MENU = {
    'zh-TW': ('📖 遊戲說明', '操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂'),
    'zh-CN': ('📖 游戏说明', '操作 · 道具 · 坐骑 · 场景 · 怪物一次看懂'),
    'en': ('📖 How to Play', 'Controls · items · mounts · stages · monsters'),
    'ja': ('📖 遊び方', '操作・アイテム・騎乗・ステージ・モンスター'),
    'ko': ('📖 게임 설명', '조작 · 아이템 · 탈것 · 스테이지 · 몬스터'),
    'th': ('📖 วิธีเล่น', 'การควบคุม · ไอเท็ม · ขี่ · ด่าน · มอนสเตอร์'),
    'vi': ('📖 Hướng dẫn', 'Điều khiển · vật phẩm · thú cưỡi · màn · quái'),
    'ru': ('📖 Как играть', 'Управление · предметы · езда · уровни · монстры'),
    'de': ('📖 Anleitung', 'Steuerung · Items · Reittier · Level · Monster'),
    'it': ('📖 Guida', 'Comandi · oggetti · cavalcatura · livelli · mostri'),
}
for lg in HELP_MENU:
    anchor = "I18N['%s'] = {" % lg
    i = s.index(anchor)
    j = s.index("'menu.settings.sub':", i)
    k = s.index('\n', j)
    line_add = "\n  'menu.help': '%s', 'menu.help.sub': '%s'," % HELP_MENU[lg]
    s = s[:k] + line_add + s[k:]
    n += 1

# ---------- 4. 樣式 ----------
CSS = r"""
  /* ================================================================
     v3.5：遊戲說明頁（首頁「📖 遊戲說明」進入）
     分頁：基本操作／道具／坐騎／場景／怪物／訣竅；道具與怪物都有小圖
     ================================================================ */
  .mbtn.helpbtn {
    background: linear-gradient(180deg, #8fdcc8, #3ea98c); border-color: #c9f0e5; color: #fff;
    text-shadow: 0 2px 0 rgba(16,80,64,.45);
    box-shadow: 0 4px 0 #2b7d67, 0 16px 26px -12px rgba(40,140,110,.6), inset 0 2px 0 rgba(255,255,255,.4);
  }
  .mbtn.helpbtn small { color: #e9fff8; }
  .mbtn.helpbtn:hover {
    border-color: #e2fff6;
    box-shadow: 0 6px 0 #2b7d67, 0 18px 30px -12px rgba(40,150,120,.65), inset 0 2px 0 rgba(255,255,255,.45);
  }
  .helpcard { padding: 18px 16px 14px; }
  .helpcard h2 { margin-bottom: 2px; }
  .helpcard .desc { margin-bottom: 10px; }
  .helptabs { display: flex; gap: 7px; flex-wrap: wrap; margin: 0 0 12px; }
  .helptabs button {
    background: #fffaf0; border: 2px solid var(--woodline); color: #8a5f35;
    border-radius: 999px; padding: 8px 15px; font-size: 14px; font-weight: 900;
    cursor: pointer; font-family: inherit; transition: transform .12s, border-color .12s, box-shadow .12s;
  }
  .helptabs button:hover { transform: translateY(-2px); border-color: #ffb066; }
  .helptabs button.on {
    background: linear-gradient(180deg, #ffb066, #f4703c); border-color: #ffc9a0; color: #fff;
    text-shadow: 0 1px 0 rgba(150,60,20,.4); box-shadow: 0 3px 0 #c9502a;
  }
  .helpbody {
    max-height: min(60vh, 540px); overflow-y: auto; -webkit-overflow-scrolling: touch;
    padding: 2px 4px 2px 2px; user-select: text; -webkit-user-select: text;
  }
  .helpbody::-webkit-scrollbar { width: 8px; }
  .helpbody::-webkit-scrollbar-thumb { background: #e2c39c; border-radius: 8px; }
  .helpbody::-webkit-scrollbar-track { background: rgba(226,195,156,.25); border-radius: 8px; }
  .hgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 10px; }
  .hcard {
    display: flex; gap: 10px; align-items: flex-start; text-align: left;
    background: #fffaf0; border: 2px solid var(--woodline); border-radius: 14px; padding: 10px 11px;
  }
  .hcard.wide { grid-column: 1 / -1; }
  .hcard .hico { flex: 0 0 auto; }
  .hcard .htx { min-width: 0; flex: 1 1 auto; }
  .hcard .hn { font-size: 14.5px; font-weight: 900; color: #7b4a1f; line-height: 1.4; }
  .hcard .hn .hen { font-size: 11px; font-weight: 700; color: #b08a63; margin-left: 5px; }
  .hcard .hd { font-size: 12.5px; line-height: 1.8; color: #8a6a4a; margin-top: 3px; }
  .hcard .hd b { color: #c9502a; }
  .hcard .hh { font-size: 12px; line-height: 1.75; color: #a5815d; margin-top: 4px; }
  .hcard .hh b { color: #7b4a1f; }
  .hcard .hsw {
    flex: 0 0 auto; width: 46px; height: 46px; border-radius: 12px;
    border: 2px solid rgba(120,80,40,.28); box-shadow: inset 0 2px 0 rgba(255,255,255,.5);
  }
  .hbadge {
    display: inline-block; font-size: 11px; font-weight: 900; padding: 1px 8px;
    border-radius: 999px; margin: 0 3px 3px 0; white-space: nowrap;
  }
  .hbadge.good { background: #eaf8e6; color: #2f7a45; border: 1px solid #b7ddb4; }
  .hbadge.bad { background: #fdeaea; color: #b3231f; border: 1px solid #f0b6b2; }
  .hbadge.info { background: #eaf1fb; color: #38609c; border: 1px solid #bcd0ee; }
  .hbadge.hot { background: #fff0e2; color: #c9502a; border: 1px solid #f4c9a4; }
  .hkv { margin: 2px 0 0; display: grid; grid-template-columns: 88px 1fr; gap: 2px 10px; font-size: 12.5px; line-height: 1.75; color: #8a6a4a; }
  .hkv dt { font-weight: 900; color: #96693f; }
  .hkv dd { margin: 0; }
  .hkv dd b { color: #c9502a; }
  .hlead { font-size: 12.5px; line-height: 1.85; color: #8a6a4a; margin: 0 0 10px; }
  .hlead b { color: #c9502a; }
  .hsub { font-size: 12.5px; font-weight: 900; color: #96693f; margin: 12px 0 6px; letter-spacing: .04em; }
  .hsub:first-child { margin-top: 0; }
  .hride { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
  .htable { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: 4px; }
  .htable th, .htable td { border: 1px solid var(--woodline); padding: 6px 8px; text-align: left; color: #8a6a4a; }
  .htable th { background: #fff2dc; color: #96693f; font-weight: 900; white-space: nowrap; }
  .htable td b { color: #c9502a; }
  @media (max-width: 560px) {
    .helpcard { padding: 13px 10px 11px; }
    .hgrid, .hride { grid-template-columns: 1fr; }
    .helpbody { max-height: 64vh; }
    .helptabs button { font-size: 13px; padding: 7px 12px; }
    .hkv { grid-template-columns: 76px 1fr; }
  }
"""
i = s.rindex('</style>')
s = s[:i] + CSS + s[i:]
n += 1

# ---------- 5. 首頁選單：新增「📖 遊戲說明」 ----------
BTN = ('        <button class="mbtn helpbtn" id="btnHelp">📖 遊戲說明'
       '<small>操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂</small></button>\n')
old_btn = '        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>'
rep(old_btn, BTN + old_btn, 1, '設定按鈕')

# ---------- 6. 說明頁骨架 ----------
SCR = '''
  <!-- 遊戲說明（v3.5） -->
  <div class="screen" id="scr-help">
    <div class="card helpcard">
      <h2>📖 遊戲說明</h2>
      <div class="desc">操作、道具、坐騎招式、場景機關、怪物圖鑑一次看懂 —— 點上面的分類切換。</div>
      <div class="helptabs" id="helpTabs">
        <button type="button" data-ht="basic" class="on">🎮 基本操作</button>
        <button type="button" data-ht="item">🎁 道具總覽</button>
        <button type="button" data-ht="ride">🦖 坐騎招式</button>
        <button type="button" data-ht="stage">🗺️ 場景機關</button>
        <button type="button" data-ht="foe">👾 怪物圖鑑</button>
        <button type="button" data-ht="tip">💡 實戰訣竅</button>
      </div>
      <div class="helpbody" id="helpBody"></div>
      <div class="backrow">
        <button class="ghostbtn" data-back="1">← 回主選單</button>
      </div>
    </div>
  </div>

'''
anchor = '  <!-- 單人關卡選擇 -->'
rep(anchor, SCR + anchor, 1, '單人關卡錨點')

io.open(P, 'w', encoding='utf-8').write(s)
print('patch_v35a OK，共 %d 處，%d → %d 位元組' % (n, len(orig), len(s)))
