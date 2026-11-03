# -*- coding: utf-8 -*-
# v4.55：主檔瘦身 —— 把 CSS 區最大顆的歷史註解壓成一行（只動註解，不動任何數值）
import re, sys, io

P = 'index.html'
s = io.open(P, encoding='utf-8').read()
before = len(s.encode())
log = []

def cut(prefix, new):
    global s
    spans = list(re.finditer(r'/\*.*?\*/', s, re.S))
    for m in spans:
        if prefix in m.group(0):
            old = m.group(0)
            if len(new.encode()) >= len(old.encode()):
                log.append(('SKIP(no gain)', prefix)); return
            s = s[:m.start()] + new + s[m.end():]
            log.append((len(old.encode()) - len(new.encode()), prefix))
            return
    log.append(('MISS', prefix))

cut('v4.3：手機橫放 —— 遊戲畫面必須',
    '/* v4.3：手機橫放要把高度綁到視口（100svh，舊機退回 100vh）—— body 只有 min-height 時 .wrap.game 的 height:100% 解析失敗，畫布會退回 4:3 撐爆、按鍵跑到畫面外 */')

cut('v4.52：首頁大按鈕統一設計',
    '/* v4.52：首頁 11 顆大按鈕同一個外型（icon 徽章＋主標＋副標）；四態：一般／hover 抬起＋外圈／active 壓到底／newbie 脈衝；三色分層：暖色主玩法、冷灰藍工具、綠教學 */')

cut('v3.0：作者公告欄（首頁左上角背景空白處）',
    '/* v3.0：作者公告欄（首頁左上角背景空白處）—— 寬螢幕預設展開，手機收成「📢 作者公告」膠囊，點開可捲動、不佔遊戲畫面 */')

cut('v3.1：右上角「下一步」快捷鈕',
    '/* v3.1：右上角「下一步」快捷鈕 —— 設定頁把主按鈕複製一份釘在右上，文字與主按鈕永遠同步（含語言切換） */')

cut('v1.4 繪本風主題',
    '/* v1.4 繪本風主題（奶油底、木頭框、圓胖字）；v1.5 角色部位骨架動畫、BOSS／坐騎／石頭木箱分色 */')

cut('v4.4：道具／坐騎提示＝輕量 Toast 橫幅',
    '/* v4.4：道具／坐騎提示＝貼在資訊列下緣的輕量 Toast（毛玻璃、pointer-events:none、2 秒淡出），不再蓋住半個畫面 */')

cut('v4.21：改成「首頁卡片裡的一般區塊」',
    '/* v4.21：公告欄改成首頁卡片裡的一般區塊 —— 舊版 fixed + z-index 會蓋住選單按鈕，玩家以為「按鈕壞了」 */')

cut('v4.47：手機直放 —— 遊戲畫面真正滿版',
    '/* v4.47：手機直放滿版 —— body.in-game padding 歸零、#stageWrap 下方不留搖桿位，畫布吃滿；搖桿改成浮在地圖上的半透明墊 */')

cut('v4.21：原本 align-items:center',
    '/* v4.21：body 不可 align-items:center（內容比視窗高時頂端會被推到畫面外）；改 flex-start + .wrap{margin-block:auto} */')

cut('v2.5：手機橫放',
    '/* v2.5：手機橫放重排（orientation:landscape + body.touch），直式的緊湊規則不能套回橫放 */')

cut('v4.2 模式 A：全域隱形大空間滑動',
    '/* v4.2 模式 A：全域隱形大空間滑動 —— 操作圖層壓在按鈕下面（z-index），放彈／引爆鍵永遠優先 */')

cut('v3.5：遊戲說明頁',
    '/* v3.5：遊戲說明頁（首頁「📖 遊戲說明」）—— 分頁：操作／道具／坐騎／場景／怪物／訣竅 */')

cut('v4.12：高度改以 --vvh 為主',
    '/* v4.12：高度以 --vvh 為主（JS 量 visualViewport），100svh／100vh 後援；100vh 在網址列出現時會溢出 */')

cut('不可以把 touch-action:none 放在 body 上',
    '/* 不可把 touch-action:none 放在 body —— 會沿祖先鏈鎖死子層 pan-y，選單就滑不動；只在遊戲畫面鎖 */')

cut('v4.1：帳號 / 第三方登入 / 雲端存檔',
    '/* v4.1：帳號／第三方登入／雲端存檔 —— 右上角常駐 👤 膠囊，遊客也能直接玩 */')

cut('v4.22：手機工具列重排',
    '/* v4.22：手機工具列只留 👤 帳號＋⋮ 更多，其餘收進選單，每顆都做滿 44px 才好按 */')

cut('v4.12：全域 canvas 規則有 background',
    '/* v4.12：全域 canvas 的深底＋圓角會把觸控鈕圖示畫成黑底方塊 → 這裡明確蓋掉成透明圓形 */')

cut('v4.22：padding 不可以從 body 的 14px',
    '/* v4.22：padding 不可從 body 的 14px 變 0 —— 第一次觸控加上 .touch 整頁會跳 14px，按鈕跟著移走就點不到 */')

cut('v4.23：手機選單改兩欄',
    '/* v4.23：手機選單兩列 —— 三個主模式跨滿整列，其餘兩兩並排，一屏看得完 */')

cut('v4.23：舊版是 position:fixed',
    '/* v4.23：舊版 fixed 會浮在選單上面蓋住按鈕，現在改成首頁頂部的一般區塊 */')

cut('v4.14b：minmax(0,1fr)',
    '/* v4.14b：minmax(0,1fr) —— 名字 nowrap 的 min-content 會把欄位撐爆，用 0 當下限才會走 ellipsis */')

cut('v4.3：直放也有同樣的「height:100% 解析不到」問題',
    '/* v4.3：直放同樣有 height:100% 解析不到的問題（畫布只剩 171px 一條），一樣把高度綁到視口 */')

cut('v4.23：原本只設了深藍底，字色仍是 .mbtn',
    '/* v4.23：淺藍卡片＋深藍字，跟羊皮紙主題一致、又跟「商店」分得開 */')

cut('v2.6：坐騎招式（🔥）改排在',
    '/* v2.6：坐騎招式（🔥）排在遙控引爆左邊 —— 疊在上方會跟右上角 ⛶ 全螢幕鈕撞在一起 */')

cut('v4.43：手機遊戲中 —— 只留',
    '/* v4.43：手機遊戲中只留「①工具列 ②資訊列」兩排，⏸ ESC 收掉，遊戲畫面吃滿 */')

io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
after = len(s.encode())
for r in log:
    print(r[0], '|', str(r[1])[:60])
print('---- bytes %d -> %d  (-%d)' % (before, after, before - after))
