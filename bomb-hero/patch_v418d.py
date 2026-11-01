# -*- coding: utf-8 -*-
"""v4.18 patch D：版號 4.18 + VERSION_LOG + SW 快取版號"""
import io, sys

def load(p):
    return io.open(p, 'rb').read().decode('utf-8').replace('\r\n', '\n')

def save(p, s):
    io.open(p, 'wb').write(s.replace('\n', '\r\n').encode('utf-8'))

fails = []
def apply(path, rules, crlf=True):
    s = load(path)
    ok = True
    for name, old, new in rules:
        n = s.count(old)
        if n != 1:
            print('❌ [%s] %s → hits %d' % (path, name, n))
            ok = False
            continue
        s = s.replace(old, new)
        print('✓ [%s] %s' % (path, name))
    if not ok:
        fails.append(path)
        return
    if crlf:
        save(path, s)
    else:
        io.open(path, 'wb').write(s.encode('utf-8'))

LOG_418 = """const VERSION_LOG = [
  { v: '4.18', date: '2026-11-02', now: true, items: [
    '<b>🔓 暱稱可以留空</b>：不想取名字也能直接玩，系統會自動取一個「玩家xxx」，之後在首頁隨時改',
    '<b>📣 分享拿金幣</b>：商店多了分享區，分享到 LINE／Facebook／X／WhatsApp 或複製連結，<b>每個平台送 1000 金幣</b>（每個平台限領一次、每天最多 3 次）。要登入正式帳號才能領；沒真的分享出去（按取消、頁面沒跳出去）不會給',
    '<b>🛡️ 分享防作假</b>：每次領取都要先向伺服器拿<b>一次性驗證碼</b>（5 分鐘過期、用過就作廢），領取記錄存在伺服器上 → 改瀏覽器資料也刷不出金幣',
    '<b>👑 開發者金幣無限</b>：開發者帳號打開商店，錢包直接顯示 <b>∞</b>，雇用隨從不扣金幣（測試用；一般玩家照規矩花錢）',
    '<b>💣 對戰 AI 丟炸彈改成「真的隔牆丟」</b>：AI 必須先撿到<b>搬彈手套</b>，才會把腳下的炸彈舉起來、往面朝方向丟過牆；落點是那個方向的第一格空地，<b>絕對不會直接砸在任何人身上</b>（以前是直接飛到對手格子，那不是玩家做得到的動作）'
  ] },
  { v: '4.17', date: '2026-11-02', now: false, items: ["""
apply('index.html', [
    ('版號常數', "const VERSION = '4.17';", "const VERSION = '4.18';"),
    ('版本紀錄徽章', '<span class="vlnum">v<span id="verLogVer">4.17</span></span>',
                     '<span class="vlnum">v<span id="verLogVer">4.18</span></span>'),
    ('頁面版本徽章', '<div class="ver beta">測試版 v<span id="verTxt">4.17</span></div>',
                     '<div class="ver beta">測試版 v<span id="verTxt">4.18</span></div>'),
    ('VERSION_LOG 新增 4.18',
     """const VERSION_LOG = [
  { v: '4.17', date: '2026-11-02', now: true, items: [""",
     LOG_418),
])

# SW 三份
for p in ['sw.js', '../public/sw.js', '../bomberman-online/public/sw.js']:
    apply(p, [('SW_VERSION', "var SW_VERSION = 'v4.17.1';", "var SW_VERSION = 'v4.18.0';")], crlf=False)

if fails:
    print('中止：%s' % ', '.join(fails))
    sys.exit(1)
print('完成')
