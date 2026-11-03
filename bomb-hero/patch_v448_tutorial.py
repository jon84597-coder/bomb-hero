# -*- coding: utf-8 -*-
# v4.48：新手教學（首頁導覽 ＋ 實戰演練 ＋ 功能總覽）
import io, sys

P = 'index.html'            # 產出
SRC = '_bak_v448_pre.html'  # 乾淨基線（可重複執行）
s = io.open(SRC, encoding='utf-8', newline='').read()
orig = s

def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:80])
    s = s.replace(old, new, 1)

# ==================================================================
# 1) CSS
# ==================================================================
CSS = '''
/* ===== v4.48 新手教學 ===== */
#btnLearn { background: linear-gradient(180deg, #2f7a52, #1e5236); border-color: #47a874; }
#btnLearn small { color: #b6e6c9; }
#btnLearn.newbie { animation: learnPulse 2.2s ease-in-out infinite; }
@keyframes learnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(120, 230, 170, .55); }
  50% { box-shadow: 0 0 0 10px rgba(120, 230, 170, 0); }
}
#learnTag { display: inline-block; margin-left: 6px; padding: 1px 7px; border-radius: 999px;
  background: #ffd166; color: #3a2a08; font-size: 10px; letter-spacing: 0; vertical-align: 2px; }
#learnTag.hide { display: none; }
.learn-card { max-width: 720px; margin: 0 auto; }
.lgo { display: block; width: 100%; padding: 15px; border-radius: 14px; border: 1px solid #47a874;
  background: linear-gradient(180deg, #3aa871, #22764b); color: #fff; font-family: inherit;
  font-weight: 900; font-size: 16px; letter-spacing: .05em; cursor: pointer; }
.lgo:active { transform: scale(.985); }
.lsub { text-align: center; color: #7d8db0; font-size: 11.5px; margin-top: 7px; line-height: 1.6; }
.lprog { display: flex; gap: 8px; margin: 12px 0 14px; flex-wrap: wrap; }
.lp { flex: 1 1 150px; display: flex; align-items: center; gap: 7px; background: #10182b;
  border: 1px solid #2a3a63; border-radius: 11px; padding: 9px 11px; cursor: pointer;
  font-size: 12.5px; font-weight: 800; color: #cfe0ff; font-family: inherit; text-align: left; }
.lp b { flex: 0 0 auto; width: 19px; height: 19px; border-radius: 50%; background: #2a3a63;
  color: #cfe0ff; font-size: 11px; display: inline-flex; align-items: center; justify-content: center; }
.lp i { margin-left: auto; font-style: normal; font-size: 11px; color: #7d8db0; font-weight: 700; }
.lp.ok { border-color: #47a874; }
.lp.ok b { background: #3aa871; color: #06240f; }
.lp.ok i { color: #8be0b0; }
.lch details { background: #10182b; border: 1px solid #25335a; border-radius: 12px;
  padding: 0 12px; margin-bottom: 7px; }
.lch summary { cursor: pointer; padding: 11px 2px; font-size: 13.5px; font-weight: 900;
  color: #e8eefc; list-style: none; }
.lch summary::-webkit-details-marker { display: none; }
.lch summary::after { content: '▾'; float: right; color: #7d8db0; }
.lch details[open] summary { color: #ffb066; }
.lch details[open] summary::after { content: '▴'; }
.lch ul { margin: 0 0 11px; padding-left: 17px; }
.lch li { font-size: 12.5px; line-height: 1.75; color: #b9c8e6; margin: 3px 0; }
.lch li b { color: #ffd166; }
/* 導覽：遮罩挖洞 */
#tutMask { position: fixed; inset: 0; z-index: 1250; display: none; }
#tutMask.on { display: block; }
#tutHole { position: absolute; border-radius: 12px; pointer-events: none;
  box-shadow: 0 0 0 9999px rgba(8, 12, 24, .74), 0 0 0 2px #ffd166, 0 0 26px rgba(255, 209, 102, .6);
  transition: left .18s ease, top .18s ease, width .18s ease, height .18s ease; }
#tutCard { position: fixed; left: 50%; transform: translateX(-50%);
  bottom: calc(14px + env(safe-area-inset-bottom, 0px)); width: min(94vw, 430px); z-index: 1260;
  background: linear-gradient(180deg, #1b2540, #111a2e); border: 1px solid #ffb066;
  border-radius: 16px; padding: 12px 14px 10px;
  box-shadow: 0 20px 44px -14px rgba(0, 0, 0, .9); color: #e8eefc; display: none; }
#tutCard.on { display: block; }
#tutCard.top { top: calc(12px + env(safe-area-inset-top, 0px)); bottom: auto; }
body.touch #tutCard { width: min(96vw, 430px); padding: 10px 12px 8px; }
/* 手機直放：卡片要讓開搖桿（#tpad 約 134px 高）與右下 💣 鍵 */
body.touch.in-game #tutCard { bottom: calc(152px + env(safe-area-inset-bottom, 0px)); }
body.touch.in-game #tutCard.top { top: calc(74px + env(safe-area-inset-top, 0px)); bottom: auto; }
@media (orientation: landscape) {
  body.touch.in-game #tutCard { bottom: calc(10px + env(safe-area-inset-bottom, 0px)); }
  body.touch.in-game #tutCard.top { top: calc(44px + env(safe-area-inset-top, 0px)); }
}
.tc-top { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: #ffd166; font-weight: 900; }
.tc-top .tc-step { margin-left: auto; color: #8fa2c8; font-weight: 800; }
.tc-x { background: none; border: 0; color: #8fa2c8; font-size: 15px; cursor: pointer; padding: 2px 4px; }
.tc-title { font-size: 15px; font-weight: 900; margin: 5px 0 3px; }
.tc-body { font-size: 12.5px; line-height: 1.68; color: #c3d1ec; }
.tc-body b { color: #ffd166; }
.tc-goal { margin-top: 7px; font-size: 11.5px; font-weight: 800; color: #8be0b0; display: none; }
.tc-goal.on { display: block; }
.tc-goal.done { color: #ffd166; }
.tc-btns { display: flex; gap: 8px; margin-top: 9px; }
.tc-btn { flex: 1 1 auto; padding: 9px 10px; border-radius: 10px; border: 1px solid #ffb066;
  background: #ff8a3d; color: #20130a; font-family: inherit; font-weight: 900; font-size: 12.5px; cursor: pointer; }
.tc-btn.ghost { flex: 0 0 auto; background: #10182b; border-color: #2a3a63; color: #93a6cc; }
.tc-dots { display: flex; gap: 4px; justify-content: center; margin-top: 8px; }
.tc-dots i { width: 5px; height: 5px; border-radius: 50%; background: #2f3d63; }
.tc-dots i.on { background: #ffd166; width: 14px; border-radius: 3px; }
#gameTop.tutglow { outline: 2px solid #ffd166; box-shadow: 0 0 20px rgba(255, 209, 102, .7); }
@media (orientation: portrait) {
  body.touch .menu .mbtn#btnLearn { grid-column: 1 / -1; }
}
'''
rep('\n</style>', CSS + '</style>')

