# -*- coding: utf-8 -*-
# v2.1 測試同步：標題文字 → LOGO 圖、版本 2.1
import io, sys

BASE = r"C:\Users\jon84\WorkBuddy\2026-10-30-12-58-54\bomb-hero\test"
fails = []

def rep(path, pairs):
    p = BASE + '\\' + path
    src = io.open(p, 'r', encoding='utf-8').read()
    for old, new, name in pairs:
        if old not in src:
            fails.append(path + ':' + name); print('FAIL', path, name); continue
        src = src.replace(old, new, 1)
        print('ok  ', path, name)
    io.open(p, 'w', encoding='utf-8', newline='\n').write(src)

# verify-v17：直放標題字級 → LOGO 寬度
rep('verify-v17.js', [(
"""ok(/@media \\(orientation: portrait\\)[\\s\\S]*?body\\.touch \\.title-card h1\\.title-en \\{ font-size: clamp\\(/.test(html),
  '直放時標題縮小（BOMB HERO 大字用 clamp 自適應）');""",
"""ok(/@media \\(orientation: portrait\\)[\\s\\S]*?body\\.touch \\.title-card \\.title-logo \\{ width: clamp\\(/.test(html),
  '直放時標題 LOGO 縮小（v2.1 改用圖片、clamp 自適應寬度）');""",
'直放標題')])

