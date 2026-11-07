# -*- coding: utf-8 -*-
"""v5.47：手機橫屏首頁重排（左 LOGO／右兩欄選單）＋ 頂部工具列壓扁"""
import io, os

ROOT = os.path.dirname(os.path.abspath(__file__))
IDX = os.path.join(ROOT, 'bomb-hero', 'index.html')
VLOG = os.path.join(ROOT, 'bomb-hero', 'js', 'version-log.js')
SW1 = os.path.join(ROOT, 'bomb-hero', 'sw.js')
SW2 = os.path.join(ROOT, 'public', 'sw.js')
SW3 = os.path.join(ROOT, 'bomberman-online', 'public', 'sw.js')
PKG = os.path.join(ROOT, 'package.json')


def read(p):
    with io.open(p, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def write(p, s):
    tmp = p + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)
    os.replace(tmp, p)


def sub(s, a, b, n=1, tag=''):
    c = s.count(a)
    assert c == n, 'COUNT %d (want %d) [%s] -> %r' % (c, n, tag, a[:60])
    return s.replace(a, b)


s = read(IDX)
before = len(s)

CSS = u'/* ===== v5.47\uff1a\u624b\u6a5f\u6a6b\u5c4f\u9996\u9801\u91cd\u6392 \u2014\u2014 \u5de6\u908a LOGO\uff0f\u8cc7\u8a0a\u3001\u53f3\u908a 2 \u6b04\u9078\u55ae =====\n' \
u'   \u89f8\u767c\uff1a\u89f8\u63a7\u88dd\u7f6e + \u6a6b\u653e + \u5bec\u5ea6 \u2265 640\uff08JS \u6253 body.home-wide\uff0c\u65cb\u8f49\u81ea\u52d5\u5207\u63db\uff09\u3002\n' \
u'   \u76ee\u7684\uff1a\u6a6b\u5c4f\u9ad8\u5ea6\u53ea\u5269 380~\u200b430px\uff0c\u539f\u672c\u300cLOGO \u2192 \u66b1\u7a31 \u2192 \u6309\u9245\u300d\u76f4\u6512\u628a\u9078\u55ae\u64e8\u5230\u7b2c\u4e8c\u5c4f\u3002\n' \
u'   \u73fe\u5728\u628a\u9078\u55ae\u642c\u5230\u53f3\u534a\u908a\u5169\u6b04\u3001LOGO \u7e2e\u5230\u5de6\u534a\u908a\uff0c\u4e0a\u65b9\u5de5\u5177\u5217\u5a93\u6210 27px \u6241\u81a0\u56ca\uff0c\n' \
u'   \u7248\u672c\u66f4\u65b0\uff0f\u4f5c\u8005\u516c\u544a\u56de\u5230\u5de6\u4e0a\u89d2\u3002\u76f4\u653e\u3001\u684c\u6a5f\u5b8c\u5168\u4e0d\u53d7\u5f71\u97ff\uff08\u6c92\u6709 .home-wide \u5c31\u7dad\u6301\u539f\u6a23\uff09\u3002 */\n' \
u'body.touch.home-wide #navBar:not(.inGame) {\n' \
u'  padding: calc(4px + env(safe-area-inset-top, 0px)) 8px 4px; gap: 6px;\n' \
u'}\n' \
u'body.touch.home-wide #navBar .navright { gap: 5px; }\n' \
u'body.touch.home-wide #navBar .navbtn {\n' \
u'  height: 27px; min-height: 0; padding: 0 9px;\n' \
u'  font-size: 11.5px; font-weight: 800; gap: 3px;\n' \
u'  border-width: 1px; border-radius: 8px; line-height: 1;\n' \
u'  box-shadow: 0 4px 12px -8px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.12);\n' \
u'}\n' \
u'body.touch.home-wide #navBar .navbtn b { font-size: 11.5px; font-weight: 800; letter-spacing: .01em; }\n' \
u'body.touch.home-wide #navBar .navbtn .ar { font-size: 14px; }\n' \
u'body.touch.home-wide #navBar .navbtn.tg { padding: 0 8px; font-size: 11px; }\n' \
u'body.touch.home-wide #navBar #acctChip { max-width: 178px; }\n' \
u'body.touch.home-wide #navBar #acctChip b {\n' \
u'  display: inline-block; max-width: 116px; overflow: hidden;\n' \
u'  text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom;\n' \
u'}\n' \
u'body.touch.home-wide #navBar .navbtn .pwico { width: 12px; height: 12px; }\n' \
u'\n' \
u'/* \u7248\u9762\u9aa8\u67b6\uff1a\u4e00\u5f35 grid \u5206\u5de6\u53f3\u5169\u6b04 */\n' \
u'body.touch.home-wide .wrap:not(.game) {\n' \
u'  padding: calc(35px + env(safe-area-inset-top, 0px)) 10px calc(8px + env(safe-area-inset-bottom, 0px));\n' \
u'  max-width: min(1080px, 100%); overflow: hidden;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title.on {\n' \
u'  display: grid; min-height: 0;\n' \
u'  grid-template-columns: minmax(0, 45fr) minmax(0, 55fr);\n' \
u'  grid-template-rows: auto auto auto auto auto;\n' \
u'  align-content: center; align-items: center;\n' \
u'  gap: 1px 14px;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .title-card { display: contents; }\n' \
u'/* \u5de6\u6b04\u2460\uff1a\u7248\u672c\u66f4\u65b0\uff0b\u4f5c\u8005\u516c\u544a\uff08\u56de\u5230\u5de6\u4e0a\u89d2\uff09 */\n' \
u'body.touch.home-wide #scr-title .toprow {\n' \
u'  position: static; grid-column: 1; grid-row: 1;\n' \
u'  width: auto; max-width: none; margin: 0 0 3px;\n' \
u'  justify-content: flex-start; flex-wrap: nowrap; gap: 6px;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .toprow .verlogbtn,\n' \
u'body.touch.home-wide #scr-title .toprow .annhead {\n' \
u'  height: 25px; padding: 0 9px; font-size: 11px; border-radius: 8px; letter-spacing: .02em;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .toprow .annbox { flex: 0 1 auto; }\n' \
u'/* \u5de6\u6b04\u2461\u2462\uff1aLOGO \u8207\u7248\u672c\u865f */\n' \
u'body.touch.home-wide #scr-title .titlewrap { grid-column: 1; grid-row: 2; padding: 0; }\n' \
u'body.touch.home-wide #scr-title .title-card .title-logo {\n' \
u'  width: clamp(120px, min(38vw, 40vh), 250px);\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .ver { grid-column: 1; grid-row: 3; justify-self: center; margin-top: 3px; }\n' \
u'body.touch.home-wide #scr-title .gap24 { display: none !important; }\n' \
u'/* \u5de6\u6b04\u2463\uff1a\u66b1\u7a31 */\n' \
u'body.touch.home-wide #scr-title .nickwrap { grid-column: 1; grid-row: 4; margin: 4px 0 0; gap: 6px; }\n' \
u'body.touch.home-wide #scr-title .nickwrap .nklabel { font-size: 10.5px; }\n' \
u'body.touch.home-wide #scr-title .nickwrap .tinput {\n' \
u'  width: 100%; max-width: 150px; flex: 1 1 auto; min-width: 0;\n' \
u'  padding: 6px 8px; font-size: 12.5px;\n' \
u'}\n' \
u'/* \u5de6\u6b04\u2464\uff1a\u652f\u63f4\u5e73\u53f0 */\n' \
u'body.touch.home-wide #scr-title .platrow { grid-column: 1; grid-row: 5; align-self: start; margin-top: 5px; }\n' \
u'body.touch.home-wide #scr-title .platrow .pchip,\n' \
u'body.touch.home-wide #scr-title .platrow .pfb { height: 20px; font-size: 9.5px; }\n' \
u'/* \u53f3\u6b04\uff1a\u65b0\u624b\u6559\u5b78 \uff0b 2\u00d73 \u5361\u7247 \uff0b \u793e\u7fa4\u4e09\u5165\u53e3 */\n' \
u'body.touch.home-wide #scr-title .menu {\n' \
u'  grid-column: 2; grid-row: 1 / span 5;\n' \
u'  display: flex; flex-direction: column; align-items: stretch; gap: 6px;\n' \
u'  width: 100%; max-width: none; margin: 0; padding-bottom: 0; align-self: center;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu > .mbtn#btnLearn {\n' \
u'  padding: 7px 10px 7px 38px; font-size: 13.5px; border-radius: 11px;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu > .mbtn#btnLearn::before {\n' \
u'  left: 9px; margin-top: -11px; width: 22px; height: 22px; line-height: 22px; font-size: 13px;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu .mgrid {\n' \
u'  grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 0;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu .mgrid .mbtn {\n' \
u'  min-height: 0; padding: 6px 6px 5px; border-radius: 11px;\n' \
u'  font-size: 13px; line-height: 1.15; gap: 0;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu .mgrid .mbtn::before {\n' \
u'  width: 18px; height: 18px; line-height: 18px; font-size: 12px; margin: 0 0 2px; border-radius: 6px;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu .mgrid .mbtn small {\n' \
u'  font-size: 9px; line-height: 1.3; margin-top: 1px; -webkit-line-clamp: 1;\n' \
u'}\n' \
u'body.touch.home-wide #scr-title .menu .quickrow { margin: 0; gap: 6px; }\n' \
u'body.touch.home-wide #scr-title .menu .qchip { padding: 6px 4px; font-size: 11px; border-radius: 9px; }\n' \
u'body.touch.home-wide #scr-title .menu .qchip .qico2 { font-size: 12px; }\n'