# ==================================================================
# 2) 首頁按鈕
# ==================================================================
rep('''      <div class="menu">
        <button class="mbtn warm" id="btnSolo">''',
    '''      <div class="menu">
        <button class="mbtn" id="btnLearn"></button>
        <button class="mbtn warm" id="btnSolo">''')

# ==================================================================
# 3) 教學主頁（章節＋入口）
# ==================================================================
LEARN = '''  <!-- v4.48 tutorial hub (content built by Tut.fillUI) -->
  <div class="screen" id="scr-learn">
    <div class="card learn-card">
      <h2 id="learnTitle"></h2>
      <div class="desc" id="learnDesc"></div>
      <div class="learn-hero" style="margin:4px 0 10px">
        <button class="lgo" id="btnTourAll" type="button"></button>
        <div class="lsub" id="learnSub"></div>
      </div>
      <div class="lprog">
        <button class="lp" id="lpHome" type="button"><b>1</b><span id="lpH0"></span><i id="lpHomeS"></i></button>
        <button class="lp" id="lpPlay" type="button"><b>2</b><span id="lpP0"></span><i id="lpPlayS"></i></button>
      </div>
      <div class="lch" id="learnChapters"></div>
      <div class="rowbtns" style="margin-top:12px"><button class="ghostbtn" data-back="1">← 回主選單</button></div>
    </div>
  </div>

'''
rep('  <!-- 遊戲 -->\n', LEARN + '  <!-- 遊戲 -->\n')

# ==================================================================
# 4) 遮罩與說明卡（放在主 script 之前）
# ==================================================================
UI = '''<!-- v4.48 tutorial: spotlight mask + step card -->
<div id="tutMask" aria-hidden="true"><div id="tutHole"></div></div>
<div id="tutCard" role="dialog" aria-live="polite">
  <div class="tc-top"><span id="tutLead"></span><span class="tc-step" id="tutStep"></span><button class="tc-x" id="tutX" type="button" title="結束教學">✕</button></div>
  <div class="tc-title" id="tutTitle"></div>
  <div class="tc-body" id="tutBody"></div>
  <div class="tc-goal" id="tutGoal"></div>
  <div class="tc-btns"><button class="tc-btn ghost" id="tutPrev" type="button"></button><button class="tc-btn" id="tutNext" type="button"></button></div>
  <div class="tc-dots" id="tutDots"></div>
</div>

'''
rep('<script>\n  try {', UI + '<script>\n  try {')

