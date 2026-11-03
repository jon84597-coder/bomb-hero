# -*- coding: utf-8 -*-
# v4.49（4/4）：升版號 4.48 → 4.49、寫更新紀錄、文案時長 3→5 分鐘
import io
#   （重跑流程：cp _bak_v449_pre.html index.html → nav → card → tut → ver）

P = 'index.html'
SRC = 'index.html'        # 就地續改（前一支 patch 的產物）
s = io.open(SRC, encoding='utf-8', newline='').read()


def rep(old, new, n=1, optional=False):
    """optional=True：已套用過就跳過（讓這支 patch 可以重複執行）"""
    global s
    if optional and s.count(old) == 0:
        if new in s: return
        raise AssertionError(('optional 但找不到 anchor', old[:80]))
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new, 1)


rep("const VERSION = '4.48';", "const VERSION = '4.49';", optional=True)
rep('<span id="verLogVer">4.48</span>', '<span id="verLogVer">4.49</span>', optional=True)
rep('<div class="ver beta">測試版 v<span id="verTxt">4.48</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.49</span></div>', optional=True)

rep("  { v: '4.48', date: '2026-11-03', now: true, items: [",
    """  { v: '4.49', date: '2026-11-03', now: true, items: [
    '手機教學提示改成單行窄條：貼在狀態列下方，只佔 48px，想看細節點一下展開',
    '教學新增「放大縮小」：手機兩指捏合、電腦滾輪或 1／2／0，範圍 58%~185%（很多人不知道）',
    '教學新增「手套搬彈投擲」：撿起炸彈再丟出去，會逐格跳過牆壁，直接砸在敵人身上',
    '功能總覽加「進階技巧」章：搬彈穿牆、推車集氣綠1／黃2／紅3格、踢彈連鎖、遙控連爆',
    '修正：手機玩一陣子後頂部工具列（上一頁／帳號／⋮）整排消失'
  ] },
  { v: '4.48', date: '2026-11-03', now: false, items: [""", optional=True)

# 教學多了兩步，時長文案 3 → 5 分鐘
s = s.replace('約 3 分鐘', '約 5 分鐘')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('OK  chars %d (limit 3,350,000, left %d)' % (len(s), 3350000 - len(s)))

# 三份 sw.js 一起升
for sw in ('sw.js', '../public/sw.js', '../bomberman-online/public/sw.js'):
    t = io.open(sw, encoding='utf-8', newline='').read()
    if "'v4.49.0'" in t:                 # 已經升級過（可重複執行）
        print('sw', sw, 'already v4.49.0')
        continue
    assert t.count("'v4.48.0'") == 1, (sw, t.count("'v4.48.0'"))
    io.open(sw, 'w', encoding='utf-8', newline='').write(t.replace("'v4.48.0'", "'v4.49.0'"))
    print('sw', sw, '-> v4.49.0')
