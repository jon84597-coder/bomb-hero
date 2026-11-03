# -*- coding: utf-8 -*-
# v4.49（1/2）：修「手機玩一陣子後，頂部工具列整排消失」
#   病根：手機進遊戲時 setPseudoFull(true)（原生全屏被拒的兜底）→ body.pseudo-full
#         CSS body.pseudo-full #navBar{display:none!important} 把工具列藏起來，
#         但離開遊戲時沒有人移除 pseudo-full → 回首页永遠看不到 ←／👤／⋮。
import io

P = 'index.html'
SRC = '_bak_v449_pre.html'
s = io.open(SRC, encoding='utf-8', newline='').read()


def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new, 1)


# ---------------------------------------------------------------
# 1) CSS 收窄：偽全屏只有在「遊戲中」才藏工具列
#    （雙保險：即使 pseudo-full 意外殘留，首页也不会丢工具列）
# ---------------------------------------------------------------
rep("""  body.pseudo-full .navrow,
  body.pseudo-full #navBar { display: none !important; }""",
    """  body.pseudo-full .navrow,
  body.pseudo-full.in-game #navBar { display: none !important; }   /* v4.49：只在遊戲中才藏，首页被殘留狀態波及過 */""")

# ---------------------------------------------------------------
# 2) 離開遊戲畫面就退出偽全屏
# ---------------------------------------------------------------
rep("""    document.body.classList.toggle('in-game', name === 'game');   // v2.9：遊戲中鎖定整頁捲動""",
    """    document.body.classList.toggle('in-game', name === 'game');   // v2.9：遊戲中鎖定整頁捲動
    // v4.49：偽全屏只為遊戲服務。手機的原生全屏常被拒 → 退回偽全屏，
    //   但以前離開遊戲沒人收 → 回到首页 #navBar 仍被 display:none 吃掉（整排按鈕消失）。
    if (name !== 'game' && document.body.classList.contains('pseudo-full') &&
        !document.fullscreenElement && !document.webkitFullscreenElement) {
      setTimeout(function () { try { setPseudoFull(false); } catch (e) {} }, 0);
    }""")

# ---------------------------------------------------------------
# 3) setPseudoFull(false) 要跟 (true) 對稱，別留 in-game
# ---------------------------------------------------------------
rep("""function setPseudoFull(on) {
  try {
    document.body.classList.toggle('pseudo-full', !!on);
    if (on) document.body.classList.add('in-game');""",
    """function setPseudoFull(on) {
  try {
    document.body.classList.toggle('pseudo-full', !!on);
    // v4.49：關閉時也要收拾 in-game（否則手機版面會停在「遊戲中」的 padding，
    //   首页左右邊距消失、整頁貼邊）。遊戲中由畫面切換自己維持 in-game，不會被這裡誤刪。
    if (on) document.body.classList.add('in-game');
    else if (typeof Screen !== 'undefined' && Screen.current !== 'game') document.body.classList.remove('in-game');""")

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK  chars %d (limit 3,350,000, left %d)' % (len(s), 3350000 - len(s)))
