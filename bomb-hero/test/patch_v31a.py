# -*- coding: utf-8 -*-
# v3.1：① 獲獎跳跳人物縮小（不再蓋住「再來一場／回主選單」）
#        ② 右上角「下一步」快捷鈕 #ctaBar（單人／對戰／線上設定頁，免滑到底就找得到下一步）
import io, sys
PATH = 'index.html'
src = io.open(PATH, encoding='utf-8').read()

def rep(old, new, n=1):
    global src
    if src.count(old) != n:
        print('FAIL(%d): %s' % (src.count(old), old[:80].replace('\n', '\\n')))
        sys.exit(1)
    src = src.replace(old, new, n)

# ---------- 1) 版本號 ----------
rep("const VERSION = '3.0';", "const VERSION = '3.1';")
rep('<div class="ver beta">測試版 v<span id="verTxt">3.0</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">3.1</span></div>')

# ---------- 2) CSS：winJumpCv 縮小 + ctaBar ----------
rep("""  .ov-box .mbtn { display: inline-block; width: auto; padding: 11px 30px; }""",
    """  .ov-box .mbtn { display: inline-block; width: auto; padding: 11px 30px; }
  /* v3.1：獲獎跳跳人物固定大小（原本被全域 canvas{width:100%} 撐爆 → 蓋住下面的「再來一場／回主選單」） */
  #winJumpCv {
    width: auto; height: auto;
    max-width: min(38vw, 190px); max-height: 30vh;
    border-radius: 0; background: transparent;
  }
  /* ================================================================
     v3.1：右上角「下一步」快捷鈕 —— 單人闖關／對戰／線上配對的設定頁，
     把「開始遊戲／開戰！／快速配對」複製一份釘在右上（原本要拖到最下面才找得到），
     點了等於按下面那顆大按鈕；文字與主按鈕永遠同步（含語言切換）。
     ================================================================ */
  #ctaBar { position: fixed; z-index: 950; right: 10px; top: calc(54px + env(safe-area-inset-top, 0px)); }
  #ctaBar.hide { display: none; }
  .ctabtn {
    display: flex; flex-direction: column; align-items: center; gap: 1px;
    font-family: inherit; cursor: pointer; text-align: center;
    background: linear-gradient(180deg, #ffa161, #f26b38); border: 2px solid #ffc59b; color: #fff;
    text-shadow: 0 2px 0 rgba(160, 60, 20, .45); border-radius: 15px;
    padding: 9px 20px 10px; letter-spacing: .05em;
    font-size: clamp(15px, 1.6vw, 20px); font-weight: 900;
    box-shadow: 0 4px 0 #c9502a, 0 16px 26px -12px rgba(220, 90, 50, .6), inset 0 2px 0 rgba(255, 255, 255, .45);
    animation: ctaPulse 1.6s ease-in-out infinite;
  }
  .ctabtn:active { transform: translateY(2px); box-shadow: 0 2px 0 #c9502a; }
  .ctabtn small { font-size: .62em; font-weight: 800; color: #ffe6d2; letter-spacing: .03em; }
  @keyframes ctaPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
  @media (max-width: 899px) {
    #ctaBar { right: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); }
    .ctabtn { font-size: 13.5px; padding: 7px 14px 8px; border-radius: 12px; }
  }
  @media (prefers-reduced-motion: reduce) { .ctabtn { animation: none; } }""")

# ---------- 3) HTML：navBar 之後插入 ctaBar ----------
rep("""<div class="wrap">

  <!-- 標題 -->""",
    """<!-- v3.1：右上角「下一步」快捷鈕（單人／對戰／線上設定頁顯示） -->
<div id="ctaBar" class="hide"><button class="ctabtn" id="ctaBtn" type="button"></button></div>

<div class="wrap">

  <!-- 標題 -->""")

# ---------- 4) showEnd：拿掉 inline max-width:100%（會蓋掉新的 #winJumpCv 尺寸） ----------
rep("'<canvas id=\"winJumpCv\" width=\"170\" height=\"168\" style=\"display:none;margin:2px auto 4px;max-width:100%\"></canvas>' +",
    "'<canvas id=\"winJumpCv\" width=\"170\" height=\"168\" style=\"display:none;margin:2px auto 4px\"></canvas>' +")

