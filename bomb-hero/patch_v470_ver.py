# -*- coding: utf-8 -*-
# v4.70：版本號 + 更新紀錄 + sw.js
import io, sys, os

P = 'index.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, tag, cnt=1):
    global s
    n = s.count(old)
    if n != cnt:
        sys.stderr.write('[FAIL] %s count=%d (want %d)\n' % (tag, n, cnt))
        sys.exit(1)
    s = s.replace(old, new)
    print('[ok] ' + tag)


rep("const VERSION = '4.69';", "const VERSION = '4.70';", 'version')
rep('<span class="vlnum">v<span id="verLogVer">4.69</span></span>',
    '<span class="vlnum">v<span id="verLogVer">4.70</span></span>', 'verlog-ver')
rep('<div class="ver beta">測試版 v<span id="verTxt">4.69</span></div>',
    '<div class="ver beta">測試版 v<span id="verTxt">4.70</span></div>', 'vertxt')

rep("""const VERSION_LOG = [
  { v: '4.69', date: '2026-11-04', now: true, items: [""",
    """const VERSION_LOG = [
  { v: '4.70', date: '2026-11-04', now: true, items: [
    '隨機生成的大地圖多了「🗺️ 小地圖雷達」（右上角）：牆留深底、可走的路淡淡發亮，白框是目前視野，白點是你、紅點是附近 7 格內的怪、黃點是道具；設定頁可以關掉',
    '組隊對戰多了「隊色 HUD」（畫面左上角）：每一隊一個色塊加存活／總數，自己那一隊會加白框，一眼就知道還剩幾個隊友',
    'RPG 模式每一章的最後一關（第 4、8、12…關）都會出魔王，跟單人闖關一樣；第 32 關仍然是最終魔王，血量最多、體型最大',
    '大逃殺門票改成「每天登入送 1 張」（同一天只送一次），想多打再用 2000 金幣買 —— 新手也不用先存一大筆錢才摸得到大逃殺',
    '隨機生成地圖會顯示「🔑 種子碼」在出發前的關卡說明上：朋友報同一個種子就能玩到同一張圖，回報問題時也可以直接說哪一張' ] },
  { v: '4.69', date: '2026-11-04', now: false, items: [""",
    'verlog-entry')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('written', len(s))

for f in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    if not os.path.exists(f):
        print('[skip] ' + f)
        continue
    t = io.open(f, encoding='utf-8').read()
    if "var SW_VERSION = 'v4.69.0';" in t:
        t = t.replace("var SW_VERSION = 'v4.69.0';", "var SW_VERSION = 'v4.70.0';")
        io.open(f, 'w', encoding='utf-8', newline='\n').write(t)
        print('[ok] sw ' + f)
    else:
        print('[WARN] sw version not found in ' + f)
