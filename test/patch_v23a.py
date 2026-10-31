# -*- coding: utf-8 -*-
# v2.3：1) 手機轉向修好  2) 遊戲內有返回鍵  3) 手機捲動一致  4) 直式可玩＋建議橫式提示
import io, sys

base = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero"
P = base + r"\index.html"
src = io.open(P, 'r', encoding='utf-8').read()
fails = []

def rep(old, new, name):
    global src
    if old not in src:
        fails.append(name); print('FAIL', name); return
    src = src.replace(old, new, 1)
    print('ok  ', name)

# ---------- 版本 ----------
rep("const VERSION = '2.2';", "const VERSION = '2.3';", 'VERSION')
rep('<span id="verTxt">2.2</span>', '<span id="verTxt">2.3</span>', 'verTxt')

# ---------- 1) 斜向被擋時「轉不過去」的根本原因 ----------
rep('''function tryMoveDiag(p, mx, my, dt, spd) {
  const T = Game.T;
  const sp = (spd || moveSpeed(p)) * dt * .7071;   // 斜走分量，總速度維持一致
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const bx = solidOrBomb(cx + mx, cy, p);
  const by = solidOrBomb(cx, cy + my, p);
  const bd = solidOrBomb(cx + mx, cy + my, p);
  if (bd || (bx && by)) {
    // 斜角過不去 → 沿著「沒被擋住」的那一軸滑（貼牆滑行的手感）
    if (bx && !by) tryMove(p, 0, my, dt);
    else if (by && !bx) tryMove(p, mx, 0, dt);
    return;
  }
  if (bx) { tryMove(p, 0, my, dt); return; }
  if (by) { tryMove(p, mx, 0, dt); return; }''',
'''// v2.3：pref = 'x' | 'y' —— 手指「推得比較多」的那一軸優先（轉彎時才不會卡死）
function tryMoveDiag(p, mx, my, dt, spd, pref) {
  const T = Game.T;
  const sp = (spd || moveSpeed(p)) * dt * .7071;   // 斜走分量，總速度維持一致
  const cx = Math.floor(p.x / T), cy = Math.floor(p.y / T);
  const bx = solidOrBomb(cx + mx, cy, p);
  const by = solidOrBomb(cx, cy + my, p);
  const bd = solidOrBomb(cx + mx, cy + my, p);
  // 先走主力軸、再走副軸（舊版在「斜角是牆、但兩軸都通」時會直接放棄 → 整個人卡住轉不過去）
  const order = pref === 'y' ? [[0, my], [mx, 0]] : [[mx, 0], [0, my]];
  if (bd || (bx && by)) {
    for (let i = 0; i < 2; i++) {
      const ax = order[i][0], ay = order[i][1];
      if (ax && !bx) { tryMove(p, ax, 0, dt, spd); return; }
      if (ay && !by) { tryMove(p, 0, ay, dt, spd); return; }
    }
    tryMove(p, order[0][0], order[0][1], dt, spd);   // 兩軸都堵：交給 tryMove 做貼牆／轉角滑行
    return;
  }
  if (bx) { tryMove(p, 0, my, dt, spd); return; }
  if (by) { tryMove(p, mx, 0, dt, spd); return; }''',
'tryMoveDiag 轉向')

rep('''    if (mx && my) tryMoveDiag(p, mx, my, dt);     // 斜向（45°）
    else if (mx || my) tryMove(p, mx, my, dt);''',
'''    if (mx && my) {
      // v2.3：斜推時以「推得比較用力」的那一軸為主力（手指稍微歪也轉得過去）
      let pref = null;
      const ts = Input.touchState || {};
      if (ts.ax || ts.ay) pref = Math.abs(ts.ax) >= Math.abs(ts.ay) ? 'x' : 'y';
      else pref = (dirs[0] === 'up' || dirs[0] === 'down') ? 'y' : 'x';
      tryMoveDiag(p, mx, my, dt, undefined, pref);   // 斜向（45°）
    }
    else if (mx || my) tryMove(p, mx, my, dt);''',
'controlHuman 主力軸')

# ---------- 2) 遊戲內（含 BOSS 討伐）也要有返回鍵 ----------
rep('  #navBar.inGame #btnBack { display: none; }',
'''  /* v2.3：遊戲中（含 BOSS 討伐）也要看得到「←」—— 點一下先暫停，就能回首頁／重新開始 */
  #navBar.inGame #btnBack { display: inline-flex; background: rgba(20,15,30,.72); }''',
'遊戲內返回鍵')

# ---------- 3) 手機捲動一致 ----------
rep('  body.touch { overscroll-behavior: none; padding: 0; }',
'''  /* v2.3：直式／橫式都改成「靠上對齊」—— 內容比螢幕高時，上半部才不會被裁掉拉不出來 */
  body.touch { overscroll-behavior: none; padding: 0; align-items: flex-start; }''',
'body.touch 靠上')

