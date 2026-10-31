# -*- coding: utf-8 -*-
# v1.8 補丁 A：版本號、首頁標題（拿掉 ICON、BOMB HERO 大字 / 爆爆英雄中字 / 測試版小字）
#              、新增「組隊 對戰」、音樂／音效開關永遠顯示在右方
import io

p = 'index.html'
s = io.open(p, encoding='utf-8').read()


def rep(old, new, tag):
    global s
    assert old in s and s.count(old) == 1, 'MISS/DUP ' + tag + ' (count=%d)' % s.count(old)
    s = s.replace(old, new)
    print('OK', tag)


# ---------- 1. 版本號 1.7 → 1.8 ----------
rep("const VERSION = '1.7';", "const VERSION = '1.8';", 'VERSION')
rep('<span id="verTxt">1.7</span>', '<span id="verTxt">1.8</span>', 'verTxt')

# ---------- 2. 首頁：拿掉 ICON，改「BOMB HERO 大字 / 爆爆英雄中字 / 測試版小字」 ----------
i = s.index('      <div class="logo-big">')
j = s.index('      <h1>爆爆英雄</h1>')
s = s[:i] + (
    '      <h1 class="title-en">BOMB HERO</h1>\n'
    '      <div class="title-zh">爆爆英雄</div>\n'
) + s[j + len('      <h1>爆爆英雄</h1>'):]
print('OK 拿掉 ICON、標題改 BOMB HERO 大字')

rep('<div class="ver">v<span id="verTxt">1.8</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">1.8</span></div>', '測試版小字')

# ---------- 3. CSS：.logo-big 整組移除 ----------
rep("""  .logo-big {
    width: 92px; height: 92px; margin: 0 auto 18px; border-radius: 26px;
    background: linear-gradient(160deg, #ff8a3d, #e83a5f);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 18px 44px -14px rgba(232,58,95,.9), inset 0 2px 0 rgba(255,255,255,.35);
  }
""", '', '移除 .logo-big（深色版）')

rep("""  .logo-big {
    background: linear-gradient(160deg, #ffb066, #f4703c);
    box-shadow: 0 18px 40px -14px rgba(200,110,40,.75), inset 0 2px 0 rgba(255,255,255,.5);
  }
""", '', '移除 .logo-big（亮色版）')

rep("""    body.touch .logo-big { width: 46px; height: 46px; border-radius: 13px; margin: 0 auto 8px; }
    body.touch .logo-big svg { width: 28px; height: 28px; }
    body.touch .title-card h1 { font-size: 27px; }
    body.touch .title-card .sub { margin-top: 2px; font-size: 10px; letter-spacing: .22em; }
""",
    """    body.touch .title-card h1.title-en { font-size: clamp(34px, 11.6vw, 58px); }
    body.touch .title-card .title-zh { margin-top: 2px; font-size: clamp(16px, 5.2vw, 25px); letter-spacing: .22em; }
""", '直放手機標題尺寸')

rep("""    .logo-big { width: 54px; height: 54px; border-radius: 16px; margin-bottom: 8px; }
    .logo-big svg { width: 32px; height: 32px; }
    .title-card h1 { font-size: 30px; }
    .title-card .sub { font-size: 11px; margin-top: 2px; }
""",
    """    .title-card h1.title-en { font-size: clamp(26px, 6.2vw, 40px); }
    .title-card .title-zh { font-size: clamp(15px, 3.4vw, 22px); margin-top: 1px; }
    .title-card .sub { font-size: 11px; margin-top: 2px; }
""", '矮螢幕標題尺寸')

# ---------- 4. CSS：標題字號（特別大）＋中文字號 ----------
rep("""  .title-card h1 {
    font-size: 40px; font-weight: 900; letter-spacing: .08em;
    background: linear-gradient(90deg, #ffd166, #ff8a3d, #ff5e7e);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .title-card .sub { color: #7d8db0; letter-spacing: .34em; font-size: 13px; font-weight: 700; margin-top: 8px; }
""",
    """  /* v1.8：首頁只留文字標題 —— BOMB HERO 超大字、爆爆英雄中字、測試版小字 */
  .title-card h1.title-en {
    font-size: clamp(42px, 9.6vw, 84px); font-weight: 900; letter-spacing: .03em; line-height: 1.04;
    background: linear-gradient(90deg, #ffd166, #ff8a3d, #ff5e7e);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .title-card .title-zh {
    color: #7d8db0; letter-spacing: .3em; font-size: clamp(19px, 4.6vw, 34px);
    font-weight: 800; margin-top: 5px;
  }
  .ver.beta { font-size: clamp(9px, 2.4vw, 11.5px); letter-spacing: .16em; opacity: .9; }
  .title-card .sub { color: #7d8db0; letter-spacing: .34em; font-size: 13px; font-weight: 700; margin-top: 8px; }
""", '標題字母字號（深色版）')

