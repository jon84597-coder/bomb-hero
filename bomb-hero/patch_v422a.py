# -*- coding: utf-8 -*-
"""v4.22 patch A：修好「首次觸控吞 click」＋手機工具列重排（帳號 44px / ⋮ 更多）
   ＋主選單加「帳號登入」大按鈕＋橫向提示記住玩家選擇。"""
import io, re, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read().replace('\r\n', '\n')
orig = s

def rep(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '[%s] 找到 %d 次（要 1 次）' % (tag, n)
    s = s.replace(old, new)
    print('ok  ' + tag)

# ---------------------------------------------------------------- R1
# 真兇：body.touch 把 padding 從 14px 改成 0 → 第一次觸控加上 touch class 時
# 整頁往上跳 14px，手指底下的按鈕跟著移走 → click 合成不出來。
rep(
"  body.touch { overscroll-behavior: none; padding: 0; align-items: flex-start; }\n",
"""  /* v4.22：padding 不可以從 body 的 14px 變成 0 —— 第一次觸控加上 .touch 時
     整頁會往上跳 14px，手指底下的按鈕跟著移走，click 就合成不出來
     （「商店／帳號第一次點沒反應」的真兇）。 */
  body.touch { overscroll-behavior: none; align-items: flex-start; }
""", 'R1 body.touch padding')

# ---------------------------------------------------------------- R2 CSS
rep(
"  .navbtn.tg.off { background: rgba(24,18,32,.7); color: #7d7790; border-color: rgba(120,110,140,.55); }\n",
"""  .navbtn.tg.off { background: rgba(24,18,32,.7); color: #7d7790; border-color: rgba(120,110,140,.55); }
  /* ===== v4.22：手機工具列重排 =====
     手機上只留「👤 帳號」＋「⋮ 更多」，其餘收進選單，每顆都做滿 44px 才好按。
     （原本 8 顆 icon 擠成 32~39px，手指根本點不準 → 玩家以為「帳號登入進不去」） */
  .navmore { display: contents; }
  #btnMore { display: none; }
  @media (max-width: 560px) {
    #navBar { padding-left: 8px; padding-right: 8px; gap: 6px; }
    #navBar .navright { gap: 6px; }
    #acctChip { min-height: 44px; padding: 0 14px; font-size: 15px; gap: 5px; }
    #btnMore {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 44px; min-height: 44px; padding: 0; font-size: 21px; line-height: 1;
    }
    .navmore {
      display: none; position: absolute; right: 6px; top: calc(100% + 6px);
      flex-direction: column; align-items: stretch; gap: 6px; padding: 8px;
      min-width: 178px; background: rgba(18,14,28,.97);
      border: 1.5px solid rgba(255,180,120,.5); border-radius: 16px;
      box-shadow: 0 18px 36px -16px rgba(0,0,0,.92);
      max-height: 68vh; overflow-y: auto; z-index: 1300;
    }
    .navmore.on { display: flex; }
    .navmore .navbtn {
      width: 100%; justify-content: flex-start; min-height: 44px;
      font-size: 15px; padding: 0 14px; box-sizing: border-box;
    }
    .navmore .navbtn b { display: inline; }
  }
""", 'R2 手機工具列 CSS')

# ---------------------------------------------------------------- R3 navBar HTML
nav_old = '''  <div class="navright">
    <!-- v4.1：常駐帳號膠囊（遊客也能直接玩；點一下開綁定視窗） -->
    <button class="navbtn acct guest" id="acctChip" type="button" title="帳號 · 綁定">
      <span class="dot"></span>👤 <b id="acctName">綁定帳號</b>
    </button>
    <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">🎵 <b>音樂</b></button>
    <button class="navbtn tg" id="btnLang" type="button" title="切換顯示語言">🌐 <b>語言</b></button>
    <div id="langMenu" class="hide"><div class="lmtitle" id="langMenuTitle">語言</div><div id="langList"></div></div>
    <button class="navbtn tg on" id="btnSfx" type="button" title="開關遊戲音效">🔊 <b>音效</b></button>
    <button class="navbtn tg" id="btnFull" type="button" title="全視窗 開／關">⛶ <b>全視窗</b></button>
    <a class="navbtn mail" id="btnMail" href="mailto:jon84597@gmail.com?subject=%E7%88%86%E7%88%86%E8%8B%B1%E9%9B%84%20BOMB%20HERO%20%E6%84%8F%E8%A6%8B%E5%9B%9E%E9%A5%8B"
       title="寫信給作者：jon84597@gmail.com">✉️ <b>信箱</b></a>
    <!-- v4.6：PWA 加入桌面捷徑（只在首頁顯示；已經用捷徑開啟時自動隱藏） -->
    <button class="navbtn pwa" id="btnInstall" type="button" title="加入桌面捷徑">
      <span class="pwico" aria-hidden="true"></span><b>下載 App</b>
    </button>
  </div>
'''
nav_new = '''  <div class="navright">
    <!-- v4.1：常駐帳號膠囊（遊客也能直接玩；點一下開綁定視窗） -->
    <button class="navbtn acct guest" id="acctChip" type="button" title="帳號 · 綁定">
      <span class="dot"></span>👤 <b id="acctName">綁定帳號</b>
    </button>
    <!-- v4.22：手機把其餘工具收進「⋮」，帳號才不會擠成 35px 點不到 -->
    <button class="navbtn more" id="btnMore" type="button" aria-haspopup="true" aria-expanded="false" title="更多設定">⋮</button>
    <div class="navmore" id="navMore">
      <button class="navbtn tg on" id="btnMusic" type="button" title="開關主音樂">🎵 <b>音樂</b></button>
      <button class="navbtn tg" id="btnLang" type="button" title="切換顯示語言">🌐 <b>語言</b></button>
      <button class="navbtn tg on" id="btnSfx" type="button" title="開關遊戲音效">🔊 <b>音效</b></button>
      <button class="navbtn tg" id="btnFull" type="button" title="全視窗 開／關">⛶ <b>全視窗</b></button>
      <a class="navbtn mail" id="btnMail" href="mailto:jon84597@gmail.com?subject=%E7%88%86%E7%88%86%E8%8B%B1%E9%9B%84%20BOMB%20HERO%20%E6%84%8F%E8%A6%8B%E5%9B%9E%E9%A5%8B"
         title="寫信給作者：jon84597@gmail.com">✉️ <b>信箱</b></a>
      <!-- v4.6：PWA 加入桌面捷徑（只在首頁顯示；已經用捷徑開啟時自動隱藏） -->
      <button class="navbtn pwa" id="btnInstall" type="button" title="加入桌面捷徑">
        <span class="pwico" aria-hidden="true"></span><b>下載 App</b>
      </button>
    </div>
    <div id="langMenu" class="hide"><div class="lmtitle" id="langMenuTitle">語言</div><div id="langList"></div></div>
  </div>
'''
rep(nav_old, nav_new, 'R3 navBar HTML')

# ---------------------------------------------------------------- R4 主選單帳號大按鈕
rep(
'        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>\n',
'''        <button class="mbtn acctbigbtn" id="btnAcctBig">👤 帳號登入<small>綁定帳號 · 雲端存檔 · 分享金幣</small></button>
        <button class="mbtn" id="btnSettings">設定<small>地圖尺寸 · 控制方式 · 音量</small></button>
''', 'R4 主選單帳號大按鈕')

# ---------------------------------------------------------------- R5 大按鈕樣式
rep(
"  .navbtn.acct { pointer-events: auto; }\n",
"""  .navbtn.acct { pointer-events: auto; }
  /* v4.22：主選單的「帳號登入」大按鈕（首頁就看得見，不用找右上角小圖示） */
  .mbtn.acctbigbtn { border-color: rgba(120,190,255,.72); background: linear-gradient(180deg, #1b3357, #142744); }
  .mbtn.acctbigbtn small { color: #9dc4f2; }
""", 'R5 帳號大按鈕樣式')

# ---------------------------------------------------------------- R6 JS 初始化
rep(
"""document.addEventListener('touchend', function () { dsEl = null; dsLast = null; }, { passive: true, capture: true });

Screen.show('title');
""",
"""document.addEventListener('touchend', function () { dsEl = null; dsLast = null; }, { passive: true, capture: true });

/* ---------- v4.22：手機「⋮ 更多」選單 ＋ 主選單帳號大按鈕 ---------- */
(function () {
  const more = $id('btnMore'), box = $id('navMore');
  function setMore(on) {
    if (!box) return;
    box.classList.toggle('on', !!on);
    if (more) more.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  if (more && box) {
    more.addEventListener('click', function (e) {
      if (e && e.cancelable) e.preventDefault();
      try { AudioSys.sfx('click'); } catch (err) {}
      setMore(!box.classList.contains('on'));
    });
    // 點選單以外的地方就收起來（用 capture 先收到，才能判斷是否在選單內）
    document.addEventListener('pointerdown', function (e) {
      if (!box.classList.contains('on')) return;
      if (box.contains(e.target) || (more && more.contains(e.target))) return;
      setMore(false);
    }, true);
    // 選了任何一項就收
    box.addEventListener('click', function (e) {
      const b = e.target && e.target.closest ? e.target.closest('.navbtn') : null;
      if (b) setTimeout(function () { setMore(false); }, 120);
    });
  }
  // 任何畫面切換都收掉，避免蓋住內容
  if (typeof Screen !== 'undefined' && Screen.apply) {
    const oldApply = Screen.apply;
    Screen.apply = function () {
      setMore(false);
      return oldApply.apply(this, arguments);
    };
  }
  window.hideMoreMenu = function () { setMore(false); };

  const big = $id('btnAcctBig');
  if (big) {
    big.addEventListener('click', function () {
      try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (err) {}
      try {
        if (typeof Cloud !== 'undefined' && Cloud.open) Cloud.open();
        else toast('⚠️ 帳號功能還沒準備好，稍後再試', 3);
      } catch (err) {
        try { toast('⚠️ 帳號視窗打不開：' + ((err && err.message) || err), 3.4); } catch (e2) {}
      }
    });
  }
})();

Screen.show('title');
""", 'R6 JS 初始化')

# ---------------------------------------------------------------- R7 橫向提示記住選擇
rep(
"""let rotHintEl = null;
function phonePortrait() {""",
"""let rotHintEl = null;
/* v4.22：玩家點過一次「直式繼續玩」就不要再攔他（原本每次進 BOSS 都被擋一張卡，
   玩家會以為「BOSS 挑戰進不去」）。設定頁可以重置。 */
const ROT_SKIP_KEY = 'bombhero-rotskip';
function rotSkipped() {
  try { return localStorage.getItem(ROT_SKIP_KEY) === '1'; } catch (e) { return false; }
}
function setRotSkip(v) {
  try { if (v) localStorage.setItem(ROT_SKIP_KEY, '1'); else localStorage.removeItem(ROT_SKIP_KEY); } catch (e) {}
}
function phonePortrait() {""", 'R7a rotSkip 工具')

rep(
"""function showRotateHint() {
  if (Screen.current !== 'game') return;
  if (!phonePortrait() || rotHintEl) return;""",
"""function showRotateHint() {
  if (Screen.current !== 'game') return;
  if (rotSkipped()) return;                 // v4.22：玩家選過「直式繼續玩」就不再擋
  if (!phonePortrait() || rotHintEl) return;""", 'R7b showRotateHint')

rep(
"""  const ok = $id('rhOk');
  if (ok) ok.addEventListener('click', function (e) {
    if (e && e.cancelable) e.preventDefault();
    try { AudioSys.sfx('click'); } catch (err) {}
    hideRotateHint();
  });
  rotHintEl = el;""",
"""  const ok = $id('rhOk');
  if (ok) ok.addEventListener('click', function (e) {
    if (e && e.cancelable) e.preventDefault();
    try { AudioSys.sfx('click'); } catch (err) {}
    setRotSkip(true);                       // v4.22：記住選擇，下次直接開始
    hideRotateHint();
  });
  // v4.22：點卡片外面的黑底也能關（以前只能點按鈕，手指偏一點就卡住）
  el.addEventListener('click', function (e) {
    if (e.target !== el) return;
    setRotSkip(true);
    hideRotateHint();
  });
  rotHintEl = el;""", 'R7c rhOk 記住')

assert s != orig
io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('寫回 index.html（CRLF）')
