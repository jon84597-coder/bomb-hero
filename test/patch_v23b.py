# -*- coding: utf-8 -*-
# v2.3 測試同步：旋轉移除、遊戲內返回鍵顯示、版本徽章
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

# v14：強制旋轉移除 → 改成直式可玩
rep('verify-v14.js', [(
"""ok(/body\\.touch \\.wrap[\\s\\S]{0,600}?rotate\\(90deg\\)/.test(html), '手機直放時整個介面旋轉 90 度（橫向畫面）');
ok(html.indexOf('--vvh') >= 0 && html.indexOf('--vvw') >= 0, '旋轉尺寸用實際視窗變數（避免網址列造成裁切）');""",
"""ok(!/body\\.touch \\.wrap\\.game[\\s\\S]{0,600}?rotate\\(90deg\\)/.test(html), 'v2.3：不再強制旋轉 90 度（直式就能玩）');
ok(/body\\.touch #stageWrap \\{ padding-bottom: 162px; \\}/.test(html), 'v2.3：直式時地圖下方留一列給搖桿');""",
'旋轉移除')])

# v16
rep('verify-v16.js', [(
"""ok(html.indexOf('--vvh') >= 0 && html.indexOf('--vvw') >= 0, '旋轉尺寸用視窗變數 --vvh/--vvw');""",
"""ok(html.indexOf('--vvh') >= 0 && html.indexOf('--vvw') >= 0, '視窗變數 --vvh/--vvw 仍在（給其他版面用）');""",
'視窗變數'),
("""ok(/width: var\\(--vvh/.test(html), '旋轉後寬度 = 視窗高（填滿）');""",
 """ok(!/width: var\\(--vvh/.test(html), 'v2.3：遊戲畫面不再用「高寬互換」的旋轉尺寸');""",
 '旋轉尺寸')])

# v23
rep('verify-v23.js', [(
"""ok(gameRules.some(r => /rotate\\(90deg\\)/.test(r.body)), '遊戲畫面直放時仍旋轉成橫向滿版');
ok(gameRules.some(r => /var\\(--vvh/.test(r.body)), '旋轉容器用實際視窗尺寸（不被網址列裁掉）');""",
"""ok(!gameRules.some(r => /rotate\\(90deg\\)/.test(r.body)), 'v2.3：遊戲畫面不再旋轉（直式直接玩）');
ok(/body\\.touch #stageWrap \\{ padding-bottom: 162px; \\}/.test(html), 'v2.3：直式遊戲畫面下方保留搖桿列');""",
'旋轉移除')])

# v24：遊戲中「上一頁」改為顯示
rep('verify-v24.js', [(
"""// 精簡模式隱藏「上一頁」（只留 🎵／🔊）""",
"""// v2.3：精簡模式改成「上一頁也留著」（遊戲中要能退回選單）""",
'註解')])

# v26
rep('verify-v26.js', [(
"""ok(/#navBar\\.inGame #btnBack \\{ display: none/.test(html), '遊戲中只收起「上一頁」，🎵／🔊 留下');""",
"""ok(/#navBar\\.inGame #btnBack \\{ display: inline-flex/.test(html), 'v2.3：遊戲中「← 上一頁」改成顯示（討伐 BOSS 才退得回來）');""",
'返回鍵'),
("""ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.2<\\/span><\\/div>/.test(html), '「測試版 v2.3」小字徽章');""",
 """ok(/<div class="ver beta">測試版 v<span id="verTxt">2\\.3<\\/span><\\/div>/.test(html), '「測試版 v2.3」小字徽章');""",
 '徽章')])

# v28
rep('verify-v28.js', [(
"""ok(/#navBar\\.inGame #btnBack \\{ display: none; \\}/.test(html) && !/#navBar\\.inGame #btnFull/.test(html),
  '遊戲中只收起「上一頁」，全視窗開關依然在');""",
"""ok(/#navBar\\.inGame #btnBack \\{ display: inline-flex/.test(html) && !/#navBar\\.inGame #btnFull/.test(html),
  'v2.3：遊戲中「←」也留著（可退回），全視窗開關依然在');""",
'返回鍵')])

if fails:
    print('共 %d 處失敗' % len(fails)); sys.exit(1)
print('ALL OK')