s = sub(s, u'</style>\n</head>', CSS + u'</style>\n</head>', tag='css')

JS = u'/* v5.47\uff1a\u9996\u9801\u6a6b\u5c4f\u300c\u5de6 LOGO\uff0f\u53f3\u9078\u55ae\u300d\u2014\u2014 \u53ea\u5728\u300c\u89f8\u63a7 + \u6a6b\u653e + \u5bec\u5ea6 \u2265 640\u300d\u664b\u7528\uff0c\n' \
u'   \u65cb\u8f49\u6216\u7e2e\u7a84\u6703\u81ea\u52d5\u9000\u56de\u4e0a\u4e0b\u5806\u758a\u3002\u64cd\u4f5c\u5224\u5b9a\u4e00\u884c\u90fd\u6c92\u52d5\uff0c\u53ea\u63db\u7248\u9762\u3002 */\n' \
u'var HOME_WIDE_MIN = 640;\n' \
u'function homeWideOn() {\n' \
u'  try {\n' \
u'    var b = document.body;\n' \
u'    if (!b || !b.classList || !b.classList.contains(\'touch\')) return false;\n' \
u'    var w = window.innerWidth || 0, h = window.innerHeight || 0;\n' \
u'    return w >= HOME_WIDE_MIN && w > h * 1.15;   // \u6a6b\u653e\uff08\u63a5\u8fd1\u6b63\u65b9\u7684\u4e0d\u7b97\uff09\n' \
u'  } catch (e) { return false; }\n' \
u'}\n' \
u'function applyHomeWide() {\n' \
u'  try {\n' \
u'    var b = document.body;\n' \
u'    if (!b || !b.classList) return false;\n' \
u'    var on = homeWideOn();\n' \
u'    b.classList.toggle(\'home-wide\', on);\n' \
u'    return on;\n' \
u'  } catch (e) { return false; }\n' \
u'}\n'
s = sub(s, u'function relayout() {\n  updateViewportVars();', JS + u'function relayout() {\n  updateViewportVars();\n  applyHomeWide();      // v5.47\uff1a\u65cb\u8f49\uff0f\u7e2a\u7a97\u5f8c\u91cd\u7b97\u9996\u9801\u6a6b\u5c4f\u7248\u9762', tag='relayout')

