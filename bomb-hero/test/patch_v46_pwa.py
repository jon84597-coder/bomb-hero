# -*- coding: utf-8 -*-
"""
v4.6：PWA（加入桌面捷徑）前端修補
  · <head> 加 manifest / theme-color / apple-touch-icon ＋ 提早攔 beforeinstallprompt
  · 右上角工具列加「📱 下載 App」按鈕（只在首頁、且不是用捷徑開啟時出現）
  · 點下去：有官方 prompt 就直接彈；iOS Safari 給圖文引導
  · 10 語字串（I18N_EXTRA）
  · 版本號 4.5 → 4.6、VERSION_LOG 新增一筆

index.html 全檔是 CRLF，一律用 binary 讀寫，不做換行轉換。
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # bomb-hero
P = os.path.join(ROOT, 'index.html')
NL = '\r\n'

src = io.open(P, 'rb').read().decode('utf-8')
orig_len = len(src)
hits = []


def sub(anchor, repl, tag):
    global src
    n = src.count(anchor)
    if n != 1:
        sys.exit('[FAIL] %s：anchor 出現 %d 次（必須剛好 1 次）' % (tag, n))
    src = src.replace(anchor, repl)
    hits.append(tag)


# ============================================================
# 1. <head>：manifest / meta / PWA bootstrap
# ============================================================
HEAD_ANCHOR = '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + NL

HEAD_ADD = (
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' + NL +
    '<!-- v4.6：PWA —— 可以「加入桌面捷徑／手機主畫面」，從捷徑開啟就是全螢幕獨立視窗 -->' + NL +
    '<link rel="manifest" href="./manifest.json">' + NL +
    '<meta name="theme-color" content="#ff4500">' + NL +
    '<meta name="application-name" content="\u7206\u7206\u82f1\u96c4">' + NL +
    '<meta name="mobile-web-app-capable" content="yes">' + NL +
    '<meta name="apple-mobile-web-app-capable" content="yes">' + NL +
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">' + NL +
    '<meta name="apple-mobile-web-app-title" content="\u7206\u7206\u82f1\u96c4">' + NL +
    '<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">' + NL +
    '<link rel="icon" type="image/png" sizes="32x32" href="./icons/favicon-32.png">' + NL +
    '<script>' + NL +
    '/* ============================================================' + NL +
    '   v4.6：PWA 前置（刻意放在 <head>）' + NL +
    '   beforeinstallprompt 可能在 1.8MB 的主程式解析完之前就 fire，' + NL +
    '   晚一步掛監聽就永遠等不到 → 先把事件攔下來存著，主程式再來拿。' + NL +
    '   ============================================================ */' + NL +
    '(function () {' + NL +
    "  'use strict';" + NL +
    '  var P = window.BHPWA = {' + NL +
    '    standalone: false,    // 是否已經是用捷徑／獨立視窗開的（要自動隱藏按鈕）' + NL +
    '    deferred: null,       // 攔下來的 beforeinstallprompt 事件（只能用一次）' + NL +
    '    canPrompt: false,     // 有沒有拿到官方安裝提示' + NL +
    '    installed: false,     // 這次工作階段剛安裝完成' + NL +
    '    updated: false,       // 有新版的 Service Worker 接手了' + NL +
    '    ios: false, android: false, safari: false, firefox: false,' + NL +
    '    secure: false, swReady: false, swError: \'\'' + NL +
    '  };' + NL +
    '' + NL +
    '  /* ---- 1. 判斷是不是「已經用捷徑開的」 ---- */' + NL +
    '  function detectStandalone() {' + NL +
    '    try {' + NL +
    '      if (window.matchMedia) {' + NL +
    "        if (matchMedia('(display-mode: standalone)').matches) return true;" + NL +
    "        if (matchMedia('(display-mode: fullscreen)').matches) return true;" + NL +
    "        if (matchMedia('(display-mode: minimal-ui)').matches) return true;" + NL +
    '      }' + NL +
    '    } catch (e) {}' + NL +
    '    if (navigator.standalone === true) return true;                 // iOS Safari' + NL +
    "    try { if ((document.referrer || '').indexOf('android-app://') === 0) return true; } catch (e) {}" + NL +
    '    return false;' + NL +
    '  }' + NL +
    '  P.standalone = detectStandalone();' + NL +
    '' + NL +
    '  /* ---- 2. 平台判斷（決定點下去要給哪一種引導） ---- */' + NL +
    "  var ua = navigator.userAgent || '';" + NL +
    "  P.ios = /iPad|iPhone|iPod/.test(ua) ||" + NL +
    "          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);" + NL +
    "  P.android = /Android/i.test(ua);" + NL +
    "  P.firefox = /Firefox|FxiOS/i.test(ua);" + NL +
    "  P.safari = !P.firefox && /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|Android/i.test(ua);" + NL +
    "  P.secure = (location.protocol === 'https:' || location.hostname === 'localhost' ||" + NL +
    "              location.hostname === '127.0.0.1');" + NL +
    '' + NL +
    '  /* ---- 3. 攔下官方安裝提示，存起來等玩家按按鈕 ---- */' + NL +
    "  window.addEventListener('beforeinstallprompt', function (e) {" + NL +
    '    e.preventDefault();' + NL +
    '    P.deferred = e;' + NL +
    '    P.canPrompt = true;' + NL +
    "    document.documentElement.setAttribute('data-pwa', 'ready');" + NL +
    '    if (P.onReady) { try { P.onReady(); } catch (err) {} }' + NL +
    '  });' + NL +
    '' + NL +
    "  window.addEventListener('appinstalled', function () {" + NL +
    '    P.deferred = null;' + NL +
    '    P.canPrompt = false;' + NL +
    '    P.installed = true;' + NL +
    "    document.documentElement.setAttribute('data-pwa', 'installed');" + NL +
    '    if (P.onInstalled) { try { P.onInstalled(); } catch (err) {} }' + NL +
    '  });' + NL +
    '' + NL +
    '  /* ---- 4. 從捷徑開啟／關掉時即時反應（display-mode 會變） ---- */' + NL +
    '  try {' + NL +
    "    var mq = window.matchMedia('(display-mode: standalone)');" + NL +
    '    var onMode = function () {' + NL +
    '      P.standalone = detectStandalone();' + NL +
    '      if (P.onModeChange) { try { P.onModeChange(); } catch (err) {} }' + NL +
    '    };' + NL +
    "    if (mq.addEventListener) mq.addEventListener('change', onMode);" + NL +
    '    else if (mq.addListener) mq.addListener(onMode);' + NL +
    '  } catch (e) {}' + NL +
    '' + NL +
    '  /* ---- 5. 註冊 Service Worker（file:// 直接跳過，不然 console 會噴錯） ---- */' + NL +
    '  P.register = function () {' + NL +
    "    if (!('serviceWorker' in navigator)) { P.swError = 'unsupported'; return; }" + NL +
    "    if (!P.secure) { P.swError = 'insecure'; return; }" + NL +
    '    try {' + NL +
    "      navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (reg) {" + NL +
    '        P.swReady = true;' + NL +
    "        document.documentElement.setAttribute('data-sw', 'ready');" + NL +
    '        try {' + NL +
    "          reg.addEventListener('updatefound', function () {" + NL +
    '            var w = reg.installing;' + NL +
    '            if (!w) return;' + NL +
    "            w.addEventListener('statechange', function () {" + NL +
    '              if (w.state === \'installed\' && navigator.serviceWorker.controller) {' + NL +
    '                P.updated = true;' + NL +
    '                if (P.onUpdate) { try { P.onUpdate(); } catch (err) {} }' + NL +
    '              }' + NL +
    '            });' + NL +
    '          });' + NL +
    '        } catch (err) {}' + NL +
    '      }).catch(function (err) {' + NL +
    '        P.swError = String((err && err.message) || err);' + NL +
    '      });' + NL +
    '    } catch (err) { P.swError = String((err && err.message) || err); }' + NL +
    '  };' + NL +
    '  P.register();' + NL +
    '})();' + NL +
    '</script>' + NL
)

sub(HEAD_ANCHOR, HEAD_ADD, 'head')

# ============================================================
# 2. CSS
# ============================================================
CSS_ANCHOR = NL + '</style>' + NL + '</head>'

CSS_ADD = (
    NL + NL +
    '  /* ===== v4.6：PWA「加入桌面捷徑」按鈕（只在首頁、且不是捷徑開啟時出現） ===== */' + NL +
    '  .navbtn.pwa {' + NL +
    '    display: none; gap: 6px;' + NL +
    '    background: linear-gradient(180deg, #3a2a16, #241a10);' + NL +
    '    border-color: rgba(255,190,110,.85); color: #ffe6c9;' + NL +
    '  }' + NL +
    '  body.pwa-on .navbtn.pwa { display: inline-flex; }' + NL +
    '  .navbtn.pwa .pwico {' + NL +
    '    width: 19px; height: 19px; border-radius: 6px; flex: 0 0 auto;' + NL +
    '    background: #452d2a url("./icons/pwa-logo.png") center/cover no-repeat;' + NL +
    '    box-shadow: 0 0 0 1px rgba(255,200,140,.55), 0 2px 6px -2px rgba(0,0,0,.85);' + NL +
    '  }' + NL +
    '  /* 已經抓到官方安裝提示 → 輕輕呼吸，提醒這裡可以按 */' + NL +
    '  .navbtn.pwa.ready { animation: pwaBreath 2.6s ease-in-out infinite; }' + NL +
    '  @keyframes pwaBreath {' + NL +
    '    0%, 100% { box-shadow: 0 6px 18px -8px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.14); }' + NL +
    '    50% { box-shadow: 0 6px 22px -6px rgba(255,170,80,.9), inset 0 1px 0 rgba(255,255,255,.24); }' + NL +
    '  }' + NL +
    '  @media (prefers-reduced-motion: reduce) { .navbtn.pwa.ready { animation: none; } }' + NL +
    '' + NL +
    '  /* 安裝引導小卡（iOS Safari／Firefox 等沒有 beforeinstallprompt 的瀏覽器） */' + NL +
    '  .pwasheet {' + NL +
    '    position: fixed; inset: 0; z-index: 1500;' + NL +
    '    display: flex; align-items: center; justify-content: center; padding: 16px;' + NL +
    '    background: rgba(6,9,18,.8);' + NL +
    '    backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);' + NL +
    '  }' + NL +
    '  .pwasheet.hide { display: none; }' + NL +
    '  .pwacard {' + NL +
    '    width: min(420px, 100%); max-height: min(86vh, 640px); overflow-y: auto;' + NL +
    '    padding: 15px 15px 13px; border-radius: 20px; text-align: center;' + NL +
    '    background: linear-gradient(180deg, #162034, #0d1424);' + NL +
    '    border: 2px solid rgba(255,180,120,.42);' + NL +
    '    box-shadow: 0 26px 60px -24px rgba(0,0,0,.95);' + NL +
    '  }' + NL +
    '  .pwahead { display: flex; align-items: center; gap: 9px; }' + NL +
    '  .pwahead .pwabig {' + NL +
    '    width: 34px; height: 34px; border-radius: 10px; flex: 0 0 auto;' + NL +
    '    background: #452d2a url("./icons/pwa-logo.png") center/cover no-repeat;' + NL +
    '    box-shadow: 0 0 0 1.5px rgba(255,200,140,.55);' + NL +
    '  }' + NL +
    '  .pwahead h3 { font-size: 15.5px; font-weight: 900; color: #ffe6a3; letter-spacing: .04em; }' + NL +
    '  .pwahead .pwax {' + NL +
    '    margin-left: auto; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;' + NL +
    '    background: #26324f; border: 1px solid #3a4a72; color: #dbe8ff;' + NL +
    '    font-size: 13px; font-weight: 900; font-family: inherit;' + NL +
    '  }' + NL +
    '  .pwahead .pwax:hover { background: #33436b; }' + NL +
    '  .pwahero { font-size: 42px; line-height: 1; margin: 12px 0 4px; }' + NL +
    '  .pwasteps { list-style: none; text-align: left; display: grid; gap: 8px; margin: 8px 0 4px; counter-reset: pwastep; }' + NL +
    '  .pwasteps li {' + NL +
    '    position: relative; padding: 10px 12px 10px 38px; border-radius: 12px;' + NL +
    '    background: rgba(255,255,255,.055); border: 1px solid rgba(255,200,140,.18);' + NL +
    '    font-size: 13.5px; line-height: 1.7; color: #dfe8fb; counter-increment: pwastep;' + NL +
    '  }' + NL +
    '  .pwasteps li::before {' + NL +
    '    content: counter(pwastep); position: absolute; left: 10px; top: 50%; transform: translateY(-50%);' + NL +
    '    width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;' + NL +
    '    font-size: 11.5px; font-weight: 900; color: #1a1208;' + NL +
    '    background: linear-gradient(180deg, #ffd79a, #ffab52);' + NL +
    '  }' + NL +
    '  .pwanote { font-size: 11.5px; color: #7d8db0; line-height: 1.8; margin: 10px 2px 12px; }' + NL +
    '  .pwabtn {' + NL +
    '    width: 100%; padding: 12px; border-radius: 13px; cursor: pointer; font-family: inherit;' + NL +
    '    font-size: 15px; font-weight: 900; letter-spacing: .1em; color: #2a1a08; border: 0;' + NL +
    '    background: linear-gradient(180deg, #ffd79a, #ffab52);' + NL +
    '    box-shadow: 0 10px 22px -12px rgba(255,170,80,.9);' + NL +
    '  }' + NL +
    '  .pwabtn:active { transform: scale(.98); }' + NL +
    NL + '</style>' + NL + '</head>'
)

sub(CSS_ANCHOR, CSS_ADD, 'css')

# ============================================================
# 3. 右上角工具列按鈕
# ============================================================
BTN_ANCHOR = ('       title="\u5beb\u4fe1\u7d66\u4f5c\u8005\uff1ajon84597@gmail.com">\u2709\ufe0f <b>\u4fe1\u7bb1</b></a>' + NL)

BTN_ADD = BTN_ANCHOR + (
    '    <!-- v4.6：PWA 加入桌面捷徑（只在首頁顯示；已經用捷徑開啟時自動隱藏） -->' + NL +
    '    <button class="navbtn pwa" id="btnInstall" type="button" title="\u52a0\u5165\u684c\u9762\u6377\u5f91">' + NL +
    '      <span class="pwico" aria-hidden="true"></span><b>\u4e0b\u8f09 App</b>' + NL +
    '    </button>' + NL
)

sub(BTN_ANCHOR, BTN_ADD, 'btn')

# ============================================================
# 4. 安裝引導小卡 HTML
# ============================================================
SHEET_ANCHOR = '<!-- v4.0\uff1a\u7248\u672c\u66f4\u65b0\u5167\u5bb9\u9762\u677f -->'

SHEET_ADD = (
    '<!-- v4.6\uff1a\u52a0\u5165\u684c\u9762\u6377\u5f91\u7684\u5716\u6587\u5f15\u5c0e' + NL +
    '     （iOS Safari \u4e0d\u652f\u63f4 beforeinstallprompt\uff0c\u53ea\u80fd\u9760\u624b\u52d5\u5b89\u88dd\uff09 -->' + NL +
    '<div class="pwasheet hide" id="pwaSheet">' + NL +
    '  <div class="pwacard">' + NL +
    '    <div class="pwahead">' + NL +
    '      <span class="pwabig" aria-hidden="true"></span>' + NL +
    '      <h3 id="pwaTitle">\U0001f4f1 \u52a0\u5165\u684c\u9762\u6377\u5f91</h3>' + NL +
    '      <button class="pwax" id="pwaClose" type="button" title="\u95dc\u9589">\u2715</button>' + NL +
    '    </div>' + NL +
    '    <div id="pwaBody"></div>' + NL +
    '    <button class="pwabtn" id="pwaOk" type="button">\u77e5\u9053\u4e86</button>' + NL +
    '  </div>' + NL +
    '</div>' + NL + NL +
    '<!-- v4.0\uff1a\u7248\u672c\u66f4\u65b0\u5167\u5bb9\u9762\u677f -->'
)

sub(SHEET_ANCHOR, SHEET_ADD, 'sheet')

# ============================================================
# 5. 窄螢幕：按鈕只留圖示
# ============================================================
NARROW_OLD = '    #acctChip b, #btnMusic b, #btnLang b, #btnSfx b { display: none; }'
NARROW_NEW = '    #acctChip b, #btnMusic b, #btnLang b, #btnSfx b, #btnInstall b { display: none; }'
sub(NARROW_OLD, NARROW_NEW, 'narrow')

# ============================================================
# 6. 10 語字串：接在 I18N_EXTRA 最後一筆之後
# ============================================================
PWA_I18N = [
    ('pwa.btn', ['\u4e0b\u8f09 App', '\u4e0b\u8f7d App', 'Get App', '\u30a2\u30d7\u30ea\u3092\u5165\u624b', '\uc571 \ubc1b\uae30',
                 '\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14\u0e41\u0e2d\u0e1b', 'T\u1ea3i App', '\u0421\u043a\u0430\u0447\u0430\u0442\u044c',
                 'App holen', 'Scarica App']),
    ('pwa.tip', ['\u52a0\u5165\u684c\u9762\u6377\u5f91', '\u52a0\u5165\u684c\u9762\u5feb\u6377\u65b9\u5f0f', 'Add to Home Screen',
                 '\u30db\u30fc\u30e0\u753b\u9762\u306b\u8ffd\u52a0', '\ud648 \ud654\uba74\uc5d0 \ucd94\uac00', '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e42\u0e2e\u0e21',
                 'Th\u00eam v\u00e0o m\u00e0n h\u00ecnh ch\u00ednh', '\u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d',
                 'Zum Startbildschirm', 'Aggiungi a Home']),
    ('pwa.title', ['\U0001f4f1 \u52a0\u5165\u684c\u9762\u6377\u5f91', '\U0001f4f1 \u52a0\u5165\u684c\u9762\u5feb\u6377\u65b9\u5f0f', '\U0001f4f1 Add to Home Screen',
                   '\U0001f4f1 \u30db\u30fc\u30e0\u753b\u9762\u306b\u8ffd\u52a0', '\U0001f4f1 \ud648 \ud654\uba74\uc5d0 \ucd94\uac00',
                   '\U0001f4f1 \u0e40\u0e1e\u0e34\u0e48\u0e21\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e42\u0e2e\u0e21',
                   '\U0001f4f1 Th\u00eam v\u00e0o m\u00e0n h\u00ecnh ch\u00ednh', '\U0001f4f1 \u041d\u0430 \u0433\u043b\u0430\u0432\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d',
                   '\U0001f4f1 Zum Startbildschirm', '\U0001f4f1 Aggiungi a Home']),
    ('pwa.iosA', ['\u9ede Safari \u4e0b\u65b9\uff08\u6216\u4e0a\u65b9\uff09\u7684\u300c\u5206\u4eab\u300d\u6309\u9245',
                  '\u70b9 Safari \u4e0b\u65b9\uff08\u6216\u4e0a\u65b9\uff09\u7684\u300c\u5206\u4eab\u300d\u6309\u94ae',
                  'Tap the Share button at the bottom of Safari',
                  'Safari \u4e0b\u90e8\uff08\u307e\u305f\u306f\u4e0a\u90e8\uff09\u306e\u300c\u5171\u6709\u300d\u30dc\u30bf\u30f3\u3092\u30bf\u30c3\u30d7',
                  'Safari \ud558\ub2e8(\ub610\ub294 \uc0c1\ub2e8)\uc758 \uacf5\uc720 \ubc84\ud2bc\uc744 \ub204\ub974\uc138\uc694',
                  '\u0e41\u0e15\u0e30\u0e1b\u0e38\u0e48\u0e21\u0e41\u0e0a\u0e23\u0e4c\u0e17\u0e35\u0e48\u0e14\u0e49\u0e32\u0e19\u0e25\u0e48\u0e32\u0e07\u0e02\u0e2d\u0e07 Safari',
                  'Nh\u1ea5n n\u00fat Chia s\u1ebb \u1edf cu\u1ed1i Safari',
                  '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443 \u00ab\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f\u00bb \u0432\u043d\u0438\u0437\u0443 Safari',
                  'Tippe unten in Safari auf \u201eTeilen\u201c',
                  'Tocca il pulsante Condividi in basso in Safari']),
    ('pwa.iosB', ['\u5728\u9078\u55ae\u88e1\u9078\u300c\u52a0\u5165\u4e3b\u756b\u9762\u300d\uff0c\u518d\u6309\u300c\u65b0\u589e\u300d',
                  '\u5728\u83dc\u5355\u91cc\u9009\u300c\u52a0\u5165\u4e3b\u5c4f\u5e55\u300d\uff0c\u518d\u6309\u300c\u6dfb\u52a0\u300d',
                  'Choose \u201cAdd to Home Screen\u201d, then tap \u201cAdd\u201d',
                  '\u300c\u30db\u30fc\u30e0\u753b\u9762\u306b\u8ffd\u52a0\u300d\u3092\u9078\u3073\u3001\u300c\u8ffd\u52a0\u300d\u3092\u30bf\u30c3\u30d7',
                  '\u2018\ud648 \ud654\uba74\uc5d0 \ucd94\uac00\u2019\ub97c \uace0\ub974\uace0 \u2018\ucd94\uac00\u2019\ub97c \ub204\ub974\uc138\uc694',
                  '\u0e40\u0e25\u0e37\u0e2d\u0e01 "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e42\u0e2e\u0e21" \u0e41\u0e25\u0e49\u0e27\u0e01\u0e14 "\u0e40\u0e1e\u0e34\u0e48\u0e21"',
                  'Ch\u1ecdn \u201cTh\u00eam v\u00e0o MH ch\u00ednh\u201d r\u1ed3i nh\u1ea5n \u201cTh\u00eam\u201d',
                  '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u00ab\u041d\u0430 \u044d\u043a\u0440\u0430\u043d \u00ab\u0414\u043e\u043c\u043e\u0439\u00bb\u00bb \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c\u00bb',
                  'W\u00e4hle \u201eZum Home-Bildschirm\u201c und tippe auf \u201eHinzuf\u00fcgen\u201c',
                  'Scegli \u201eAggiungi a Home\u201c e tocca \u201eAggiungi\u201c']),
    ('pwa.desktop', ['\u6309\u700f\u89bd\u5668\u7db2\u5740\u5217\u53f3\u5074\u7684\u300c\u5b89\u88dd\u300d\u5c0f\u5716\u793a\uff0c\u5c31\u80fd\u5efa\u7acb\u684c\u9762\u6377\u5f91',
                     '\u6309\u6d4f\u89c8\u5668\u5730\u5740\u680f\u53f3\u4fa7\u7684\u300c\u5b89\u88c5\u300d\u5c0f\u56fe\u6807\uff0c\u5c31\u80fd\u521b\u5efa\u684c\u9762\u5feb\u6377\u65b9\u5f0f',
                     'Tap the install icon on the right side of the address bar to create a shortcut',
                     '\u30a2\u30c9\u30ec\u30b9\u30d0\u30fc\u53f3\u5074\u306e\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u30a2\u30a4\u30b3\u30f3\u3092\u62bc\u3059\u3068\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u3092\u4f5c\u6210\u3067\u304d\u307e\u3059',
                     '\uc8fc\uc18c\ucc3d \uc624\ub978\ucabd\uc758 \uc124\uce58 \uc544\uc774\ucf58\uc744 \ub204\ub974\uba74 \ubc14\ub85c\uac00\uae30\uac00 \ub9cc\ub4e4\uc5b4\uc9d1\ub2c8\ub2e4',
                     '\u0e01\u0e14\u0e44\u0e2d\u0e04\u0e2d\u0e19\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07\u0e17\u0e32\u0e07\u0e02\u0e27\u0e32\u0e02\u0e2d\u0e07\u0e41\u0e16\u0e1a\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e17\u0e32\u0e07\u0e25\u0e31\u0e14',
                     'Nh\u1ea5n bi\u1ec3u t\u01b0\u1ee3ng c\u00e0i \u0111\u1eb7t b\u00ean ph\u1ea3i thanh \u0111\u1ecba ch\u1ec9 \u0111\u1ec3 t\u1ea1o l\u1ed1i t\u1eaft',
                     '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u0437\u043d\u0430\u0447\u043e\u043a \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0438 \u0441\u043f\u0440\u0430\u0432\u0430 \u043e\u0442 \u0430\u0434\u0440\u0435\u0441\u043d\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0438, \u0447\u0442\u043e\u0431\u044b \u0441\u043e\u0437\u0434\u0430\u0442\u044c \u044f\u0440\u043b\u044b\u043a',
                     'Tippe rechts in der Adressleiste auf das Installationssymbol, um eine Verkn\u00fcpfung zu erstellen',
                     'Tocca l\u2019icona di installazione a destra della barra degli indirizzi per creare la scorciatoia']),
    ('pwa.manual', ['\u6253\u958b\u700f\u89bd\u5668\u53f3\u4e0a\u89d2\u7684\u9078\u55ae\uff0c\u9078\u300c\u5b89\u88dd\u61c9\u7528\u7a0b\u5f0f\u300d\u6216\u300c\u52a0\u5230\u4e3b\u756b\u9762\u300d',
                    '\u6253\u5f00\u6d4f\u89c8\u5668\u53f3\u4e0a\u89d2\u7684\u83dc\u5355\uff0c\u9009\u300c\u5b89\u88c5\u5e94\u7528\u300d\u6216\u300c\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55\u300d',
                    'Open the browser menu (\u22ee) and choose \u201cInstall app\u201d or \u201cAdd to Home screen\u201d',
                    '\u30d6\u30e9\u30a6\u30b6\u306e\u30e1\u30cb\u30e5\u30fc\uff08\u22ee\uff09\u304b\u3089\u300c\u30a2\u30d7\u30ea\u3092\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u300d\u307e\u305f\u306f\u300c\u30db\u30fc\u30e0\u753b\u9762\u306b\u8ffd\u52a0\u300d\u3092\u9078\u629e',
                    '\ube0c\ub77c\uc6b0\uc800 \uba54\ub274(\u22ee)\uc5d0\uc11c \u2018\uc571 \uc124\uce58\u2019 \ub610\ub294 \u2018\ud648 \ud654\uba74\uc5d0 \ucd94\uac00\u2019\ub97c \uc120\ud0dd\ud558\uc138\uc694',
                    '\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e21\u0e19\u0e39\u0e40\u0e1a\u0e23\u0e32\u0e27\u0e4c\u0e40\u0e0b\u0e2d\u0e23\u0e4c (\u22ee) \u0e41\u0e25\u0e49\u0e27\u0e40\u0e25\u0e37\u0e2d\u0e01 "\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07\u0e41\u0e2d\u0e1b" \u0e2b\u0e23\u0e37\u0e2d "\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e44\u0e1b\u0e17\u0e35\u0e48\u0e2b\u0e19\u0e49\u0e32\u0e08\u0e2d\u0e42\u0e2e\u0e21"',
                    'M\u1edf menu tr\u00ecnh duy\u1ec7t (\u22ee) v\u00e0 ch\u1ecdn \u201cC\u00e0i \u1ee9ng d\u1ee5ng\u201d ho\u1eb7c \u201cTh\u00eam v\u00e0o MH ch\u00ednh\u201d',
                    '\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043c\u0435\u043d\u044e \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (\u22ee) \u0438 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u00ab\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435\u00bb \u0438\u043b\u0438 \u00ab\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043d\u0430 \u0433\u043b\u0430\u0432\u043d\u044b\u0439 \u044d\u043a\u0440\u0430\u043d\u00bb',
                    '\u00d6ffne das Browsermen\u00fc (\u22ee) und w\u00e4hle \u201eApp installieren\u201c oder \u201eZum Startbildschirm\u201c',
                    'Apri il menu del browser (\u22ee) e scegli \u201eInstalla app\u201c o \u201eAggiungi a Home\u201c']),
    ('pwa.note', ['\u5f9e\u6377\u5f91\u958b\u555f\u6642\u6c92\u6709\u7db2\u5740\u5217\uff0c\u5168\u87a2\u5e55\u6c88\u6d78\u66f4\u597d\u73a9',
                  '\u4ece\u5feb\u6377\u65b9\u5f0f\u6253\u5f00\u65f6\u6ca1\u6709\u5730\u5740\u680f\uff0c\u5168\u5c4f\u6c89\u6d78\u66f4\u597d\u73a9',
                  'Opened from the shortcut it runs full screen, with no address bar',
                  '\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u304b\u3089\u8d77\u52d5\u3059\u308b\u3068\u30a2\u30c9\u30ec\u30b9\u30d0\u30fc\u306a\u3057\u306e\u5168\u753b\u9762\u3067\u904a\u3079\u307e\u3059',
                  '\ubc14\ub85c\uac00\uae30\ub85c \uc5f4\uba74 \uc8fc\uc18c\ucc3d \uc5c6\uc774 \uc804\uccb4 \ud654\uba74\uc73c\ub85c \uc990\uae38 \uc218 \uc788\uc2b5\ub2c8\ub2e4',
                  '\u0e40\u0e1b\u0e34\u0e14\u0e08\u0e32\u0e01\u0e17\u0e32\u0e07\u0e25\u0e31\u0e14\u0e08\u0e30\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e16\u0e1a\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48 \u0e40\u0e25\u0e48\u0e19\u0e40\u0e15\u0e47\u0e21\u0e08\u0e2d\u0e2a\u0e19\u0e38\u0e01\u0e01\u0e27\u0e48\u0e32',
                  'M\u1edf t\u1eeb l\u1ed1i t\u1eaft s\u1ebd kh\u00f4ng c\u00f3 thanh \u0111\u1ecba ch\u1ec9, to\u00e0n m\u00e0n h\u00ecnh',
                  '\u0417\u0430\u043f\u0443\u0441\u043a \u0441 \u044f\u0440\u043b\u044b\u043a\u0430 \u2014 \u043d\u0430 \u0432\u0435\u0441\u044c \u044d\u043a\u0440\u0430\u043d, \u0431\u0435\u0437 \u0430\u0434\u0440\u0435\u0441\u043d\u043e\u0439 \u0441\u0442\u0440\u043e\u043a\u0438',
                  'Vom Symbol gestartet l\u00e4uft es im Vollbild ohne Adressleiste',
                  'Avviata dalla scorciatoia gira a schermo intero, senza barra degli indirizzi']),
    ('pwa.ok', ['\u77e5\u9053\u4e86', '\u77e5\u9053\u4e86', 'Got it', '\u4e86\u89e3', '\ud655\uc778', '\u0e40\u0e02\u0e49\u0e32\u0e43\u0e08\u0e41\u0e25\u0e49\u0e27',
                '\u0110\u00e3 hi\u1ec3u', '\u041f\u043e\u043d\u044f\u0442\u043d\u043e', 'Verstanden', 'Ho capito']),
    ('pwa.done', ['\u5df2\u52a0\u5165\u684c\u9762\u6377\u5f91 \U0001f389', '\u5df2\u52a0\u5165\u684c\u9762\u5feb\u6377\u65b9\u5f0f \U0001f389', 'Shortcut added \U0001f389',
                  '\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8\u3092\u8ffd\u52a0\u3057\u307e\u3057\u305f \U0001f389', '\ubc14\ub85c\uac00\uae30\ub97c \ucd94\uac00\ud588\uc5b4\uc694 \U0001f389',
                  '\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e17\u0e32\u0e07\u0e25\u0e31\u0e14\u0e41\u0e25\u0e49\u0e27 \U0001f389', '\u0110\u00e3 th\u00eam l\u1ed1i t\u1eaft \U0001f389',
                  '\u042f\u0440\u043b\u044b\u043a \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d \U0001f389', 'Verkn\u00fcpfung hinzugef\u00fcgt \U0001f389', 'Scorciatoia aggiunta \U0001f389']),
    ('pwa.cancel', ['\u5df2\u53d6\u6d88\u5b89\u88dd', '\u5df2\u53d6\u6d88\u5b89\u88c5', 'Install cancelled', '\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u3092\u30ad\u30e3\u30f3\u30bb\u30eb\u3057\u307e\u3057\u305f',
                    '\uc124\uce58\ub97c \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4', '\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e01\u0e32\u0e23\u0e15\u0e34\u0e14\u0e15\u0e31\u0e49\u0e07\u0e41\u0e25\u0e49\u0e27',
                    '\u0110\u00e3 hu\u1ef7 c\u00e0i \u0111\u1eb7t', '\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430 \u043e\u0442\u043c\u0435\u043d\u0435\u043d\u0430',
                    'Installation abgebrochen', 'Installazione annullata']),
    ('pwa.already', ['\u5df2\u7d93\u662f\u6377\u5f91\u958b\u555f\u4e86 \U0001f64c', '\u5df2\u7ecf\u662f\u5feb\u6377\u65b9\u5f0f\u6253\u5f00\u4e86 \U0001f64c', 'Already running as an app \U0001f64c',
                     '\u3059\u3067\u306b\u30a2\u30d7\u30ea\u3068\u3057\u3066\u8d77\u52d5\u4e2d\u3067\u3059 \U0001f64c', '\uc774\ubbf8 \uc571\uc73c\ub85c \uc2e4\ud589 \uc911\uc785\ub2c8\ub2e4 \U0001f64c',
                     '\u0e40\u0e1b\u0e34\u0e14\u0e40\u0e1b\u0e47\u0e19\u0e41\u0e2d\u0e1b\u0e2d\u0e22\u0e39\u0e48\u0e41\u0e25\u0e49\u0e27 \U0001f64c', '\u0110ang ch\u1ea1y d\u1ea1ng \u1ee9ng d\u1ee5ng r\u1ed3i \U0001f64c',
                     '\u0423\u0436\u0435 \u0437\u0430\u043f\u0443\u0449\u0435\u043d\u043e \u043a\u0430\u043a \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \U0001f64c',
                     'L\u00e4uft bereits als App \U0001f64c', '\u00c8 gi\u00e0 in esecuzione come app \U0001f64c']),
]
LANGS = ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it']


def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


i18n_lines = []
for key, vals in PWA_I18N:
    assert len(vals) == len(LANGS), key
    parts = ', '.join('%s: %s' % (jsq(lg), jsq(v)) for lg, v in zip(LANGS, vals))
    i18n_lines.append("  " + jsq(key) + ": { " + parts + " }")
I18N_BLOCK = ',\r\n'.join(i18n_lines)

I18N_ANCHOR = '  }};\r\n(function () {\r\n  for (const k in I18N_EXTRA) {'
I18N_REPL = '  },\r\n' + I18N_BLOCK + '\r\n};\r\n(function () {\r\n  for (const k in I18N_EXTRA) {'
sub(I18N_ANCHOR, I18N_REPL, 'i18n')

# ============================================================
# 7. 主程式：PWA UI 與觸發邏輯（插在「下一步」快捷鈕之前）
# ============================================================
JS_ANCHOR = '/* ---- v3.1\uff1a\u53f3\u4e0a\u89d2\u300c\u4e0b\u4e00\u6b65\u300d\u5feb\u6377\u9215 ---- */'

JS_ADD = '''/* ---- v4.6：PWA「加入桌面捷徑」 ---- */
// 攔事件的程式在 <head>（免得 beforeinstallprompt 太早 fire 被漏掉），這裡只管 UI 與觸發。
var pwaHintKind = '';          // 目前開著的引導種類（換語言時要重畫）
function pwaCore() { return window.BHPWA || null; }

function pwaSync() {
  var P = pwaCore();
  var on = !!P && !P.standalone && Screen.current === 'title';
  document.body.classList.toggle('pwa-on', on);
  var btn = $id('btnInstall');
  if (!btn) return;
  btn.classList.toggle('ready', !!(P && P.canPrompt && !P.installed));
  btn.title = t('pwa.tip');
}

function pwaHintHtml(kind) {
  var steps;
  if (kind === 'ios') steps = [t('pwa.iosA'), t('pwa.iosB')];
  else if (kind === 'manual') steps = [t('pwa.manual')];
  else steps = [t('pwa.desktop')];
  var lis = '';
  for (var i = 0; i < steps.length; i++) lis += '<li>' + steps[i] + '</li>';
  var ico = kind === 'ios' ? '\\uD83D\\uDCF2' : '\\uD83D\\uDCBB';
  return '<div class="pwahero">' + ico + '</div><ol class="pwasteps">' + lis + '</ol>' +
         '<p class="pwanote">' + t('pwa.note') + '</p>';
}

function pwaHint(kind) {
  var sheet = $id('pwaSheet'), body = $id('pwaBody'), title = $id('pwaTitle');
  if (!sheet || !body) return;
  pwaHintKind = kind || 'desktop';
  body.innerHTML = pwaHintHtml(pwaHintKind);
  if (title) title.textContent = t('pwa.title');
  sheet.classList.remove('hide');
}
function pwaHintClose() {
  var s = $id('pwaSheet');
  if (s) s.classList.add('hide');
  pwaHintKind = '';
}
function pwaRefreshHint() { if (pwaHintKind) pwaHint(pwaHintKind); }

function pwaInstall() {
  var P = pwaCore();
  if (!P) return;
  if (P.standalone) { toast(t('pwa.already'), 2.2); return; }

  // 1) 有攔到官方安裝提示 → 直接叫出瀏覽器自己的安裝框
  var ev = P.deferred;
  if (ev && typeof ev.prompt === 'function') {
    P.deferred = null;
    P.canPrompt = false;
    pwaSync();
    try { ev.prompt(); } catch (e) {}
    var choice = ev.userChoice;
    if (choice && typeof choice.then === 'function') {
      choice.then(function (r) {
        if (r && r.outcome === 'accepted') toast(t('pwa.done'), 2.6);
        else toast(t('pwa.cancel'), 2.2);
      }).catch(function () {});
    }
    return;
  }

  // 2) 沒得攔（iOS Safari／Firefox／被使用者封鎖過）→ 給圖文步驟
  if (P.ios) pwaHint('ios');
  else if (P.android || P.firefox || P.safari || !P.secure) pwaHint('manual');
  else pwaHint('desktop');
}

(function wirePwa() {
  var btn = $id('btnInstall');
  if (btn) btn.addEventListener('click', pwaInstall);
  var close = $id('pwaClose');
  if (close) close.addEventListener('click', pwaHintClose);
  var ok = $id('pwaOk');
  if (ok) ok.addEventListener('click', pwaHintClose);
  var sheet = $id('pwaSheet');
  if (sheet) {
    sheet.addEventListener('click', function (e) { if (e.target === sheet) pwaHintClose(); });
  }
  var P = pwaCore();
  if (P) {
    P.onReady = function () { pwaSync(); };
    P.onInstalled = function () { pwaHintClose(); pwaSync(); toast(t('pwa.done'), 2.6); };
    P.onModeChange = function () { pwaSync(); if (P.standalone) pwaHintClose(); };
  }
  pwaSync();
})();

'''
sub(JS_ANCHOR, JS_ADD + JS_ANCHOR, 'js')

# ============================================================
# 8. updateNavUI 尾巴補 pwaSync()
# ============================================================
NAV_OLD = ('  const m = $id(\'btnMusic\'), sf = $id(\'btnSfx\');\r\n'
           '  if (m) m.classList.toggle(\'off\', !(settings.bgm > 0));\r\n'
           '  if (sf) sf.classList.toggle(\'off\', !(settings.sfx > 0));\r\n'
           '}')
NAV_NEW = ('  const m = $id(\'btnMusic\'), sf = $id(\'btnSfx\');\r\n'
           '  if (m) m.classList.toggle(\'off\', !(settings.bgm > 0));\r\n'
           '  if (sf) sf.classList.toggle(\'off\', !(settings.sfx > 0));\r\n'
           '  try { pwaSync(); } catch (e) {}      // v4.6：換畫面時同步「加入桌面捷徑」按鈕\r\n'
           '}')
sub(NAV_OLD, NAV_NEW, 'navui')

# ============================================================
# 9. 換語言時重畫引導卡
# ============================================================
RI_OLD = '  try { if (typeof updateNavUI === \'function\') updateNavUI(); } catch (e) {}'
RI_NEW = (RI_OLD + '\r\n'
          '  try { if (typeof pwaRefreshHint === \'function\') pwaRefreshHint(); } catch (e) {}')
sub(RI_OLD, RI_NEW, 'refreshI18N')

# ============================================================
# 10. __BH 匯出
# ============================================================
BH_OLD = '  setAnnMin: setAnnMin, toggleAnn: toggleAnn, initAnn: initAnn, isAnnMin: isAnnMin,'
BH_NEW = (BH_OLD + '\r\n'
          '  // v4.6：PWA 安裝（測試／除錯用）\r\n'
          '  PWA: (typeof window.BHPWA !== \'undefined\' ? window.BHPWA : null),\r\n'
          '  pwaSync: pwaSync, pwaInstall: pwaInstall, pwaHint: pwaHint, pwaHintClose: pwaHintClose,')
sub(BH_OLD, BH_NEW, 'export')

# ============================================================
# 11. 版本號 4.5 → 4.6（只改「版本字串」那幾處，不動 14.5px 之類的樣式值）
# ============================================================
VER_PAIRS = [
    ('<span id="verLogVer">4.5</span>', '<span id="verLogVer">4.6</span>', 'verLogVer'),
    ('<span id="verTxt">4.5</span>', '<span id="verTxt">4.6</span>', 'verTxt'),
    ('<span class="vlog-sub">Ver 3.0 \u2192 4.5</span>', '<span class="vlog-sub">Ver 3.0 \u2192 4.6</span>', 'vlogsub'),
    ("const VERSION = '4.5';", "const VERSION = '4.6';", 'VERSION'),
]
for a, b, tg in VER_PAIRS:
    sub(a, b, tg)

# ============================================================
# 12. VERSION_LOG 新增 v4.6（放在最前面，v4.5 的 now 取消）
# ============================================================
LOG_OLD = "  { v: '4.5', date: '2026-11-01', now: true, items: ["
LOG_NEW = ('  { v: \'4.6\', date: \'2026-11-01\', now: true, items: [\r\n'
           '    \'<b>\u53ef\u4ee5\u88dd\u5230\u684c\u9762\u4e86</b>\uff1a\u9996\u9801\u53f3\u4e0a\u89d2\u591a\u4e86\u300c\U0001f4f1 \u4e0b\u8f09 App\u300d\uff0c\u6309\u4e00\u4e0b\u5c31\u80fd\u628a\u300a\u7206\u7206\u82f1\u96c4\u300b\u52a0\u5230 <b>\u96fb\u8166\u684c\u9762</b>\u6216<b>\u624b\u6a5f\u4e3b\u756b\u9762</b>\uff0c\u4e4b\u5f8c\u5f9e\u5716\u793a\u9ede\u958b\u5c31\u662f<b>\u5168\u87a2\u5e55\u3001\u6c92\u6709\u7db2\u5740\u5217</b>\u7684\u7368\u7acb\u8996\u7a97\',\r\n'
           '    \'<b>\u7528\u81ea\u5df1\u7684\u70b8\u5f48 LOGO</b>\uff1a\u6377\u5f91\u5716\u793a\u5c31\u662f\u9996\u9801\u90a3\u9846\u91d1\u5c6c\u70b8\u5f48\uff08192\uff0f512 \u5169\u7a2e\u5c3a\u5bf8\uff0bAndroid \u906e\u7f69\u5b89\u5168\u5340\u7248\u672c\uff09\uff0ciPhone \u7684\u684c\u9762\u5716\u793a\u4e5f\u4e00\u8d77\u9867\u5230\u4e86\',\r\n'
           '    \'<b>iPhone \u4e5f\u6709\u5f15\u5c0e</b>\uff1aiOS Safari \u4e0d\u652f\u63f4\u4e00\u9375\u5b89\u88dd\uff0c\u6309\u4e0b\u53bb\u6703\u8df3\u51fa\u5716\u6587\u6b65\u9a5f\uff08\u5206\u4eab \u2192 \u52a0\u5165\u4e3b\u756b\u9762 \u2192 \u65b0\u589e\uff09\uff0c\u7167\u8457\u9ede\u5c31\u597d\',\r\n'
           '    \'<b>\u5df2\u7d93\u88dd\u904e\u5c31\u4e0d\u5435\u4f60</b>\uff1a\u7528\u6377\u5f91\u958b\u555f\u6642\u6309\u9245\u6703\u81ea\u52d5\u96b1\u85cf\uff1b\u5b89\u88dd\u5b8c\u6210\u7684\u7576\u4e0b\u4e5f\u6703\u81ea\u5df1\u6536\u8d77\u4f86\',\r\n'
           '    \'<b>\u96e2\u7dda\u4e5f\u6253\u5f97\u958b</b>\uff1aService Worker \u6703\u628a\u904a\u6232\u672c\u9ad4\u8207\u5716\u793a\u5feb\u53d6\u8d77\u4f86\uff0c\u6377\u5f91\u9ede\u958b\u79d2\u9032\u904a\u6232\uff1b\u6539\u7248\u5f8c\u91cd\u65b0\u6574\u7406\u5c31\u662f\u65b0\u7248\uff0c\u4e0d\u6703\u5361\u5728\u820a\u7248\',\r\n'
           '    \'<b>\u4e0d\u5f71\u97ff\u9023\u7dda\u529f\u80fd</b>\uff1a\u5e33\u865f\u3001\u96f2\u7aef\u5b58\u6a94\u3001\u7dda\u4e0a\u914d\u5c0d\u7684 API \u4e00\u5f8b\u4e0d\u5feb\u53d6\uff0c\u6c38\u9060\u62ff\u5373\u6642\u7684\'\r\n'
           '  ] },\r\n'
           "  { v: '4.5', date: '2026-11-01', items: [")
sub(LOG_OLD, LOG_NEW, 'versionlog')

# ---------- 寫回（維持 CRLF） ----------
out = src.encode('utf-8')
io.open(P, 'wb').write(out)
print('[OK] patch v4.6 完成：%d → %d bytes（+%d）' % (orig_len, len(src), len(src) - orig_len))
for h in hits:
    print('   ✓ ' + h)