rep('''  body.touch .wrap:not(.game) {
    touch-action: pan-y; max-height: 100%; overflow-y: auto;
    -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;
  }''',
'''  body.touch .wrap:not(.game) {
    touch-action: pan-y; max-height: 100%; overflow-y: auto; min-height: 0;
    -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain;
    /* v2.3：子畫面自己也能滑（之前某些頁被內層容器吃掉，變成「有時候滑得動、有時候不行」） */
  }
  body.touch .screen, body.touch .screen.on { touch-action: pan-y; }
  body.touch .wrap:not(.game) .card { max-height: none; }''',
'選單捲動')

# ---------- 4) 直式：不再強制旋轉 90 度 ----------
rep('''  /* ===== 橫向滿版：手機直放時整個介面自動轉成橫向 ===== */
  /* 手機直放：整個介面旋轉 90 度變成橫向（用視窗實際尺寸，避免網址列造成裁切） */
  @media (orientation: portrait) {
    /* 只有「遊戲畫面」旋轉成橫向；選單／設定照手機原本的方向直放，
       這樣長表單可以用手指自然上下滑（旋轉過的容器在某些瀏覽器滑不動）。 */
    body.touch { align-items: flex-start; }
    body.touch .wrap.game {
      position: fixed; left: 50%; top: 50%;
      width: var(--vvh, 100vh); height: var(--vvw, 100vw);
      max-width: none; max-height: none; margin: 0; box-sizing: border-box;
      padding: 8px 14px; overflow-y: auto; overflow-x: hidden;
      transform: translate(-50%, -50%) rotate(90deg); transform-origin: center center;
      display: flex; flex-direction: column;
      touch-action: pan-y; -webkit-overflow-scrolling: touch;
    }''',
'''  /* ===== v2.3：手機直放不再強制轉橫向 —— 直式就能玩，橫式更好玩（開始時給提示） ===== */
  @media (orientation: portrait) {
    /* 遊戲畫面維持手機原本的直式方向；地圖下方留一列給搖桿／放彈鍵，不擋住畫面 */
    body.touch .wrap.game {
      width: 100%; height: 100%; margin: 0; box-sizing: border-box;
      padding: 4px 8px; overflow: hidden; display: flex; flex-direction: column;
    }''',
'移除強制旋轉')

# 直式控制列：把觸控鍵移到地圖下方的保留區
rep('''    body.touch .wrap.game { padding: 3px 6px; overflow: hidden; touch-action: none; }''',
'''    body.touch .wrap.game { padding: 3px 6px; overflow: hidden; touch-action: none; }
    /* v2.3 直式：地圖下方留 162px 給搖桿＋放彈鍵（畫布自己縮小，不再被按鈕壓住） */
    body.touch #stageWrap { padding-bottom: 162px; }
    body.touch #touchUI .tpad { bottom: 12px; }
    body.touch #touchUI .tact { bottom: 26px; }
    body.touch #touchUI .tdet, body.touch #touchUI .tfire { bottom: 128px; }''',
'直式控制列')

# ---------- 直式提示畫面 CSS ----------
rep('''  /* v2.0：全視窗開關（ON 時亮起來） */''',
'''  /* v2.3：直式開始遊戲 → 建議轉橫式的提示畫面 */
  .rothint {
    position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
    background: rgba(6,10,20,.78); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
  }
  .rothint .rhbox {
    width: min(88vw, 420px); text-align: center; padding: 22px 18px 18px;
    background: linear-gradient(180deg, #1b2440, #131a2e);
    border: 2px solid rgba(150,190,255,.34); border-radius: 18px;
    box-shadow: 0 18px 40px -18px rgba(0,0,0,.9);
  }
  .rothint .rhico { font-size: 48px; line-height: 1; animation: rh-rot 2.6s ease-in-out infinite; }
  @keyframes rh-rot {
    0%, 38% { transform: rotate(0deg); }
    58%, 100% { transform: rotate(90deg); }
  }
  @media (prefers-reduced-motion: reduce) { .rothint .rhico { animation: none; } }
  .rothint h3 { font-size: 22px; font-weight: 900; letter-spacing: .04em; margin: 8px 0 6px; }
  .rothint p { color: #9fb0d4; font-size: 13.5px; line-height: 1.95; margin-bottom: 15px; }
  .rothint p b { color: #ffd9b0; }
  .rothint .rhrow { display: flex; justify-content: center; }
  .rothint .mbtn { display: inline-block; width: auto; padding: 12px 26px; }
  /* v2.0：全視窗開關（ON 時亮起來） */''',
'提示畫面 CSS')

