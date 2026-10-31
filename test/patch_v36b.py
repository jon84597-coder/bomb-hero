# -*- coding: utf-8 -*-
# v3.6b：index.html 的 CSS + 首頁 HTML + 10 語字典
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HTML = os.path.join(ROOT, 'bomb-hero', 'index.html')

s = io.open(HTML, encoding='utf-8').read()
orig = s
n = 0

def rep(old, new, tag):
    global s, n
    if old not in s:
        sys.exit('[v36b] 找不到錨點：' + tag)
    if s.count(old) > 1:
        sys.exit('[v36b] 錨點不唯一：' + tag)
    s = s.replace(old, new)
    n += 1

# =========================================================
# 1. CSS：統計列（並把公告欄往下挪，兩者共用左側直欄）
# =========================================================
CSS = u'''  /* ================================================================
     v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」
     有後端（server.js）就是所有人共用的真實數字；沒有後端就退回本機統計。
     ================================================================ */
  .statbox {
    position: fixed; z-index: 901;
    left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));
    display: flex; align-items: center; gap: 8px;
    padding: 6px 11px;
    background: rgba(255, 248, 233, .94);
    border: 2px solid var(--woodline, #ecd0ab);
    border-radius: 14px;
    box-shadow: 0 8px 20px -14px rgba(120, 80, 40, .55);
    color: var(--ink, #5b3a1e);
  }
  .statbox .stit { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 900; letter-spacing: .04em; }
  .statbox .stit .stic { font-size: 15px; }
  .statbox .stit b, .statbox .stlike b { font-variant-numeric: tabular-nums; font-size: 14px; }
  .statbox .stlb { font-weight: 800; font-size: 11.5px; color: var(--ink-soft, #8a6a4a); }
  .statbox .stsep { width: 1px; height: 18px; background: var(--woodline, #ecd0ab); }
  .statbox .stlike {
    display: inline-flex; align-items: center; gap: 5px;
    border: 2px solid var(--woodline, #ecd0ab); border-radius: 999px;
    background: linear-gradient(180deg, #fffdf6, #ffeccd);
    color: var(--ink, #5b3a1e); font-family: inherit; font-size: 12.5px; font-weight: 900;
    padding: 4px 11px; cursor: pointer; -webkit-tap-highlight-color: transparent;
    transition: transform .12s ease;
  }
  .statbox .stlike .sth { font-size: 14px; }
  .statbox .stlike:hover { transform: translateY(-1px); }
  .statbox .stlike:active { transform: translateY(1px); }
  .statbox .stlike.on { background: linear-gradient(180deg, #ffe6da, #ffc3a6); border-color: #f4703c; color: #b3340f; }
  .statbox .stlike.on .sth { animation: stpop .4s ease; }
  @keyframes stpop { 0% { transform: scale(1); } 40% { transform: scale(1.5); } 100% { transform: scale(1); } }
  .statbox .stlocal {
    font-size: 10px; font-weight: 900; color: #fff8e9; background: #8a6a4a;
    border-radius: 999px; padding: 2px 7px; letter-spacing: .04em;
  }
  .statbox .stwait { opacity: .5; }
  .statbox .stlocal.hide, .statbox .stwait.hide { display: none; }
  body.touch .statbox { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); padding: 5px 9px; gap: 7px; }
  body.touch .statbox .stit b, body.touch .statbox .stlike b { font-size: 13px; }
  body.touch .statbox .stlike { padding: 4px 9px; }

  /* v3.6：統計列插在公告欄上面 → 公告欄往下移，避免疊在一起 */
'''
rep(u'''  /* ================================================================
     v3.0：作者公告欄（首頁左上角背景空白處）''',
    CSS + u'''  /* ================================================================
     v3.0：作者公告欄（首頁左上角背景空白處）''',
    'CSS 插入點')

# 公告欄往下挪（PC）
rep(u'''.annbox {
    position: fixed; z-index: 900;
    left: 10px; top: calc(56px + env(safe-area-inset-top, 0px));''',
    u'''.annbox {
    position: fixed; z-index: 900;
    left: 10px; top: calc(104px + env(safe-area-inset-top, 0px));''',
    'annbox PC 下移')

# 公告欄往下挪（手機）
rep(u'''  body.touch .annbox { left: 8px; top: calc(48px + env(safe-area-inset-top, 0px)); }''',
    u'''  body.touch .annbox { left: 8px; top: calc(92px + env(safe-area-inset-top, 0px)); }''',
    'annbox 手機下移')

# =========================================================
# 2. 首頁 HTML：統計列（放在公告欄前面 → 視覺上在它上面）
# =========================================================
HTML_BOX = u'''    <!-- v3.6：首頁左上角「實際瀏覽人數 ＋ 按讚」 -->
    <div class="statbox" id="statBox">
      <span class="stit" id="stViewItem"><span class="stic">👁</span><b id="stViews">--</b><span class="stlb">瀏覽</span></span>
      <span class="stsep"></span>
      <button class="stlike" id="stLike" type="button">
        <span class="sth" id="stHeart">👍</span><b id="stLikes">--</b>
      </button>
      <span class="stlocal hide" id="stLocal">本機</span>
    </div>
'''
rep(u'''    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->''',
    HTML_BOX + u'''    <!-- v3.0：作者公告欄（左上角；手機預設收起成小膠囊） -->''',
    'HTML 插入點')

