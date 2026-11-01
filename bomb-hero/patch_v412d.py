# -*- coding: utf-8 -*-
# v4.12 第四輪：版本號 v4.11 → v4.12、版本紀錄、Service Worker 快取升版
import io

PATH = 'index.html'
src = io.open(PATH, encoding='utf-8', newline='').read()
text = src.replace('\r\n', '\n')

rules = []
def R(old, new):
    rules.append((old, new))

# ---- 版本號 ----
R("const VERSION = '4.11';", "const VERSION = '4.12';")
R('id="verTxt">4.11', 'id="verTxt">4.12')
R('id="verLogVer">4.11', 'id="verLogVer">4.12')

# ---- 版本紀錄：新增 v4.12、v4.11 改成 now:false ----
R(
"  { v: '4.11', date: '2026-11-01', now: true, items: [",
"  { v: '4.12', date: '2026-11-01', now: true, items: [\n"
"    '<b>暈眩的怪也會被炸死</b>：小怪被炸彈砸到會暈 1 秒，但暈眩期間<b>炸到不會扣血也不會死</b>。已修正 → 暈眩只是不能移動，照樣會被火焰傷害打死',\n"
"    '<b>手機瀏覽器轉正後能正常玩</b>：修正 LINE／FB 等內建瀏覽器轉正後畫面變巨大、捲不動的問題（高度改用 visualViewport 量測、旋轉後連續重新量測、鎖住頁面縮放）',\n"
"    '<b>全螢幕按鈕修好</b>：原本 requestFullscreen 帶參數在 iOS／WebView 會直接失敗，而且進遊戲時沒有使用者手勢也會被拒 → 現在改成不帶參數、只在有手勢時呼叫，並支援 webkit 版與偽全螢幕後援',\n"
"    '<b>單人闖關的怪改回一擊必殺</b>：單人闖關的小怪回到<b>炸一下就死</b>（沒有血量、也不顯示血條）；<b>只有 RPG 模式</b>的怪才有血量與血條 → 兩個模式的血量規則重新分開',\n"
"    '<b>功能鍵黑底徹底移除</b>：真正的黑底來源是「全域 canvas 樣式」的 background:#0a0f1c + 圓角，會把觸控鈕的圖示畫布也塗黑 → 已讓圖示畫布完全透明、圓形',\n"
"    '<b>Service Worker 快取跟版號走</b>：SW 快取版本從 v4.7.0 起就沒動過，舊版 index.html 會一直黏在瀏覽器裡（LINE／FB 的 WebView 尤其嚴重）→ 現在跟著遊戲版號一起升'\n"
"  ] },\n"
"  { v: '4.11', date: '2026-11-01', now: false, items: ["
)

# ---- 匯出新函式（測試用） ----
R(
"  cameraTarget: cameraTarget, clampCam: clampCam, enterImmersive: enterImmersive, toggleFullscreen: toggleFullscreen,",
"  cameraTarget: cameraTarget, clampCam: clampCam, enterImmersive: enterImmersive, toggleFullscreen: toggleFullscreen,\n"
"  isFullscreenNow: isFullscreenNow, setPseudoFull: setPseudoFull, hasUserGesture: hasUserGesture,\n"
"  fixOrientationLayout: fixOrientationLayout, enemyFlameDamage: enemyFlameDamage,"
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
