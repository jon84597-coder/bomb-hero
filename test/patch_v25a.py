# -*- coding: utf-8 -*-
"""v2.5：
1) 手機橫放：首頁／單人／對戰／線上／設定 全部重排（一屏放得下）＋拖曳捲動兜底
2) 遊戲畫面：整張地圖都要看得到（手機），不再只看到局部
"""
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
n = 0


def rep(old, new, label=''):
    global s, n
    if old not in s:
        print('  !! NOT FOUND:', label or old[:70].replace('\n', '\\n'))
        sys.exit(1)
    s = s.replace(old, new, 1)
    n += 1
    print('  ok:', label or old[:60].replace('\n', '\\n'))


# ---------- 1a. 手機橫式版面（插在直式 media query 後面） ----------
rep("""  /* ===== 寬螢幕：選單／設定改橫向多欄，充分利用橫向空間 ===== */""",
    """  /* ===== v2.5：手機橫放 —— 首頁／單人／對戰／線上／設定全部重排（一屏放得下） =====
     直式的緊湊規則只寫在 portrait 裡，橫放時會套回桌機大按鈕 → 版面爆掉。
     這裡用「orientation: landscape + body.touch」重新安排，並保留上下捲動。 ===== */
  @media (orientation: landscape) {
    /* 外框：上方讓開工具列，內容一律可以上下拖曳 */
    body.touch .wrap:not(.game) {
      padding: calc(46px + env(safe-area-inset-top, 0px)) 14px calc(10px + env(safe-area-inset-bottom, 0px));
      max-width: min(920px, 97vw);
      max-height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch;
      touch-action: pan-y; overscroll-behavior-y: contain;
    }
    /* 首頁：標題壓扁、選單 3 欄 → 整頁一屏放得下（不必捲也看得到全部項目） */
    body.touch #scr-title.on { display: flex; flex-direction: column; justify-content: center; min-height: 0; }
    body.touch #scr-title .title-card {
      padding: 2px 8px 4px; min-height: 0; flex: 0 0 auto;
      display: flex; flex-direction: column; justify-content: center;
    }
    body.touch .title-card .title-logo { width: clamp(100px, 34vh, 185px); }
    body.touch .title-card .sub { display: none; }
    body.touch #scr-title .ver.beta { font-size: 9px; margin-top: 2px; }
    body.touch #scr-title .gap24 { height: 4px !important; }
    body.touch #scr-title .hint { display: none; }
    body.touch #scr-title .menu {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px 9px;
      max-width: none; width: 100%; margin: 5px 0 0;
    }
    body.touch #scr-title .menu .mbtn { font-size: 14.5px; padding: 9px 8px; border-radius: 12px; }
    body.touch #scr-title .menu .mbtn small { font-size: 10px; margin-top: 1px; }
    /* 其他選單頁：卡片改兩欄（同 PC 寬版排版），緊湊但不擠 */
    body.touch #scr-solo .card, body.touch #scr-battle .card,
    body.touch #scr-settings .card, body.touch #scr-online .card {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; align-items: start;
      padding: 9px 15px 11px;
    }
    body.touch #scr-solo .card > h2, body.touch #scr-solo .card > .desc, body.touch #scr-solo .card > .backrow,
    body.touch #scr-solo .card > .stagegrid, body.touch #scr-solo .card > .gowrap,
    body.touch #scr-battle .card > h2, body.touch #scr-battle .card > .desc, body.touch #scr-battle .card > .backrow,
    body.touch #scr-settings .card > h2, body.touch #scr-settings .card > .desc, body.touch #scr-settings .card > .backrow,
    body.touch #scr-online .card > h2, body.touch #scr-online .card > .desc, body.touch #scr-online .card > .backrow {
      grid-column: 1 / -1;
    }
    body.touch #scr-solo .card h2, body.touch #scr-battle .card h2,
    body.touch #scr-settings .card h2, body.touch #scr-online .card h2 { font-size: 16.5px; margin-bottom: 2px; }
    body.touch #scr-solo .card .desc, body.touch #scr-battle .card .desc,
    body.touch #scr-settings .card .desc, body.touch #scr-online .card .desc {
      font-size: 10.5px; line-height: 1.5; margin-bottom: 5px;
    }
    body.touch #scr-solo .field, body.touch #scr-battle .field,
    body.touch #scr-settings .field, body.touch #scr-online .field { margin: 7px 0; }
    body.touch #scr-solo .field > label, body.touch #scr-battle .field > label,
    body.touch #scr-settings .field > label, body.touch #scr-online .field > label { font-size: 10.5px; margin-bottom: 4px; }
    body.touch #scr-solo .chargrid { grid-template-columns: repeat(8, 1fr); gap: 5px; }
    body.touch #scr-solo .stagegrid { grid-template-columns: repeat(8, 1fr); gap: 6px; margin-bottom: 8px; }
    body.touch #scr-solo .stg { padding: 6px 4px; border-radius: 10px; }
    body.touch #scr-solo .stg b { font-size: 13px; }
    body.touch #scr-solo .stg span { font-size: 9px; }
    body.touch #scr-solo .biggo { padding: 9px 14px; font-size: 16px; }
    body.touch #scr-solo .seg button, body.touch #scr-battle .seg button,
    body.touch #scr-settings .seg button { padding: 6px 9px; font-size: 11.5px; }
    body.touch #scr-battle .pbox canvas.pav { width: 38px; height: 38px; margin: 3px auto 1px; }
    body.touch #scr-battle .pbox { padding: 6px; }
    body.touch #scr-online .tinput { padding: 6px 9px; font-size: 12.5px; }
    body.touch #scr-online .roomlist { max-height: 96px; }
    body.touch #scr-online .netroster { max-height: 96px; }
    body.touch #scr-online .netcode { font-size: 19px; padding: 3px 0 4px 5px; }
    body.touch #scr-online #netEntry, body.touch #scr-online #netRoom { grid-template-columns: 1fr 1fr; gap: 0 18px; }
    body.touch .ghostbtn { padding: 6px 13px; font-size: 12px; }
    body.touch .backrow { margin-top: 6px; }
  }
  /* ===== 寬螢幕：選單／設定改橫向多欄，充分利用橫向空間 ===== */""",
    '手機橫式版面 CSS')

