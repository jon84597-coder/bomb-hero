# -*- coding: utf-8 -*-
"""v4.47：手機直放遊戲畫面滿版

問題（使用者附圖）：黃框（畫布）只有 362x613，螢幕 390x844 ——
  · 左右各 14px 是 body 的 padding；
  · 下方 162px 是 #stageWrap 留給搖桿／放彈鍵的空間，整片露出背景插圖。
加起來將近螢幕的 1/4 沒有用在遊戲上。

作法：
  1. 遊戲中 body / wrap 的 padding 歸零、#stageWrap 不再留 162px → 畫布貼滿整個寬，
     並一直延伸到螢幕下緣（搖桿與放彈鍵改成浮在地圖上，本來就是圓形半透明底）。
  2. 畫布變高之後，tileSize() 改用「cover」（取寬／高較大者）→ 地圖一定蓋滿畫布，
     不會出現上下深色空帶；橫放維持原本的 MOBILE_VIEW_FRAC 邏輯。
  3. 底部按鈕加上 safe-area-inset-bottom，全面屏手機不會貼到系統手勢條。
"""
import io
import sys

GAME = 'index.html'
s = io.open(GAME, encoding='utf-8', newline='').read()
orig = s

# ---------------------------------------------------------------- 1) CSS
CSS_ANCHOR = """  body.touch.in-game #pauseBtn { display: none; }
  body.touch.in-game .wrap.game { padding: 0; }
"""
CSS_NEW = """  body.touch.in-game #pauseBtn { display: none; }
  body.touch.in-game .wrap.game { padding: 0; }
  /* ===== v4.47：手機直放 —— 遊戲畫面真正滿版 =====
     原本 body 有 14px padding（左右各 14px）＋ #stageWrap 下方留 162px 給搖桿，
     畫布只有 362×613（螢幕 390×844），將近 1/4 的畫面是背景插圖。
     現在左右貼邊、下方也吃到底，搖桿／放彈鍵改成「浮在地圖上」的圓形半透明墊。 */
  @media (orientation: portrait) {
    body.touch.in-game { padding: 0; }
    body.touch.in-game #stageWrap { padding-bottom: 0; }
    body.touch.in-game #cv { border-radius: 0; }
    /* 搖桿墊壓在地圖上 → 降低不透明度，底下的格子要看得到 */
    body.touch.in-game #touchUI .tpad {
      bottom: calc(8px + env(safe-area-inset-bottom, 0px));
      background: radial-gradient(circle at 50% 40%, rgba(38,58,102,.40), rgba(9,14,28,.52) 74%);
      border-color: rgba(150,190,255,.30);
    }
    body.touch.in-game #touchUI .tact { bottom: calc(18px + env(safe-area-inset-bottom, 0px)); }
    body.touch.in-game #touchUI .tdet,
    body.touch.in-game #touchUI .tfire { bottom: calc(118px + env(safe-area-inset-bottom, 0px)); }
  }
"""
if CSS_NEW in s:
    print('CSS 已存在，略過')
elif s.count(CSS_ANCHOR) == 1:
    s = s.replace(CSS_ANCHOR, CSS_NEW)
    print('CSS 已插入')
else:
    print('!! CSS 錨點找不到')
    sys.exit(1)

# ---------------------------------------------------------------- 2) tileSize
OLD_TILE = """function tileSize() {
  // v2.5 → v2.6：先算「整張塞進去」的格子，再放大到只裝 MOBILE_VIEW_FRAC。
  // 桌機維持原本依高度決定的手感。
  if (document.body && document.body.classList.contains('touch')) {
    const fit = Math.floor(Math.min(VIEW_W / Game.cols, VIEW_H / Game.rows));
    return clamp(Math.round(fit / MOBILE_VIEW_FRAC), 24, 62);
  }
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}"""
NEW_TILE = """function tileSize() {
  // v2.5 → v2.6：先算「整張塞進去」的格子，再放大到只裝 MOBILE_VIEW_FRAC。
  // 桌機維持原本依高度決定的手感。
  if (document.body && document.body.classList.contains('touch')) {
    const fw = VIEW_W / Game.cols, fh = VIEW_H / Game.rows;
    // v4.47：直放改成「cover」—— 畫面又高又窄（地圖 15×13、畫布 390×777），
    // 取寬／高較大者才能保證地圖蓋滿畫布；用原本的 fit 會讓地圖只有 520 高，
    // 上下各留 100px 深色空帶（畫布滿版之後就變成兩條黑邊）。
    // 橫放寬度本來就夠，維持「整張的 60%」，手感不要動。
    if (VIEW_H > VIEW_W) return clamp(Math.round(Math.max(fw, fh)), 24, 62);
    return clamp(Math.round(Math.floor(Math.min(fw, fh)) / MOBILE_VIEW_FRAC), 24, 62);
  }
  return clamp(Math.round(VIEW_H / 9.2), 30, 62);
}"""
if NEW_TILE in s:
    print('tileSize 已是新版')
elif s.count(OLD_TILE) == 1:
    s = s.replace(OLD_TILE, NEW_TILE)
    print('tileSize 已更新')
else:
    print('!! tileSize 錨點找不到')
    sys.exit(1)

if s != orig:
    io.open(GAME, 'w', encoding='utf-8', newline='').write(s)
print('done, len =', len(s))
