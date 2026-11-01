# -*- coding: utf-8 -*-
# v4.12 第三輪：全螢幕的使用者手勢判斷 + Service Worker 快取升版
#
# · 全螢幕：瀏覽器規定 requestFullscreen 必須在「使用者手勢」內呼叫。
#   遊戲開始時自動呼叫 → 沒有手勢 → 被拒（Permissions check failed），
#   而部分 WebView 會因此讓後續手勢的全螢幕請求也失敗 → 按鈕就再也點不開。
#   → 用「最近一次互動的時間戳」判斷是不是在手勢有效期內。
# · Service Worker：SW_VERSION 從 v4.7.0 起就沒動過 → 舊的 index.html 會一直留在
#   快取裡。LINE／FB 的 WebView 尤其 aggressive → 使用者拿到的是舊版（黑底按鈕）。
#   → 跟著遊戲版號一起升版，逼 SW 清掉舊快取。
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ================================================================
# 全螢幕：記錄最近一次使用者互動
# ================================================================
R(
"""// v4.12：目前是否在（原生或偽）全螢幕
function isFullscreenNow() {""",
"""// v4.12：記錄最近一次使用者互動的時間（判斷 requestFullscreen 能不能用）
let lastGestureAt = 0;
function markUserGesture() { lastGestureAt = Date.now(); }
try {
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, markUserGesture, { passive: true, capture: true });
  });
} catch (e) {}
// 2 秒內的互動才算有效手勢（點完按鈕馬上進遊戲也算）
function hasUserGesture() { return (Date.now() - lastGestureAt) < 2000; }

// v4.12：目前是否在（原生或偽）全螢幕
function isFullscreenNow() {"""
)

# enterImmersive 改成用 hasUserGesture() 判斷
R(
"""  // v4.12：只有在「有使用者手勢」時才要求原生全螢幕。
  //   沒有手勢時 requestFullscreen 必定被拒（Permissions check failed），
  //   而且部分 WebView 會因此讓後續的手勢請求也失敗 → 全螢幕鈕就再也點不開。
  if (userGesture) {
    const pr = tryNativeFullscreen(document.documentElement);
    if (pr && pr.then) pr.then(function (ok) { if (!ok) setPseudoFull(true); });
  }""",
"""  // v4.12：只有在「有使用者手勢」時才要求原生全螢幕。
  //   沒有手勢時 requestFullscreen 必定被拒（Permissions check failed），
  //   而且部分 WebView 會因此讓後續的手勢請求也失敗 → 全螢幕鈕就再也點不開。
  var gesture = (userGesture === true) || (userGesture === undefined && hasUserGesture());
  if (gesture) {
    const pr = tryNativeFullscreen(document.documentElement);
    if (pr && pr.then) pr.then(function (ok) { if (!ok) setPseudoFull(true); });
    else if (!pr) setPseudoFull(true);
  }"""
)

# 偽全螢幕切換後要更新按鈕外觀
R(
"""function setPseudoFull(on) {
  try {
    document.body.classList.toggle('pseudo-full', !!on);
    if (on) document.body.classList.add('in-game');
    updateViewportVars();
    setTimeout(resizeView, 60);
    setTimeout(resizeView, 320);
  } catch (e) {}
}""",
"""function setPseudoFull(on) {
  try {
    document.body.classList.toggle('pseudo-full', !!on);
    if (on) document.body.classList.add('in-game');
    updateViewportVars();
    setTimeout(resizeView, 60);
    setTimeout(resizeView, 320);
    setTimeout(resizeView, 700);
    try { if (typeof updateFullBtn === 'function') updateFullBtn(); } catch (e) {}
  } catch (e) {}
}"""
)

# ---- 套用並斷言 ----
failed = []
for i, (old, new) in enumerate(rules, 1):
    c = text.count(old)
    if c != 1:
        failed.append((i, c, old[:100]))
        continue
    text = text.replace(old, new)

if failed:
    print("FAILED rules:")
    for i, c, ctx in failed:
        print("  #%d count=%d ctx=%r" % (i, c, ctx))
    print("No file written.")
else:
    out = text.replace('\n', '\r\n')
    io.open(PATH, 'w', encoding='utf-8', newline='').write(out)
    print("OK: all %d rules applied" % len(rules))