# ---------- 5) JS：updateCta / ctaTargets / initCta（放在 v3.0 公告欄常數前） ----------
rep("""/* ---- v3.0：作者公告欄（作者的話 + FB 連結） ---- */
const ANN_STORE = 'bombhero.ann.min';""",
    """/* ---- v3.1：右上角「下一步」快捷鈕 ---- */
function ctaTargets() {
  const cur = Screen.current;
  if (cur === 'solo') {
    const go = $id('btnSoloGo');
    if (!go) return null;
    if (go.classList.contains('locked') || go.disabled) return null;   // 還沒解鎖 → 不誤導
    const tx = $id('soloGoTxt'), sub = $id('soloGoSub');
    return { btn: go, txt: tx ? tx.textContent : '', sub: sub ? sub.textContent : '' };
  }
  if (cur === 'battle') {
    const b = $id('btnStartBattle');
    return b ? { btn: b, txt: b.textContent || '', sub: '' } : null;
  }
  if (cur === 'online') {
    const room = $id('netRoom');
    if (room && room.style.display === 'grid') {          // 已在等待室
      const st = $id('btnNetStart');
      if (st && st.style.display !== 'none') return { btn: st, txt: st.textContent || '', sub: '' };
      return null;                                        // 訪客等房主 → 不用快捷鈕
    }
    const q = $id('btnNetQuick');
    return q ? { btn: q, txt: q.textContent || '', sub: '' } : null;   // 大廳 → 快速配對最快
  }
  return null;
}
function updateCta() {
  const bar = $id('ctaBar'), b = $id('ctaBtn');
  if (!bar || !b) return;
  const tg = (Screen.current === 'game') ? null : ctaTargets();
  if (!tg || !tg.txt) { bar.classList.add('hide'); return; }
  b.innerHTML = '<span class="cta-t"></span>' + (tg.sub ? '<small></small>' : '');
  b.querySelector('.cta-t').textContent = tg.txt;
  if (tg.sub) b.querySelector('small').textContent = tg.sub;
  bar.classList.remove('hide');
}
function initCta() {
  const b = $id('ctaBtn');
  if (b && typeof b.addEventListener === 'function') {
    b.addEventListener('click', function () {
      const tg = ctaTargets();
      if (!tg) return;
      try { AudioSys.ensure(); AudioSys.sfx('click'); } catch (e) {}
      if (tg.btn && typeof tg.btn.click === 'function') tg.btn.click();
    });
  }
  try { if (typeof refreshers !== 'undefined' && refreshers.push) refreshers.push(updateCta); } catch (e) {}
  updateCta();
}

/* ---- v3.0：作者公告欄（作者的話 + FB 連結） ---- */
const ANN_STORE = 'bombhero.ann.min';""")

# initCta() 呼叫（跟 initAnn 同一個啟動 IIFE）
rep("""  updateLangBtn();
  // v3.0：作者公告欄（左上角）—— PC 寬螢幕預設展開，手機／窄螢幕收起，點標題開合
  initAnn();""",
    """  updateLangBtn();
  // v3.0：作者公告欄（左上角）—— PC 寬螢幕預設展開，手機／窄螢幕收起，點標題開合
  initAnn();
  // v3.1：右上角「下一步」快捷鈕
  initCta();""")

# 語言切換後同步快捷鈕文字
rep("""  try { if (typeof applyCtrl === 'function') applyCtrl(); } catch (e) {}""",
    """  try { if (typeof applyCtrl === 'function') applyCtrl(); } catch (e) {}
  try { if (typeof updateCta === 'function') updateCta(); } catch (e) {}""")

# Solo.renderGo 包一層：選關／解鎖變化時同步快捷鈕
rep("""    Solo.renderGo();
  }
};

// ---------- 選角預覽""",
    """    Solo.renderGo();
  }
};

// v3.1：選關變化 → 右上角快捷鈕文字同步
(function () {
  const rg = Solo.renderGo;
  Solo.renderGo = function () {
    const r = rg.apply(this, arguments);
    try { updateCta(); } catch (e) {}
    return r;
  };
})();

// ---------- 選角預覽""")

# Net 進房／離房 → 快捷鈕切換（等待室房主＝開始遊戲；大廳＝快速配對）
rep("""    if (st) st.style.display = Net.role === 'host' ? '' : 'none';
    Net.renderRoster();
    Net.renderCountSeg();
  },""",
    """    if (st) st.style.display = Net.role === 'host' ? '' : 'none';
    Net.renderRoster();
    Net.renderCountSeg();
    try { updateCta(); } catch (e) {}
  },""")
rep("""    const entry = $id('netEntry'); if (entry) entry.style.display = '';
    const room = $id('netRoom'); if (room) room.style.display = 'none';""",
    """    const entry = $id('netEntry'); if (entry) entry.style.display = '';
    const room = $id('netRoom'); if (room) room.style.display = 'none';
    try { updateCta(); } catch (e) {}""")

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(src)
print('v3.1 OK')