rep("""  .title-card h1 {
    font-size: 46px; letter-spacing: .1em;
    background: linear-gradient(180deg, #ffd98a, #ff9a4d 48%, #ef6d38);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 3px 0 rgba(255,255,255,.95)) drop-shadow(0 8px 12px rgba(150,90,40,.35));
  }
  .title-card .sub { color: #a97c52; font-size: 14.5px; letter-spacing: .3em; }
""",
    """  .title-card h1.title-en {
    font-size: clamp(46px, 9.8vw, 88px); letter-spacing: .03em; line-height: 1.04;
    background: linear-gradient(180deg, #ffd98a, #ff9a4d 48%, #ef6d38);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 3px 0 rgba(255,255,255,.95)) drop-shadow(0 8px 14px rgba(150,90,40,.4));
  }
  .title-card .title-zh { color: #b0763f; font-size: clamp(20px, 4.8vw, 36px); letter-spacing: .3em; font-weight: 800; }
  .title-card .sub { color: #a97c52; font-size: 14.5px; letter-spacing: .3em; }
""", '標題字母字號（亮色版）')

# ---------- 5. 首頁新增「組隊 對戰（未開放 敬請期待）」 ----------
rep("""        <button class="mbtn" id="btnBattle">對戰（含 AI）<small>4／8 人混戰 · 可改名 · 沒人就 AI 補位</small></button>
""",
    """        <button class="mbtn" id="btnBattle">對戰（含 AI）<small>4／8 人混戰 · 可改名 · 沒人就 AI 補位</small></button>
        <button class="mbtn soon" id="btnTeam">👥 組隊 對戰<small>未開放 敬請期待</small></button>
""", '組隊對戰按鈕 HTML')

rep("""  .mbtn.warm { background: linear-gradient(180deg, #e8541f, #c22f4e); border-color: #ff8a5e; }
  .mbtn.bossbtn {
""",
    """  /* v1.8：尚未開放的模式（虛線灰底，看得出來「以後才有」） */
  .mbtn.soon {
    background: linear-gradient(180deg, #20263a, #191e2e);
    border: 1px dashed #56628c; color: #8d98b8;
  }
  .mbtn.soon small { color: #6d789b; }
  .mbtn.soon:hover { transform: none; border-color: #6f7da9; box-shadow: none; }
  .mbtn.soon:active { transform: scale(.99); }
  .mbtn.bossbtn {
""", '組隊對戰按鈕 CSS')

rep("""$id('btnOnline').addEventListener('click', function () {""",
    """$id('btnTeam').addEventListener('click', function () {
  AudioSys.ensure(); AudioSys.sfx('click');
  toast('👥 組隊對戰 尚未開放，敬請期待！', 2.4);
});
$id('btnOnline').addEventListener('click', function () {""", '組隊對戰按鈕 JS')

# ---------- 6. 音樂／音效開關：連遊戲中也顯示在右方 ----------
rep("""  #navBar.hide { display: none; }
""",
    """  #navBar.hide { display: none; }
  /* v1.8：遊戲中也顯示工具列（🎵／🔊 永遠在右上角）→ 換成精簡版，不擋上方資訊列 */
  #navBar.inGame { padding-top: calc(5px + env(safe-area-inset-top, 0px)); justify-content: flex-end; }
  #navBar.inGame #btnBack { display: none; }
  #navBar.inGame .navbtn { padding: 6px 12px 6px 10px; font-size: 12.5px; background: rgba(20,15,30,.72); }
  #navBar.inGame .navbtn b { display: none; }
  #scr-game.on .game-top { padding-top: calc(40px + env(safe-area-inset-top, 0px)); }
  body.touch #scr-game.on .game-top { padding-top: calc(34px + env(safe-area-inset-top, 0px)); }
""", 'inGame 工具列 CSS')

rep("""  bar.classList.toggle('hide', cur === 'game');
""",
    """  // v1.8：永遠顯示（遊戲中改為右上角的精簡版），音樂／音效隨時都關得到
  bar.classList.toggle('inGame', cur === 'game');
""", 'updateNavUI 不再隱藏')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('bytes', len(s.encode('utf-8')))
