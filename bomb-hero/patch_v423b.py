# -*- coding: utf-8 -*-
"""
v4.23 patch B：把影片裡看到的介面問題一次修掉
1. 「版本更新內容」膠囊原本 position:fixed —— 會浮在選單上方、蓋住按鈕、也跟作者公告撞在一起
   → 改成首頁頂部同一列的普通區塊（跟作者公告並排、可換行）
2. 「帳號登入」深藍底 + 深褐字（#6b4222 繼承自 .mbtn）→ 幾乎看不見
   → 改成淺藍卡片 + 深藍字，跟羊皮紙主題一致
3. 「商店」原本深橄欖底 → 改成金色卡片
4. 手機選單 10 顆一路排到第四屏，商店／帳號要滑很久
   → 手機改兩欄，並把商店／帳號提到 BOSS 後面
"""
import io, re

P = 'index.html'
src = io.open(P, encoding='utf-8', newline='').read()
s = src.replace('\r\n', '\n')

def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n == cnt, '需要 %d 次，實際 %d 次：%r' % (cnt, n, old[:90])
    s = s.replace(old, new)

# ---------------------------------------------------------------- 1. 版本膠囊
rep("""  .verlogbtn {
    position: fixed; z-index: 900; left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));
    display: inline-flex; align-items: center; gap: 5px; cursor: pointer;""",
    """  .verlogbtn {
    /* v4.23：舊版是 position:fixed —— 它會浮在選單上面、蓋住按鈕（點到的是它），
       而且手機上跟「作者公告」膠囊疊在一起。現在改成首頁頂部的一般區塊。 */
    position: relative; z-index: 1;
    display: inline-flex; align-items: center; gap: 5px; cursor: pointer;""")

rep("  body.touch .verlogbtn { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); font-size: 11px; padding: 5px 10px; }",
    "  body.touch .verlogbtn { font-size: 11px; padding: 5px 10px; }")

# 首頁頂部：把版本膠囊與作者公告排在同一列
rep("""    <!-- v4.0：左上角「版本更新內容」標籤 -->
    <button class="verlogbtn" id="verLogBtn" type="button" title="看看每個版本改了什麼">
      📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.22</span></span>
    </button>
    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->
    <div class="annbox" id="annBox">""",
    """    <!-- v4.23：頂部資訊列（版本更新 + 作者公告），兩顆排在同一列、自動換行 -->
    <div class="toprow" id="topRow">
    <!-- v4.0：「版本更新內容」標籤 -->
    <button class="verlogbtn" id="verLogBtn" type="button" title="看看每個版本改了什麼">
      📜 <b>版本更新內容</b><span class="vlnum">v<span id="verLogVer">4.22</span></span>
    </button>
    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->
    <div class="annbox" id="annBox">""")

# 關掉 toprow（annBox 的結尾）
rep("""      </div>
    </div>
    <div class="bootdiag hide" id="bootDiag">""",
    """      </div>
    </div>
    </div><!-- /toprow -->
    <div class="bootdiag hide" id="bootDiag">""")

# toprow 樣式
rep("""  .annbox {
    /* v4.21：改成「首頁卡片裡的一般區塊」——""",
    """  /* v4.23：首頁頂部資訊列 —— 版本更新膠囊與作者公告並排，永遠不覆蓋選單 */
  .toprow {
    display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start;
    justify-content: center; width: 100%; max-width: 560px; margin: 0 auto 10px;
  }
  .toprow .verlogbtn { flex: 0 0 auto; }
  .toprow .annbox { margin: 0; flex: 0 1 auto; max-width: 100%; }
  .toprow .annbox:not(.min) { flex: 1 1 100%; }
  @media (max-width: 380px) {
    .toprow { justify-content: space-between; }
    .toprow .verlogbtn b { display: none; }
  }
  .annbox {
    /* v4.21：改成「首頁卡片裡的一般區塊」——""")

# ---------------------------------------------------------------- 2/3. 按鈕配色
rep("""  .mbtn.acctbigbtn { border-color: rgba(120,190,255,.72); background: linear-gradient(180deg, #1b3357, #142744); }
  .mbtn.acctbigbtn small { color: #9dc4f2; }""",
    """  /* v4.23：原本只設了深藍底，字色仍是 .mbtn 的深褐 #6b4222 → 深底深字幾乎看不到。
     改成淺藍卡片＋深藍字，跟羊皮紙主題一致，也跟「商店」分得開。 */
  .mbtn.acctbigbtn {
    background: linear-gradient(180deg, #eef7ff, #d3e8ff);
    border-color: #6fa8e0; color: #123f6b;
    box-shadow: 0 4px 0 #a9c9e8, 0 14px 24px -14px rgba(50,110,180,.55), inset 0 2px 0 #fff;
  }
  .mbtn.acctbigbtn small { color: #3d6c9c; }
  .mbtn.acctbigbtn:hover { border-color: #4b90d8; }""")