s = sub(s,
        u'  if (mode === \'touch\') document.body.classList.add(\'touch\');      // \u53ea\u6709\u89f8\u63a7\u6a21\u5f0f\u624d\u986f\u793a\u624b\u6a5f\u6309\u9215\n'
        u'  else document.body.classList.remove(\'touch\');\n',
        u'  if (mode === \'touch\') document.body.classList.add(\'touch\');      // \u53ea\u6709\u89f8\u63a7\u6a21\u5f0f\u624d\u986f\u793a\u624b\u6a5f\u6309\u9215\n'
        u'  else document.body.classList.remove(\'touch\');\n'
        u'  applyHomeWide();                                                 // v5.47\uff1a\u5207\u63db\u89f8\u63a7\u6a21\u5f0f\u5f8c\u91cd\u7b97\u6a6b\u5c4f\u7248\u9762\n',
        tag='applyCtrl')

s = sub(s,
        u'  rpgBuyPoint: rpgBuyPoint, rpgAdjust: rpgAdjust, rpgLeft: rpgLeft,\n',
        u'  rpgBuyPoint: rpgBuyPoint, rpgAdjust: rpgAdjust, rpgLeft: rpgLeft,\n'
        u'  applyHomeWide: applyHomeWide, homeWideOn: homeWideOn, HOME_WIDE_MIN: HOME_WIDE_MIN,   // v5.47\n',
        tag='export')

s = sub(s, u'<span class="vlnum">v<span id="verLogVer">5.46</span></span>',
        u'<span class="vlnum">v<span id="verLogVer">5.47</span></span>', tag='verlogver')
s = sub(s, u'<div class="ver beta">\u6e2c\u8a66\u7248 v<span id="verTxt">5.46</span></div>',
        u'<div class="ver beta">\u6e2c\u8a66\u7248 v<span id="verTxt">5.47</span></div>', tag='vertxt')
s = sub(s, u"const VERSION = '5.46';", u"const VERSION = '5.47';", tag='version')

write(IDX, s)
print('index.html %d -> %d (%+d)' % (before, len(s), len(s) - before))