# ==================================================================
# 5) JS 模組
# ==================================================================
JS = r'''
// ================================================================
//   v4.48：新手教學（首頁導覽 → 實戰演練 → 功能總覽）
//   · 首頁導覽：遮罩挖洞聚光燈，一步一步介紹每一顆按鈕
//   · 實戰演練：固定教學地圖，邊做邊學（移動／放彈／炸磚／撿道具／
//     踢彈／遙控／打怪／找門），每一步都能「跳過」，卡住不會卡死
//   · 功能總覽：八章可折疊圖鑑（操作、道具、機關、恐龍、BOSS、模式、商店、帳號）
//   全部資料驅動 —— 之後要調整文案只要改 HOME / PLAY / CH 三個陣列。
// ================================================================
const Tut = (function () {
  try {
    return (function () {
      const KEY = 'bombhero-tut2';
      let on = false, part = '', i = 0, goal = 0, baseN = 0, flags = {}, doneP = {}, advT = 0, pausedHide = false;
      try { doneP = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { doneP = {}; }

      // 進度一變就同步首頁／進度卡（完成後回首頁，按鈕的「推薦先玩」與副標要立刻消失）
      function saveDone() {
        try { localStorage.setItem(KEY, JSON.stringify(doneP)); } catch (e) {}
        try { syncTag(); } catch (e) {}
      }
      function isDone() { return !!(doneP.home && doneP.play); }
      function syncTag() {
        const tag = $id('learnTag'); if (tag) tag.classList.toggle('hide', isDone());
        const btn = $id('btnLearn'); if (btn) btn.classList.toggle('newbie', !isDone());
        if (btn) {
          const sub = btn.querySelector ? btn.querySelector('small') : null;
          if (sub) sub.textContent = isDone() ? '一步一步帶你玩 · 約 3 分鐘' : '第一次玩？先點這裡，3 分鐘帶你玩一輪';
        }
        const hs = $id('lpHomeS'), ps = $id('lpPlayS');
        if (hs) hs.textContent = doneP.home ? '✓ 已完成' : '未完成';
        if (ps) ps.textContent = doneP.play ? '✓ 已完成' : '未完成';
        const hw = $id('lpHome'), pw = $id('lpPlay');
        if (hw) hw.classList.toggle('ok', !!doneP.home);
        if (pw) pw.classList.toggle('ok', !!doneP.play);
      }

      /* ---------- 功能總覽（八章） ---------- */
      const CH = [
        ['🎮', '操作與介面', [
          '電腦：<b>WASD／方向鍵</b> 移動、<b>空白／Enter</b> 放炸彈、<b>E</b> 遙控引爆、<b>F</b> 恐龍吐火、<b>ESC</b> 暫停。',
          '手把：左搖桿移動、<b>A</b> 放彈、<b>X</b> 引爆、<b>Y</b> 吐火、<b>Start</b> 暫停。',
          '手機：左半邊滑動（或虛擬搖桿）移動，右下 <b>💣</b> 放彈；設定可換「操作區在左／右」「按鈕大小」「拖曳搖桿位置」。',
          '畫面快捷：<b>1／2</b> 縮放、<b>0</b> 還原；右上 <b>⋮</b> 裡有音樂、音效、語言、全視窗、下載 App、強制更新。'
        ]],
        ['💣', '炸彈與道具', [
          '炸彈放下後 <b>2.4 秒</b>爆炸，火焰是十字型；<b>🔥火力</b>決定長度（最多 10 格）、<b>💣彈量</b>決定能同時放幾顆（最多 8 顆）。',
          '道具藏在軟磚底下，走過去自動撿：🔥火力、💣彈量、🛼速度、❤️愛心、🥾踢彈、🧤搬彈、🥊打彈、📱遙控、🧨穿透、🧲線圈、💀骷髏。',
          '<b>🧤搬彈手套</b>：站在炸彈上按動作鍵撿起來，再按一次往面向的方向丟（可以丟過牆）。',
          '<b>📱遙控器</b>：炸彈不會自己爆，按 <b>E</b> 才炸，彈量順便 +1；<b>💀骷髏頭</b>是詛咒，撞別人傳出去就換他倒楣。',
          '畫面正上方 <b>🎒</b> 那格會顯示你目前有的裝備，吃到新道具會亮一下。'
        ]],
        ['🗺️', '場地與機關', [
          '<b>軟磚（木箱）</b>炸得開、<b>石牆</b>炸不開。出口門一定藏在軟磚底下，而且小怪全部清光才會開。',
          '<b>❄️冰面</b>會滑、<b>➡️輸送帶</b>推著你走（順行加速／逆行變慢）、<b>🌀傳送門</b>同色成對互相傳送。',
          '縮圈（激戰突死）會定時把安全範圍縮小，站在圈外會受傷，AI 也會往圈內躲。',
          '<b>🌿樹叢／🏚️破屋／🪨岩石／🏺陶罐／📦木箱</b>可以躲人：小怪與對手看不到你，但火焰照樣燒得到，炸一次就燒掉。'
        ]],
        ['🦖', '恐龍與蛋', [
          '炸軟磚偶爾會掉<b>恐龍蛋</b>，走上去孵出<b>綠龍</b>：多擋一次傷害，按 <b>F</b>（手機 🔥）往前吐火 2 格。',
          '再吃一顆蛋升級<b>紅龍</b>：四方向吐火，清場超快。',
          '恐龍被炸到會消失（有 0.7 秒無敵不會連續爆），想再騎就要再找蛋。'
        ]],
        ['👾', '敵人與 BOSS', [
          '8 大關各有專屬生態（每關 6 種小怪）：會追人、會穿牆飛、會吐元素彈。地上出現<b>落點圈</b>就先閃開。',
          '每 4 關一隻<b>章節王</b>，第 32 關是最終魔王。BOSS 會丟彈、會躲炸彈、有自己的地盤，靠近才會發怒。',
          '單人模式「碰到就死」；RPG 模式看<b>血量／護甲</b>，被打不會一下就倒。'
        ]],
        ['🏆', '五種模式', [
          '<b>單人闖關</b>：32 張地圖、8 大關，過關解鎖下一關，金幣帶回商店。',
          '<b>RPG 模式</b>：四維屬性、血量與護甲，適合喜歡養成的人。',
          '<b>挑戰 BOSS</b>：跳過前面，直接單挑最終魔王，練手感最快。',
          '<b>對戰（含 AI）</b>：2～8 人混戰，沒人會 AI 補位，可組隊；<b>線上配對</b>：用 4 位數房號跟朋友連線，空位 AI 補滿。'
        ]],
        ['🛒', '商店與金幣', [
          '過關拿金幣：<b>40 ＋ 每 4 關 +10</b>，再加上本關賺到的分數；陣亡也會保留本關金幣。',
          '隨從三種各 <b>1000</b> 金幣：⚔️刀客（近戰）、💣投彈（遠程支援）、🛡️格檔（幫你擋怪），只在單人／RPG 出場。',
          '分享到五個平台各送 <b>1000</b> 金幣（要登入正式帳號，每平台一次、每天最多 3 次）。'
        ]],
        ['👤', '帳號與其他', [
          '綁定帳號 → <b>雲端存檔</b>、換裝置續玩、分享金幣。遊客也能玩，只是進度只在這台裝置。',
          '右上 <b>📜 版本更新內容</b> 看每次改了什麼；卡在舊版按 <b>⋮ → 🔄 強制更新</b>。',
          '「下載 App」可以把遊戲加到手機主畫面，用全螢幕玩；有問題直接點 <b>✉️ 信箱</b> 回報。'
        ]]
      ];
      (function renderCh() {
        const box = $id('learnChapters'); if (!box) return;
        let h = '';
        for (let k = 0; k < CH.length; k++) {
          h += '<details><summary>' + CH[k][0] + ' ' + CH[k][1] + '</summary><ul>';
          for (let j = 0; j < CH[k][2].length; j++) h += '<li>' + CH[k][2][j] + '</li>';
          h += '</ul></details>';
        }
        box.innerHTML = h;
      })();

      /* ---------- 首頁導覽步驟 ---------- */
      const HOME = [
        { sel: '#playerName', t: '先取個名字', b: '這是你的<b>暱稱</b>，會用在對戰與排行。留空也可以，系統會自動取一個，之後在首頁都改得到。' },
        { sel: '#btnSolo', t: '① 單人闖關（主要玩法）', b: '32 張地圖、8 大關。進去先<b>選角色</b>→ 選難度與時間 → 出發。炸光小怪、炸開軟磚找到<b>出口門</b>就過關。' },
        { sel: '#btnRpg', t: '② RPG 模式', b: '多了<b>血量、護甲、四維屬性</b>，被打不會一下就死，適合喜歡慢慢養成的人。' },
        { sel: '#btnBoss', t: '③ 挑戰 BOSS', b: '跳過前面所有關卡，直接單挑<b>最終魔王</b>，沒有小怪干擾，練手感最快。' },
        { sel: '#btnStore', t: '④ 商店', b: '過關賺的<b>金幣</b>在這裡花：買隨從幫你打、看分享送金幣。' },
        { sel: '#btnAcctBig', t: '⑤ 帳號登入', b: '綁定後<b>雲端存檔</b>，換手機進度還在；分享金幣也需要正式帳號。' },
        { sel: '#btnBattle', t: '⑥ 對戰（含 AI）', b: '2～8 人混戰，可以改名、組隊；沒人加入時 <b>AI 自動補位</b>，一個人也能玩。' },
        { sel: '#btnOnline', t: '⑦ 線上配對', b: '用 <b>4 位數房號</b>跟朋友連線，等待室到齊就開打；沒滿的位子由 AI 補。' },
        { sel: '#btnHelp', t: '⑧ 遊戲說明', b: '道具、坐騎、場景、怪物圖鑑都在這裡，隨時可以回來查。' },
        { sel: '#btnSettings', t: '⑨ 設定', b: '地圖尺寸、鍵盤按鍵、手機搖桿位置與大小、音樂音效音量，全部在這裡調。' },
        { sel: '#btnQuit', t: '⑩ 離開遊戲', b: '會先幫你<b>存好進度</b>再關頁面，下次回來從原本的地方繼續。' },
        { sel: '#navBar', pad: 3, t: '右上角工具列', b: '🎵 音樂、🔊 音效、🌐 語言、⛶ 全視窗、📥 下載 App 都在右上。<b>手機</b>點 <b>⋮</b> 展開，遊戲中也可以隨時按。' },
        { sel: '#verLogBtn', t: '📜 版本更新內容', b: '每次改版都記在這裡，想知道新增什麼就點開看。' },
        { next: 'play', t: '導覽完成！', b: '介面都認識了。接下來進<b>實戰演練</b>：用一張練習地圖，帶你把移動、放炸彈、炸磚、撿道具、踢彈、遙控、打怪、找出口全部做一次。' }
      ];

      /* ---------- 實戰演練步驟 ---------- */
      const PLAY = [
        { key: 'move', mark: [2, 1], t: '① 走動', b: '用 <b>WASD／方向鍵</b>（手機：左邊搖桿或左半邊滑動）走到<b>發光格子</b>。走到就會自動進下一步。',
          cond: function (p) { return tileKey(p) === '2,1'; } },
        { key: 'bomb', on: 'bomb', need: '放 1 顆炸彈', t: '② 放炸彈', b: '按 <b>空白鍵／Enter</b>（手機：右下 <b>💣</b>）在腳下放一顆。<b>2.4 秒</b>後爆炸，火焰是十字型。',
          cond: function () { return goal >= 1; } },
        { key: 'safe', safe: 1, need: '爆炸一次（有跑開）', t: '③ 快跑！', b: '炸彈要爆了，快離開那條十字線！被炸到會<b>少一條命</b>（教學中不會真的出局）。',
          cond: function () { return !!flags.boom; } },
        { key: 'soft', on: 'soft', need: '炸開 1 塊軟磚', mark: [4, 1], t: '④ 炸開軟磚', b: '<b>木箱（軟磚）</b>後面藏著道具和出口。走到木箱旁邊放一顆炸彈，把它炸開。',
          cond: function () { return goal >= 1; } },
        { key: 'item', on: 'item', need: '撿 1 個道具', mark: [4, 1], t: '⑤ 撿道具', b: '軟磚破了會掉<b>道具</b>，走過去會自動撿起來（骷髏頭除外，那是詛咒）。',
          cond: function () { return goal >= 1; } },
        { key: 'hud', hud: 1, t: '⑥ 看狀態列', b: '畫面上方由左到右：<b>🗺️關卡 💰金幣 ❤️生命 🔥火力 💣彈量 🛼速度 🎒道具 ⏱️時間</b>。剛吃到火力，🔥 變成 2，火焰就多一格。' },
        { key: 'kick', on: 'kick', give: 'kick', need: '踢走 1 顆炸彈', t: '⑦ 踢炸彈', b: '先送你 <b>踢彈鞋 🥾</b>。在腳下放一顆炸彈 → 退開一格 → <b>朝炸彈走過去</b>就會把它踢出去。',
          cond: function () { return goal >= 1; } },
        { key: 'det', on: 'det', give: 'remote', need: '引爆 1 次', t: '⑧ 遙控引爆', b: '再送你 <b>遙控器 📱</b>：這種炸彈不會自己爆。放一顆 → 走遠一點 → 按 <b>E</b>（手機 <b>🧨</b>）引爆。',
          cond: function () { return goal >= 1; } },
        { key: 'kill', 'on': 'kill', spawn: [6, 3], need: '炸掉 1 隻小怪', mark: [6, 3], t: '⑨ 打小怪', b: '小怪碰到你就死。把自己當餌：先放彈再繞開，讓牠走進火焰。<b>一隻史萊姆</b>已經放出來了。',
          cond: function () { return goal >= 1; } },
        { key: 'door', markDoor: 1, need: '炸出出口門', t: '⑩ 找出口', b: '小怪清光，<b>出口門</b>才會開；門一定躲在<b>軟磚</b>底下。炸開發光的那一格。',
          cond: function () { return !!(Game.door && Game.door.revealed); } },
        { key: 'reach', markDoor: 1, need: '走進出口門', t: '⑪ 走進出口', b: '走進發光的門就過關。正式關卡就是一直重複：<b>炸磚 → 撿道具 → 打怪 → 找門</b>。',
          cond: function () { return !!flags.door; } },
        { key: 'end', end: 1, t: '🎉 你已經會玩了！', b: '移動、放彈、炸磚、撿道具、踢彈、遙控、打怪、找出口，全部做過一輪。道具與場景細節可以回主選單的<b>「🎓 新手教學 → 功能總覽」</b>慢慢看。' }
      ];

      function idxOf(key) { for (let k = 0; k < PLAY.length; k++) if (PLAY[k].key === key) return k; return 0; }
      function tileKey(p) { const T = Game.T || 1; return Math.floor(p.x / T) + ',' + Math.floor(p.y / T); }

      /* ---------- 卡片 ---------- */
      function closeCard() {
        const c = $id('tutCard'), m = $id('tutMask'), top = $id('gameTop');
        if (c) { c.classList.remove('on'); c.classList.remove('top'); }
        if (m) m.classList.remove('on');
        if (top) top.classList.remove('tutglow');
      }
      function paintCard(st, n) {
        const total = part === 'home' ? HOME.length : PLAY.length;
        $id('tutTitle').innerHTML = st.t;
        $id('tutBody').innerHTML = st.b;
        const g = $id('tutGoal');
        if (st.need) { g.className = 'tc-goal on'; g.innerHTML = '🎯 ' + st.need; }
        else { g.className = 'tc-goal'; g.innerHTML = ''; }
        $id('tutStep').textContent = (n + 1) + ' / ' + total;
        let d = '';
        for (let k = 0; k < total; k++) d += '<i' + (k === n ? ' class="on"' : '') + '></i>';
        $id('tutDots').innerHTML = d;
        const pv = $id('tutPrev'), nx = $id('tutNext');
        if (pv) {
          pv.style.display = (part === 'play' && n === 0 && !st.end) ? 'none' : '';
          pv.textContent = st.end ? '🏠 回主選單' : '← 上一步';
        }
        if (nx) nx.textContent = st.end ? '▶ 開始第 1 關'
          : (st.need ? '跳過這步 →' : (st.next === 'play' ? '接著實戰演練 →' : '下一步 →'));
        $id('tutCard').classList.add('on');
      }

      /* ---------- 首頁聚光燈 ---------- */
      function spot(sel, pad) {
        const el = document.querySelector(sel);
        const m = $id('tutMask'), h = $id('tutHole'), c = $id('tutCard');
        if (!el || !el.getBoundingClientRect) { if (m) m.classList.remove('on'); return; }
        try { el.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (e) {}
        const paint = function () {
          const r = el.getBoundingClientRect();
          const p = pad == null ? 7 : pad;
          h.style.left = (r.left - p) + 'px';
          h.style.top = (r.top - p) + 'px';
          h.style.width = Math.max(10, r.width + p * 2) + 'px';
          h.style.height = Math.max(10, r.height + p * 2) + 'px';
          m.classList.add('on');
          c.classList.toggle('top', r.top + r.height / 2 > (window.innerHeight || 640) * .56);
        };
        paint();
        const t0 = Date.now();
        const follow = function () {
          if (!on || part !== 'home') return;
          paint();
          if (Date.now() - t0 < 800) setTimeout(follow, 70);
        };
        setTimeout(follow, 90);
      }
      function showHome(n) {
        part = 'home'; i = n;
        const st = HOME[n];
        if (st.sel) spot(st.sel, st.pad); else { const m = $id('tutMask'); if (m) m.classList.remove('on'); }
        paintCard(st, n);
      }
      function startHome() {
        closeCard();
        try { if (Screen.current !== 'title') Screen.show('title'); } catch (e) {}
        on = true; part = 'home'; i = 0;
        const c = $id('tutCard'); if (c) c.classList.remove('top');
        showHome(0);
      }

      /* ---------- 實戰 ---------- */
      function buildMap() {
        const cols = 13, rows = 11;
        Game.cols = cols; Game.rows = rows; Game.T = tileSize();
        Game.ox = Math.floor((VIEW_W - Game.T * cols) / 2);
        Game.oy = Math.floor((VIEW_H - Game.T * rows) / 2);
        Game.camSnap = true;
        const g = [];
        for (let y = 0; y < rows; y++) {
          const row = [];
          for (let x = 0; x < cols; x++) row.push((x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 1 : 0);
          g.push(row);
        }
        [[7, 2], [7, 5], [3, 6], [9, 4], [6, 8], [10, 2], [2, 4]].forEach(function (c) { g[c[1]][c[0]] = 1; });
        [[4, 1], [4, 2], [4, 3], [8, 3], [6, 6], [7, 6], [5, 9], [10, 8], [1, 5], [2, 8], [9, 9], [11, 3], [5, 5], [8, 7]].forEach(function (c) { g[c[1]][c[0]] = 2; });
        Game.grid = g;
        Game.hazards = [];
        for (let y = 0; y < rows; y++) Game.hazards.push(new Array(cols).fill(null));
        Game.warps = []; Game.hidden = {};
        Game.hidden['1,4'] = 'fire';              // (x=4, y=1) 軟磚底下藏火力
        Game.door = { x: 10, y: 8, revealed: false, open: false };
        Game.hidden['8,10'] = 'door';             // 門藏在 (10,8) 軟磚下
        Game.doorHinted = true;   // 教學地圖不要跳「敵人清光了」提示
        Game.items = []; Game.bombs = []; Game.flames = []; Game.enemies = [];
        Game.pets = []; Game.eggs = []; Game.eggsHidden = []; Game.bolts = [];
        Game.particles = []; Game.bubbles = []; Game.pops = [];
        Game.edgeFx = 0; Game.shake = 0; Game.sdIndex = 0; Game.sdTimer = 0; Game.sdList = [];
        Game.endShown = false; Game.state = 'play'; Game.timer = Infinity;
        Game.stage = 1; Game.theme = THEMES[0];
        Game.mapInfo = { n: '新手教學', theme: 0 };
        Game.mode = 'solo'; Game.rpg = false; Game.bossRush = false;
        const p = Game.players[0];
        p.x = 1 * Game.T + Game.T / 2; p.y = 1 * Game.T + Game.T / 2;
        p.alive = true; p.dead = false; p.invuln = 0; p.lives = 3; p.score = 0;
        p.carry = null; p.slide = null; p.warpLock = ''; p.dino = false; p.redDragon = false;
        resetPlayerStats(p);
        paused = false;
      }
      function startPlay() {
        closeCard(); on = false;
        try {
          const scheme = settings.ctrl === 'auto' ? Input.schemes.auto
            : ctrlMode() === 'touch' ? Input.schemes.touch
            : ctrlMode() === 'pad' ? Input.schemes.pad(0) : Input.schemes.kb1;
          const p = makePlayer(0, settings.soloChar || 0, scheme, { px: 0, py: 0 });
          p.name = settings.playerName || '';
          Game.players = [p];
          Game.pets = [];
          Screen.show('game');
          resizeView();
          buildMap();
          updateHud();
          flags = {}; goal = 0;
          on = true; part = 'play';
          showPlay(0);
          try { AudioSys.startBGM(stageBGM(1)); } catch (e) {}
          try { enterImmersive(); } catch (e) {}
        } catch (e) {
          on = false; closeCard();
          try { toast('⚠️ 教學開不起來：' + ((e && e.message) || e), 3.6); } catch (e2) {}
          try { Screen.show('title'); } catch (e2) {}
        }
      }
      function showPlay(n) {
        if (n >= PLAY.length) n = PLAY.length - 1;
        i = n;
        const st = PLAY[n];
        goal = 0; baseN = 0;
        const top = $id('gameTop'); if (top) top.classList.remove('tutglow');
        if (st.hud && top) top.classList.add('tutglow');
        const p = Game.players && Game.players[0];
        if (st.give && p) {
          p[st.give] = true;
          try { toast('🎁 教學先送你：' + (st.give === 'kick' ? '踢彈鞋 🥾' : '遙控器 📱'), 2.6, 'gear'); } catch (e) {}
        }
        if (st.spawn) {
          try {
            const e = makeEnemy(st.spawn[0], st.spawn[1], 'slime', 1, .55);
            e.isSplit = true;    // 教學這隻不分裂，打死就是打死，免得新手被小史萊姆淹沒
            Game.enemies.push(e);
          } catch (e) {}
          baseN = Game.enemies.length;
        }
        paintCard(st, n);
        applyPos(st);
      }
      // 目標在上半部 → 卡片放下面；目標在下半部 → 卡片放上面（不要蓋住要看的格子）
      function applyPos(st) {
        const c = $id('tutCard');
        if (!c || !st) return;
        let ty = null;
        if (st.mark) ty = st.mark[1];
        else if (st.markDoor && Game.door) ty = Game.door.y;
        c.classList.toggle('top', ty !== null && ty >= (Game.rows || 11) / 2);
      }
      function advance(auto) {
        if (advT) return;
        advT = setTimeout(function () {
          advT = 0;
          if (!on || part !== 'play') return;
          showPlay(i + 1);
        }, auto ? 850 : 0);
      }
      function tick(dt) {
        if (!on || part !== 'play') return;
        // 跑去別的畫面（暫停選單→設定／回主選單）就把卡片收掉，不要浮在別頁上
        if (typeof Screen !== 'undefined' && Screen.current !== 'game') {
          on = false; part = ''; closeCard(); return;
        }
        const p = Game.players && Game.players[0];
        if (!p) return;
        // 暫停時把卡片藏起來（暫停選單要用），繼續後再畫回來
        if (typeof paused !== 'undefined' && paused) {
          if (!pausedHide) { pausedHide = true; closeCard(); }
          return;
        }
        if (pausedHide) {
          pausedHide = false;
          const st0 = PLAY[i];
          if (st0) { paintCard(st0, i); applyPos(st0); }
        }
        const st = PLAY[i];
        if (!st || st.end) return;
        if (flags.door && st.key !== 'reach') { showPlay(idxOf('reach')); return; }
        if (st.safe && Game.flames && Game.flames.length) {
          const T = Game.T || 1;
          const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
          let inF = false;
          for (let k = 0; k < Game.flames.length; k++) {
            if (Game.flames[k].cx === cx && Game.flames[k].cy === cy) { inF = true; break; }
          }
          if (!inF || !p.alive) flags.boom = 1;
        }
        if (st.cond && st.cond(p)) {
          if (st.need) {
            const g = $id('tutGoal');
            if (g) { g.className = 'tc-goal on done'; g.innerHTML = '✅ ' + st.need; }
          }
          advance(true);
        }
      }
      function glow() {
        if (!on || part !== 'play') return false;
        const st = PLAY[i];
        return !!(st && st.hud);
      }
      function hit(k) {
        if (!on || part !== 'play') return;
        const st = PLAY[i];
        if (st && st.on === k) goal++;
      }
      // 教學中不會真的出局：剩最後一條命時，這一擊不算
      function guard(p) {
        if (!on || part !== 'play') return false;
        if (!p || p !== (Game.players && Game.players[0])) return false;
        if ((p.lives | 0) > 1) return false;
        p.lives = 1; p.invuln = 2.2;
        try { toast('🛡️ 教學中不會真的出局（生命剩 1 條會補滿無敵）', 2.6, 'hp'); } catch (e) {}
        return true;
      }
      function onDoor() {
        if (!on || part !== 'play') return false;
        Game.state = 'play';
        flags.door = 1;
        return true;
      }
      function drawWorld(g) {
        if (!on || part !== 'play') return;
        const st = PLAY[i]; if (!st) return;
        const T = Game.T || 1;
        let cx = null, cy = null;
        if (st.mark) { cx = st.mark[0]; cy = st.mark[1]; }
        else if (st.markDoor && Game.door) { cx = Game.door.x; cy = Game.door.y; }
        if (cx === null) return;
        const px = cx * T + T / 2, py = cy * T + T / 2;
        const t = (Date.now() % 1100) / 1100;
        const r = T * (.44 + .09 * Math.sin(t * 6.283));
        g.save();
        g.beginPath(); g.arc(px, py, r, 0, 6.283);
        g.strokeStyle = 'rgba(255,209,102,.95)';
        g.lineWidth = Math.max(2, T * .07); g.stroke();
        g.beginPath(); g.arc(px, py, r + T * .13, 0, 6.283);
        g.strokeStyle = 'rgba(255,138,61,.5)';
        g.lineWidth = Math.max(1.4, T * .045); g.stroke();
        const ay = py - T * (.46 + .10 * Math.abs(Math.sin(t * 3.1416)));
        g.fillStyle = '#ffd166';
        g.beginPath();
        g.moveTo(px, ay + T * .30); g.lineTo(px - T * .17, ay); g.lineTo(px + T * .17, ay);
        g.closePath(); g.fill();
        g.restore();
      }

      /* ---------- 流程控制 ---------- */
      function endPlay(goStage) {
        doneP.play = 1; saveDone();
        on = false; closeCard();
        try { Game.state = 'idle'; paused = false; } catch (e) {}
        try {
          if (goStage) startSolo(1);
          else { AudioSys.startBGM('menu'); Screen.show('title'); }
        } catch (e) {}
      }
      function next() {
        try { AudioSys.sfx('click'); } catch (e) {}
        if (!on) return;
        if (part === 'home') {
          if (HOME[i].next === 'play') { doneP.home = 1; saveDone(); startPlay(); return; }
          if (i >= HOME.length - 1) { doneP.home = 1; saveDone(); closeAll(); return; }
          showHome(i + 1);
          return;
        }
        const st = PLAY[i];
        if (st.end) { endPlay(true); return; }
        showPlay(i + 1);
      }
      function prev() {
        try { AudioSys.sfx('click'); } catch (e) {}
        if (!on) return;
        if (part === 'home') { if (i > 0) showHome(i - 1); return; }
        const st = PLAY[i];
        if (st.end) { endPlay(false); return; }
        if (i > 0) showPlay(i - 1);
      }
      function closeAll() {
        const wasPlay = (part === 'play');
        on = false; closeCard();
        if (wasPlay) {
          try { Game.state = 'idle'; paused = false; Screen.show('title'); AudioSys.startBGM('menu'); } catch (e) {}
        }
        part = '';
      }

      /* ---------- 介面文字（集中在這裡，靜態 HTML 不放中文） ---------- */
      function fillUI() {
        const b = $id('btnLearn');
        if (b) b.innerHTML = '🎓 新手教學<span id="learnTag">推薦先玩</span><small>一步一步帶你玩 · 約 3 分鐘</small>';
        const t = $id('learnTitle'); if (t) t.textContent = '🎓 新手教學';
        const d = $id('learnDesc'); if (d) d.textContent = '第一次玩？照著做一輪就會了。想直接查功能，往下打開「功能總覽」。';
        const g = $id('btnTourAll'); if (g) g.textContent = '▶ 一步一步帶我玩（約 3 分鐘）';
        const s = $id('learnSub');
        if (s) s.innerHTML = '① 首頁導覽 → ② 實戰演練 → 直接進第 1 關<br>每一步都可以「跳過」，隨時關掉也沒關係';
        const h0 = $id('lpH0'); if (h0) h0.textContent = '介面導覽';
        const p0 = $id('lpP0'); if (p0) p0.textContent = '實戰演練';
        const lead = $id('tutLead'); if (lead) lead.textContent = '🎓 新手教學';
      }

      /* ---------- 接線 ---------- */
      (function wire() {
        fillUI();
        const b = $id('btnLearn');
        if (b) b.addEventListener('click', function () {
          try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
          syncTag(); Screen.show('learn');
        });
        const all = $id('btnTourAll');
        if (all) all.addEventListener('click', function () {
          try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
          startHome();
        });
        const h = $id('lpHome');
        if (h) h.addEventListener('click', function () { try { AudioSys.sfx('click'); } catch (e) {} startHome(); });
        const pl = $id('lpPlay');
        if (pl) pl.addEventListener('click', function () { try { AudioSys.sfx('click'); } catch (e) {} startPlay(); });
        const nx = $id('tutNext'), pv = $id('tutPrev'), x = $id('tutX');
        if (nx) nx.addEventListener('click', next);
        if (pv) pv.addEventListener('click', prev);
        if (x) x.addEventListener('click', function () { try { AudioSys.sfx('click'); } catch (e) {} closeAll(); });
        window.addEventListener('resize', function () {
          if (on && part === 'home') { const st = HOME[i]; if (st && st.sel) spot(st.sel, st.pad); }
        });
        syncTag();
      })();

      return {
        startHome: startHome, startPlay: startPlay, tick: tick, drawWorld: drawWorld,
        hit: hit, guard: guard, onDoor: onDoor, syncTag: syncTag, glow: glow,
        get on() { return on; }, get part() { return part; }, get step() { return i; },
        PLAY: PLAY, HOME: HOME, CH: CH, _next: next, _prev: prev, _close: closeAll
      };
    })();
  } catch (__e) {
    __bootFail('Tut', __e);
    const noop = function () {};
    return { startHome: noop, startPlay: noop, tick: noop, drawWorld: noop, hit: noop,
      guard: function () { return false; }, onDoor: function () { return false; }, syncTag: noop,
      glow: function () { return false; },
      on: false, part: '', step: 0, PLAY: [], HOME: [], CH: [] };
  }
})();

'''
rep("Screen.show('title');\n// 除錯參數", JS + "Screen.show('title');\n// 除錯參數")

