# -*- coding: utf-8 -*-
# v4.12 第二輪：WebView 旋轉／全螢幕修正 + Service Worker 快取升版
#
# ② 為什麼在 LINE／FB 的 WebView 會「畫面變巨大、不能拖曳、不能玩」
#    根因 A：版面高度用的是 100svh / 100vh。
#       · iOS Safari 的 100vh 是「網址列收起來時」的最大高度 → 網址列一顯示就溢出。
#       · 老一點的 Android WebView 根本不支援 svh → 落到 100vh → 溢出更多。
#       · 結果：轉正後寬度變成橫向、高度還是直向的舊值 → 內容比畫面大很多，
#         而 body.in-game 是 overflow:hidden → 溢出來的部分捲不到、拖不動 → 整個不能玩。
#    修法：改用 JS 量到的 --vvh（來自 visualViewport，旋轉後最準）當主控，
#         100svh / 100vh 留作後備。
#    根因 B：旋轉時 WebView 回報的尺寸常常是舊的（落後 300~600ms），
#         只靠一次 orientationchange 不夠 → 改成旋轉後連續量測好幾次。
#    根因 C：viewport meta 沒有鎖縮放 → 使用者可以在 WebView 裡雙指縮小，
#         整頁縮成「一張小圖」飄在畫面中間（就是使用者說的「畫面會變圖片」）。
#         → 加 maximum-scale=1, user-scalable=no。
#    根因 D：全螢幕按鈕點不開。
#         · requestFullscreen({navigationUI:'hide'}) 帶參數在 iOS Safari / WebView 會直接失敗
#           （TypeError），要改成不帶參數先試。
#         · iOS 要用 webkitRequestFullscreen；WebView 常把兩種都擋掉 → 再加
#           「偽全螢幕」CSS 後援（把頁面內容撐滿、藏掉自己的工具列）。
#         · 進遊戲時 enterImmersive() 會在「沒有使用者手勢」的情況下叫 requestFullscreen
#           → 必定被拒（Permissions check failed），還可能把狀態弄壞 → 改成只在
#           有手勢時才嘗試原生全螢幕。
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

def Rall(old, new, n):
    """把同一段文字出現的 n 處全部換掉（例如直放／橫放兩處規則一模一樣）"""
    rules.append((old, new, n))

# ================================================================
# ②-C：viewport meta 鎖縮放（避免 WebView 裡整頁被縮成「一張圖」）
# ================================================================
R(
'<meta name="viewport" content="width=device-width, initial-scale=1.0">',
'<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, viewport-fit=cover">'
)

# ================================================================
# ②-A：版面高度改用 --vvh（JS 從 visualViewport 量，旋轉後最準）
# ================================================================
# 直放 / 橫放兩處只差 margin/padding → 分開處理
# 直放
R(
"""    body.touch.in-game { height: 100vh; height: 100svh; min-height: 0; overflow: hidden; }
    body.touch.in-game .wrap.game {
      height: 100vh; height: 100svh;
      max-height: 100vh; max-height: 100svh;
      margin: 0; box-sizing: border-box; overflow: hidden;
    }""",
"""    /* v4.12：高度改以 --vvh 為主（JS 用 visualViewport 量，旋轉後最準）。
       100svh / 100vh 留作後援（老 WebView 不支援 svh 時至少還有值）。
       原本用 100vh 會在網址列出現時溢出 → 轉正後內容比畫面大、捲不到 → 不能玩。 */
    body.touch.in-game { height: 100vh; height: 100svh; height: var(--vvh, 100svh); min-height: 0; overflow: hidden; }
    body.touch.in-game .wrap.game {
      height: 100vh; height: 100svh; height: var(--vvh, 100svh);
      max-height: 100vh; max-height: 100svh; max-height: var(--vvh, 100svh);
      margin: 0; box-sizing: border-box; overflow: hidden;
    }"""
)
# 橫放
R(
"""    body.touch.in-game { height: 100vh; height: 100svh; min-height: 0; overflow: hidden; }
    body.touch.in-game .wrap.game {
      height: 100vh; height: 100svh;
      max-height: 100vh; max-height: 100svh;
      margin: 0 auto; padding: 2px 4px; box-sizing: border-box; overflow: hidden;
    }""",
"""    /* v4.12：同直放 —— 以 --vvh（visualViewport 量測）為主，避免旋轉後高度還是舊值 */
    body.touch.in-game { height: 100vh; height: 100svh; height: var(--vvh, 100svh); min-height: 0; overflow: hidden; }
    body.touch.in-game .wrap.game {
      height: 100vh; height: 100svh; height: var(--vvh, 100svh);
      max-height: 100vh; max-height: 100svh; max-height: var(--vvh, 100svh);
      margin: 0 auto; padding: 2px 4px; box-sizing: border-box; overflow: hidden;
    }"""
)

