# -*- coding: utf-8 -*-
# v2.1：首頁標題文字 → 美術 LOGO 圖（去背 PNG、data URI 內嵌）
import base64, io, sys

P = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\index.html"
LOGO = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\art\title-logo-q.png"

src = io.open(P, 'r', encoding='utf-8').read()
n0 = len(src)
fails = []
def rep(old, new, name):
    global src
    if old not in src:
        fails.append(name); print('FAIL', name); return
    src = src.replace(old, new, 1)
    print('ok  ', name)

# 1) 版本號 2.0 → 2.1
rep("const VERSION = '2.0';", "const VERSION = '2.1';", 'VERSION')
rep('<span id="verTxt">2.0</span>', '<span id="verTxt">2.1</span>', 'verTxt')

# 2) 標題 HTML：兩行文字 → 一張 LOGO 圖
b64 = base64.b64encode(open(LOGO, 'rb').read()).decode()
rep('''        <h1 class="title-en" data-t="BOMB HERO">BOMB HERO</h1>
        <div class="title-zh" data-t="爆爆英雄">爆爆英雄</div>''',
    '        <img class="title-logo" id="titleLogo" alt="BOMB HERO 爆爆英雄" draggable="false" src="data:image/png;base64,' + b64 + '">',
    '標題 HTML → LOGO 圖')

# 3) 基礎字級 CSS（v1.8 區塊）→ 註解保留脈絡
rep('''  /* v1.8：首頁只留文字標題 —— BOMB HERO 超大字、爆爆英雄中字、測試版小字 */
  .title-card h1.title-en {
    font-size: clamp(42px, 9.6vw, 84px); font-weight: 900; letter-spacing: .03em; line-height: 1.04;
    background: linear-gradient(90deg, #ffd166, #ff8a3d, #ff5e7e);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .title-card .title-zh {
    color: #7d8db0; letter-spacing: .3em; font-size: clamp(19px, 4.6vw, 34px);
    font-weight: 800; margin-top: 5px;
  }
''', '  /* v2.1：首頁標題改用美術 LOGO 圖（.title-logo 規則在下方 v2.1 區塊） */\n', 'v1.8 字級 CSS 移除')

# 4) v2.0 紅底外凸 CSS → LOGO 圖 CSS
rep('''  /* v2.0：拿掉一整圈大光暈 → 改成「標題字型外凸出去的紅底形狀」 */
  .titlewrap { position: relative; padding: 8px 0 4px; }
  .titlewrap > * { position: relative; }
  .title-en, .title-zh { isolation: isolate; }
  .title-en::before, .title-zh::before {
    content: attr(data-t);
    position: absolute; left: 0; top: 0; width: 100%; z-index: -1;
    color: #7d0518; -webkit-text-fill-color: #7d0518;
    -webkit-text-stroke: clamp(8px, 1.9vw, 17px) #7d0518;
    paint-order: stroke fill;
    pointer-events: none;
    filter: drop-shadow(0 3px 0 rgba(60,0,12,.85));
  }
  .title-zh::before {
    color: #8a0a1e; -webkit-text-fill-color: #8a0a1e;
    -webkit-text-stroke: clamp(6px, 1.35vw, 12px) #8a0a1e;
    filter: drop-shadow(0 2px 0 rgba(60,0,12,.8));
  }''',
    '''  /* v2.1：美術 LOGO 圖（去背 PNG data URI，桌面／手機共用一個寬度clamp） */
  .titlewrap { position: relative; padding: 8px 0 4px; }
  .titlewrap > * { position: relative; }
  .title-logo {
    display: block; margin: 0 auto; width: clamp(250px, 64vw, 560px); height: auto;
    user-select: none; -webkit-user-drag: none;
  }''', 'v2.0 紅底外凸 CSS → LOGO CSS')

# 5) 手機直放字級 → LOGO 寬度
rep('''    body.touch .title-card h1.title-en { font-size: clamp(34px, 11.6vw, 58px); }
    body.touch .title-card .title-zh { margin-top: 2px; font-size: clamp(16px, 5.2vw, 25px); letter-spacing: .22em; }''',
    '    body.touch .title-card .title-logo { width: clamp(190px, 62vw, 300px); }', '手機直放 LOGO 寬度')

# 6) 淺色主題區塊的字級與外凸濾镜 → 移除（LOGO 自帶描邊，淺色底直接用）
rep('''  .title-card h1.title-en {
    font-size: clamp(46px, 9.8vw, 88px); letter-spacing: .03em; line-height: 1.04;
    background: linear-gradient(180deg, #ffd98a, #ff9a4d 48%, #ef6d38);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 3px 0 rgba(255,255,255,.95)) drop-shadow(0 8px 14px rgba(150,90,40,.4));
  }
  .title-card .title-zh { color: #b0763f; font-size: clamp(20px, 4.8vw, 36px); letter-spacing: .3em; font-weight: 800; }
  /* v2.0：淺色底一樣是「字型外凸的紅底形狀」，顏色略深一點才看得清 */
  .title-en::before, .title-zh::before { filter: drop-shadow(0 2px 0 rgba(96,16,16,.55)); }''',
    '  /* v2.1：淺色主題下 LOGO 稍微放大一點（圖自帶白描邊，淺底也清楚） */\n  .title-card .title-logo { width: clamp(255px, 62vw, 545px); }', '淺色主題 LOGO')

# 7) 矮螢幕（手機橫放）
rep('''    .title-card h1.title-en { font-size: clamp(26px, 6.2vw, 40px); }
    .title-card .title-zh { font-size: clamp(15px, 3.4vw, 22px); margin-top: 1px; }''',
    '    .title-card .title-logo { width: clamp(150px, 30vw, 230px); }', '矮螢幕 LOGO')

if fails:
    print('共 %d 處失敗，不寫檔' % len(fails)); sys.exit(1)

io.open(P, 'w', encoding='utf-8', newline='\n').write(src)
print('bytes', n0, '->', len(src))