# ==================================================================
# 6) 遊戲內掛鉤
# ==================================================================
rep('''  Game.bombs.push(b);
  AudioSys.sfx('place');
  return true;''',
    '''  Game.bombs.push(b);
  AudioSys.sfx('place');
  try { Tut.hit('bomb'); } catch (e) {}
  return true;''')

rep('''  const T = Game.T;
  burst(x * T + T / 2, y * T + T / 2, '#c98d4b', 8, 130);
}''',
    '''  const T = Game.T;
  burst(x * T + T / 2, y * T + T / 2, '#c98d4b', 8, 130);
  try { Tut.hit('soft'); } catch (e) {}
}''')

rep('''  burst(p.x, p.y, type === 'skull' ? '#b06ef7' : '#8ff0ff', 10, 130);
}''',
    '''  burst(p.x, p.y, type === 'skull' ? '#b06ef7' : '#8ff0ff', 10, 130);
  try { Tut.hit('item'); } catch (e) {}
}''')

rep('''  AudioSys.sfx('kick');
  return true;
}''',
    '''  AudioSys.sfx('kick');
  try { Tut.hit('kick'); } catch (e) {}
  return true;
}''')

rep("  if (n) AudioSys.sfx('click');\n  return n;",
    "  if (n) AudioSys.sfx('click');\n  try { Tut.hit('det'); } catch (e) {}\n  return n;")