# ---------- 畫布尺寸：以 canvas 自己的 CSS 尺寸為準 ----------
rep('''  const w = Math.max(240, Math.round((wrapEl && wrapEl.clientWidth) || 720));
  const h = Math.max(150, Math.round((wrapEl && wrapEl.clientHeight) || 540));''',
'''  // v2.3：直式時 stageWrap 下方要留一列給搖桿 → 用 canvas 自己的 CSS 尺寸才不會算進 padding
  const cw = cv ? cv.clientWidth : 0, ch = cv ? cv.clientHeight : 0;
  const w = Math.max(240, Math.round(cw || (wrapEl && wrapEl.clientWidth) || 720));
  const h = Math.max(150, Math.round(ch || (wrapEl && wrapEl.clientHeight) || 540));''',
'畫布尺寸')

# ---------- 不再強制鎖橫向 ----------
rep('''  } catch (e) {}
  lockLandscape();
  setTimeout(resizeView, 260);
  setTimeout(resizeView, 900);
}''',
'''  } catch (e) {}
  // v2.3：不再強制鎖成橫向（讓玩家自己決定）→ 直式開始時給一張「建議轉橫式」提示
  setTimeout(resizeView, 260);
  setTimeout(resizeView, 900);
  setTimeout(showRotateHint, 140);
}''',
'取消鎖橫向')

rep('''      const pr = el.requestFullscreen({ navigationUI: 'hide' });
      if (pr && pr.then) pr.then(lockLandscape).catch(function () {});''',
'''      const pr = el.requestFullscreen({ navigationUI: 'hide' });
      if (pr && pr.then) pr.then(function () { resizeView(); }).catch(function () {});''',
'全視窗不鎖方向')

# ---------- 直式提示 JS ----------
rep('''function togglePause() {''',
'''// ================================================================
// v2.3：手機直式開始遊戲 → 提示「轉成橫式體驗更好」，玩家自己決定要不要轉
// ================================================================
let rotHintEl = null;
function phonePortrait() {
  try {
    if (!document.body || !document.body.classList.contains('touch')) return false;
    return window.innerHeight > window.innerWidth + 40;
  } catch (e) { return false; }
}
function hideRotateHint() {
  if (!rotHintEl) return;
  if (rotHintEl.parentNode) rotHintEl.parentNode.removeChild(rotHintEl);
  rotHintEl = null;
  paused = false;                 // 解除凍結，倒數／遊戲繼續
  try { resizeView(); } catch (e) {}
}
function showRotateHint() {
  if (Screen.current !== 'game') return;
  if (!phonePortrait() || rotHintEl) return;
  if (Game.state === 'over' || Game.state === 'idle' && !Game.rows) return;
  const host = $id('scr-game') || document.body;
  const el = document.createElement('div');
  el.className = 'rothint';
  el.setAttribute('id', 'rotHint');
  el.innerHTML = '<div class="rhbox">' +
    '<div class="rhico">\\u{1F4F1}</div>' +
    '<h3>橫著玩更過癮</h3>' +
    '<p>把手機轉成<b>橫式</b>，地圖更大、按鍵更好按。<br>' +
    '（不想轉也沒關係，直式一樣能玩）</p>' +
    '<div class="rhrow"><button class="mbtn warm" id="rhOk" type="button">\\u{1F4DD} 直式繼續玩</button></div>' +
    '</div>';
  host.appendChild(el);
  const ok = $id('rhOk');
  if (ok) ok.addEventListener('click', function (e) {
    if (e && e.cancelable) e.preventDefault();
    try { AudioSys.sfx('click'); } catch (err) {}
    hideRotateHint();
  });
  rotHintEl = el;
  paused = true;                  // 提示期間先凍住，免得一開始就挨打
}
// 轉成橫式就自動關掉提示
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { try { resizeView(); } catch (e) {} if (rotHintEl && !phonePortrait()) hideRotateHint(); }, 280);
  });
  window.addEventListener('resize', function () {
    if (rotHintEl && !phonePortrait()) hideRotateHint();
  });
}

function togglePause() {''',
'直式提示 JS')

# ---------- 匯出（測試用） ----------
rep('  togglePause: togglePause, doorOpenFx: doorOpenFx, isPaused: function () { return paused; },',
'''  togglePause: togglePause, doorOpenFx: doorOpenFx, isPaused: function () { return paused; },
  tryMoveDiag: tryMoveDiag, showRotateHint: showRotateHint, hideRotateHint: hideRotateHint,
  phonePortrait: phonePortrait, hasRotateHint: function () { return !!rotHintEl; },''',
'匯出')

if fails:
    print('共 %d 處失敗，不寫檔' % len(fails)); sys.exit(1)
io.open(P, 'w', encoding='utf-8', newline='\n').write(src)
print('bytes', len(src))