# ================================================================
# ②-B：旋轉後連續量測（WebView 回報的尺寸常落後幾百毫秒）
# ================================================================
R(
"""// 視窗尺寸變化（旋轉裝置、拉視窗、進出全螢幕）→ 重新量測
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', function () { relayout(); setTimeout(resizeView, 320); });
if (window.visualViewport) {
  try {
    window.visualViewport.addEventListener('resize', function () {
      updateViewportVars();
      setTimeout(resizeView, 80);
    });
  } catch (e) {}
}""",
"""// 視窗尺寸變化（旋轉裝置、拉視窗、進出全螢幕）→ 重新量測
window.addEventListener('resize', relayout);
window.addEventListener('orientationchange', function () { relayout(); fixOrientationLayout(); });
// v4.12：旋轉後 WebView 回報的尺寸常常還是舊的（落後 300~600ms），
//   只量一次不夠 → 連續量好幾次，確保畫布最後一定是對的。
function fixOrientationLayout() {
  var waits = [0, 120, 300, 600, 1000, 1600];
  for (var i = 0; i < waits.length; i++) {
    (function (ms) {
      setTimeout(function () {
        try { updateViewportVars(); resizeView(); } catch (e) {}
      }, ms);
    })(waits[i]);
  }
}
// v4.12：螢幕旋轉事件（部分 WebView 只有這個、沒有 orientationchange）
try {
  if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
    window.screen.orientation.addEventListener('change', function () { relayout(); fixOrientationLayout(); });
  }
} catch (e) {}
if (window.visualViewport) {
  try {
    window.visualViewport.addEventListener('resize', function () {
      updateViewportVars();
      setTimeout(resizeView, 80);
    });
  } catch (e) {}
  try {
    // v4.12：visualViewport 旋轉（WebView 常只發這個）
    window.visualViewport.addEventListener('orientationchange' in window.visualViewport ? 'orientationchange' : 'resize', function () {
      updateViewportVars(); fixOrientationLayout();
    });
  } catch (e) {}
}"""
)

