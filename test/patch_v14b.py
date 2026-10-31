# -*- coding: utf-8 -*-
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. 手機端字級放大（原本偏小） ----------
s = s.replace("body.touch .menu .mbtn { font-size: 13.5px; padding: 9px 6px; border-radius: 11px; }",
              "body.touch .menu .mbtn { font-size: 16.5px; padding: 11px 6px; border-radius: 13px; }")
s = s.replace("body.touch .menu .mbtn small { font-size: 9.5px; margin-top: 1px; }",
              "body.touch .menu .mbtn small { font-size: 11px; margin-top: 1px; }")
s = s.replace("body.touch .title-card h1 { font-size: 23px; }",
              "body.touch .title-card h1 { font-size: 27px; }")
s = s.replace("body.touch #scr-online .card h2 { font-size: 16px; margin-bottom: 2px; }",
              "body.touch #scr-online .card h2 { font-size: 19px; margin-bottom: 2px; }")
s = s.replace("body.touch #scr-online .desc { font-size: 10px; line-height: 1.45; margin-bottom: 6px; }",
              "body.touch #scr-online .desc { font-size: 11.5px; line-height: 1.5; margin-bottom: 6px; }")
s = s.replace("body.touch #scr-online .netcol > label { font-size: 10.5px; margin-bottom: 4px; }",
              "body.touch #scr-online .netcol > label { font-size: 12px; margin-bottom: 4px; }")