# ---------------- version-log ----------------
s = read(VLOG)
old = u"window.__VERSION_LOG = [\n  { v: '5.46', date: '2026-11-07', now: true, items: [\n"
new = (u"window.__VERSION_LOG = [\n"
       u"  { v: '5.47', date: '2026-11-07', now: true, items: [\n"
       u"    '\U0001F4F1 <b>\u624b\u6a5f\u6a6b\u5c4f\u9996\u9801\u91cd\u6392\uff1a\u5de6\u908a LOGO\uff0f\u53f3\u908a\u9078\u55ae</b>\u3002\u6a6b\u5c4f\u6642\u6309\u9245\u642c\u5230\u53f3\u534a\u908a\u6392\u6210<b>\u5169\u6b04</b>\uff08\u65b0\u624b\u6559\u5b78\u2151\u516d\u5f35\u5361\u7247\u2151\u6210\u5c31\uff0f\u6392\u540d\uff0f\u7dda\u4e0a\u73a9\u5bb6\uff09\uff0cLOGO \u81ea\u52d5\u7e2e\u5230\u5de6\u534a\u908a\u2014\u2014\u4e00\u5f35\u5c4f\u5c31\u770b\u5f97\u5230\u6240\u6709\u5165\u53e3\u3002',\n"
       u"    '\U0001F4CF <b>\u89f8\u767c\u689d\u4ef6\uff1a\u89f8\u63a7 + \u6a6b\u653e + \u5bec\u5ea6 \u2265 640</b>\u3002\u5bec\u5ea6\u4e0d\u5920\u3001\u76f4\u653e\u3001\u684c\u6a5f\u90fd\u7dad\u6301\u539f\u672c\u7684\u4e0a\u4e0b\u5806\u758a\u7248\uff1b\u65cb\u8f49\u624b\u6a5f\u6703\u81ea\u52d5\u5207\u63db\uff0c\u4e0d\u7528\u91cd\u6574\u3002',\n"
       u"    '\U0001F4C9 <b>\u9802\u90e8\u5de5\u5177\u5217\u5a93\u6210\u6241\u81a0\u56ca</b>\uff1a\u97f3\u6a02\uff0f\u8a9e\u8a00\uff0f\u97f3\u6548\uff0f\u5168\u8996\u7a97\uff0f\u4fe1\u7bb1\uff0f\u4e0b\u8f09 App\uff0f\u5f37\u5236\u66f4\u65b0\u5f9e 36px \u58d3\u5230 <b>27px</b>\uff0c\u5b57\u8ddf\u8457\u7e2e\u4e00\u7d1a\u4f46\u4fdd\u7559\u6e05\u695a\u53ef\u8b80\uff1b\u5e33\u865f\u4fe1\u7bb1\u9577\u5ea6\u81ea\u52d5\u7701\u7565\u3002',\n"
       u"    '\U0001F4DC <b>\u7248\u672c\u66f4\u65b0\uff0f\u4f5c\u8005\u516c\u544a\u56de\u5230\u5de6\u4e0a\u89d2</b>\uff1a\u4ee5\u524d\u6a6b\u5c4f\u88ab\u56fa\u5b9a\u5728\u53f3\u4e0a\uff08\u53c8\u88ab\u5de5\u5177\u5217\u906e\u4f4f\uff09\uff0c\u73fe\u5728\u5b89\u975c\u5730\u6392\u5728\u5de6\u6b04\u7b2c\u4e00\u884c\uff0c\u9ede\u4e00\u4e0b\u4e00\u6a23\u770b\u5f97\u5230\u5167\u5bb9\u3002',\n"
       u"    '\U0001F9EA \u65b0\u589e verify-v547\uff1a\u65ad\u8a00\u89f8\u767c\u689d\u4ef6\u3001\u5de6\u53f3\u5169\u6b04\u9aa8\u67b6\u3001\u6241\u81a0\u56ca\u5c3a\u5bf8\uff0c\u4e26\u7528\u771f\u700f\u89bd\u5668\u5728 844\u00d7390\uff0f640\u00d7360 \u62cd\u5716\u5c0d\u7167\u3002'\n"
       u"  ] },\n"
       u"\n"
       u"  { v: '5.46', date: '2026-11-07', now: false, items: [\n")
s = sub(s, old, new, tag='vlog')
write(VLOG, s)

# ---------------- versions ----------------
for p, tag in ((SW1, 'sw-dev'), (SW2, 'sw-public'), (SW3, 'sw-legacy')):
    t = read(p)
    t = sub(t, u"var SW_VERSION = 'v5.46.0';", u"var SW_VERSION = 'v5.47.0';", tag=tag)
    write(p, t)
t = read(PKG)
t = sub(t, u'"version": "5.46.0"', u'"version": "5.47.0"', tag='pkg')
write(PKG, t)
print('version files ok')
