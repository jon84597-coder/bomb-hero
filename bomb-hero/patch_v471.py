# -*- coding: utf-8 -*-
# v4.71：① 橫屏與直屏格子大小一致 ② 小地圖挪到左上（不被暫停／全螢幕鈕擋住）
#        ③ 修「轉屏後縮放亂跳」（雙指手勢被版面重排扯到 → 一瞬間跳到 210%）
import io, sys

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    n = s.count(old)
    if n != 1:
        print('[FAIL]', tag, 'count=', n)
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok]', tag)


# ---------- ① tileSize：直放／橫放用同一條公式 ----------
rep("""    if (sz.h > sz.w && sz.w < 720) {
      const byH = sz.h / Math.max(1, Game.rows);
      const byW = sz.w / 11;
      return clamp(Math.round(Math.min(byH, byW)), 24, 62);
    }
    return clamp(Math.max(18, Math.floor(fit)), 12, 62);""",
    """    // v4.71：直放／橫放「同一個格子大小」。
    //   舊版橫放走「整張塞進畫面」→ 390px 高的橫屏只有 18px／格，角色跟螞蟻一樣；
    //   直放同一張圖卻有 36px。現在一律用「短邊當寬、長邊當高」代入同一條公式，
    //   轉屏時格子大小不變（角色、怪物、美術比例全部一致），看不完的地方相機跟著走。
    if (document.body && document.body.classList.contains('touch')) {
      const sh = Math.min(sz.w, sz.h), lg = Math.max(sz.w, sz.h);
      const byH = lg / Math.max(1, Game.rows);
      const byW = sh / 11;
      return clamp(Math.round(Math.min(byH, byW)), 24, 62);
    }
    return clamp(Math.max(18, Math.floor(fit)), 12, 62);""",
    'tilesize-bigmap-touch')

rep("""  if (document.body && document.body.classList.contains('touch')) {
    const fw = VIEW_W / Game.cols, fh = VIEW_H / Game.rows;
    // 取寬／高較大者才能保證地圖蓋滿畫布；用原本的 fit 會讓地圖只有 520 高，
    // 上下各留 100px 深色空帶（畫布滿版之後就變成兩條黑邊）。
    // 橫放寬度本來就夠，維持「整張的 60%」，手感不要動。
    if (VIEW_H > VIEW_W) {
      // 直放：寬度只求「至少 7 格」，其餘讓高度決定（地圖才蓋得滿畫布）。
      // 純 cover 會只剩 6 格寬，火燄射程 4 格 → 看不到敵人。
      return clamp(Math.round(Math.min(fh, VIEW_W / 7.2)), 24, 62);
    }
    return clamp(Math.round(Math.floor(Math.min(fw, fh)) / MOBILE_VIEW_FRAC), 24, 62);
  }""",
    """  if (document.body && document.body.classList.contains('touch')) {
    // v4.71：同一條公式吃「短邊／長邊」→ 直放橫放的格子一樣大。
    //   舊版橫放走「整張的 60%」→ 15×13 在 844×390 算出 50px、直放 54px，
    //   再加上縮放誤觸，看起來就像「轉橫屏全部變大」。
    const sz2 = canvasSize();
    const sh = Math.min(sz2.w, sz2.h), lg = Math.max(sz2.w, sz2.h);
    return clamp(Math.round(Math.min(lg / Math.max(1, Game.rows), sh / 7.2)), 24, 62);
  }""",
    'tilesize-classic-touch')

# ---------- ③ 縮放：轉屏／版面重排時重新取基準，並擋掉單一事件的暴衝 ----------
rep("""  function dist2p() {
    const ids = Object.keys(pts);
    if (ids.length < 2) return 0;""",
    """  // v4.71：轉屏／網址列伸縮會讓 clientX/clientY 整組變掉，
  //   留著舊的 pinchD 再比一次 → 一瞬間算出 3 倍距離 → 直接跳到 ZOOM_MAX。
  //   （實測：210% 與 88% 都是這樣來的，使用者根本沒捏過）
  function rebase() {
    for (const k in pts) delete pts[k];
    pinchD = 0;
  }
  function dist2p() {
    const ids = Object.keys(pts);
    if (ids.length < 2) return 0;""",
    'zoom-rebase-def')

rep("""        const d = dist2p();
        if (d > 12 && pinchD > 12) {
          set(pinchBase * (d / pinchD));""",
    """        const d = dist2p();
        if (d > 12 && pinchD > 12) {
          // 一次 pointermove 不可能讓兩指距離改變 >64px（60fps 下要 3840px/s）。
          //   超過就是「手指被換掉／版面重排」→ 重新取基準，不要套用這次的比例。
          const jump = Math.abs(d - pinchD);
          if (jump > 64 || d / pinchD < .55 || d / pinchD > 1.8) {
            pinchD = d; pinchBase = Game.zoomTarget; return;
          }
          set(pinchBase * (d / pinchD));""",
    'zoom-jump-guard')

rep("""  return { set: set, by: by, reset: reset, tick: tick, min: ZOOM_MIN, max: ZOOM_MAX, step: ZOOM_STEP };""",
    """  return { set: set, by: by, reset: reset, tick: tick, rebase: rebase,
    min: ZOOM_MIN, max: ZOOM_MAX, step: ZOOM_STEP };""",
    'zoom-export')

# resizeView：尺寸真的變了才重取基準（loop 每 0.4s 會呼叫，尺寸沒變不要亂清）
rep("""  const dpr = Math.min(2, (window.devicePixelRatio || 1));
  VIEW_W = w; VIEW_H = h; PIXEL_RATIO = dpr;""",
    """  const dpr = Math.min(2, (window.devicePixelRatio || 1));
  const wasW = VIEW_W, wasH = VIEW_H;
  VIEW_W = w; VIEW_H = h; PIXEL_RATIO = dpr;
  if (Math.abs(w - wasW) > 2 || Math.abs(h - wasH) > 2) {
    try { Zoom.rebase(); } catch (e) {}      // v4.71：轉屏 → 舊的捏合基準作廢
  }""",
    'resizeview-rebase')

# 新關卡若還停在極端縮放（被誤觸），回到 100%
rep("""function beginCountdown(bgmName) {
  Game.state = 'countdown';""",
    """function beginCountdown(bgmName) {
  // v4.71：上一關被雙指誤觸放大／縮小到極端值就帶到下一關 → 新關卡一律回到 100%
  try { if (Math.abs(Game.zoomTarget - 1) > .34) Zoom.reset(); } catch (e) {}
  Game.state = 'countdown';""",
    'countdown-zoom-reset')

# ---------- ② 小地圖挪到左上 ----------
rep("""  w = Math.max(56, Math.round(w));
  h = Math.max(42, Math.round(h));
  return { x: Math.round(VIEW_W - w - 8), y: 8, w: w, h: h };""",
    """  w = Math.max(56, Math.round(w));
  h = Math.max(42, Math.round(h));
  // v4.71：改放左上。右上角是手機的 ⏸／⛶（`.tpause` right:16 top:12 46px、
  //   `.tfs` top:64 44px，換算成畫布座標會蓋到 y 8~108 這一塊），
  //   直放橫放都一樣 → 與其動態避讓，直接換到左上（那裡只有縮放指示在中間，不會撞）。
  return { x: 8, y: 8, w: w, h: h };""",
    'minimap-topleft')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done')
