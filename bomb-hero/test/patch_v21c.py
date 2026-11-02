# -*- coding: utf-8 -*-
# v2.1 測試修正第二輪：v20 門行為、v22/v23 隨機角色、v28 紅底外凸段落
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

# verify-v20：v2.0 起門藏在軟磚下 → 斷言改成「清光敵人當下未現身；炸完磚一定現身」
rep('verify-v20.js', [(
"""    if (st !== 8) G.enemies.length = 0; else G.enemies.length = 0;
    P.updateSolo(1 / 60);
    if (!(G.door.revealed && G.door.open)) doorOpenAll = false;""",
"""    if (st !== 8) G.enemies.length = 0; else G.enemies.length = 0;
    P.updateSolo(1 / 60);
    // v2.0：門藏在軟磚底下 → 清光敵人當下還不會現身（磚還沒炸）
    if (G.door.revealed && G.door.open) doorOpenAll = false;
    // 炸掉場上所有軟磚 → 門一定現身且可通過（不會卡關）
    for (let yy = 1; yy < G.rows - 1; yy++) for (let xx = 1; xx < G.cols - 1; xx++)
      if (G.grid[yy][xx] === 2) P.destroySoft(xx, yy);
    P.updateSolo(1 / 60);
    if (!(G.door.revealed && G.door.open)) doorOpenAll = false;""",
'門行為'),
("ok(doorOpenAll, '敵人清光後門一定自動露出並開啟（不會卡關）');",
 "ok(doorOpenAll, 'v2.0+：門藏軟磚下（清光敵人未現身）、炸完磚一定現身可過（不會卡關）');",
'門訊息')])

# verify-v22：隨機角色 → 固定用兔子（有注入精靈圖的）才畫得出 drawImage
rep('verify-v22.js', [(
"""const p0 = freshSolo(1);
rec.calls.length = 0;
BH.drawPlayer(p0, G.T);
ok(rec.calls.filter(c => c[0] === 'drawImage').length >= 1, '遊戲內的角色是用精靈圖畫的');""",
"""P.settings.soloChar = 0;   // v2.0 起角色預設隨機 → 固定兔子（本測試有注入兔圖）
const p0 = freshSolo(1);
rec.calls.length = 0;
BH.drawPlayer(p0, G.T);
ok(rec.calls.filter(c => c[0] === 'drawImage').length >= 1, '遊戲內的角色是用精靈圖畫的');""",
'固定兔子')])

# verify-v23：同上
rep('verify-v23.js', [(
"""const p3 = freshSolo(1);
G.enemies.forEach(e => { e.x = -9999; e.y = -9999; });""",
"""P.settings.soloChar = 0;   // v2.0 起角色預設隨機 → 固定兔子（精靈圖才貼得出來）
const p3 = freshSolo(1);
G.enemies.forEach(e => { e.x = -9999; e.y = -9999; });""",
'固定兔子')])

# verify-v28：紅底外凸段落 → LOGO 圖段落
rep('verify-v28.js', [(
"""ok(/content: attr\\(data-t\\)/.test(html), '改成「同一個字」再畫一層（content: attr(data-t)）');
ok(/-webkit-text-stroke: clamp\\(8px, 1\\.9vw, 17px\\) #7d0518/.test(html), '外凸是用深紅色描邊做出來的');
ok(/-webkit-text-fill-color: #7d0518/.test(html), '外凸層填深紅（父層 gradient-clip 的透明色不會影響它）');
ok(/position: absolute; left: 0; top: 0; width: 100%; z-index: -1;/.test(html), '那一層壓在標題文字底下');
ok(/paint-order: stroke fill/.test(html), '描邊畫在填色後面，字本身不會被吃掉');
ok(/filter: drop-shadow\\(0 3px 0 rgba\\(60,0,12,\\.85\\)\\)/.test(html), '再加一點厚度，紅底形狀更立體');""",
"""ok(!/content: attr\\(data-t\\)/.test(html) && !/paint-order: stroke fill/.test(html), 'v2.1：紅底外凸層（data-t 複本）已整個移除');
ok(/<img class="title-logo" id="titleLogo"[^>]*src="data:image\\/png;base64,/.test(html), 'v2.1：標題換成美術 LOGO 圖（data URI 內嵌）');
ok(/\\.title-logo \\{[^}]*width: clamp\\(250px, 64vw, 560px\\)/.test(html), 'v2.1：LOGO 桌面寬度 clamp(250px, 64vw, 560px)');
ok(/body\\.touch \\.title-card \\.title-logo \\{ width: clamp\\(190px, 62vw, 300px\\) \\}/.test(html), 'v2.1：手機直放 LOGO 縮到 clamp(190px, 62vw, 300px)');
ok(!/title-en/.test(html) && !/title-zh/.test(html), 'v2.1：舊文字標題的 class 全部清除');""",
'v28 標題段落')])

if fails:
    print('共 %d 處失敗' % len(fails)); sys.exit(1)
print('ALL OK')
