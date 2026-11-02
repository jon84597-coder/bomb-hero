# -*- coding: utf-8 -*-
"""v4.23e：補開機診斷卡文案的 10 語言翻譯（修 verify-v33 覆蓋率），並修 verify-v66 的版本斷言"""
import io, os, sys

P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html')
raw = io.open(P, 'r', encoding='utf-8', newline='').read()
src = raw.replace('\r\n', '\n')
assert src != raw
orig_len = len(src)
n = 0

# ---------- 1. I18N_EXTRA：新增開機診斷卡 / 強制更新 的 10 語言 ----------
anchor = "  'pwa.already': {"
i = src.index(anchor)
add = """  'boot.warn': { 'zh-TW': '⚠️ 這個裝置有部分功能沒有載入成功', 'zh-CN': '⚠️ 这个设备有部分功能没有加载成功', 'en': '⚠️ Some features did not load on this device', 'ja': '⚠️ この端末では一部の機能が読み込めませんでした', 'ko': '⚠️ 이 기기에서 일부 기능이 로드되지 않았습니다', 'th': '⚠️ บางฟีเจอร์โหลดไม่สำเร็จบนอุปกรณ์นี้', 'vi': '⚠️ Một số tính năng chưa tải được trên thiết bị này', 'ru': '⚠️ На этом устройстве не загрузились некоторые функции', 'de': '⚠️ Auf diesem Gerät wurden einige Funktionen nicht geladen', 'it': '⚠️ Su questo dispositivo alcune funzioni non sono state caricate' },
  'boot.sub': { 'zh-TW': '商店／帳號／RPG／BOSS 可能按了沒反應。', 'zh-CN': '商店／账号／RPG／BOSS 可能点了没反应。', 'en': 'Shop / Account / RPG / Boss may not respond.', 'ja': 'ショップ／アカウント／RPG／ボスが反応しない場合があります。', 'ko': '상점／계정／RPG／보스가 반응하지 않을 수 있습니다.', 'th': 'ร้านค้า／บัญชี／RPG／บอส อาจกดแล้วไม่ตอบสนอง', 'vi': 'Cửa hàng / Tài khoản / RPG / Boss có thể bấm không phản hồi.', 'ru': 'Магазин / Аккаунт / RPG / Босс могут не реагировать.', 'de': 'Shop / Konto / RPG / Boss reagieren evtl. nicht.', 'it': 'Negozio / Account / RPG / Boss potrebbero non rispondere.' },
  'boot.fix': { 'zh-TW': '🔄 強制更新', 'zh-CN': '🔄 强制更新', 'en': '🔄 Force update', 'ja': '🔄 強制更新', 'ko': '🔄 강제 업데이트', 'th': '🔄 บังคับอัปเดต', 'vi': '🔄 Cập nhật bắt buộc', 'ru': '🔄 Обновить принудительно', 'de': '🔄 Neu laden', 'it': '🔄 Aggiorna ora' },
  'boot.more': { 'zh-TW': '顯示細節', 'zh-CN': '显示细节', 'en': 'Show details', 'ja': '詳細を表示', 'ko': '세부 정보 보기', 'th': 'แสดงรายละเอียด', 'vi': 'Xem chi tiết', 'ru': 'Подробнее', 'de': 'Details zeigen', 'it': 'Mostra dettagli' },
  'nav.forceUpd': { 'zh-TW': '強制更新', 'zh-CN': '强制更新', 'en': 'Force update', 'ja': '強制更新', 'ko': '강제 업데이트', 'th': 'บังคับอัปเดต', 'vi': 'Cập nhật bắt buộc', 'ru': 'Обновить принудительно', 'de': 'Neu laden', 'it': 'Aggiorna ora' },
"""
src = src[:i] + add + src[i:]
n += 1

# ---------- 2. verify-v66：VERSION_LOG[0] 寫死 → 改用版號 filter ----------
V66 = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test', 'verify-v66.js')
raw66 = io.open(V66, 'r', encoding='utf-8', newline='').read()
s66 = raw66.replace('\r\n', '\n')
old66 = "ok(P.VERSION_LOG[0].items.join(' ').indexOf('14px') > 0, '更新內容有寫「整頁往上跳」這件事');"
new66 = ("const v422log = P.VERSION_LOG.filter(function (e) { return e.v === '4.22'; })[0] || { items: [] };\n"
         "ok(v422log.items.join(' ').indexOf('14px') > 0, '4.22 更新內容有寫「整頁往上跳」這件事');")
assert s66.count(old66) == 1, 'v66 斷言比對失敗'
s66 = s66.replace(old66, new66)
io.open(V66, 'w', encoding='utf-8', newline='').write(s66.replace('\n', '\r\n'))
n += 1

io.open(P, 'w', encoding='utf-8', newline='').write(src.replace('\n', '\r\n'))
print('OK 套用 %d 條，index.html %d → %d 字元' % (n, orig_len, len(src)))
