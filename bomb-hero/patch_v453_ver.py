# -*- coding: utf-8 -*-
# v4.53 版號升級：重生點／拳擊彈跳／推車選格／選角卡片
import io, sys, re

def must(c, m):
    if not c:
        print('FAIL ' + m); sys.exit(1)

P = 'index.html'
s = io.open(P, encoding='utf-8', newline='').read()

def rep(old, new, tag):
    global s
    if old not in s:
        must(new in s, 'MISS ' + tag)
        print('  skip ' + tag); return
    must(s.count(old) == 1, 'DUP(%d) %s' % (s.count(old), tag))
    s = s.replace(old, new)
    print('  ok   ' + tag)

rep("const VERSION = '4.52'", "const VERSION = '4.53'", 'VERSION')
rep('id="verTxt">4.52<', 'id="verTxt">4.53<', 'verTxt')
rep('id="verLogVer">4.52<', 'id="verLogVer">4.53<', 'verLogVer')

ENTRY = """VERSION_LOG = [
  { v: '4.53', date: '2026-11-03', now: true, items: [
    '重生點修好：死亡後回到「這一場的出生格」附近的安全空地，不再死寫回左上角（大圖會直接卡在石頭裡）',
    '復活瞬間鏡頭直接跳過去，不用等畫面捲；無敵時間 2 秒 → 2.2 秒',
    '打彈拳擊改成「跨過一道牆就落地」：牆後面還是牆才繼續彈，不再一次飛到最底',
    '推車丟彈改成階梯式選格：輕點＝第 1 格、按住 0.35 秒＝第 2 格、0.7 秒＝第 3 格（到頂鎖定，不會按過頭）',
    '對戰選角卡片重做：◀▶ 與 🤖 按鈕 20x17 → 44x44、頭像 34 → 54px，AI 鍵會顯示 👤／🤖 目前狀態',
    '順手把 CSS 縮排壓掉，主檔反而小了一點（約 3.5KB）',
  ] },
  { v: '4.52', date: '2026-11-03', now: false, items: ["""
rep("VERSION_LOG = [\n  { v: '4.52', date: '2026-11-03', now: true, items: [", ENTRY, 'VERSION_LOG')

io.open(P, 'w', encoding='utf-8', newline='').write(s)

# 三份 sw.js
for sw in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    try:
        t = io.open(sw, encoding='utf-8', newline='').read()
    except IOError:
        print('  skip (no file) ' + sw); continue
    t2 = t.replace("v4.52.0", "v4.53.0")
    must(t2 != t, 'sw 沒換版號 ' + sw)
    io.open(sw, 'w', encoding='utf-8', newline='').write(t2)
    print('  ok   sw ' + sw)

print('chars', len(s), 'bytes', len(s.encode('utf-8')))