# ================================================================
# ②-D：全螢幕（原生 API → webkit → 偽全螢幕 CSS 後援）
# ================================================================
R(
"""function enterImmersive() {
  if (ctrlMode() !== 'touch') return;          // 電腦不強制全螢幕
  const el = document.documentElement;
  try {
    if (el.requestFullscreen && !document.fullscreenElement) {
      const pr = el.requestFullscreen({ navigationUI: 'hide' });
      if (pr && pr.catch) pr.catch(function () {});
    }
  } catch (e) {}
  // v2.3：不再強制鎖成橫向（讓玩家自己決定）→ 直式開始時給一張「建議轉橫式」提示
  setTimeout(resizeView, 260);
  setTimeout(resizeView, 900);
  setTimeout(showRotateHint, 140);
}
function toggleFullscreen() {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
    } else if (el.requestFullscreen) {
      const pr = el.requestFullscreen({ navigationUI: 'hide' });
      if (pr && pr.then) pr.then(function () { resizeView(); }).catch(function () {});
    }
  } catch (e) {}
  setTimeout(resizeView, 320);
}""",
"""// v4.12：目前是否在（原生或偽）全螢幕
function isFullscreenNow() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement ||
            document.body.classList.contains('pseudo-full'));
}
// v4.12：偽全螢幕 —— WebView 把原生 API 擋掉時，至少讓遊戲撐滿畫面、藏掉自己的工具列
function setPseudoFull(on) {
  try {
    document.body.classList.toggle('pseudo-full', !!on);
    if (on) document.body.classList.add('in-game');
    updateViewportVars();
    setTimeout(resizeView, 60);
    setTimeout(resizeView, 320);
  } catch (e) {}
}
// v4.12：嘗試進入原生全螢幕（回傳 Promise 或 null）
function tryNativeFullscreen(el) {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) return null;
    // 注意：不要帶 { navigationUI: 'hide' } —— iOS Safari / 某些 WebView 帶參數會直接 TypeError
    if (el.requestFullscreen) {
      const pr = el.requestFullscreen();
      if (pr && pr.then) return pr.then(function () { resizeView(); return true; })
                                .catch(function () { return false; });
      return null;
    }
    if (el.webkitRequestFullscreen) {          // iOS Safari
      el.webkitRequestFullscreen();
      return Promise.resolve(true);
    }
    if (el.webkitEnterFullscreen) {             // iOS 舊版
      el.webkitEnterFullscreen();
      return Promise.resolve(true);
    }
  } catch (e) {}
  return null;
}
function exitNativeFullscreen() {
  try {
    if (document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen(); return true; }
    if (document.webkitFullscreenElement && document.webkitExitFullscreen) { document.webkitExitFullscreen(); return true; }
  } catch (e) {}
  return false;
}
function enterImmersive(userGesture) {
  if (ctrlMode() !== 'touch') return;          // 電腦不強制全螢幕
  // v4.12：只有在「有使用者手勢」時才要求原生全螢幕。
  //   沒有手勢時 requestFullscreen 必定被拒（Permissions check failed），
  //   而且部分 WebView 會因此讓後續的手勢請求也失敗 → 全螢幕鈕就再也點不開。
  if (userGesture) {
    const pr = tryNativeFullscreen(document.documentElement);
    if (pr && pr.then) pr.then(function (ok) { if (!ok) setPseudoFull(true); });
  }
  // v2.3：不再強制鎖成橫向（讓玩家自己決定）→ 直式開始時給一張「建議轉橫式」提示
  setTimeout(resizeView, 260);
  setTimeout(resizeView, 900);
  setTimeout(showRotateHint, 140);
}
function toggleFullscreen() {
  const el = document.documentElement;
  const on = isFullscreenNow();
  if (on) {
    if (!exitNativeFullscreen()) setPseudoFull(false);
    try { document.body.classList.remove('pseudo-full'); } catch (e) {}
  } else {
    // 這裡一定是在使用者點擊（手勢）裡 → 可以要求原生全螢幕
    const pr = tryNativeFullscreen(el);
    if (pr && pr.then) {
      pr.then(function (ok) { if (!ok) setPseudoFull(true); });
    } else {
      // 沒有原生 API（或同步失敗）→ 偽全螢幕
      setPseudoFull(true);
    }
  }
  setTimeout(resizeView, 120);
  setTimeout(resizeView, 320);
  setTimeout(resizeView, 700);
}"""
)

# ================================================================
# 偽全螢幕的 CSS
# ================================================================
R(
"""  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }""",
"""  body.touch #touchUI .tdet.hide, body.touch #touchUI .tfire.hide { display: none; }
  /* v4.12：偽全螢幕（原生 Fullscreen API 被 WebView 擋掉時的後援）
     → 藏掉自己的工具列、讓遊戲畫面撐滿可視區 */
  body.pseudo-full { overflow: hidden; }
  body.pseudo-full .navrow,
  body.pseudo-full #navBar { display: none !important; }
  body.pseudo-full #scr-game.on { height: 100%; }"""
)

# ================================================================
# updateFullBtn 要認得偽全螢幕
# ================================================================
R(
"""  var on = !!document.fullscreenElement;
  el.classList.toggle('on', on);""",
"""  // v4.12：也認偽全螢幕（原生 API 被擋時按鈕也要有feedback）
  var on = !!(document.fullscreenElement || document.webkitFullscreenElement ||
              document.body.classList.contains('pseudo-full'));
  el.classList.toggle('on', on);"""
)

# ---- 套用並斷言 ----
failed = []
for i, rule in enumerate(rules, 1):
    if len(rule) == 3:
        old, new, n = rule
    else:
        old, new = rule
        n = 1
    c = text.count(old)
    if c != n:
        failed.append((i, c, n, old[:100]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, n, ctx in failed:
        print("  #%d count=%d (expect %d) ctx=%r" % (i, c, n, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