# 擊殺計數（分裂怪也只算第一隻）
rep('''      Game.enemies.splice(i, 1);
      try { foeOnDeath(de); } catch (err) {}''',
    '''      Game.enemies.splice(i, 1);
      try { Tut.hit('kill'); } catch (err) {}
      try { foeOnDeath(de); } catch (err) {}''')

# 玩家走進出口：教學期間攔下來（不進結算）
rep('      if (cx === Game.door.x && cy === Game.door.y) {',
    '      if (cx === Game.door.x && cy === Game.door.y && !(typeof Tut !== \'undefined\' && Tut.onDoor())) {')

# 教學中不會真的出局
rep('function killPlayer(p, silent, killer) {',
    'function killPlayer(p, silent, killer) {\n  if (typeof Tut !== \'undefined\' && Tut.guard(p)) return;')

# 畫面上畫教學高亮
rep('''  ctx.globalAlpha = 1;
  // v4.5：邊緣紅光貼在畫布四周''',
    '''  ctx.globalAlpha = 1;
  try { Tut.drawWorld(ctx); } catch (e) {}
  // v4.5：邊緣紅光貼在畫布四周''')

# 主迴圈：教學計時
rep('''  Input.flush();
}
requestAnimationFrame(loop);''',
    '''  try { Tut.tick(dt); } catch (e) {}
  Input.flush();
}
requestAnimationFrame(loop);''')