# verify-v26：標題區塊整段換成 LOGO 斷言
rep('verify-v26.js', [
("""ok(html.indexOf('<h1 class="title-en" data-t="BOMB HERO">BOMB HERO</h1>') > 0, '標題主字是「BOMB HERO」（v2.0 多一個 data-t 給紅底外凸層用）');
ok(/<div class="title-zh" data-t="爆爆英雄">爆爆英雄<\\/div>/.test(html), '第二行是中文字「爆爆英雄」');
ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.0<\\/span><\\/div>/.test(html), '「測試版 v2.0」小字徽章');
const enRule = html.match(/\\.title-card h1\\.title-en \\{\\s*font-size: clamp\\(([^)]*)\\)/);
const zhRule = html.match(/\\.title-card \\.title-zh \\{[\\s\\S]{0,120}?font-size: clamp\\(([^)]*)\\)/);
const betaRule = html.match(/\\.ver\\.beta \\{[^}]*font-size: clamp\\(([^)]*)\\)/);
function clampMax(s) { const a = (s || '').split(','); return parseFloat((a[a.length - 1] || '0').replace('px', '')); }
ok(!!enRule, 'BOMB HERO 用 clamp() 自適應字級');
ok(clampMax(enRule && enRule[1]) >= 60, 'BOMB HERO 最大字級 ' + clampMax(enRule && enRule[1]) + 'px（真的很大）');
ok(clampMax(zhRule && zhRule[1]) < clampMax(enRule && enRule[1]) * .55,
  '爆爆英雄是中字（' + clampMax(zhRule && zhRule[1]) + 'px < ' + clampMax(enRule && enRule[1]) + 'px）');
ok(clampMax(betaRule && betaRule[1]) <= 12, '「測試版」維持小字（' + clampMax(betaRule && betaRule[1]) + 'px）');
ok(/body\\.touch \\.title-card h1\\.title-en \\{ font-size: clamp\\(/.test(html), '手機直放也有專屬字級');
ok(/<h1 class="title-en" data-t="BOMB HERO">BOMB HERO<\\/h1>\\s*<div class="title-zh"/.test(html), '順序：BOMB HERO 大字在上、爆爆英雄在下方');""",
"""ok(/<img class="title-logo" id="titleLogo" alt="BOMB HERO 爆爆英雄"[^>]*src="data:image\\/png;base64,[A-Za-z0-9+/=]{1000,}"/.test(html), 'v2.1：標題改用美術 LOGO 圖（data URI 內嵌、夠大不是佔位）');
ok(html.indexOf('title-en') < 0 && html.indexOf('title-zh') < 0, 'v2.1：舊的文字標題（.title-en／.title-zh）已完全移除');
ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.1<\\/span><\\/div>/.test(html), '「測試版 v2.1」小字徽章');
const logoRule = html.match(/\\.title-logo \\{[^}]*width: clamp\\(([^)]*)\\)/);
const betaRule = html.match(/\\.ver\\.beta \\{[^}]*font-size: clamp\\(([^)]*)\\)/);
function clampMax(s) { const a = (s || '').split(','); return parseFloat((a[a.length - 1] || '0').replace('px', '')); }
ok(!!logoRule, 'LOGO 用 clamp() 自適應寬度');
ok(clampMax(logoRule && logoRule[1]) >= 400, 'LOGO 最大寬度 ' + clampMax(logoRule && logoRule[1]) + 'px（夠氣派）');
ok(clampMax(betaRule && betaRule[1]) <= 12, '「測試版」維持小字（' + clampMax(betaRule && betaRule[1]) + 'px）');
ok(/body\\.touch \\.title-card \\.title-logo \\{ width: clamp\\(/.test(html), '手機直放也有專屬 LOGO 寬度');
ok(/<div class="titlewrap">\\s*<img class="title-logo"/.test(html), '順序：LOGO 圖包在 .titlewrap 裡');""",
'標題區塊'),
("""ok(P.VERSION === '2.0', '版本 = 2.0（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.0</span>') > 0, '畫面上的版本號同步 2.0');""",
"""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
'版本 2.1')])

# verify-v27：紅底外凸段落 → LOGO 段落
rep('verify-v27.js', [
("""ok(/<div class="titlewrap">[\\s\\S]{0,160}data-t="BOMB HERO"/.test(html), '標題（BOMB HERO）包在 .titlewrap 裡，且有 data-t 文字複本');
ok(/data-t="爆爆英雄"/.test(html), '中文標題也有 data-t（紅底形狀才蓋得到）');
ok(/\\.title-en::before, \\.title-zh::before \\{[\\s\\S]{0,200}content: attr\\(data-t\\)/.test(html),
  '標題底下那一層是「同樣字型」的複本（content: attr(data-t)）');
ok(/-webkit-text-stroke: clamp\\(8px, 1\\.9vw, 17px\\) #7d0518/.test(html), '那一層用深紅色外凸描邊（-#7d0518）');
ok(/-webkit-text-fill-color: #7d0518/.test(html), '外凸層填深紅色（父層的透明填色不會把它吃掉）');
ok(/\\.title-zh::before \\{[\\s\\S]{0,160}-webkit-text-stroke: clamp\\(6px, 1\\.35vw, 12px\\)/.test(html), '中文標題外凸幅度比較細');
ok(!/repeating-conic-gradient/.test(html), 'v2.0：一整圈放射狀大光暈已經拿掉');
ok(!/@keyframes bh-rays/.test(html), 'v2.0：不再有旋轉的光芒動畫');
ok(!/rgba\\(196,12,32,\\.(60|34)\\)/.test(html), 'v2.0：一大團橢圓暈光也拿掉了');
ok(/z-index: -1/.test(html), '紅底形狀壓在標題文字底下');""",
"""ok(/<div class="titlewrap">\\s*<img class="title-logo"/.test(html), 'v2.1：.titlewrap 裡是一張 LOGO 圖');
ok(/src="data:image\\/png;base64,/.test(html), 'v2.1：LOGO 用 data URI 內嵌（零外部請求）');
ok(!/data-t="BOMB HERO"/.test(html) && !/data-t="爆爆英雄"/.test(html), 'v2.1：舊的 data-t 文字複本已移除');
ok(!/\\.title-en::before/.test(html) && !/\\.title-zh::before/.test(html), 'v2.1：紅底外凸層 CSS 已移除');
ok(!/repeating-conic-gradient/.test(html), '一整圈放射狀大光暈維持拿掉');
ok(!/@keyframes bh-rays/.test(html), '不再有旋轉的光芒動畫');
ok(!/-webkit-text-stroke: clamp\\(8px, 1\\.9vw, 17px\\)/.test(html), 'v2.1：深紅外凸描邊已移除');
ok(/\\.title-logo \\{[\\s\\S]{0,80}display: block; margin: 0 auto/.test(html), 'LOGO 置中顯示');
ok(/user-select: none/.test(html), 'LOGO 不可被選取拖曳（不干擾按鈕）');""",
'標題段落'),
("""ok(P.VERSION === '2.0', '版本 = 2.0（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.0</span>') > 0, '畫面上的版本號同步 2.0');""",
"""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
'版本 2.1')])

# verify-v28：版本
rep('verify-v28.js', [(
"""ok(P.VERSION === '2.0', '版本 = 2.0（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.0</span>') > 0, '畫面上的版本號同步 2.0');""",
"""ok(P.VERSION === '2.1', '版本 = 2.1（' + P.VERSION + '）');
ok(html.indexOf('<span id="verTxt">2.1</span>') > 0, '畫面上的版本號同步 2.1');""",
'版本 2.1')])

# verify-v26/v27 標題段落開頭的小節名也順手更新（非必要，跳過）
if fails:
    print('共 %d 處失敗' % len(fails)); sys.exit(1)
print('ALL OK')