# =========================================================
# 3. 10 語字典
# =========================================================
TR = {
    'zh-TW': [u"'st.viewTip': '總瀏覽人數 {n} 人（今日 {d} 人）', 'st.likeTip': '按一下支持作者 👍（再按一下收回）', 'st.likedTip': '已按讚！再按一下可收回', 'st.localTip': '沒有連到後端：目前只統計這台裝置的次數', 'st.local': '本機', 'st.wan': '萬',"],
    'zh-CN': [u"'st.viewTip': '总浏览人数 {n} 人（今日 {d} 人）', 'st.likeTip': '点一下支持作者 👍（再点一下收回）', 'st.likedTip': '已点赞！再点一下可收回', 'st.localTip': '没有连到后端：目前只统计这台设备的次数', 'st.local': '本机', 'st.wan': '万',"],
    'en': [u"'st.viewTip': '{n} visitors total ({d} today)', 'st.likeTip': 'Tap 👍 to support (tap again to undo)', 'st.likedTip': 'Liked! Tap again to undo', 'st.localTip': 'No backend: counting this device only', 'st.local': 'Local', 'st.wan': 'K',"],
    'ja': [u"'st.viewTip': '総閲覧 {n} 人（本日 {d} 人）', 'st.likeTip': '👍 応援する（もう一度で取り消し）', 'st.likedTip': 'いいね済み！もう一度で取り消し', 'st.localTip': 'サーバー未接続：この端末のみ集計中', 'st.local': 'ローカル', 'st.wan': 'K',"],
    'ko': [u"'st.viewTip': '총 방문 {n}명 (오늘 {d}명)', 'st.likeTip': '👍 응원하기 (다시 누르면 취소)', 'st.likedTip': '좋아요 완료! 다시 누르면 취소', 'st.localTip': '서버 미연결: 이 기기만 집계 중', 'st.local': '로컬', 'st.wan': 'K',"],
    'th': [u"'st.viewTip': 'ผู้เข้าชมรวม {n} คน (วันนี้ {d} คน)', 'st.likeTip': 'กด 👍 เพื่อให้กำลังใจ (กดซ้ำเพื่อยกเลิก)', 'st.likedTip': 'กดถูกใจแล้ว! กดซ้ำเพื่อยกเลิก', 'st.localTip': 'ไม่มีเซิร์ฟเวอร์: นับเฉพาะอุปกรณ์นี้', 'st.local': 'เครื่อง', 'st.wan': 'K',"],
    'vi': [u"'st.viewTip': 'Tổng {n} lượt xem (hôm nay {d})', 'st.likeTip': 'Nhấn 👍 để ủng hộ (nhấn lại để bỏ)', 'st.likedTip': 'Đã thích! Nhấn lại để bỏ', 'st.localTip': 'Không có máy chủ: chỉ tính trên thiết bị này', 'st.local': 'Cục bộ', 'st.wan': 'K',"],
    'ru': [u"'st.viewTip': 'Всего посетителей: {n} (сегодня {d})', 'st.likeTip': 'Нажмите 👍 в поддержку (повторно — отмена)', 'st.likedTip': 'Лайк поставлен! Повторно — отмена', 'st.localTip': 'Нет сервера: считается только это устройство', 'st.local': 'Лок.', 'st.wan': 'K',"],
    'de': [u"'st.viewTip': 'Besucher gesamt: {n} (heute {d})', 'st.likeTip': 'Zum Unterstützen 👍 tippen (nochmal = zurück)', 'st.likedTip': 'Gefällt mir! Nochmal zum Zurücknehmen', 'st.localTip': 'Kein Server: nur dieses Gerät wird gezählt', 'st.local': 'Lokal', 'st.wan': 'K',"],
    'it': [u"'st.viewTip': 'Visitatori totali: {n} (oggi {d})', 'st.likeTip': 'Tocca 👍 per supportare (di nuovo per annullare)', 'st.likedTip': 'Mi piace! Tocca di nuovo per annullare', 'st.localTip': 'Nessun server: conta solo questo dispositivo', 'st.local': 'Locale', 'st.wan': 'K',"],
}
for lg in ['zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'th', 'vi', 'ru', 'de', 'it']:
    anchor = u"I18N['%s'] = {\n" % lg
    rep(anchor, anchor + u"  // v3.6 瀏覽人數／按讚\n  " + u'\n  '.join(TR[lg]) + u'\n', 'i18n ' + lg)

io.open(HTML, 'w', encoding='utf-8', newline='\n').write(s)
print('[v36b] index.html 修補 %d 處，%d → %d bytes' % (n, len(orig), len(s)))