# 暫停時也要跑一次 tick（把教學卡收起來，暫停選單才看得到）
rep('  if (paused) { Input.flush(); return; }',
    '  if (paused) { try { Tut.tick(0); } catch (e) {} Input.flush(); return; }')

# updateHud 每幀重設 className → 教學的狀態列光暈要一起寫進去
rep("""  const top = $id('gameTop');
  const battle = Game.mode === 'battle';
  top.className = 'game-top' + (battle ? ' battle' : '');""",
    """  const top = $id('gameTop');
  const battle = Game.mode === 'battle';
  top.className = 'game-top' + (battle ? ' battle' : '') +
    ((typeof Tut !== 'undefined' && Tut.glow && Tut.glow()) ? ' tutglow' : '');""")

# HUD 關卡名：教學時顯示「新手教學」
rep('''      '<i class="thn">' + themeName(thIdx) + '</i></div>' +''',
    '''      '<i class="thn">' + ((typeof Tut !== 'undefined' && Tut.on && Tut.part === 'play') ? '新手教學' : themeName(thIdx)) + '</i></div>' +''')

# 匯出
rep('  togglePause: togglePause, doorOpenFx: doorOpenFx, isPaused: function () { return paused; },',
    '  togglePause: togglePause, doorOpenFx: doorOpenFx, isPaused: function () { return paused; },\n  Tut: Tut,')