# ---------- 1b. 拖曳捲動兜底：找不到可捲容器時捲整頁 ----------
rep("""function dsFind(node) {
  while (node && node !== document.body) {
    if (node.nodeType === 1 && (node.scrollHeight > node.clientHeight + 2)) {
      const st = getComputedStyle(node);
      if (/auto|scroll/.test(st.overflowY)) return node;
    }
    node = node.parentNode;
  }
  return null;
}""",
    """function dsFind(node) {
  while (node && node !== document.body) {
    if (node.nodeType === 1 && (node.scrollHeight > node.clientHeight + 2)) {
      const st = getComputedStyle(node);
      if (/auto|scroll/.test(st.overflowY)) return node;
    }
    node = node.parentNode;
  }
  // v2.5：頁面本身比視窗高時，拖曳直接捲整頁（有些手機瀏覽器不會自己捲 body）
  const se = document.scrollingElement || document.documentElement;
  if (se && se.scrollHeight > se.clientHeight + 2) return se;
  return null;
}""",
    'dsFind 整頁兜底')

# ---------- 2a. tileSize：手機以「整張地圖都看得到」為優先 ----------
rep("""function tileSize() {
  // 依畫面高度決定格子大小：手機橫放也看得清楚，桌機不會過度放大
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}""",
    """function tileSize() {
  // v2.5：手機上「整張地圖」都要看得到（之前只看得到局部，整個局面看不到）。
  // 格子 = 畫面寬、高都能塞下全部行列的最小值；桌機維持原本依高度決定的手感。
  if (document.body && document.body.classList.contains('touch')) {
    const fit = Math.floor(Math.min(VIEW_W / Game.cols, VIEW_H / Game.rows));
    return clamp(fit, 20, 62);
  }
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}""",
    'tileSize 整張地圖')

# ---------- 2b. resizeView：旋轉／縮放當下把世界座標等比重貼 ----------
rep("""  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (cv.width !== bw) cv.width = bw;
  if (cv.height !== bh) cv.height = bh;
  return { w: w, h: h, dpr: dpr };
}""",
    """  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (cv.width !== bw) cv.width = bw;
  if (cv.height !== bh) cv.height = bh;
  // v2.5：遊戲中轉直／轉橫 → 格子重算，所有東西的世界座標等比搬過去，地圖繼續整張看得到
  if (document.body && document.body.classList.contains('touch') &&
      Game.state && Game.state !== 'idle' && Game.grid && Game.grid.length && Game.cols) {
    const nt = tileSize();
    if (nt !== Game.T) {
      const k = nt / Game.T;
      Game.T = nt;
      Game.ox = Math.floor((VIEW_W - nt * Game.cols) / 2);
      Game.oy = Math.floor((VIEW_H - nt * Game.rows) / 2);
      Game.players.forEach(function (p) { p.x *= k; p.y *= k; });
      Game.enemies.forEach(function (e) { e.x *= k; e.y *= k; });
      Game.bombs.forEach(function (b) { b.px *= k; b.py *= k; });
      Game.items.forEach(function (it) { it.x *= k; it.y *= k; });
      Game.camSnap = true;
    }
  }
  return { w: w, h: h, dpr: dpr };
}""",
    'resizeView 世界座標重貼')

# ---------- 版本 ----------
rep("const VERSION = '2.4';", "const VERSION = '2.5';", 'VERSION')
rep('<span id="verTxt">2.4</span>', '<span id="verTxt">2.5</span>', 'verTxt')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('patched', n, 'bytes', len(s.encode('utf-8')))