# ---------- 2. 繪本風主題覆寫（插在 </style> 前） ----------
theme = r"""
  /* ================================================================
     v1.4 繪本風主題（比照使用者提供的插畫：奶油底、木頭框、圓胖字）
     ================================================================ */
  :root {
    --ink: #5b3a1e;
    --ink-soft: #8a6a4a;
    --cream: #fff8e9;
    --cream2: #ffeccd;
    --woodline: #ecd0ab;
    --sun: #f4703c;
  }
  body {
    font-family: "Yuanti TC", "YuanTi TC", "HanziPen TC", "Comic Sans MS", "Marker Felt",
                 "PingFang TC", "Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif;
    background: #fdf3de;
    color: var(--ink);
  }
  /* 首頁／選單底圖：使用者提供的插畫（JS 於啟動時填入） */
  #titleBg {
    position: fixed; inset: 0; z-index: -2;
    background: #fdf3de center / cover no-repeat;
  }
  #titleBg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,252,244,.20), rgba(255,248,235,.44) 44%, rgba(255,245,226,.62));
  }
  .title-card h1 {
    font-size: 46px; letter-spacing: .1em;
    background: linear-gradient(180deg, #ffd98a, #ff9a4d 48%, #ef6d38);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 3px 0 rgba(255,255,255,.95)) drop-shadow(0 8px 12px rgba(150,90,40,.35));
  }
  .title-card .sub { color: #a97c52; font-size: 14.5px; letter-spacing: .3em; }
  .title-card .hint { color: #7d5a3a; font-size: 13.5px; line-height: 2.05; }
  .title-card .hint b { color: #c9502a; }
  .ver { background: rgba(255,255,255,.78); border-color: #e0b083; color: #a05f28; text-shadow: none; font-size: 12px; }
  .logo-big {
    background: linear-gradient(160deg, #ffb066, #f4703c);
    box-shadow: 0 18px 40px -14px rgba(200,110,40,.75), inset 0 2px 0 rgba(255,255,255,.5);
  }
  .menu { gap: 13px; }
  .mbtn {
    background: linear-gradient(180deg, #fffdf6, #ffedcf);
    border: 2px solid #e2b489; border-radius: 18px;
    color: #6b4222; font-size: 20px; font-weight: 900; letter-spacing: .06em;
    padding: 15px 18px; text-shadow: 0 1px 0 #fff;
    box-shadow: 0 4px 0 #dfb58c, 0 14px 24px -14px rgba(120,80,40,.55), inset 0 2px 0 #fff;
  }
  .mbtn:hover {
    transform: translateY(-2px); border-color: #ffb066;
    box-shadow: 0 6px 0 #dfb58c, 0 18px 28px -14px rgba(120,80,40,.6), inset 0 2px 0 #fff;
  }
  .mbtn:active { transform: translateY(2px); box-shadow: 0 2px 0 #dfb58c; }
  .mbtn small { font-size: 12.5px; color: #a8845f; font-weight: 700; letter-spacing: .02em; margin-top: 4px; }
  .mbtn.warm {
    background: linear-gradient(180deg, #ffa161, #f26b38); border-color: #ffc59b; color: #fff;
    text-shadow: 0 2px 0 rgba(160,60,20,.45);
    box-shadow: 0 4px 0 #c9502a, 0 16px 26px -12px rgba(220,90,50,.6), inset 0 2px 0 rgba(255,255,255,.45);
  }
  .mbtn.warm small { color: #ffe6d2; }
  .mbtn.bossbtn {
    background: linear-gradient(180deg, #ad74dd, #6f3ba8); border-color: #e0c6ff; color: #fff;
    text-shadow: 0 2px 0 rgba(70,30,120,.5);
    box-shadow: 0 4px 0 #502a7a, 0 16px 26px -12px rgba(120,60,180,.6), inset 0 2px 0 rgba(255,255,255,.35);
  }
  .mbtn.bossbtn small { color: #eed9ff; }
  .mbtn.bossbtn:hover { border-color: #f0e2ff; box-shadow: 0 6px 0 #502a7a, 0 18px 30px -12px rgba(140,80,200,.65), inset 0 2px 0 rgba(255,255,255,.4); }
  .padfocus {
    outline: 3px solid #f4703c !important; outline-offset: 3px !important;
    box-shadow: 0 0 0 6px rgba(244,112,60,.20), 0 0 22px rgba(244,112,60,.55) !important;
  }
  .card {
    background: linear-gradient(180deg, rgba(255,251,241,.97), rgba(255,243,224,.95));
    border: 2px solid #e8c39a; border-radius: 22px; color: var(--ink);
    box-shadow: 0 22px 46px -18px rgba(120,80,40,.45), inset 0 2px 0 #fff;
  }
  .card h2 { font-size: 26px; color: #7b4a1f; letter-spacing: .06em; }
  .card .desc { color: #8a6a4a; font-size: 14px; line-height: 1.8; }
  .field label { color: #96693f; font-size: 14px; letter-spacing: .04em; }
  .hint { color: #9a7a58; font-size: 12.5px; line-height: 1.85; }
  .hint b { color: #7b4a1f; }
  kbd { background: #fff2da; border: 1px solid #e2c39c; color: #8a5a2a; font-size: 12px; }
  .seg { gap: 7px; }
  .seg button {
    background: #fffaf0; border: 2px solid var(--woodline); color: #8a5f35;
    border-radius: 12px; font-size: 14px; font-weight: 800; padding: 9px 14px;
  }
  .seg button.sel {
    background: linear-gradient(180deg, #ffb066, #f4703c); border-color: #ffc9a0; color: #fff;
    text-shadow: 0 1px 0 rgba(150,60,20,.4); box-shadow: 0 3px 0 #c9502a;
  }
  .ghostbtn {
    background: #fffaf0; border: 2px solid #e2bd93; color: #8a5f35;
    font-size: 15px; border-radius: 14px; padding: 11px 22px;
  }
  .ghostbtn:hover { border-color: #f4703c; color: #c9502a; background: #fff3e2; }
  .minibtn { background: #fffaf0; border: 2px solid var(--woodline); color: #8a5f35; font-size: 13px; }
  .keybtn { background: #fffaf0; border: 2px solid var(--woodline); color: #7b4a1f; font-size: 13.5px; }
  .keybtn small { color: #a98a68; font-size: 11.5px; }
  .keybtn b { color: #d2691e; font-size: 15px; }
  .keybtn.listening { background: #fff0d6; border-color: #f4703c; color: #a33a10; }
  .stg { background: #fffaf0; border: 2px solid var(--woodline); color: #7b4a1f; }
  .stg b { font-size: 18px; }
  .stg span { color: #a98a68; font-size: 11.5px; }
  .stg.done { border-color: #7fc98a; }
  .stg:hover:not(:disabled) { border-color: #f4703c; }
  .chcard {
    background: linear-gradient(180deg, #fffdf6, #ffeed6);
    border: 2px solid var(--woodline); color: #7b4a1f;
  }
  .chcard:hover { border-color: #ffb066; }
  .chcard.sel {
    border-color: #f4703c; background: linear-gradient(180deg, #fff6e0, #ffe3bf);
    box-shadow: 0 0 0 3px rgba(244,112,60,.18), 0 8px 18px rgba(200,110,40,.25);
  }
  .chcard .cn { font-size: 11.5px; color: #7b4a1f; }
  .chcard .ct { font-size: 10px; color: #a98a68; }
  .chcard.sel .ct { color: #d2691e; }
  .chcard .ck { color: #f4703c; font-size: 12px; }
  .tinput, .pbox .pname { background: #fffdf6; border: 2px solid var(--woodline); color: #6b4222; font-size: 15px; }
  .netcode { background: #fffdf6; border: 2px dashed #e2bd93; color: #d2691e; font-size: 38px; }
  .pbox { background: #fffaf0; border: 2px solid var(--woodline); }
  .pbox .pw { color: #a98a68; font-size: 12px; }
  .pbox .pj { color: #7b4a1f; }
  .netcol > label { color: #96693f; font-size: 13px; }
  .roomitem, .netslot { background: #fffaf0; border: 2px solid var(--woodline); }
  .roomitem:hover { border-color: #f4703c; }
  .roomitem .rcode { color: #d2691e; }
  .roomitem .rinfo { color: #8a6a4a; }
  .roomempty { color: #a98a68; font-size: 13px; }
  .side .pcard { background: #fffaf0; border: 2px solid var(--woodline); }
  .side .pcard .plabel { color: #7b4a1f; font-size: 13px; }
  .side .pcard .pstars { color: #d2691e; }
  .game-top .chip { background: #fffaf0; border: 2px solid var(--woodline); color: #7b4a1f; font-size: 13px; }
  .game-top .chip b { color: #c9502a; font-size: 16.5px; }
  .game-top .chip.big b { font-size: 24px; }
  #pauseBtn { background: #fffaf0; border: 2px solid var(--woodline); color: #8a5f35; font-size: 13px; }
  .tips { color: #9a7a58; font-size: 12px; }
  .overlay-in { background: rgba(58,34,16,.72); }
  .ov-box h3 { font-size: 34px; color: #fff; text-shadow: 0 3px 0 rgba(120,60,20,.6), 0 10px 22px rgba(0,0,0,.45); }
  .ov-box p { color: #ffe9d0; font-size: 15px; }
  #banner span { text-shadow: 0 6px 26px rgba(255,150,70,.95), 0 3px 0 #b23a1f; }
  #toast {
    background: rgba(255,249,237,.96); border: 2px solid #e8c39a;
    color: #7b4a1f; font-size: 14px; box-shadow: 0 8px 20px rgba(120,80,40,.35);
  }
  /* 暫停選單：控制設定與首頁一致 */
  .pmset {
    display: grid; grid-template-columns: 1fr 1fr; gap: 4px 22px;
    text-align: left; margin: 10px auto 2px; max-width: 620px;
  }
  .pmset .field { margin: 9px 0; }
  .pmset .field label { color: #ffe2bf; font-size: 13px; }
  .pmset .seg button { background: rgba(255,248,235,.92); }
  .pmset .seg button.sel { background: linear-gradient(180deg,#ffb066,#f4703c); }
  .pm-panel {
    background: rgba(255,246,232,.10); border: 2px solid rgba(255,220,180,.35);
    border-radius: 16px; padding: 6px 14px 10px; margin-top: 6px;
  }
  .ov-box .pmhint { color: #ffd9b0; font-size: 12.5px; line-height: 1.7; }
"""
assert s.count('</style>') == 1
s = s.replace('</style>', theme + '</style>', 1)

# ---------- 3. 首頁底圖容器 + 啟動時填入插畫 ----------
old = '<body>\n<div class="wrap">'
assert old in s
s = s.replace(old, '<body>\n<div id="titleBg" aria-hidden="true"></div>\n<div class="wrap">', 1)

old = "Sprites.load();\nSolo.init();"
new = ("Sprites.load();\n"
       "(function () { var tb = document.getElementById('titleBg'); if (tb) tb.style.backgroundImage = 'url(' + IMG_TITLEBG + ')'; })();\n"
       "Solo.init();")
assert old in s
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8').write(s)
print('ok')