rep("""  .mbtn.storebtn {
    background: linear-gradient(180deg, #2a2418, #1c1913);
    border: 1px dashed #a08a52; color: #e8dcc0;
  }
  .mbtn.storebtn small { color: #8d7f5f; }
  .mbtn.storebtn:hover { transform: none; border-color: #d8c07a; box-shadow: none; }""",
    """  /* v4.23：舊版是深橄欖底＋虛線金框（像「尚未開放」），跟其他按鈕很突兀；改成金色卡片 */
  .mbtn.storebtn {
    background: linear-gradient(180deg, #fff8e2, #ffe6ac);
    border: 2px solid #dcb463; color: #6a4512;
    box-shadow: 0 4px 0 #d8bb84, 0 14px 24px -14px rgba(150,110,40,.5), inset 0 2px 0 #fff;
  }
  .mbtn.storebtn small { color: #8a6a2a; }
  .mbtn.storebtn:hover { transform: translateY(-2px); border-color: #f0c877; box-shadow: 0 6px 0 #d8bb84, 0 18px 28px -14px rgba(150,110,40,.55), inset 0 2px 0 #fff; }""")

# ------------------------------------------------- 4. 手機選單兩欄 + 調整順序
old_menu = """        <button class="mbtn warm" id="btnSolo">單人闖關<small>32 張地圖 · 難易度／無限時間 · 第 32 關魔王</small></button>
        <button class="mbtn rpgbtn" id="btnRpg">🎲 RPG 模式<span class="betaTag">測試版 Beta</span><small>四維屬性 · 血量防禦 · 32 張地圖</small></button>
        <button class="mbtn bossbtn" id="btnBoss">挑戰 BOSS 👹<small>直接單挑暗黑魔王 · 沒有小怪干擾</small></button>
        <button class="mbtn" id="btnBattle">對戰（含 AI）<small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small></button>
        <button class="mbtn" id="btnOnline">線上配對<small>房號連線 · 等待室 · 朋友一起打</small></button>
        <button class="mbtn helpbtn" id="btnHelp">📖 遊戲說明<small>操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂</small></button>
        <button class="mbtn storebtn" id="btnStore">🛒 商店<small>隨從 1000 金幣 · 分享送金幣</small></button>
        <button class="mbtn acctbigbtn" id="btnAcctBig">👤 帳號登入<small>綁定帳號 · 雲端存檔 · 分享金幣</small></button>
        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
        <button class="mbtn quitbtn" id="btnQuit">🚪 離開遊戲<small>存好進度 · 關掉這個頁面</small></button>"""
new_menu = """        <button class="mbtn warm" id="btnSolo">單人闖關<small>32 張地圖 · 難易度／無限時間 · 第 32 關魔王</small></button>
        <button class="mbtn rpgbtn" id="btnRpg">🎲 RPG 模式<span class="betaTag">測試版 Beta</span><small>四維屬性 · 血量防禦 · 32 張地圖</small></button>
        <button class="mbtn bossbtn" id="btnBoss">挑戰 BOSS 👹<small>直接單挑暗黑魔王 · 沒有小怪干擾</small></button>
        <!-- v4.23：商店／帳號往上挪到 BOSS 後面（原本要滑到第四屏才看得到，很多人根本沒發現） -->
        <button class="mbtn storebtn" id="btnStore">🛒 商店<small>隨從 1000 金幣 · 分享送金幣</small></button>
        <button class="mbtn acctbigbtn" id="btnAcctBig">👤 帳號登入<small>綁定帳號 · 雲端存檔 · 分享金幣</small></button>
        <button class="mbtn" id="btnBattle">對戰（含 AI）<small>2～8 人混戰 · 可改名 · 沒人就 AI 補位</small></button>
        <button class="mbtn" id="btnOnline">線上配對<small>房號連線 · 等待室 · 朋友一起打</small></button>
        <button class="mbtn helpbtn" id="btnHelp">📖 遊戲說明<small>操作 · 道具 · 坐騎 · 場景 · 怪物一次看懂</small></button>
        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
        <button class="mbtn quitbtn" id="btnQuit">🚪 離開遊戲<small>存好進度 · 關掉這個頁面</small></button>"""
rep(old_menu, new_menu)

# 手機兩欄
rep("""    body.touch .menu .mbtn { font-size: 16.5px; padding: 11px 6px; border-radius: 13px; }
    body.touch .menu .mbtn small { font-size: 11px; margin-top: 1px; }""",
    """    body.touch .menu .mbtn { font-size: 16.5px; padding: 11px 6px; border-radius: 13px; }
    body.touch .menu .mbtn small { font-size: 11px; margin-top: 1px; }
    /* v4.23：手機選單改兩欄 —— 原本 10 顆一路排到第四屏，商店／帳號幾乎沒人找到。
       三個主模式（單人／RPG／BOSS）跨滿整列，其餘兩兩並排，一屏就看得完。 */
    body.touch .menu {
      display: grid; grid-template-columns: 1fr 1fr; gap: 9px; max-width: 560px;
    }
    body.touch .menu .mbtn { padding: 11px 8px; font-size: 15px; letter-spacing: .02em; }
    body.touch .menu .mbtn small { font-size: 10.5px; line-height: 1.45; }
    body.touch .menu .mbtn.warm,
    body.touch .menu .mbtn.rpgbtn,
    body.touch .menu .mbtn.bossbtn,
    body.touch .menu .mbtn.quitbtn { grid-column: 1 / -1; }
    body.touch .menu .mbtn.rpgbtn .betaTag { right: 6px; top: 5px; font-size: 9px; }""")

io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('patch B 完成')
