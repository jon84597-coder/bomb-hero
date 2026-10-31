# -*- coding: utf-8 -*-
"""
v4.0-a：首頁擴充
  1. 新增「🎲 RPG 模式」選單鈕（帶「測試版 Beta」標籤）
  2. 新增「🛒 商店」鈕（未來開放，點了顯示維護中）
  3. 左上角新增「📜 版本更新內容」標籤 → 彈出面板，列出 v3.0 ~ v4.0 詳細更動
  4. 版本號 3.9 → 4.0
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'index.html')
raw = open(P, 'rb').read()
EOL = b'\r\n' if b'\r\n' in raw else b'\n'
s = raw.decode('utf-8')


def sub(old, new, tag, count=1):
    o = old.replace('\n', EOL.decode())
    n = new.replace('\n', EOL.decode())
    if s.count(o) != count:
        print('  !! %s：出現 %d 次（預期 %d）' % (tag, s.count(o), count))
        sys.exit(1)
    globals()['s'] = s.replace(o, n, count)
    print('  ok %s' % tag)


# ============================================================
# 1. CSS：RPG 鈕 / 商店鈕 / 版本更新面板
# ============================================================
OLD_CSS = """  .mbtn.bossbtn:hover { border-color: #e3ccff; box-shadow: 0 0 0 1px rgba(227,204,255,.5), 0 14px 34px -14px rgba(201,168,255,.9); }
"""
NEW_CSS = """  .mbtn.bossbtn:hover { border-color: #e3ccff; box-shadow: 0 0 0 1px rgba(227,204,255,.5), 0 14px 34px -14px rgba(201,168,255,.9); }
  /* v4.0：RPG 模式鈕（金色 × 深藍，跟其他模式明顯區隔）＋ 測試版標籤 */
  .mbtn.rpgbtn {
    position: relative;
    background: linear-gradient(180deg, #1e3a63, #10203a);
    border-color: #ffd166; color: #fff6e0;
    box-shadow: 0 0 0 1px rgba(255,209,102,.28), 0 12px 30px -16px rgba(255,190,80,.85);
  }
  .mbtn.rpgbtn:hover { border-color: #ffe6a3; box-shadow: 0 0 0 1px rgba(255,230,163,.55), 0 14px 34px -14px rgba(255,209,102,.9); }
  .mbtn.rpgbtn .betaTag {
    position: absolute; right: 8px; top: 7px;
    font-size: 9.5px; font-weight: 900; letter-spacing: .06em;
    padding: 2px 7px; border-radius: 999px;
    color: #3a1c00; background: linear-gradient(180deg, #ffe6a3, #ffb347);
    box-shadow: 0 2px 8px -3px rgba(0,0,0,.6);
  }
  /* v4.0：商店鈕（虛線金框，標示「即將開放」） */
  .mbtn.storebtn {
    background: linear-gradient(180deg, #2a2418, #1c1913);
    border: 1px dashed #a08a52; color: #e8dcc0;
  }
  .mbtn.storebtn small { color: #8d7f5f; }
  .mbtn.storebtn:hover { transform: none; border-color: #d8c07a; box-shadow: none; }
  /* v4.0：左上角「版本更新內容」標籤 */
  .verlogbtn {
    position: fixed; z-index: 900; left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));
    display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
    padding: 6px 12px; border-radius: 999px;
    font-family: inherit; font-size: 12px; font-weight: 800; letter-spacing: .04em;
    color: #4a2a0e; background: linear-gradient(180deg, #fff6e2, #ffe0b0);
    border: 2px solid #f0cf9a;
    box-shadow: 0 8px 18px -12px rgba(120,80,40,.75);
  }
  .verlogbtn:hover { border-color: #f4703c; }
  .verlogbtn .vlnum {
    font-size: 10.5px; font-weight: 900; color: #fff;
    background: #f4703c; border-radius: 999px; padding: 1px 7px;
  }
  body.touch .verlogbtn { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); font-size: 11px; padding: 5px 10px; }
  /* v4.0：版本更新面板（全螢幕遮罩 ＋ 可捲動卡片） */
  .vlog {
    position: fixed; inset: 0; z-index: 1400; display: flex; align-items: center; justify-content: center;
    padding: 16px; background: rgba(6,9,18,.78); backdrop-filter: blur(3px);
  }
  .vlog.hide { display: none; }
  .vlog .vlog-card {
    width: min(680px, 100%); max-height: min(84vh, 760px);
    display: flex; flex-direction: column;
    background: linear-gradient(180deg, #141d31, #0e1524);
    border: 2px solid #2c3c62; border-radius: 18px;
    box-shadow: 0 26px 60px -24px rgba(0,0,0,.95);
    overflow: hidden;
  }
  .vlog .vlog-head {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 16px; border-bottom: 1px solid #243252;
    background: linear-gradient(180deg, #1b2740, #141d31);
  }
  .vlog .vlog-head h3 { font-size: 16px; font-weight: 900; letter-spacing: .06em; color: #ffe6a3; }
  .vlog .vlog-head .vlog-sub { font-size: 11px; color: #7d8db0; font-weight: 700; }
  .vlog .vlog-x {
    margin-left: auto; width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
    background: #26324f; border: 1px solid #3a4a72; color: #dbe8ff; font-size: 14px; font-weight: 900;
  }
  .vlog .vlog-x:hover { background: #33436b; }
  .vlog .vlog-body { padding: 14px 16px 20px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .vlog .vlog-item { padding: 11px 0; border-bottom: 1px dashed #25314e; }
  .vlog .vlog-item:last-child { border-bottom: 0; }
  .vlog .vlog-v {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13.5px; font-weight: 900; color: #cfe0ff; letter-spacing: .05em;
  }
  .vlog .vlog-v .tagnow {
    font-size: 9.5px; font-weight: 900; color: #10240f; background: #7fe08a;
    border-radius: 999px; padding: 1px 7px;
  }
  .vlog .vlog-v .vdate { font-size: 10.5px; font-weight: 700; color: #66739a; letter-spacing: .02em; }
  .vlog .vlog-item ul { margin: 7px 0 0 2px; padding: 0; list-style: none; }
  .vlog .vlog-item li {
    position: relative; padding-left: 15px; margin-top: 5px;
    font-size: 12.5px; line-height: 1.72; color: #b9c6e2; font-weight: 600;
  }
  .vlog .vlog-item li::before {
    content: ''; position: absolute; left: 3px; top: .62em; width: 5px; height: 5px;
    border-radius: 50%; background: #f4703c;
  }
  .vlog .vlog-item li b { color: #ffd9b0; }
  .vlog .vlog-item.hot .vlog-v { color: #ffe6a3; }
  .vlog .vlog-item.hot li::before { background: #ffd166; }
"""
sub(OLD_CSS, NEW_CSS, 'CSS：RPG／商店／版本面板')

# ============================================================
# 2. HTML：版本更新標籤 + RPG／商店鈕 + 面板
# ============================================================
OLD_TITLE = """  <!-- 標題 -->
  <div class="screen on" id="scr-title">
    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->"""
NEW_TITLE = """  <!-- 標題 -->
  <div class="screen on" id="scr-title">
    <!-- v4.0：左上角「版本更新內容」標籤 -->
    <button class="verlogbtn" id="verLogBtn" type="button" title="看看每個版本改了什麼">
      📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.0</span></span>
    </button>
    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->"""
sub(OLD_TITLE, NEW_TITLE, 'HTML：版本更新標籤')

OLD_MENU = """        <button class="mbtn warm" id="btnSolo">單人闖關<small>8 大關卡 · 難易度／無限時間 · 關底魔王</small></button>
        <button class="mbtn bossbtn" id="btnBoss">挑戰 BOSS 👹<small>直接單挑暗黑魔王 · 沒有小怪干擾</small></button>"""
NEW_MENU = """        <button class="mbtn warm" id="btnSolo">單人闖關<small>8 大關卡 · 難易度／無限時間 · 關底魔王</small></button>
        <button class="mbtn rpgbtn" id="btnRpg">🎲 RPG 模式<span class="betaTag">測試版 Beta</span><small>四維屬性配點 · 怪物血量防禦 · 32 張不規則地圖</small></button>
        <button class="mbtn bossbtn" id="btnBoss">挑戰 BOSS 👹<small>直接單挑暗黑魔王 · 沒有小怪干擾</small></button>"""
sub(OLD_MENU, NEW_MENU, 'HTML：RPG 模式鈕')

OLD_MENU2 = """        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
      </div>"""
NEW_MENU2 = """        <button class="mbtn storebtn" id="btnStore">🛒 商店<small>未來開放 · 道具／造型兌換</small></button>
        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
      </div>"""
sub(OLD_MENU2, NEW_MENU2, 'HTML：商店鈕')

# 面板放在 body 尾端（.wrap 之後）
OLD_TAIL = """<script>
(function () {
'use strict';"""
NEW_TAIL = """<!-- v4.0：版本更新內容面板 -->
<div class="vlog hide" id="verLog">
  <div class="vlog-card">
    <div class="vlog-head">
      <h3>📜 版本更新內容</h3>
      <span class="vlog-sub">Ver 3.0 → 4.0</span>
      <button class="vlog-x" id="verLogClose" type="button" title="關閉">✕</button>
    </div>
    <div class="vlog-body" id="verLogBody"></div>
  </div>
</div>

<script>
(function () {
'use strict';"""
sub(OLD_TAIL, NEW_TAIL, 'HTML：版本面板')

# ============================================================
# 3. 版本號 4.0
# ============================================================
OLD_VER = """// v3.9：手機觸控按鈕圖示換成場上的真實美術（黑亮圓球炸彈／遙控 LED 彈／四層水滴火焰），
//       外加三層同心金屬圓框（盤面＋金屬環＋深色外圈、外緣細白線、上緣玻璃反光）
const VERSION = '3.9';"""
NEW_VER = """// v3.9：手機觸控按鈕圖示換成場上的真實美術（黑亮圓球炸彈／遙控 LED 彈／四層水滴火焰），
//       外加三層同心金屬圓框（盤面＋金屬環＋深色外圈、外緣細白線、上緣玻璃反光）
// v4.0（大更新）：全新「RPG 模式（測試版）」獨立系統 —— 四維屬性 HP／防禦／速度／攻擊、
//       10 點自由配點、怪物血量與防禦分級、32 張不規則動態地圖（8 主題 × 4 小地圖）、
//       首頁「版本更新內容」面板與「商店」預留鈕
const VERSION = '4.0';"""
sub(OLD_VER, NEW_VER, '版本號 4.0')

OLD_BADGE = """      <div class="ver beta">測試版 v<span id="verTxt">3.9</span></div>"""
NEW_BADGE = """      <div class="ver beta">測試版 v<span id="verTxt">4.0</span></div>"""
sub(OLD_BADGE, NEW_BADGE, 'HTML：版本徽章 4.0')

open(P, 'wb').write(s.encode('utf-8'))
print('\n[patch_v40a] 完成 ' + str(len(s.encode('utf-8'))) + ' bytes')