# ==================================================================
# 7) 版本
# ==================================================================
rep("const VERSION = '4.47';", "const VERSION = '4.48';")
rep('<span id="verLogVer">4.47</span>', '<span id="verLogVer">4.48</span>')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.47</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.48</span></div>')
rep("  { v: '4.47', date: '2026-11-03', now: true, items: [",
    """  { v: '4.48', date: '2026-11-03', now: true, items: [
    '首頁新增「🎓 新手教學」：一步一步帶新手認識所有功能，第一次玩也能自己上手',
    '介面導覽：聚光燈一格一格介紹單人／RPG／BOSS／商店／帳號／對戰／線上／說明／設定／離開與右上工具列',
    '實戰演練：專用練習地圖，邊做邊學移動、放炸彈、安全躲避、炸軟磚、撿道具、踢彈、遙控引爆、打小怪、找出口',
    '功能總覽：八章圖鑑（操作、炸彈道具、場地機關、恐龍、敵人與 BOSS、五種模式、商店金幣、帳號）',
    '教學中不會真的出局，每一步都能跳過；完成後直接接第 1 關，首頁按鈕會顯示「已完成」'
  ] },
  { v: '4.47', date: '2026-11-03', now: false, items: [""")

# ==================================================================
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK  chars %d (limit 3,350,000, left %d)' % (len(s), 3350000 - len(s)))
import os
print('    bytes %d (was %d, +%d)' % (os.path.getsize(P), os.path.getsize(P), len(s.encode('utf-8'))))
print('    bytes actual %d' % os.path.getsize(P))
