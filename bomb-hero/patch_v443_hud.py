# -*- coding: utf-8 -*-
"""v4.43 ②：手機 HUD 收成兩排以內、ESC 收掉、工具列一律收進 ⋮、畫面吃滿。"""
import io

HTML = 'index.html'
s = io.open(HTML, encoding='utf-8', newline='').read()
s = s.replace('\r\n', '\n')
n0 = len(s)


def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:70])
    s = s.replace(old, new)


# ---------------------------------------------------------------- 1) 關卡名改成可隱藏的 <i>
rep("""    html = '<div class="chip" data-k="stage"><span class="ic">🗺️</span><b>' + Game.stage + '</b> ' + themeName(thIdx) + '</div>' +""",
    """    html = '<div class="chip" data-k="stage"><span class="ic">🗺️</span><b>' + Game.stage + '</b>' +
      '<i class="thn">' + themeName(thIdx) + '</i></div>' +""")

# ---------------------------------------------------------------- 2) 「上一頁」文字收進 <b>（遊戲中只留箭頭）
rep('<button class="navbtn" id="btnBack" type="button"><span class="ar">←</span> 上一頁</button>',
    '<button class="navbtn" id="btnBack" type="button"><span class="ar">←</span><b>上一頁</b></button>')

# ---------------------------------------------------------------- 3) CSS
CSS_ANCHOR = """  #navBar.inGame .navbtn b { display: none; }"""
CSS_NEW = """  #navBar.inGame .navbtn b { display: none; }
  /* ===== v4.43：遊戲中工具列一律收成「⋮」，跟資訊列擠在同一排，
     不再因為螢幕寬（橫放）就把 7 顆小圖示攤平佔掉整條高度 ===== */
  #navBar.inGame #btnMore {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 38px; min-height: 38px; padding: 0; font-size: 20px; line-height: 1;
  }
  #navBar.inGame .navmore {
    display: none; position: absolute; right: 0; top: calc(100% + 6px);
    flex-direction: column; align-items: stretch; gap: 6px; padding: 8px;
    min-width: 184px; background: rgba(18,14,28,.97);
    border: 1.5px solid rgba(255,180,120,.5); border-radius: 16px;
    box-shadow: 0 18px 36px -16px rgba(0,0,0,.92);
    max-height: 68vh; overflow-y: auto; z-index: 1300;
  }
  #navBar.inGame .navmore.on { display: flex; }
  #navBar.inGame .navmore .navbtn {
    width: 100%; justify-content: flex-start; min-height: 42px; box-sizing: border-box;
    font-size: 14px; padding: 0 14px; gap: 7px;
  }
  #navBar.inGame .navmore .navbtn b { display: inline !important; }"""
rep(CSS_ANCHOR, CSS_NEW)

# ---------------------------------------------------------------- 4) 直放 in-game：一列資訊、ESC 收掉、畫面貼邊
HUD_ANCHOR = """    /* 橫放時 HUD 壓成一行（原本會折成兩行吃掉 72px，將近螢幕 1/5） */
    body.touch.in-game #gameTop { flex-wrap: nowrap; overflow: hidden; margin-bottom: 2px; gap: 4px; }
    body.touch.in-game .chip { min-height: 24px; padding: 1px 6px; font-size: 10px; border-radius: 8px; gap: 4px; }
    body.touch.in-game .chip.big b { font-size: 13px; }
    body.touch.in-game .pcard canvas { width: 26px; height: 26px; }"""
HUD_NEW = """    /* 橫放時 HUD 壓成一行（原本會折成兩行吃掉 72px，將近螢幕 1/5） */
    body.touch.in-game #gameTop { flex-wrap: nowrap; overflow: hidden; margin-bottom: 2px; gap: 4px; }
    body.touch.in-game .chip { min-height: 24px; padding: 1px 6px; font-size: 10px; border-radius: 8px; gap: 4px; }
    body.touch.in-game .chip.big b { font-size: 13px; }
    body.touch.in-game .pcard canvas { width: 26px; height: 26px; }
    /* v4.43：橫放時資訊列與「⋮」共用最上面那一排 → 只留一排，遊戲畫面往上長 */
    body.touch.in-game #scr-game.on .game-top {
      padding-top: calc(4px + env(safe-area-inset-top, 0px));
      padding-left: 5px; padding-right: 138px; margin-bottom: 2px;
    }
    body.touch.in-game #gameTop { justify-content: flex-start; }"""
rep(HUD_ANCHOR, HUD_NEW)

PORT_ANCHOR = """  body.touch #scr-game.on .game-top { padding-top: calc(34px + env(safe-area-inset-top, 0px)); }"""
PORT_NEW = """  body.touch #scr-game.on .game-top { padding-top: calc(34px + env(safe-area-inset-top, 0px)); }
  /* ===== v4.43：手機遊戲中 —— 只留「①工具列 ②資訊列」兩排，
     原本那顆 ⏸ ESC（#pauseBtn）收掉（右邊已經有一顆大顆暫停），遊戲畫面吃滿 ===== */
  body.touch.in-game #scr-game.on .game-top {
    padding-top: calc(46px + env(safe-area-inset-top, 0px));
    padding-left: 4px; padding-right: 4px; margin-bottom: 2px;
  }
  body.touch.in-game #gameTop {
    flex-wrap: nowrap; overflow: hidden; justify-content: flex-start;
    gap: 3px; width: 100%;
  }
  body.touch.in-game #gameTop .chip {
    min-height: 21px; padding: 0 5px; font-size: 9.5px; border-radius: 7px;
    gap: 3px; flex: 0 1 auto; min-width: 0; white-space: nowrap;
  }
  body.touch.in-game #gameTop .chip .ic { font-size: 10.5px; }
  body.touch.in-game #gameTop .chip b { font-size: 10.5px; }
  body.touch.in-game #gameTop .chip.big b { font-size: 12px; }
  body.touch.in-game #gameTop .chip .thn { display: none; }   /* 關卡名讓給數字，一排才塞得下 */
  body.touch.in-game #gameTop .gi { font-size: 10px; padding: 0; }
  body.touch.in-game #pauseBtn { display: none; }
  body.touch.in-game .wrap.game { padding: 0; }
  body.touch.in-game #cv { border-radius: 0; }
  body.touch.in-game #stageWrap { border-radius: 0; }
  .chip .thn { font-style: normal; margin-left: 3px; }"""
rep(PORT_ANCHOR, PORT_NEW)

io.open(HTML, 'w', encoding='utf-8', newline='').write(s)
print('OK  %d -> %d  (%+.1f KB)' % (n0, len(s), (len(s) - n0) / 1024.0))
